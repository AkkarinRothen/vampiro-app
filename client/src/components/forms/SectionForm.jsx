import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import Icons from '../ui/Icons';

// --- UTILIDADES ---

// Convertir archivo a Base64 con manejo de errores
const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

// Validar si una cadena es una URL válida (simple)
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// --- COMPONENTE PRINCIPAL ---

const SectionForm = ({ section, onSave, onCancel }) => {
    // Estado del formulario principal
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image_url: '',
        image_width: '100%',
        image_height: 'auto'
    });
    
    // Estados de Interfaz de Usuario (UI)
    const [showPreview, setShowPreview] = useState(false);
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0); // Nuevo: Contador de palabras
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Nuevo: Estado de carga al guardar
    
    // Estados del Selector de Color
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [currentColor, setCurrentColor] = useState('#ef4444'); // Rojo VTM por defecto
    const [favoriteColors, setFavoriteColors] = useState([]);

    // Referencias
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null); // Referencia al input de archivo para limpiarlo

    // --- EFECTOS ---

    // 1. Cargar datos iniciales si estamos editando
    useEffect(() => {
        if (section) {
            setFormData({
                title: section.title || '',
                content: section.content || '',
                image_url: section.image_url || '',
                image_width: section.image_width || '100%',
                image_height: section.image_height || 'auto'
            });
            updateCounts(section.content || '');
        }
        
        // Cargar colores favoritos
        const storedColors = localStorage.getItem('vtm_fav_colors');
        if (storedColors) {
            try {
                setFavoriteColors(JSON.parse(storedColors));
            } catch (e) {
                console.error("Error al cargar colores favoritos", e);
                setFavoriteColors(['#ef4444', '#b91c1c', '#f59e0b', '#a3a3a3', '#ffffff']);
            }
        } else {
            setFavoriteColors(['#ef4444', '#b91c1c', '#f59e0b', '#a3a3a3', '#ffffff']);
        }
    }, [section]);

    // --- MANEJADORES DE CAMBIO ---

    const updateCounts = (text) => {
        setCharCount(text.length);
        setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setFormData(prev => ({ ...prev, content: newContent }));
        updateCounts(newContent);
        if (error) setError(''); // Limpiar error al escribir
    };

    const handleTitleChange = (e) => {
        setFormData(prev => ({ ...prev, title: e.target.value }));
        if (error) setError('');
    };

    // --- MANEJO DE IMÁGENES ---

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validación de tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError("⚠️ La imagen es demasiado grande (Máx 5MB). Intenta comprimirla.");
            // Limpiar input
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        // Validación de tipo
        if (!file.type.startsWith('image/')) {
            setError("⚠️ El archivo seleccionado no es una imagen válida.");
            return;
        }

        try {
            const base64 = await convertToBase64(file);
            setFormData(prev => ({ ...prev, image_url: base64 }));
            setError('');
        } catch (err) {
            console.error(err);
            setError("Error al procesar la imagen. Intenta con otra.");
        }
    };

    const handleUrlChange = (e) => {
        setFormData(prev => ({ ...prev, image_url: e.target.value }));
    };

    // --- LÓGICA DE EDICIÓN DE TEXTO ---

    // Función central para insertar texto o envolver selección
    const insertText = (prefix, suffix = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        // Construir nuevo texto
        const newText = `${before}${prefix}${selection}${suffix}${after}`;
        
        setFormData(prev => ({ ...prev, content: newText }));
        updateCounts(newText);
        
        // Recuperar foco y posicionar cursor
        setTimeout(() => {
            textarea.focus();
            // Si había selección, el cursor va al final del bloque insertado
            // Si no, el cursor va en medio de las etiquetas
            const newCursorPos = selection.length === 0 
                ? start + prefix.length 
                : start + prefix.length + selection.length + suffix.length;
            
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Manejo de atajos de teclado
    const handleKeyDown = (e) => {
        // Permitir Tabulación (indentación)
        if (e.key === 'Tab') {
            e.preventDefault();
            insertText('    '); // 4 espacios
            return;
        }

        // Atajos con Ctrl (Windows) o Meta (Mac)
        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            
            switch(key) {
                case 'b': // Negrita
                    e.preventDefault();
                    insertText('**', '**');
                    break;
                case 'i': // Cursiva
                    e.preventDefault();
                    insertText('*', '*');
                    break;
                case 'u': // Subtítulo (H3)
                    e.preventDefault();
                    insertText('### ');
                    break;
                case 'h': // Resaltado (Highlight)
                    e.preventDefault();
                    insertText('==', '==');
                    break;
                case 'm': // Nota / Comentario
                    e.preventDefault();
                    insertText('^[', ']');
                    break;
                case 's': // Guardar rápido
                    e.preventDefault();
                    handleSubmit(e);
                    break;
                default: break;
            }
        }
    };

    // --- GESTIÓN DE COLORES ---

    const applyColor = (colorToApply) => {
        // Usamos span con estilos en línea para el color
        insertText(`<span style="color: ${colorToApply}">`, `</span>`);
        setShowColorPicker(false);
    };

    const addFavorite = () => {
        if (!favoriteColors.includes(currentColor)) {
            const newFavs = [...favoriteColors, currentColor];
            setFavoriteColors(newFavs);
            localStorage.setItem('vtm_fav_colors', JSON.stringify(newFavs));
        }
    };

    const removeFavorite = (colorToRemove, e) => {
        e.stopPropagation();
        const newFavs = favoriteColors.filter(c => c !== colorToRemove);
        setFavoriteColors(newFavs);
        localStorage.setItem('vtm_fav_colors', JSON.stringify(newFavs));
    };

    // --- PROCESAMIENTO DE MARKDOWN (VISUALIZACIÓN) ---

    const processCustomSyntax = (text) => {
        if (!text) return '';
        return text
            // Resaltado ==texto==
            .replace(/==([^=]+)==/g, '<mark class="bg-yellow-600/30 text-yellow-100 px-1 rounded shadow-sm border border-yellow-600/40">$1</mark>')
            // Notas Flotantes ^[texto]
            .replace(/\^\[([^\]]+)\]/g, (match, noteContent) => {
                return `
                    <span class="relative group cursor-help inline-block text-red-400 border-b border-dashed border-red-500/50 align-baseline mx-1">
                        <sup class="font-bold text-[10px] ml-0.5">?</sup>
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 border border-neutral-700 rounded shadow-2xl text-neutral-300 text-sm font-sans leading-tight opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 backdrop-blur-md">
                            ${noteContent}
                            <span class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-900"></span>
                        </span>
                    </span>
                `;
            });
    };

    // Componentes personalizados para ReactMarkdown
    const markdownComponents = {
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-neutral-300" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-3xl font-serif text-red-500 mt-6 mb-4 border-b border-red-900/30 pb-2" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-2xl font-serif text-red-400 mt-5 mb-3" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-xl font-serif text-red-400/80 mt-4 mb-2 italic" {...props} />,
        strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
        em: ({node, ...props}) => <em className="text-red-200" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-1 marker:text-red-600" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 marker:text-red-600" {...props} />,
        li: ({node, ...props}) => <li className="pl-1" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-red-900 pl-4 py-2 my-6 bg-red-900/10 italic text-neutral-400 rounded-r shadow-inner" {...props} />,
        hr: ({node, ...props}) => <hr className="border-red-900/30 my-8" {...props} />,
        a: ({node, ...props}) => <a className="text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors" {...props} target="_blank" rel="noopener noreferrer" />,
        // Permitir HTML seguro
        span: ({node, ...props}) => <span {...props} />,
        mark: ({node, ...props}) => <mark {...props} />,
        sup: ({node, ...props}) => <sup {...props} />
    };

    // --- GUARDADO ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validación básica
        if (!formData.title.trim()) {
            setError("❌ El título del capítulo es obligatorio.");
            return;
        }
        if (!formData.content.trim()) {
            setError("❌ El contenido no puede estar vacío.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Simulamos un pequeño delay para feedback visual
            // await new Promise(r => setTimeout(r, 300)); 
            await onSave(formData);
        } catch (err) {
            setError("Error al guardar. Intenta nuevamente.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER ---

    return (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 shadow-2xl animate-fade-in relative pb-20 md:pb-6 transition-all duration-300">
            
            {/* Header del Formulario */}
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                <h3 className="text-xl font-serif text-red-500 flex items-center gap-2 select-none">
                    {section ? <Icons.Edit /> : <Icons.Plus />}
                    {section ? 'Editar Capítulo' : 'Nuevo Capítulo'}
                </h3>
                
                {/* Toggle Vista Previa */}
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-full transition-all border ${
                        showPreview 
                        ? 'bg-red-900/20 text-red-400 border-red-900/50' 
                        : 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'
                    }`}
                >
                    <Icons.Eye />
                    {showPreview ? 'Volver a Editar' : 'Vista Previa'}
                </button>
            </div>

            {/* Mensajes de Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-950/40 border-l-4 border-red-600 text-red-200 rounded text-sm flex items-center gap-3 animate-pulse">
                    <span className="text-xl">⚠️</span>
                    {error}
                </div>
            )}

            {/* --- MODO VISTA PREVIA --- */}
            {showPreview ? (
                <div className="bg-black/50 p-8 rounded border border-neutral-800 min-h-[400px] shadow-inner">
                    <article className="prose prose-invert max-w-none">
                         <h2 className="text-3xl font-serif text-neutral-200 mb-6 flex items-start gap-3 border-b border-neutral-800 pb-4">
                            <span className="text-red-900 text-2xl mt-1 select-none">§</span> 
                            {formData.title || <span className="text-neutral-600 italic">Sin título...</span>}
                        </h2>
                        
                        {formData.image_url && (
                            <div className="mb-8 flex justify-center w-full">
                                <img 
                                    src={formData.image_url} 
                                    alt="Vista previa" 
                                    style={{ 
                                        width: formData.image_width, 
                                        height: formData.image_height, 
                                        maxWidth: '100%', 
                                        objectFit: 'contain' 
                                    }} 
                                    className="rounded border border-neutral-800 shadow-lg bg-black"
                                />
                            </div>
                        )}

                        <div className="font-sans text-lg text-justify selection:bg-red-900 selection:text-white leading-relaxed">
                            <ReactMarkdown 
                                rehypePlugins={[rehypeRaw]} 
                                components={markdownComponents}
                            >
                                {processCustomSyntax(formData.content || '*La página está en blanco...*')}
                            </ReactMarkdown>
                        </div>
                    </article>
                </div>
            ) : (
                /* --- MODO EDICIÓN --- */
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Input Título */}
                    <div>
                        <label className="text-xs text-neutral-500 uppercase font-bold mb-2 block tracking-wider">
                            Título del Capítulo <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            placeholder="Ej: El despertar de la Bestia..." 
                            className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded text-neutral-200 focus:border-red-900 focus:ring-1 focus:ring-red-900 outline-none text-lg font-serif placeholder-neutral-700 transition-all"
                            value={formData.title}
                            onChange={handleTitleChange}
                            required
                            autoFocus
                        />
                    </div>
                    
                    {/* Área de Texto y Toolbar */}
                    <div className="border border-neutral-800 rounded bg-neutral-950 relative group focus-within:border-neutral-700 transition-colors">
                        
                        {/* --- TOOLBAR DESKTOP --- */}
                        <div className="hidden md:flex flex-wrap gap-1 bg-neutral-900 p-2 border-b border-neutral-800 rounded-t items-center relative z-20">
                            {/* Formato Básico */}
                            <button type="button" onClick={() => insertText('**', '**')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-bold transition-colors" title="Negrita (Ctrl+B)">B</button>
                            <button type="button" onClick={() => insertText('*', '*')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white italic transition-colors" title="Cursiva (Ctrl+I)">I</button>
                            
                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
                            
                            {/* Herramientas Obsidian */}
                            <button type="button" onClick={() => insertText('==', '==')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-yellow-400 transition-colors" title="Resaltar (Ctrl+H)"><Icons.Highlighter /></button>
                            <button type="button" onClick={() => insertText('^[', ']')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400 transition-colors" title="Nota Flotante (Ctrl+M)"><Icons.StickyNote /></button>

                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
                            
                            {/* Selector de Color Desktop */}
                            <div className="relative">
                                <button 
                                    type="button" 
                                    onClick={() => setShowColorPicker(!showColorPicker)} 
                                    className={`p-2 rounded flex items-center gap-2 border border-transparent transition-all ${
                                        showColorPicker ? 'bg-neutral-800 border-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800'
                                    }`}
                                    title="Color de Texto"
                                >
                                    <Icons.Palette /> 
                                    <div className="w-3 h-3 rounded-full border border-neutral-500 shadow-sm" style={{ backgroundColor: currentColor }}></div>
                                </button>

                                {/* Popover Flotante */}
                                {showColorPicker && (
                                    <div className="absolute top-full left-0 mt-2 p-4 bg-neutral-900 border border-neutral-700 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] w-64 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Paleta</span>
                                            <button onClick={() => setShowColorPicker(false)} className="text-neutral-500 hover:text-white transition-colors"><Icons.X /></button>
                                        </div>
                                        
                                        <div className="flex gap-2 mb-4">
                                            <input 
                                                type="color" 
                                                value={currentColor} 
                                                onChange={(e) => setCurrentColor(e.target.value)} 
                                                className="h-8 w-10 bg-transparent border-0 cursor-pointer rounded overflow-hidden p-0" 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => applyColor(currentColor)} 
                                                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded border border-neutral-700 transition-colors"
                                            >
                                                Aplicar
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={addFavorite} 
                                                className="px-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-xs rounded transition-colors" 
                                                title="Guardar favorito"
                                            >
                                                ★
                                            </button>
                                        </div>

                                        {/* Grid de Favoritos */}
                                        {favoriteColors.length > 0 && (
                                            <div>
                                                <div className="h-px bg-neutral-800 mb-3"></div>
                                                <div className="flex flex-wrap gap-2">
                                                    {favoriteColors.map((color, idx) => (
                                                        <div key={idx} className="group relative">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => { setCurrentColor(color); applyColor(color); }} 
                                                                className="w-6 h-6 rounded-full border border-neutral-700 hover:border-white hover:scale-110 transition-all shadow-sm" 
                                                                style={{ backgroundColor: color }} 
                                                                title={color}
                                                            />
                                                            <button 
                                                                type="button" 
                                                                onClick={(e) => removeFavorite(color, e)} 
                                                                className="absolute -top-1 -right-1 bg-neutral-900 text-neutral-500 hover:text-red-500 rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-700" 
                                                                style={{ fontSize: '8px' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
                            
                            {/* Estilos de Párrafo */}
                            <button type="button" onClick={() => insertText('### ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-serif font-bold" title="Título H3 (Ctrl+U)">H3</button>
                            <button type="button" onClick={() => insertText('> ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white" title="Cita"><Icons.Quote /></button>
                            <button type="button" onClick={() => insertText('- ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white" title="Lista"><Icons.List /></button>
                            <button type="button" onClick={() => insertText('\n---\n')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white text-xs font-mono" title="Separador">HR</button>
                            
                            <div className="flex-1"></div>
                            
                            {/* Contadores */}
                            <div className="flex gap-3 text-[10px] text-neutral-600 font-mono px-2 select-none">
                                <span>{wordCount} palabras</span>
                                <span>{charCount} carac.</span>
                            </div>
                        </div>
                        
                        {/* Overlay para cerrar popups si clic afuera */}
                        {showColorPicker && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)}></div>
                        )}

                        {/* TEXTAREA PRINCIPAL */}
                        <textarea 
                            ref={textareaRef}
                            placeholder="Escribe aquí los sucesos de la noche... Usa Markdown o los botones." 
                            className="w-full bg-neutral-950 p-6 rounded-b min-h-[400px] text-neutral-300 outline-none font-mono text-sm leading-relaxed resize-y placeholder-neutral-700"
                            value={formData.content}
                            onChange={handleContentChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                            required
                        />
                    </div>

                    {/* --- TOOLBAR MÓVIL (Sticky Bottom) --- */}
                    {isFocused && (
                        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-red-900/30 p-2 flex justify-around items-center z-50 animate-slide-up shadow-[0_-5px_20px_rgba(0,0,0,0.8)] backdrop-blur-lg">
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('**', '**'); }} className="p-3 text-neutral-300 active:text-white font-bold text-lg">B</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('*', '*'); }} className="p-3 text-neutral-300 active:text-white italic serif text-lg">I</button>
                            <div className="w-px h-6 bg-neutral-700"></div>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('==', '=='); }} className="p-3 text-yellow-500/80 active:text-yellow-400"><Icons.Highlighter /></button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('^[', ']'); }} className="p-3 text-blue-400/80 active:text-blue-300"><Icons.StickyNote /></button>
                            <div className="w-px h-6 bg-neutral-700"></div>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); applyColor('#ef4444'); }} className="p-3 text-red-500 font-bold text-lg flex items-center justify-center">
                                A<span className="text-[8px] align-top">color</span>
                            </button>
                        </div>
                    )}

                    {/* Gestión de Imagen */}
                    <div className="bg-neutral-950 p-5 rounded border border-neutral-800 transition-colors hover:border-neutral-700">
                        <label className="text-xs text-neutral-500 uppercase font-bold mb-4 flex items-center gap-2">
                            <Icons.Image /> Imagen del Capítulo (Opcional)
                        </label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {/* Input Archivo */}
                                <div>
                                    <label className="block text-[10px] text-neutral-600 mb-1 uppercase">Subir archivo</label>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-neutral-800 file:text-red-500 hover:file:bg-neutral-700 cursor-pointer border border-neutral-800 rounded"
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                    />
                                </div>
                                
                                {/* Separador */}
                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-neutral-800 flex-1"></div>
                                    <span className="text-[10px] text-neutral-600 uppercase">o enlace externo</span>
                                    <div className="h-px bg-neutral-800 flex-1"></div>
                                </div>
                                
                                {/* Input URL */}
                                <input 
                                    type="url" 
                                    placeholder="https://ejemplo.com/imagen.jpg" 
                                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-sm text-neutral-300 focus:border-red-900 outline-none transition-colors"
                                    value={formData.image_url}
                                    onChange={handleUrlChange}
                                />

                                {/* Controles de Tamaño */}
                                {formData.image_url && (
                                    <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4 animate-fade-in">
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 mb-1">ANCHO</label>
                                            <input type="text" className="w-full bg-black border border-neutral-800 p-2 rounded text-xs text-neutral-300" placeholder="Ej: 100%, 500px" value={formData.image_width} onChange={e => setFormData(prev => ({...prev, image_width: e.target.value}))} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 mb-1">ALTO</label>
                                            <input type="text" className="w-full bg-black border border-neutral-800 p-2 rounded text-xs text-neutral-300" placeholder="Ej: auto, 300px" value={formData.image_height} onChange={e => setFormData(prev => ({...prev, image_height: e.target.value}))} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preview Imagen Pequeña */}
                            <div className="flex flex-col items-center justify-center bg-black rounded border border-neutral-800 min-h-[200px] overflow-hidden relative">
                                {formData.image_url ? (
                                    <>
                                        <img 
                                            src={formData.image_url} 
                                            alt="Preview thumbnail" 
                                            style={{ width: 'auto', height: '100%', maxHeight: '180px', objectFit: 'contain' }} 
                                            className="opacity-90"
                                            onError={(e) => { e.target.style.display='none'; }}
                                        />
                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-[10px] text-neutral-400 rounded">
                                            Vista previa
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-neutral-700 text-xs italic flex flex-col items-center gap-2 select-none">
                                        <Icons.Image /> Sin imagen seleccionada
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
                        <button 
                            type="button" 
                            onClick={onCancel} 
                            disabled={isSubmitting}
                            className="px-6 py-2 text-neutral-500 hover:text-white transition-colors text-sm font-medium hover:bg-neutral-800 rounded disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`px-8 py-2 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 text-sm font-bold tracking-wide ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    Guardando...
                                </>
                            ) : (
                                <>{section ? 'Guardar Cambios' : 'Publicar Capítulo'}</>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SectionForm;