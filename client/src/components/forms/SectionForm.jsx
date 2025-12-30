import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'dompurify';

// Iconos simplificados inline
const Icons = {
    Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    Highlighter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3v18M3 12h18" /></svg>,
    StickyNote: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
    Palette: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    Quote: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>,
    List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Image: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Info: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>,
    Warning: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
    BookOpen: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    Key: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
    Lightbulb: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
    ChevronRight: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
};

// --- UTILIDADES ---
const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

const SectionForm = ({ section, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image_url: '',
        image_width: '100%',
        image_height: 'auto'
    });
    
    const [showPreview, setShowPreview] = useState(false);
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [error, setError] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [currentColor, setCurrentColor] = useState('#ef4444');
    const [favoriteColors, setFavoriteColors] = useState(['#ef4444', '#b91c1c', '#f59e0b', '#a3a3a3', '#ffffff']);
    const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Configuración de DOMPurify
    const purifyConfig = useMemo(() => ({
        ALLOWED_TAGS: [
            'span', 'mark', 'sup', 'sub', 'strong', 'em', 'br', 
            'details', 'summary', 'img', 'div', 'p', 'ul', 'ol', 'li'
        ],
        ALLOWED_ATTR: [
            'class', 'id', 'title', 'alt', 'src', 'style', 'loading'
        ],
        ALLOW_DATA_ATTR: true,
        KEEP_CONTENT: true
    }), []);

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
    }, [section]);

    const updateCounts = (text) => {
        setCharCount(text.length);
        setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
    };

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setFormData(prev => ({ ...prev, content: newContent }));
        updateCounts(newContent);
        if (error) setError('');
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("⚠️ La imagen es demasiado grande (Máx 5MB).");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError("⚠️ El archivo no es una imagen válida.");
            return;
        }

        try {
            const base64 = await convertToBase64(file);
            setFormData(prev => ({ ...prev, image_url: base64 }));
            setError('');
        } catch (err) {
            setError("Error al procesar la imagen.");
        }
    };

    const insertText = (prefix, suffix = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = `${before}${prefix}${selection}${suffix}${after}`;
        
        setFormData(prev => ({ ...prev, content: newText }));
        updateCounts(newText);
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = selection.length === 0 
                ? start + prefix.length 
                : start + prefix.length + selection.length + suffix.length;
            
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            insertText('    ');
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            
            switch(key) {
                case 'b':
                    e.preventDefault();
                    insertText('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insertText('*', '*');
                    break;
                case 'h':
                    e.preventDefault();
                    insertText('==', '==');
                    break;
                case 'm':
                    e.preventDefault();
                    insertText('^[', ']');
                    break;
                case 's':
                    e.preventDefault();
                    handleSubmit(e);
                    break;
            }
        }
    };

    const applyColor = (colorToApply) => {
        insertText(`<span style="color: ${colorToApply}">`, `</span>`);
        setShowColorPicker(false);
    };

    // Procesamiento de sintaxis personalizada para preview
    const processCustomSyntax = (text) => {
        if (!text) return '';
        
        let processed = text;

        // Resaltados con colores
        const highlights = {
            '!': { bg: 'bg-red-600/30', text: 'text-red-100', border: 'border-red-600/40' },
            '+': { bg: 'bg-green-600/30', text: 'text-green-100', border: 'border-green-600/40' },
            '*': { bg: 'bg-blue-600/30', text: 'text-blue-100', border: 'border-blue-600/40' },
            '?': { bg: 'bg-yellow-600/30', text: 'text-yellow-100', border: 'border-yellow-600/40' }
        };

        // Resaltado por defecto
        processed = processed.replace(
            /==([^=]+)==/g,
            '<mark class="bg-yellow-600/30 text-yellow-100 px-1.5 py-0.5 rounded shadow-sm border border-yellow-600/40">$1</mark>'
        );

        // Resaltados con símbolos
        Object.entries(highlights).forEach(([symbol, classes]) => {
            const regex = new RegExp(`==\\${symbol}([^=]+)==`, 'g');
            processed = processed.replace(
                regex,
                `<mark class="${classes.bg} ${classes.text} px-1.5 py-0.5 rounded shadow-sm border ${classes.border}"">$1</mark>`
            );
        });

        // Notas expandibles
        processed = processed.replace(
            /\^expand\[([^|]+)\|([^\]]+)\]/g,
            (match, title, content) => {
                const safeTitle = DOMPurify.sanitize(title, { ALLOWED_TAGS: ['strong', 'em'], KEEP_CONTENT: true });
                const safeContent = DOMPurify.sanitize(content, purifyConfig);
                return `
                    <details class="my-4 p-4 bg-neutral-900/60 border-l-4 border-red-900 rounded-r cursor-pointer">
                        <summary class="font-semibold text-red-400 cursor-pointer">${safeTitle}</summary>
                        <div class="mt-3 pl-6 text-neutral-300 text-sm">${safeContent}</div>
                    </details>
                `;
            }
        );

        // Notas al margen
        processed = processed.replace(/\^side\[([^\]]+)\]/g, (match, content) => {
            const safeContent = DOMPurify.sanitize(content, purifyConfig);
            return `
                <span class="relative inline-block">
                    <sup class="text-red-500 cursor-help ml-1 font-bold">[※]</sup>
                    <span class="hidden lg:inline-block lg:absolute lg:left-full lg:ml-12 lg:w-64 lg:top-0 p-3 bg-neutral-900/95 border-l-4 border-red-900 rounded-r text-xs text-neutral-300">${safeContent}</span>
                </span>
            `;
        });

        // Sistema de notas tipadas
        const noteTypes = {
            info: { icon: 'ℹ', color: 'text-blue-400', border: 'border-blue-500/50' },
            warning: { icon: '⚠', color: 'text-yellow-400', border: 'border-yellow-500/50' },
            lore: { icon: '📖', color: 'text-purple-400', border: 'border-purple-500/50' },
            secret: { icon: '👁', color: 'text-red-400', border: 'border-red-500/50' },
            tip: { icon: '💡', color: 'text-green-400', border: 'border-green-500/50' }
        };

        Object.entries(noteTypes).forEach(([type, config]) => {
            const regex = new RegExp(`\\^${type}\\[([^\\]]+)\\]`, 'g');
            processed = processed.replace(regex, (match, content) => {
                const safeContent = DOMPurify.sanitize(content, purifyConfig);
                return `
                    <span class="tooltip-wrapper relative group/tooltip inline-block ${config.color} cursor-help mx-1" data-note-type="${type}">
                        <span class="tooltip-trigger border-b-2 ${config.border} border-dotted hover:border-solid transition-all duration-200 hover:scale-105 inline-block">${config.icon}</span>
                        <span class="tooltip-content absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 max-w-[calc(100vw-2rem)] p-4 bg-neutral-900/98 border border-neutral-700 rounded-lg shadow-2xl text-neutral-300 text-sm leading-relaxed opacity-0 scale-95 pointer-events-none z-[9999] backdrop-blur-md max-h-96 overflow-y-auto group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:pointer-events-auto transition-all duration-300 ease-out">
                            <div class="relative z-10">${safeContent}</div>
                            <span class="tooltip-arrow absolute left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-neutral-900 top-full drop-shadow-lg"></span>
                        </span>
                    </span>
                `;
            });
        });

        // Notas por defecto
        processed = processed.replace(
            /\^\[([^\]]+)\]/g,
            (match, content) => {
                const safeContent = DOMPurify.sanitize(content, purifyConfig);
                return `
                    <span class="tooltip-wrapper relative group/tooltip inline-block text-red-400 cursor-help mx-1" data-note-type="default">
                        <span class="tooltip-trigger border-b-2 border-red-500/50 border-dotted hover:border-solid transition-all duration-200 hover:scale-105 inline-block">?</span>
                        <span class="tooltip-content absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 max-w-[calc(100vw-2rem)] p-4 bg-neutral-900/98 border border-neutral-700 rounded-lg shadow-2xl text-neutral-300 text-sm leading-relaxed opacity-0 scale-95 pointer-events-none z-[9999] backdrop-blur-md max-h-96 overflow-y-auto group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:pointer-events-auto transition-all duration-300 ease-out">
                            <div class="relative z-10">${safeContent}</div>
                            <span class="tooltip-arrow absolute left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-neutral-900 top-full drop-shadow-lg"></span>
                        </span>
                    </span>
                `;
            }
        );

        return processed;
    };

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
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-red-900 pl-4 py-2 my-6 bg-red-900/10 italic text-neutral-400 rounded-r" {...props} />,
        hr: ({node, ...props}) => <hr className="border-red-900/30 my-8" {...props} />,
        a: ({node, ...props}) => <a className="text-red-400 hover:text-red-300 underline" {...props} target="_blank" rel="noopener noreferrer" />,
        span: ({node, ...props}) => <span {...props} />,
        mark: ({node, ...props}) => <mark {...props} />,
        sup: ({node, ...props}) => <sup {...props} />,
        details: ({node, ...props}) => <details {...props} />,
        summary: ({node, ...props}) => <summary {...props} />
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            setError("⌛ El título es obligatorio.");
            return;
        }
        if (!formData.content.trim()) {
            setError("⌛ El contenido no puede estar vacío.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(formData);
        } catch (err) {
            setError("Error al guardar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Referencia rápida de sintaxis
    const syntaxReference = [
        { 
            category: "Formato Básico",
            items: [
                { syntax: "**texto**", desc: "Negrita", shortcut: "Ctrl+B" },
                { syntax: "*texto*", desc: "Cursiva", shortcut: "Ctrl+I" },
                { syntax: "### Título", desc: "Subtítulo H3", shortcut: "Ctrl+U" }
            ]
        },
        {
            category: "Resaltados",
            items: [
                { syntax: "==texto==", desc: "Resaltado amarillo", shortcut: "Ctrl+H" },
                { syntax: "==!texto==", desc: "Resaltado rojo (importante)" },
                { syntax: "==+texto==", desc: "Resaltado verde (positivo)" },
                { syntax: "==*texto==", desc: "Resaltado azul (info)" },
                { syntax: "==?texto==", desc: "Resaltado amarillo (precaución)" }
            ]
        },
        {
            category: "Notas Flotantes",
            items: [
                { syntax: "^[texto]", desc: "Nota por defecto", shortcut: "Ctrl+M" },
                { syntax: "^info[texto]", desc: "Nota informativa (ℹ)" },
                { syntax: "^warning[texto]", desc: "Nota de advertencia (⚠)" },
                { syntax: "^lore[texto]", desc: "Nota de lore (📖)" },
                { syntax: "^secret[texto]", desc: "Nota secreta (👁)" },
                { syntax: "^tip[texto]", desc: "Consejo (💡)" }
            ]
        },
        {
            category: "Notas Avanzadas",
            items: [
                { syntax: "^side[texto]", desc: "Nota al margen lateral" },
                { syntax: "^expand[Título|Contenido]", desc: "Nota expandible/acordeón" },
                { syntax: "^ref[texto]", desc: "Referencia numerada al pie" }
            ]
        }
    ];

    return (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 shadow-2xl relative pb-20 md:pb-6">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                <h3 className="text-xl font-serif text-red-500 flex items-center gap-2">
                    {section ? <Icons.Edit /> : <Icons.Plus />}
                    {section ? 'Editar Capítulo' : 'Nuevo Capítulo'}
                </h3>
                
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowSyntaxHelp(!showSyntaxHelp)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-all ${
                            showSyntaxHelp 
                            ? 'bg-blue-900/20 text-blue-400 border border-blue-900/50' 
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                        title="Ayuda de sintaxis"
                    >
                        <Icons.Info />
                    </button>
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
                        {showPreview ? 'Editar' : 'Preview'}
                    </button>
                </div>
            </div>

            {/* Panel de ayuda de sintaxis */}
            {showSyntaxHelp && (
                <div className="mb-6 bg-neutral-950 border border-blue-900/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
                        <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <Icons.BookOpen />
                            Referencia Rápida de Sintaxis
                        </h4>
                        <button onClick={() => setShowSyntaxHelp(false)} className="text-neutral-500 hover:text-white">
                            <Icons.X />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {syntaxReference.map((category, idx) => (
                            <div key={idx} className="space-y-2">
                                <h5 className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-2">
                                    {category.category}
                                </h5>
                                {category.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 text-neutral-400 hover:text-neutral-200 transition-colors">
                                        <code className="text-red-400 bg-black px-2 py-0.5 rounded font-mono text-[11px] flex-shrink-0">
                                            {item.syntax}
                                        </code>
                                        <div className="flex-1">
                                            <span className="block">{item.desc}</span>
                                            {item.shortcut && (
                                                <span className="text-[10px] text-neutral-600 flex items-center gap-1 mt-0.5">
                                                    <Icons.Key /> {item.shortcut}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-950/40 border-l-4 border-red-600 text-red-200 rounded text-sm flex items-center gap-3">
                    <Icons.Warning />
                    {error}
                </div>
            )}

            {/* Vista Previa */}
            {showPreview ? (
                <div className="bg-black/50 p-8 rounded border border-neutral-800 min-h-[400px]">
                    <article className="prose prose-invert max-w-none">
                        <h2 className="text-3xl font-serif text-neutral-200 mb-6 flex items-start gap-3 border-b border-neutral-800 pb-4">
                            <span className="text-red-900 text-2xl mt-1">§</span> 
                            {formData.title || <span className="text-neutral-600 italic">Sin título...</span>}
                        </h2>
                        
                        {formData.image_url && (
                            <div className="mb-8 flex justify-center">
                                <img 
                                    src={formData.image_url} 
                                    alt="Vista previa" 
                                    style={{ 
                                        width: formData.image_width, 
                                        height: formData.image_height, 
                                        maxWidth: '100%', 
                                        objectFit: 'contain' 
                                    }} 
                                    className="rounded border border-neutral-800 shadow-lg"
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
                /* Modo Edición */
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Título */}
                    <div>
                        <label className="text-xs text-neutral-500 uppercase font-bold mb-2 block tracking-wider">
                            Título del Capítulo <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            placeholder="Ej: El despertar de la Bestia..." 
                            className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded text-neutral-200 focus:border-red-900 focus:ring-1 focus:ring-red-900 outline-none text-lg font-serif placeholder-neutral-700 transition-all"
                            value={formData.title}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, title: e.target.value }));
                                if (error) setError('');
                            }}
                            required
                            autoFocus
                        />
                    </div>
                    
                    {/* Editor de Texto */}
                    <div className="border border-neutral-800 rounded bg-neutral-950 focus-within:border-neutral-700 transition-colors">
                        
                        {/* Toolbar Desktop */}
                        <div className="hidden md:flex flex-wrap gap-1 bg-neutral-900 p-2 border-b border-neutral-800 rounded-t items-center relative z-20">
                            {/* Formato */}
                            <button type="button" onClick={() => insertText('**', '**')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-bold transition-colors" title="Negrita (Ctrl+B)">B</button>
                            <button type="button" onClick={() => insertText('*', '*')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white italic transition-colors" title="Cursiva (Ctrl+I)">I</button>
                            
                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
                            
                            {/* Herramientas */}
                            <button type="button" onClick={() => insertText('==', '==')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-yellow-400 transition-colors" title="Resaltar (Ctrl+H)"><Icons.Highlighter /></button>
                            <button type="button" onClick={() => insertText('^[', ']')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400 transition-colors" title="Nota (Ctrl+M)"><Icons.StickyNote /></button>

                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>

                            {/* Notas Especiales */}
                            <div className="flex gap-1 bg-neutral-950 rounded px-1">
                                <button type="button" onClick={() => insertText('^info[', ']')} className="p-2 hover:bg-neutral-800 rounded text-blue-400 hover:text-blue-300 transition-colors text-sm" title="Nota Info">ℹ</button>
                                <button type="button" onClick={() => insertText('^warning[', ']')} className="p-2 hover:bg-neutral-800 rounded text-yellow-400 hover:text-yellow-300 transition-colors text-sm" title="Advertencia">⚠</button>
                                <button type="button" onClick={() => insertText('^lore[', ']')} className="p-2 hover:bg-neutral-800 rounded text-purple-400 hover:text-purple-300 transition-colors text-sm" title="Lore">📖</button>
                                <button type="button" onClick={() => insertText('^secret[', ']')} className="p-2 hover:bg-neutral-800 rounded text-red-400 hover:text-red-300 transition-colors text-sm" title="Secreto">👁</button>
                                <button type="button" onClick={() => insertText('^tip[', ']')} className="p-2 hover:bg-neutral-800 rounded text-green-400 hover:text-green-300 transition-colors text-sm" title="Consejo">💡</button>
                            </div>

                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>

                            {/* Notas Avanzadas */}
                            <button type="button" onClick={() => insertText('^side[', ']')} className="px-3 py-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors text-xs" title="Nota al margen">Margen</button>
                            <button type="button" onClick={() => insertText('^expand[Título|', ']')} className="px-3 py-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors text-xs" title="Nota expandible">Expandir</button>
                            
                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
                            
                            {/* Color */}
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
                                    <div className="w-3 h-3 rounded-full border border-neutral-500" style={{ backgroundColor: currentColor }}></div>
                                </button>

                                {showColorPicker && (
                                    <div className="absolute top-full left-0 mt-2 p-4 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl w-64 z-50">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Paleta</span>
                                            <button type="button" onClick={() => setShowColorPicker(false)} className="text-neutral-500 hover:text-white transition-colors"><Icons.X /></button>
                                        </div>
                                        
                                        <div className="flex gap-2 mb-4">
                                            <input 
                                                type="color" 
                                                value={currentColor} 
                                                onChange={(e) => setCurrentColor(e.target.value)} 
                                                className="h-8 w-10 bg-transparent border-0 cursor-pointer rounded" 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => applyColor(currentColor)} 
                                                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded border border-neutral-700 transition-colors"
                                            >
                                                Aplicar
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {favoriteColors.map((color, idx) => (
                                                <button 
                                                    key={idx}
                                                    type="button" 
                                                    onClick={() => { setCurrentColor(color); applyColor(color); }} 
                                                    className="w-6 h-6 rounded-full border border-neutral-700 hover:border-white hover:scale-110 transition-all" 
                                                    style={{ backgroundColor: color }} 
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
                            
                            {/* Formato Párrafo */}
                            <button type="button" onClick={() => insertText('### ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-serif font-bold" title="H3">H3</button>
                            <button type="button" onClick={() => insertText('> ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white" title="Cita"><Icons.Quote /></button>
                            <button type="button" onClick={() => insertText('- ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white" title="Lista"><Icons.List /></button>
                            <button type="button" onClick={() => insertText('\n---\n')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white text-xs" title="Separador">HR</button>
                            
                            <div className="flex-1"></div>
                            
                            {/* Contadores */}
                            <div className="flex gap-3 text-[10px] text-neutral-600 font-mono px-2">
                                <span>{wordCount} palabras</span>
                                <span>{charCount} carac.</span>
                            </div>
                        </div>
                        
                        {showColorPicker && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)}></div>
                        )}

                        {/* Textarea */}
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

                    {/* Toolbar Móvil */}
                    {isFocused && (
                        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-red-900/30 p-2 flex justify-around items-center z-50 backdrop-blur-lg shadow-2xl">
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('**', '**'); }} className="p-3 text-neutral-300 active:text-white font-bold">B</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('*', '*'); }} className="p-3 text-neutral-300 active:text-white italic">I</button>
                            <div className="w-px h-6 bg-neutral-700"></div>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('==', '=='); }} className="p-3 text-yellow-500"><Icons.Highlighter /></button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('^[', ']'); }} className="p-3 text-blue-400"><Icons.StickyNote /></button>
                            <div className="w-px h-6 bg-neutral-700"></div>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('^info[', ']'); }} className="p-3 text-blue-400 text-lg">ℹ</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); insertText('^tip[', ']'); }} className="p-3 text-green-400 text-lg">💡</button>
                        </div>
                    )}

                    {/* Gestión de Imagen */}
                    <div className="bg-neutral-950 p-5 rounded border border-neutral-800">
                        <label className="text-xs text-neutral-500 uppercase font-bold mb-4 flex items-center gap-2">
                            <Icons.Image /> Imagen del Capítulo (Opcional)
                        </label>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
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
                                
                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-neutral-800 flex-1"></div>
                                    <span className="text-[10px] text-neutral-600 uppercase">o enlace</span>
                                    <div className="h-px bg-neutral-800 flex-1"></div>
                                </div>
                                
                                <input 
                                    type="url" 
                                    placeholder="https://ejemplo.com/imagen.jpg" 
                                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded text-sm text-neutral-300 focus:border-red-900 outline-none"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                />

                                {formData.image_url && (
                                    <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 mb-1">ANCHO</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-black border border-neutral-800 p-2 rounded text-xs text-neutral-300" 
                                                placeholder="100%, 500px" 
                                                value={formData.image_width} 
                                                onChange={e => setFormData(prev => ({...prev, image_width: e.target.value}))} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 mb-1">ALTO</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-black border border-neutral-800 p-2 rounded text-xs text-neutral-300" 
                                                placeholder="auto, 300px" 
                                                value={formData.image_height} 
                                                onChange={e => setFormData(prev => ({...prev, image_height: e.target.value}))} 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-center bg-black rounded border border-neutral-800 min-h-[200px] overflow-hidden">
                                {formData.image_url ? (
                                    <img 
                                        src={formData.image_url} 
                                        alt="Preview" 
                                        style={{ width: 'auto', height: '100%', maxHeight: '180px', objectFit: 'contain' }} 
                                        className="opacity-90"
                                    />
                                ) : (
                                    <span className="text-neutral-700 text-xs italic flex flex-col items-center gap-2">
                                        <Icons.Image /> Sin imagen
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
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
                            className={`px-8 py-2 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg flex items-center gap-2 text-sm font-bold ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
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

            {/* Estilos para tooltips mejorados */}
            <style jsx>{`
                /* ===== SISTEMA DE TOOLTIPS MEJORADO ===== */
                
                .tooltip-wrapper::before {
                    content: '';
                    position: absolute;
                    inset: -8px;
                    z-index: 1;
                }

                .tooltip-content:hover {
                    opacity: 1 !important;
                    scale: 1 !important;
                    pointer-events: auto !important;
                }

                .tooltip-wrapper {
                    position: relative;
                    z-index: 1;
                }

                .tooltip-wrapper:hover {
                    z-index: 10000;
                }

                .tooltip-content {
                    transition: opacity 0.3s ease-out 0.1s, 
                                transform 0.3s ease-out 0.1s;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(220, 38, 38, 0.6) rgba(38, 38, 38, 0.3);
                    scroll-behavior: smooth;
                    box-shadow: 
                        0 10px 40px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
                }

                .tooltip-wrapper:hover .tooltip-content {
                    transition-delay: 0s;
                }

                .tooltip-content::-webkit-scrollbar {
                    width: 8px;
                }

                .tooltip-content::-webkit-scrollbar-track {
                    background: rgba(38, 38, 38, 0.3);
                    border-radius: 4px;
                    margin: 4px 0;
                }

                .tooltip-content::-webkit-scrollbar-thumb {
                    background: rgba(220, 38, 38, 0.6);
                    border-radius: 4px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }

                .tooltip-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(220, 38, 38, 0.8);
                }

                .tooltip-trigger {
                    text-shadow: 0 0 0 transparent;
                    transition: all 0.2s ease;
                    user-select: none;
                    position: relative;
                }

                .tooltip-wrapper:hover .tooltip-trigger {
                    text-shadow: 0 0 8px currentColor;
                }

                .tooltip-trigger::after {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 3px;
                    opacity: 0;
                    background: currentColor;
                    z-index: -1;
                    transition: opacity 0.2s;
                }

                .tooltip-wrapper:hover .tooltip-trigger::after {
                    opacity: 0.1;
                }

                @keyframes tooltip-slide-in {
                    from {
                        opacity: 0;
                        transform: translate(-50%, 4px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                }

                .tooltip-wrapper:hover .tooltip-content {
                    animation: tooltip-slide-in 0.3s ease-out forwards;
                }

                .tooltip-arrow {
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                }

                .tooltip-content strong {
                    color: rgb(255 255 255);
                    font-weight: 600;
                }

                .tooltip-content em {
                    color: rgb(252 165 165);
                }

                .tooltip-content {
                    user-select: text;
                }

                @keyframes pulse-border {
                    0%, 100% {
                        border-opacity: 1;
                    }
                    50% {
                        border-opacity: 0.5;
                    }
                }

                .tooltip-wrapper:hover .tooltip-trigger {
                    animation: pulse-border 2s ease-in-out infinite;
                }

                .tooltip-wrapper[data-note-type="info"]:hover .tooltip-trigger {
                    border-color: rgb(96 165 250);
                }

                .tooltip-wrapper[data-note-type="warning"]:hover .tooltip-trigger {
                    border-color: rgb(250 204 21);
                }

                .tooltip-wrapper[data-note-type="lore"]:hover .tooltip-trigger {
                    border-color: rgb(192 132 252);
                }

                .tooltip-wrapper[data-note-type="secret"]:hover .tooltip-trigger {
                    border-color: rgb(248 113 113);
                }

                .tooltip-wrapper[data-note-type="tip"]:hover .tooltip-trigger {
                    border-color: rgb(134 239 172);
                }

                @media (max-width: 768px) {
                    .tooltip-content {
                        left: 50% !important;
                        right: auto !important;
                        transform: translateX(-50%);
                        width: calc(100vw - 3rem) !important;
                        max-width: 28rem;
                    }
                    
                    .tooltip-wrapper::before {
                        inset: -12px;
                    }
                }
            `}</style>
        </div>
    );
};

export default SectionForm;