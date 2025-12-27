import React, { useState, useEffect } from 'react';
import { FaBold, FaItalic, FaHeading } from 'react-icons/fa';
import ImageSizeControls from './ImageSizeControls';

const SectionForm = ({ section, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image_url: '',
        image_width: '100%',
        image_height: 'auto'
    });

    useEffect(() => {
        if (section) {
            setFormData({
                title: section.title || '',
                content: section.content || '',
                image_url: section.image_url || '',
                image_width: section.image_width || '100%',
                image_height: section.image_height || 'auto'
            });
        }
    }, [section]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    // Helper para insertar etiquetas (<b>, <i>, etc)
    const insertTag = (tagStart, tagEnd) => {
        const textarea = document.getElementById('section-content-area');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);
        
        const newText = before + tagStart + selected + tagEnd + after;
        setFormData({ ...formData, content: newText });
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tagStart.length, start + tagStart.length + selected.length);
        }, 0);
    };

    return (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-serif text-red-500 mb-6 border-b border-neutral-800 pb-2">
                {section ? 'Editar Capítulo' : 'Nuevo Capítulo'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Título */}
                <input 
                    type="text" 
                    placeholder="Título del Capítulo" 
                    className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded text-neutral-200 focus:border-red-900 outline-none text-lg"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                />
                
                {/* Barra de herramientas */}
                <div className="flex gap-1 bg-neutral-950 p-2 rounded-t border-x border-t border-neutral-800">
                    <button type="button" onClick={() => insertTag('<b>', '</b>')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400" title="Negrita"><FaBold /></button>
                    <button type="button" onClick={() => insertTag('<i>', '</i>')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400" title="Cursiva"><FaItalic /></button>
                    <button type="button" onClick={() => insertTag('<h3>', '</h3>')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400" title="Subtítulo"><FaHeading /></button>
                </div>
                
                {/* Área de texto */}
                <textarea 
                    id="section-content-area"
                    placeholder="Relata los hechos..." 
                    className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded-b min-h-[250px] text-neutral-300 focus:border-red-900 outline-none font-sans leading-relaxed"
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    required
                />

                {/* URL Imagen */}
                <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
                    <input 
                        type="url"
                        placeholder="URL de Imagen (Opcional)" 
                        className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded text-sm text-neutral-400 focus:border-red-900 outline-none mb-4"
                        value={formData.image_url}
                        onChange={e => setFormData({...formData, image_url: e.target.value})}
                    />

                    {/* CONTROL DE TAMAÑO DE IMAGEN */}
                    {formData.image_url && (
                        <ImageSizeControls 
                            width={formData.image_width}
                            height={formData.image_height}
                            onChange={(w, h) => setFormData(prev => ({ ...prev, image_width: w, image_height: h }))}
                        />
                    )}
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-4">
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="px-5 py-2 text-neutral-500 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg transition-all"
                    >
                        {section ? 'Guardar Cambios' : 'Publicar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SectionForm;