import React, { useState, useEffect } from 'react';
import Icons from '../ui/Icons'; // Importamos tus iconos consistentes

// Función auxiliar interna para convertir imágenes (para no depender de utils externos)
const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

const SagaModal = ({ show, onClose, onSave, sagaToEdit }) => {
    const [title, setTitle] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (show) {
            if (sagaToEdit) {
                setTitle(sagaToEdit.title);
                setImagePreview(sagaToEdit.cover_image || '');
                // Si es una URL externa, la ponemos en el campo URL
                if (sagaToEdit.cover_image && sagaToEdit.cover_image.startsWith('http')) {
                    setUrl(sagaToEdit.cover_image);
                } else {
                    setUrl('');
                }
            } else {
                resetForm();
            }
            setError('');
        }
    }, [show, sagaToEdit]);

    const resetForm = () => {
        setTitle('');
        setImagePreview('');
        setFile(null);
        setUrl('');
        setError('');
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        
        if (!selectedFile) return;

        // Validar tipo de archivo
        if (!selectedFile.type.startsWith('image/')) {
            setError('Por favor selecciona un archivo de imagen válido');
            return;
        }

        // Validar tamaño (máximo 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            setError('La imagen debe pesar menos de 5MB');
            return;
        }

        try {
            setError('');
            setFile(selectedFile);
            const base64 = await convertToBase64(selectedFile);
            setImagePreview(base64);
            setUrl(''); // Limpiar URL si el usuario decide subir un archivo
        } catch (err) {
            console.error('Error converting file:', err);
            setError('Error al procesar la imagen');
        }
    };

    const handleUrlChange = (e) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        
        if (newUrl.trim()) {
            setImagePreview(newUrl);
            setFile(null); // Limpiar archivo si el usuario decide usar URL
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError('El título es obligatorio');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let finalImage = imagePreview;
            
            // Lógica de prioridad: Si hay URL manual y no hay archivo nuevo, usamos la URL
            if (!file && url.trim()) {
                finalImage = url.trim();
            }

            await onSave({
                id: sagaToEdit?.id || null,
                title: title.trim(),
                cover_image: finalImage || null
            });
            
            onClose();
            resetForm();
        } catch (err) {
            console.error('Error saving saga:', err);
            setError('Error al guardar la crónica. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
            resetForm();
        }
    };

    if (!show) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={handleClose}
        >
            <div 
                className="bg-neutral-900 rounded-lg border border-red-900/30 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-[0_0_30px_rgba(153,27,27,0.2)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-950/50">
                    <h2 className="text-xl font-serif text-red-500 tracking-wide">
                        {sagaToEdit ? 'Editar Crónica' : 'Nueva Crónica'}
                    </h2>
                    <button 
                        type="button" 
                        onClick={handleClose}
                        disabled={loading}
                        className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full"
                        aria-label="Cerrar modal"
                    >
                        <Icons.Times /> 
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/10 border border-red-900/40 text-red-400 p-3 rounded text-sm flex items-start gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Título */}
                    <div>
                        <label className="block text-neutral-400 text-xs font-bold uppercase mb-2 tracking-wider">
                            Título de la Saga <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-neutral-700 focus:border-red-900 rounded p-3 text-white outline-none transition-colors font-serif text-lg placeholder-neutral-600"
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: La Caída de Londres"
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    {/* Previsualización */}
                    {imagePreview && (
                        <div className="relative group">
                            <div className="text-center bg-black p-2 rounded border border-neutral-800 overflow-hidden">
                                <img 
                                    src={imagePreview} 
                                    alt="Vista previa" 
                                    className="max-h-48 w-full object-cover rounded opacity-80 group-hover:opacity-100 transition-opacity"
                                    onError={() => {
                                        setError('No se pudo cargar la imagen');
                                        setImagePreview('');
                                    }}
                                />
                            </div>
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur">
                                Vista Previa
                            </div>
                        </div>
                    )}

                    {/* Selector de Tabs (Visual) para Imagen */}
                    <div className="space-y-4 pt-2">
                        <label className="block text-neutral-400 text-xs font-bold uppercase tracking-wider">
                            Imagen de Portada
                        </label>

                        {/* Opción 1: Subir Archivo */}
                        <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
                            <label className="block text-xs text-neutral-500 mb-2">Subir desde dispositivo</label>
                            <input 
                                type="file" 
                                className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-neutral-800 file:text-red-500 hover:file:bg-neutral-700 cursor-pointer"
                                accept="image/*" 
                                onChange={handleFileChange}
                                disabled={loading}
                            />
                            <p className="text-[10px] text-neutral-600 mt-2">
                                Máximo 5MB • JPG, PNG, WEBP
                            </p>
                        </div>

                        <div className="flex items-center gap-3 justify-center">
                            <div className="h-px bg-neutral-800 w-12"></div>
                            <span className="text-neutral-600 text-xs font-serif italic">o usar enlace</span>
                            <div className="h-px bg-neutral-800 w-12"></div>
                        </div>

                        {/* Opción 2: URL */}
                        <div>
                            <input 
                                type="url" 
                                className="w-full bg-black border border-neutral-700 focus:border-red-900 rounded p-3 text-sm text-neutral-300 outline-none transition-colors placeholder-neutral-600"
                                placeholder="https://..."
                                value={url} 
                                onChange={handleUrlChange}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
                        <button 
                            type="button" 
                            onClick={handleClose}
                            disabled={loading}
                            className="px-5 py-2 text-neutral-500 hover:text-white transition-colors text-sm hover:underline"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg shadow-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-bold tracking-wide"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    GUARDANDO...
                                </>
                            ) : (
                                'GUARDAR CRÓNICA'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SagaModal;