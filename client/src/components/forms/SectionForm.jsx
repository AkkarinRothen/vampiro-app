import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw'; // IMPORTANTE: Importamos el plugin para leer HTML/Colores
import Icons from '../ui/Icons';

// Función auxiliar para convertir imágenes
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
    
    // Estados de UI
    const [showPreview, setShowPreview] = useState(false);
    const [charCount, setCharCount] = useState(0);
    const [error, setError] = useState('');
    
    // --- ESTADOS DE COLOR ---
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [currentColor, setCurrentColor] = useState('#ef4444'); // Rojo vampiro por defecto
    const [favoriteColors, setFavoriteColors] = useState([]);

    const textareaRef = useRef(null);

    // Cargar datos y favoritos al inicio
    useEffect(() => {
        if (section) {
            setFormData({
                title: section.title || '',
                content: section.content || '',
                image_url: section.image_url || '',
                image_width: section.image_width || '100%',
                image_height: section.image_height || 'auto'
            });
            setCharCount(section.content?.length || 0);
        }
        
        // Cargar colores favoritos de LocalStorage
        const storedColors = localStorage.getItem('vtm_fav_colors');
        if (storedColors) {
            setFavoriteColors(JSON.parse(storedColors));
        } else {
            // Colores por defecto (Rojo Sangre, Dorado, Gris, etc.)
            setFavoriteColors(['#ef4444', '#b91c1c', '#f59e0b', '#a3a3a3', '#ffffff']);
        }
    }, [section]);

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setFormData({ ...formData, content: newContent });
        setCharCount(newContent.length);
    };

    // --- LÓGICA DE INSERCIÓN (Markdown y HTML Color) ---
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
        
        setFormData({ ...formData, content: newText });
        setCharCount(newText.length);
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length + selection.length + suffix.length;
            const finalPos = selection.length === 0 ? start + prefix.length : newCursorPos;
            textarea.setSelectionRange(finalPos, finalPos);
        }, 0);
    };

    // Insertar etiqueta de color HTML
    const applyColor = (colorToApply) => {
        // Usamos etiquetas span con estilo porque Markdown no soporta color nativo
        insertText(`<span style="color: ${colorToApply}">`, `</span>`);
        setShowColorPicker(false);
    };

    // Gestión de Favoritos
    const addFavorite = () => {
        if (!favoriteColors.includes(currentColor)) {
            const newFavs = [...favoriteColors, currentColor];
            setFavoriteColors(newFavs);
            localStorage.setItem('vtm_fav_colors', JSON.stringify(newFavs));
        }
    };

    const removeFavorite = (colorToRemove, e) => {
        e.stopPropagation(); // Evitar seleccionar el color al borrarlo
        const newFavs = favoriteColors.filter(c => c !== colorToRemove);
        setFavoriteColors(newFavs);
        localStorage.setItem('vtm_fav_colors', JSON.stringify(newFavs));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError("La imagen no debe superar los 5MB");
            return;
        }
        try {
            const base64 = await convertToBase64(file);
            setFormData({ ...formData, image_url: base64 });
            setError('');
        } catch (err) {
            setError("Error al procesar la imagen");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            setError("El título y contenido son obligatorios");
            return;
        }
        onSave(formData);
    };

    // Estilos para ReactMarkdown (Igual que ChronicleSection)
    const markdownComponents = {
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-neutral-300" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-3xl font-serif text-red-500 mt-6 mb-4 border-b border-red-900/30 pb-2" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-2xl font-serif text-red-400 mt-5 mb-3" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-xl font-serif text-red-400/80 mt-4 mb-2 italic" {...props} />,
        strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
        em: ({node, ...props}) => <em className="text-red-200" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-1 marker:text-red-600" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-red-900 pl-4 py-2 my-6 bg-red-900/10 italic text-neutral-400 rounded-r shadow-inner" {...props} />,
        hr: ({node, ...props}) => <hr className="border-red-900/30 my-8" {...props} />,
        a: ({node, ...props}) => <a className="text-red-400 hover:text-red-300 underline" {...props} />,
        // Permitir que los spans rendericen sus estilos (colores)
        span: ({node, ...props}) => <span {...props} />
    };

    return (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 shadow-2xl animate-fade-in relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                <h3 className="text-xl font-serif text-red-500 flex items-center gap-2">
                    {section ? <Icons.Edit /> : <Icons.Plus />}
                    {section ? 'Editar Capítulo' : 'Nuevo Capítulo'}
                </h3>
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-full transition-colors border border-neutral-700"
                >
                    <Icons.Eye />
                    {showPreview ? 'Volver a Edición' : 'Vista Previa'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* MODO VISTA PREVIA */}
            {showPreview ? (
                <div className="bg-neutral-950 p-8 rounded border border-neutral-800 min-h-[400px]">
                    <article className="prose prose-invert max-w-none">
                         <h2 className="text-3xl font-serif text-neutral-200 mb-6 flex items-start gap-3">
                            <span className="text-red-900 text-2xl mt-1 select-none">§</span> 
                            {formData.title || 'Sin título'}
                        </h2>
                        {formData.image_url && (
                            <div className="mb-8 flex justify-center w-full">
                                <img src={formData.image_url} alt="Preview" style={{ width: formData.image_width, height: formData.image_height, maxWidth: '100%', objectFit: 'contain' }} className="rounded border border-neutral-800" />
                            </div>
                        )}
                        <div className="font-sans text-lg text-justify selection:bg-red-900 selection:text-white">
                            {/* AQUÍ USAMOS rehypeRaw PARA VER LOS COLORES */}
                            <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                {formData.content || '*La página está en blanco...*'}
                            </ReactMarkdown>
                        </div>
                    </article>
                </div>
            ) : (
                /* MODO EDICIÓN */
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-xs text-neutral-500 uppercase font-bold mb-2 block tracking-wider">Título del Capítulo <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="Ej: El despertar..." className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded text-neutral-200 focus:border-red-900 outline-none text-lg font-serif" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                    </div>
                    
                    <div className="border border-neutral-800 rounded bg-neutral-950 relative">
                        {/* Toolbar */}
                        <div className="flex flex-wrap gap-1 bg-neutral-900 p-2 border-b border-neutral-800 rounded-t items-center relative z-20">
                            <button type="button" onClick={() => insertText('**', '**')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-bold" title="Negrita">B</button>
                            <button type="button" onClick={() => insertText('*', '*')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white italic" title="Cursiva">I</button>
                            <div className="w-px h-5 bg-neutral-800 mx-1"></div>
                            
                            {/* BOTÓN DE COLOR */}
                            <div className="relative">
                                <button 
                                    type="button" 
                                    onClick={() => setShowColorPicker(!showColorPicker)} 
                                    className={`p-2 rounded transition-colors flex items-center gap-1 ${showColorPicker ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                    title="Color de Texto"
                                >
                                    <Icons.Palette />
                                    <div className="w-3 h-3 rounded-full border border-neutral-600" style={{ backgroundColor: currentColor }}></div>
                                </button>

                                {/* POPOVER DE COLOR */}
                                {showColorPicker && (
                                    <div className="absolute top-full left-0 mt-2 p-4 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl w-64 z-50 animate-fade-in">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-neutral-400 uppercase">Elegir Color</span>
                                            <button onClick={() => setShowColorPicker(false)} className="text-neutral-500 hover:text-white"><Icons.X /></button>
                                        </div>
                                        
                                        {/* Selector y Botón Agregar */}
                                        <div className="flex gap-2 mb-4">
                                            <input 
                                                type="color" 
                                                value={currentColor} 
                                                onChange={(e) => setCurrentColor(e.target.value)}
                                                className="h-9 w-12 bg-transparent border-0 cursor-pointer rounded"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => applyColor(currentColor)}
                                                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs rounded border border-neutral-700"
                                            >
                                                Aplicar
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={addFavorite}
                                                className="px-3 bg-red-900 hover:bg-red-800 text-white text-xs rounded"
                                                title="Guardar en Favoritos"
                                            >
                                                ★
                                            </button>
                                        </div>

                                        {/* Lista de Favoritos */}
                                        {favoriteColors.length > 0 && (
                                            <div>
                                                <span className="text-[10px] text-neutral-500 uppercase block mb-2">Favoritos</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {favoriteColors.map((color, idx) => (
                                                        <div key={idx} className="group relative">
                                                            <button 
                                                                type="button"
                                                                onClick={() => { setCurrentColor(color); applyColor(color); }}
                                                                className="w-6 h-6 rounded-full border border-neutral-600 hover:scale-110 transition-transform shadow-sm"
                                                                style={{ backgroundColor: color }}
                                                                title={color}
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => removeFavorite(color, e)}
                                                                className="absolute -top-1 -right-1 bg-black text-red-500 rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-neutral-800"
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

                            <div className="w-px h-5 bg-neutral-800 mx-1"></div>
                            <button type="button" onClick={() => insertText('### ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-serif font-bold">H3</button>
                            <button type="button" onClick={() => insertText('> ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"><Icons.Quote /></button>
                            <button type="button" onClick={() => insertText('- ')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"><Icons.List /></button>
                            <button type="button" onClick={() => insertText('\n---\n')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white text-xs">HR</button>
                            <div className="flex-1"></div>
                            <span className="text-xs text-neutral-600 self-center font-mono px-2">{charCount} chars</span>
                        </div>
                        
                        {/* Overlay para cerrar el color picker si haces click fuera */}
                        {showColorPicker && (
                            <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)}></div>
                        )}

                        <textarea 
                            ref={textareaRef}
                            placeholder="Escribe tu historia..." 
                            className="w-full bg-neutral-950 p-4 rounded-b min-h-[300px] text-neutral-300 outline-none font-mono text-sm leading-relaxed resize-y placeholder-neutral-700"
                            value={formData.content}
                            onChange={handleContentChange}
                            required
                        />
                    </div>

                    {/* Gestión de Imagen */}
                    <div className="bg-neutral-950 p-5 rounded border border-neutral-800">
                        <label className="text-xs text-neutral-500 uppercase font-bold mb-4 flex items-center gap-2">Imagen (Opcional)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <input type="file" className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-neutral-800 file:text-red-500 hover:file:bg-neutral-700 cursor-pointer" accept="image/*" onChange={handleFileChange} />
                                <input type="url" placeholder="https://..." className="w-full bg-neutral-900 border border-neutral-700 p-2 rounded text-sm text-neutral-300 focus:border-red-900 outline-none" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
                                {formData.image_url && (
                                    <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4">
                                        <input type="text" className="w-full bg-black border border-neutral-700 p-2 rounded text-xs text-neutral-300" placeholder="Ancho (100%)" value={formData.image_width} onChange={e => setFormData({...formData, image_width: e.target.value})} />
                                        <input type="text" className="w-full bg-black border border-neutral-700 p-2 rounded text-xs text-neutral-300" placeholder="Alto (auto)" value={formData.image_height} onChange={e => setFormData({...formData, image_height: e.target.value})} />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-center bg-black rounded border border-neutral-800 min-h-[200px]">
                                {formData.image_url ? <img src={formData.image_url} alt="Preview" style={{ width: '50%', height: 'auto', objectFit: 'contain' }} className="max-h-48 opacity-80" /> : <span className="text-neutral-700 text-xs italic">Sin imagen</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                        <button type="button" onClick={onCancel} className="px-5 py-2 text-neutral-500 hover:text-white transition-colors text-sm font-medium">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg font-bold text-sm">Guardar Cambios</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SectionForm;