import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'dompurify';
import Icons from '../ui/Icons'; // Ajusta esta ruta a tus iconos
import './ChronicleSection.css'; 

const ChronicleSection = ({ 
    section, 
    glossary = [],
    isAdmin, 
    isFirst, 
    isLast, 
    onEdit, 
    onDelete, 
    onMoveUp, 
    onMoveDown 
}) => {
    // --- ESTADOS ---
    const [readingMode, setReadingMode] = useState(false);
    
    // Estado complejo para la ventana flotante
    const [popover, setPopover] = useState({
        visible: false,
        x: 0,
        y: 0,
        term: '',
        content: '',
        type: 'default', // default, warning, secret, glossary
        isTop: false,    // Si true, se renderiza hacia arriba del cursor
        isPinned: false, // Si true, el usuario la "fijó" al arrastrar
        isDragging: false // Si true, se está moviendo actualmente
    });

    // --- REFS (Para evitar re-renders innecesarios en lógica de eventos) ---
    const hoverTimeoutRef = useRef(null); // Controla el delay de entrada/salida
    const dragOffset = useRef({ x: 0, y: 0 }); // Guarda la distancia mouse-esquina al arrastrar
    const popoverRef = useRef(null); // Referencia al DOM del popover para detectar clicks fuera

    // Validación básica
    if (!section) return null;

    // --- EFECTOS GLOBALES (Drag & Click Outside) ---
    useEffect(() => {
        // 1. Manejo del movimiento del mouse (Solo si se está arrastrando)
        const handleGlobalMouseMove = (e) => {
            if (popover.isDragging) {
                e.preventDefault(); // Evita selecciones de texto raras
                setPopover(prev => ({
                    ...prev,
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y,
                    // Al mover, garantizamos que está "pinned" y reseteamos flags de posicionamiento automático
                    isPinned: true, 
                    isTop: false // Al arrastrar usamos coordenadas absolutas directas
                }));
            }
        };

        // 2. Soltar el arrastre
        const handleGlobalMouseUp = () => {
            if (popover.isDragging) {
                setPopover(prev => ({ ...prev, isDragging: false }));
            }
        };

        // 3. Cerrar al hacer click fuera (Solo si está visible y no se está interactuando con ella)
        const handleGlobalClick = (e) => {
            if (popover.visible && popoverRef.current && !popoverRef.current.contains(e.target)) {
                // Excepción crítica: No cerrar si el click fue en el trigger que la abrió
                if (e.target.closest('.obsidian-trigger')) return;
                
                // Cerrar ventana
                closePopover();
            }
        };

        // Añadimos listeners solo si la ventana es visible
        if (popover.visible) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousedown', handleGlobalClick);
        }

        // Cleanup al desmontar o cerrar
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousedown', handleGlobalClick);
        };
    }, [popover.visible, popover.isDragging]);

    // Cleanup de timers al desmontar el componente
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    // --- LÓGICA DE POSICIONAMIENTO INTELIGENTE ---
    const calculatePosition = (targetRect) => {
        const POPOVER_WIDTH = 380;
        const POPOVER_HEIGHT_EST = 250;
        const GAP = 15;
        
        let x = targetRect.left + (targetRect.width / 2); // Centro horizontal del elemento
        let y = targetRect.bottom + GAP; // Por defecto: abajo
        let isTop = false;

        // 1. Corrección Horizontal (Clamp): Evitar salir por izq/der
        const screenW = window.innerWidth;
        if (x + (POPOVER_WIDTH / 2) > screenW) {
            x = screenW - (POPOVER_WIDTH / 2) - 20; // Margen derecho
        } else if (x - (POPOVER_WIDTH / 2) < 0) {
            x = (POPOVER_WIDTH / 2) + 20; // Margen izquierdo
        }

        // 2. Corrección Vertical (Flip): Si no cabe abajo, poner arriba
        const screenH = window.innerHeight;
        if (y + POPOVER_HEIGHT_EST > screenH) {
            y = targetRect.top - GAP;
            isTop = true;
        }

        return { x, y, isTop };
    };

    // --- HANDLERS DE INTERACCIÓN ---

    // 1. Entrar en un Trigger (Enlace)
    const handleTriggerEnter = (e, term, contentEncoded, type) => {
        // Si ya tengo una ventana fijada por el usuario, ignoro el hover (opcional, mejora UX)
        if (popover.isPinned) return; 

        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        const target = e.currentTarget;
        const content = decodeURIComponent(contentEncoded);
        const { x, y, isTop } = calculatePosition(target.getBoundingClientRect());

        // Delay de 300ms para evitar parpadeos al pasar rápido el mouse
        hoverTimeoutRef.current = setTimeout(() => {
            setPopover({
                visible: true,
                x, 
                y,
                term,
                content,
                type,
                isTop,
                isPinned: false, // Hover inicial = no pinned
                isDragging: false
            });
        }, 300);
    };

    // 2. Salir del Trigger o del Popover
    const handleLeave = () => {
        // MAGIA: Si está pinned (movida por usuario) o arrastrando, NO cerramos automáticamente
        if (popover.isPinned || popover.isDragging) return;

        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        // Damos un margen de 300ms para mover el mouse del texto a la ventana
        hoverTimeoutRef.current = setTimeout(() => {
            closePopover();
        }, 300);
    };

    // 3. Entrar al Popover (cancela el cierre automático)
    const handlePopoverEnter = () => {
        if (!popover.isPinned && hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    // 4. Iniciar Arrastre (Click en Header)
    const handleDragStart = (e) => {
        // Calculamos dónde hizo click el usuario relativo a la esquina de la ventana
        // Nota: Si isTop era true, el CSS usaba transform. Al arrastrar, pasamos a coordenadas absolutas simples.
        
        // Truco: Para evitar saltos, calculamos la posición visual actual del elemento
        const rect = popoverRef.current.getBoundingClientRect();
        
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Actualizamos estado: ahora está "pinned" y "dragging"
        // Actualizamos x/y a la posición actual del rect para quitar el transform CSS sin saltos
        setPopover(prev => ({
            ...prev,
            isDragging: true,
            isPinned: true,
            isTop: false, // Desactivamos lógica flip vertical
            x: rect.left, // Coordenada absoluta real
            y: rect.top   // Coordenada absoluta real
        }));
    };

    const closePopover = () => {
        setPopover(prev => ({ ...prev, visible: false, isPinned: false }));
    };

    // --- PARSER DE CONTENIDO (Markdown -> HTML Interactivo) ---
    const processedData = useMemo(() => {
        let content = section.content || '';
        const footnotes = [];
        let footnoteCount = 0;

        // Función auxiliar para crear el span interactivo
        const createTrigger = (text, htmlContent, type = 'default') => {
            // Encodeamos para pasar HTML dentro de un atributo data- de forma segura
            const safeContent = encodeURIComponent(htmlContent);
            return `<span 
                data-obsidian-trigger="true" 
                data-term="${text}" 
                data-content="${safeContent}" 
                data-type="${type}"
                class="obsidian-trigger"
            >${text}</span>`;
        };

        // 1. Glosario (Ordenado por longitud para evitar remplazos parciales)
        const sortedGlossary = [...glossary].sort((a, b) => b.term.length - a.term.length);
        sortedGlossary.forEach(entry => {
            // Regex que busca la palabra completa (\b) insensible a mayúsculas (gi)
            const regex = new RegExp(`\\b(${entry.term})\\b`, 'gi');
            const tooltipHtml = `
                ${entry.image ? `<img src="${entry.image}" alt="${entry.term}" loading="lazy"/>` : ''}
                <p>${entry.definition}</p>
            `;
            content = content.replace(regex, (match) => createTrigger(match, tooltipHtml, 'glossary'));
        });

        // 2. Notas Tipificadas (Ej: ^secret[Texto oculto])
        // Tipos soportados: info, warning, secret, lore
        const typedNoteRegex = /\^(info|warning|secret|lore)\[([^\]]+)\]/g;
        content = content.replace(typedNoteRegex, (match, type, text) => {
            const icons = { info: 'ℹ', warning: '⚠', secret: '👁', lore: '📖' };
            const label = icons[type] || '?';
            return createTrigger(label, text, type);
        });

        // 3. Notas Estándar (Ej: ^[Nota simple])
        const noteRegex = /\^\[([^\]]+)\]/g;
        content = content.replace(noteRegex, (match, text) => createTrigger('?', text, 'default'));

        // 4. Notas al Pie (Referencias bibliográficas al final) - Ej: ^ref[Fuente]
        const refRegex = /\^ref\[([^\]]+)\]/g;
        content = content.replace(refRegex, (match, text) => {
            footnoteCount++;
            footnotes.push({ id: footnoteCount, text });
            return `<sup class="text-red-500 font-bold ml-0.5 cursor-pointer" title="Ver nota al pie">[${footnoteCount}]</sup>`;
        });

        // 5. Resaltados (Markdown estándar ==texto==)
        // Lo convertimos a HTML <mark>
        content = content.replace(/==([^=]+)==/g, '<mark class="bg-yellow-500/20 text-yellow-200 px-1 rounded border border-yellow-500/30">$1</mark>');

        // Calculo de tiempo de lectura
        const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const minutes = Math.ceil(words / 250);

        return { html: content, footnotes, readingTime: minutes };

    }, [section.content, glossary]);

    // --- RENDERIZADORES MARKDOWN ---
    const markdownComponents = {
        // Interceptamos SPAN para inyectar nuestra lógica de eventos React
        span: ({node, ...props}) => {
            if (props['data-obsidian-trigger']) {
                return (
                    <span 
                        className={`obsidian-trigger`}
                        data-type={props['data-type']}
                        onMouseEnter={(e) => handleTriggerEnter(e, props['data-term'], props['data-content'], props['data-type'])}
                        onMouseLeave={handleLeave}
                    >
                        {props.children}
                    </span>
                );
            }
            return <span {...props} />;
        },
        // Estilos base
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-neutral-300" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-3xl font-serif text-red-500 mt-6 mb-4 border-b border-red-900/30 pb-2" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-red-900 pl-4 py-2 my-6 bg-red-900/10 italic text-neutral-400 rounded-r" {...props} />,
        a: ({node, ...props}) => <a className="text-red-400 hover:text-red-300 underline decoration-dotted underline-offset-4" {...props} target="_blank" rel="noopener noreferrer" />,
        img: ({node, ...props}) => <img {...props} className="rounded-lg shadow-xl my-6 border border-neutral-800 w-full" loading="lazy" />,
    };

    return (
        <>
            <article className="relative bg-neutral-900/20 p-6 md:p-8 rounded-lg border-l-2 border-red-900/20 hover:border-red-900/60 transition-all duration-300 group">
                
                {/* --- HEADER --- */}
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl md:text-3xl font-serif text-neutral-200 flex items-center gap-2">
                        <span className="text-red-900 select-none text-xl">§</span> {section.title}
                    </h2>
                    
                    {/* Controles Admin */}
                    <div className="flex items-center gap-2">
                        {isAdmin && !readingMode && (
                            <div className="flex bg-black/40 rounded-lg p-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/5">
                                <button onClick={() => !isFirst && onMoveUp(section.id)} disabled={isFirst} className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 disabled:opacity-30"><Icons.ChevronUp size={16}/></button>
                                <button onClick={() => !isLast && onMoveDown(section.id)} disabled={isLast} className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 disabled:opacity-30"><Icons.ChevronDown size={16}/></button>
                                <div className="w-px bg-white/10 mx-1"></div>
                                <button onClick={() => onEdit(section)} className="p-1.5 hover:bg-yellow-900/30 hover:text-yellow-500 rounded text-neutral-400 transition-colors"><Icons.Edit size={16}/></button>
                                <button onClick={() => onDelete(section.id)} className="p-1.5 hover:bg-red-900/30 hover:text-red-500 rounded text-neutral-400 transition-colors"><Icons.Trash size={16}/></button>
                            </div>
                        )}
                        <button 
                            onClick={() => setReadingMode(!readingMode)} 
                            className={`p-2 rounded-lg transition-colors ${readingMode ? 'text-red-400 bg-red-900/20' : 'text-neutral-500 hover:text-white'}`}
                            title="Modo Lectura"
                        >
                            {readingMode ? <Icons.Eye size={20}/> : <Icons.BookOpen size={20}/>}
                        </button>
                    </div>
                </div>

                {/* --- IMAGEN PRINCIPAL --- */}
                {section.image_url && (
                    <div className="mb-8 w-full flex justify-center bg-black/20 rounded-lg p-2 border border-white/5">
                        <img src={section.image_url} alt={section.title} className="rounded shadow-2xl max-h-[500px] object-contain" />
                    </div>
                )}

                {/* --- CONTENIDO --- */}
                <div className="font-sans text-lg text-justify leading-relaxed text-neutral-300 selection:bg-red-900/60 selection:text-white">
                    <ReactMarkdown 
                        rehypePlugins={[rehypeRaw]} 
                        components={markdownComponents}
                    >
                        {processedData.html}
                    </ReactMarkdown>
                </div>

                {/* --- FOOTER & NOTAS --- */}
                <div className="mt-8 pt-4 border-t border-neutral-800/50">
                    <div className="flex justify-between text-xs text-neutral-600 font-mono mb-4">
                        <span className="flex items-center gap-2"><Icons.Clock size={12}/> {processedData.readingTime} min</span>
                        <span>{new Date(section.created_at).toLocaleDateString()}</span>
                    </div>

                    {processedData.footnotes.length > 0 && (
                        <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-2">
                            <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-900"></span> Referencias
                            </h4>
                            <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-1 ml-1">
                                {processedData.footnotes.map(note => (
                                    <li key={note.id} className="pl-2 marker:text-neutral-600 marker:font-bold">
                                        {note.text}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </article>

            {/* --- POPOVER PORTAL (La Ventana Flotante) --- */}
            {createPortal(
                <div 
                    ref={popoverRef}
                    className={`obsidian-popover ${popover.visible ? 'visible' : ''}`}
                    style={{ 
                        left: popover.x, 
                        top: popover.y,
                        // TRUCO DE ESTILOS:
                        // 1. Si isPinned (arrastrando/fijo): Usamos coordenadas directas (transform simple para escala)
                        // 2. Si isTop (hover automático arriba): Translate Y -100% para subirlo sobre el cursor
                        // 3. Default (hover automático abajo): Translate X -50% para centrarlo
                        transform: popover.isPinned 
                            ? `translate(0, 0) scale(${popover.visible ? 1 : 0.95})` 
                            : `translate(-50%, ${popover.isTop ? '-100%' : '0'}) scale(${popover.visible ? 1 : 0.95})`
                    }}
                    onMouseEnter={handlePopoverEnter}
                    onMouseLeave={handleLeave}
                >
                    {/* Header para Arrastrar */}
                    <div 
                        className="popover-header" 
                        onMouseDown={handleDragStart}
                        title="Arrastra para mover y fijar la nota"
                    >
                        <span className="popover-title">
                            {popover.isPinned && <span className="text-xs text-neutral-500 mr-2">📌</span>}
                            {popover.term}
                        </span>
                        <button 
                            className="popover-close" 
                            onClick={(e) => { e.stopPropagation(); closePopover(); }}
                            aria-label="Cerrar"
                        >
                            <Icons.X size={14} />
                        </button>
                    </div>

                    {/* Contenido HTML Sanitizado */}
                    <div 
                        className="popover-body"
                        dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(popover.content, {
                                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'img'],
                                ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class']
                            }) 
                        }} 
                    />
                </div>,
                document.body // Renderiza directamente en <body> para evitar recortes (overflow)
            )}
        </>
    );
};

export default ChronicleSection;