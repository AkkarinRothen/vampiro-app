import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'dompurify';
import Icons from '../ui/Icons';
import './ChronicleSection.css'; 

const ChronicleSection = ({ 
    section, 
    glossary = [],
    canEdit, // <--- 1. IMPORTANTE: Recibir esta propiedad
    isFirst, 
    isLast, 
    onEdit, 
    onDelete, 
    onMoveUp, 
    onMoveDown 
}) => {
    const [readingMode, setReadingMode] = useState(false);
    
    // Estado para popover (tooltip avanzado)
    const [popover, setPopover] = useState({
        visible: false,
        x: 0,
        y: 0,
        term: '',
        content: '',
        type: 'default',
        isTop: false,
        isPinned: false,
        isDragging: false
    });

    const hoverTimeoutRef = useRef(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const popoverRef = useRef(null);

    if (!section) return null;

    // --- EFECTOS (Drag & Drop de Popover) ---
    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            if (popover.isDragging) {
                e.preventDefault();
                setPopover(prev => ({
                    ...prev,
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y,
                    isPinned: true, 
                    isTop: false
                }));
            }
        };

        const handleGlobalMouseUp = () => {
            if (popover.isDragging) {
                setPopover(prev => ({ ...prev, isDragging: false }));
            }
        };

        const handleGlobalClick = (e) => {
            if (popover.visible && popoverRef.current && !popoverRef.current.contains(e.target)) {
                if (e.target.closest('.obsidian-trigger')) return;
                closePopover();
            }
        };

        if (popover.visible) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mousedown', handleGlobalClick);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mousedown', handleGlobalClick);
        };
    }, [popover.visible, popover.isDragging]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    // --- LOGICA POPOVER ---
    const calculatePosition = (targetRect) => {
        const POPOVER_WIDTH = 380;
        const POPOVER_HEIGHT_EST = 250;
        const GAP = 15;
        
        let x = targetRect.left + (targetRect.width / 2);
        let y = targetRect.bottom + GAP;
        let isTop = false;

        const screenW = window.innerWidth;
        if (x + (POPOVER_WIDTH / 2) > screenW) {
            x = screenW - (POPOVER_WIDTH / 2) - 20;
        } else if (x - (POPOVER_WIDTH / 2) < 0) {
            x = (POPOVER_WIDTH / 2) + 20;
        }

        const screenH = window.innerHeight;
        if (y + POPOVER_HEIGHT_EST > screenH) {
            y = targetRect.top - GAP;
            isTop = true;
        }

        return { x, y, isTop };
    };

    const handleTriggerEnter = (e, term, contentEncoded, type) => {
        if (popover.isPinned) return; 
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        const target = e.currentTarget;
        const content = decodeURIComponent(contentEncoded);
        const { x, y, isTop } = calculatePosition(target.getBoundingClientRect());

        hoverTimeoutRef.current = setTimeout(() => {
            setPopover({
                visible: true,
                x, y, term, content, type, isTop,
                isPinned: false, isDragging: false
            });
        }, 300);
    };

    const handleLeave = () => {
        if (popover.isPinned || popover.isDragging) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        hoverTimeoutRef.current = setTimeout(() => {
            closePopover();
        }, 300);
    };

    const handlePopoverEnter = () => {
        if (!popover.isPinned && hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    const handleDragStart = (e) => {
        const rect = popoverRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        setPopover(prev => ({
            ...prev,
            isDragging: true, isPinned: true, isTop: false,
            x: rect.left, y: rect.top
        }));
    };

    const closePopover = () => {
        setPopover(prev => ({ ...prev, visible: false, isPinned: false }));
    };

    // --- PARSER ---
    const processedData = useMemo(() => {
        let content = section.content || '';
        const footnotes = [];
        let footnoteCount = 0;

        const createTrigger = (text, htmlContent, type = 'default') => {
            const safeContent = encodeURIComponent(htmlContent);
            return `<span 
                data-obsidian-trigger="true" 
                data-term="${text}" 
                data-content="${safeContent}" 
                data-type="${type}"
                class="obsidian-trigger"
            >${text}</span>`;
        };

        const sortedGlossary = [...glossary].sort((a, b) => b.term.length - a.term.length);
        sortedGlossary.forEach(entry => {
            const regex = new RegExp(`\\b(${entry.term})\\b`, 'gi');
            const tooltipHtml = `
                ${entry.image ? `<img src="${entry.image}" alt="${entry.term}" loading="lazy"/>` : ''}
                <p>${entry.definition}</p>
            `;
            content = content.replace(regex, (match) => createTrigger(match, tooltipHtml, 'glossary'));
        });

        const typedNoteRegex = /\^(info|warning|secret|lore)\[([^\]]+)\]/g;
        content = content.replace(typedNoteRegex, (match, type, text) => {
            const icons = { info: 'ℹ', warning: '⚠', secret: '👁', lore: '📖' };
            const label = icons[type] || '?';
            return createTrigger(label, text, type);
        });

        const noteRegex = /\^\[([^\]]+)\]/g;
        content = content.replace(noteRegex, (match, text) => createTrigger('?', text, 'default'));

        const refRegex = /\^ref\[([^\]]+)\]/g;
        content = content.replace(refRegex, (match, text) => {
            footnoteCount++;
            footnotes.push({ id: footnoteCount, text });
            return `<sup class="text-red-500 font-bold ml-0.5 cursor-pointer" title="Ver nota al pie">[${footnoteCount}]</sup>`;
        });

        content = content.replace(/==([^=]+)==/g, '<mark class="bg-yellow-500/20 text-yellow-200 px-1 rounded border border-yellow-500/30">$1</mark>');

        const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const minutes = Math.ceil(words / 250);

        return { html: content, footnotes, readingTime: minutes };

    }, [section.content, glossary]);

    const markdownComponents = {
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
                    
                    <div className="flex items-center gap-2">
                        {/* 2. IMPORTANTE: Bloque de Controles 
                           Solo se muestra si canEdit es true
                        */}
                        {canEdit && !readingMode && (
                            <div className="flex bg-black/40 rounded-lg p-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/5">
                                <button onClick={() => !isFirst && onMoveUp(section.id)} disabled={isFirst} className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 disabled:opacity-30"><Icons.ChevronUp size={16}/></button>
                                <button onClick={() => !isLast && onMoveDown(section.id)} disabled={isLast} className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 disabled:opacity-30"><Icons.ChevronDown size={16}/></button>
                                <div className="w-px bg-white/10 mx-1"></div>
                                <button onClick={() => onEdit(section)} className="p-1.5 hover:bg-yellow-900/30 hover:text-yellow-500 rounded text-neutral-400 transition-colors"><Icons.Edit size={16}/></button>
                                <button onClick={() => onDelete(section.id)} className="p-1.5 hover:bg-red-900/30 hover:text-red-500 rounded text-neutral-400 transition-colors"><Icons.Trash size={16}/></button>
                            </div>
                        )}
                        
                        {/* Botón Lectura (Siempre visible) */}
                        <button 
                            onClick={() => setReadingMode(!readingMode)} 
                            className={`p-2 rounded-lg transition-colors ${readingMode ? 'text-red-400 bg-red-900/20' : 'text-neutral-500 hover:text-white'}`}
                            title="Modo Lectura"
                        >
                            {readingMode ? <Icons.Eye size={20}/> : <Icons.BookOpen size={20}/>}
                        </button>
                    </div>
                </div>

                {/* --- CONTENIDO --- */}
                {section.image_url && (
                    <div className="mb-8 w-full flex justify-center bg-black/20 rounded-lg p-2 border border-white/5">
                        <img src={section.image_url} alt={section.title} className="rounded shadow-2xl max-h-[500px] object-contain" />
                    </div>
                )}

                <div className="font-sans text-lg text-justify leading-relaxed text-neutral-300 selection:bg-red-900/60 selection:text-white">
                    <ReactMarkdown 
                        rehypePlugins={[rehypeRaw]} 
                        components={markdownComponents}
                    >
                        {processedData.html}
                    </ReactMarkdown>
                </div>

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

            {/* Popover Portal */}
            {createPortal(
                <div 
                    ref={popoverRef}
                    className={`obsidian-popover ${popover.visible ? 'visible' : ''}`}
                    style={{ 
                        left: popover.x, 
                        top: popover.y,
                        transform: popover.isPinned 
                            ? `translate(0, 0) scale(${popover.visible ? 1 : 0.95})` 
                            : `translate(-50%, ${popover.isTop ? '-100%' : '0'}) scale(${popover.visible ? 1 : 0.95})`
                    }}
                    onMouseEnter={handlePopoverEnter}
                    onMouseLeave={handleLeave}
                >
                    <div 
                        className="popover-header" 
                        onMouseDown={handleDragStart}
                    >
                        <span className="popover-title">
                            {popover.isPinned && <span className="text-xs text-neutral-500 mr-2">📌</span>}
                            {popover.term}
                        </span>
                        <button 
                            className="popover-close" 
                            onClick={(e) => { e.stopPropagation(); closePopover(); }}
                        >
                            <Icons.X size={14} />
                        </button>
                    </div>

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
                document.body
            )}
        </>
    );
};

export default ChronicleSection;