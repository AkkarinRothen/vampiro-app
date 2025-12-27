// ============================================
// SagaModal.jsx - Mejorado
// ============================================

import { useState, useEffect } from 'react';
import { convertToBase64 } from '../utils';

function SagaModal({ show, onClose, onSave, sagaToEdit }) {
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
                setUrl('');
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
            setUrl(''); // Limpiar URL si había una
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
            setFile(null); // Limpiar archivo si había uno
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
            
            // Si hay URL manual, tiene prioridad
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
        >
            <div 
                className="bg-neutral-900 rounded-lg border border-red-900/30 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                    <h2 className="text-xl font-serif text-red-500">
                        {sagaToEdit ? 'Editar Crónica' : 'Nueva Crónica'}
                    </h2>
                    <button 
                        type="button" 
                        onClick={handleClose}
                        disabled={loading}
                        className="text-neutral-400 hover:text-white transition-colors text-2xl"
                        aria-label="Cerrar modal"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {/* Título */}
                    <div>
                        <label className="block text-neutral-400 text-sm mb-2">
                            Título <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            className="w-full bg-neutral-950 border border-neutral-700 focus:border-red-900 rounded p-3 text-white outline-none transition-colors"
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="El nombre de tu crónica"
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    {/* Previsualización */}
                    {imagePreview && (
                        <div className="text-center bg-black/40 p-4 rounded border border-neutral-800">
                            <img 
                                src={imagePreview} 
                                alt="Vista previa" 
                                className="max-h-48 mx-auto rounded border border-neutral-700"
                                onError={() => {
                                    setError('No se pudo cargar la imagen');
                                    setImagePreview('');
                                }}
                            />
                        </div>
                    )}

                    {/* Subir Imagen */}
                    <div>
                        <label className="block text-neutral-400 text-sm mb-2">
                            Subir Imagen
                        </label>
                        <input 
                            type="file" 
                            className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-neutral-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-red-900 file:text-white file:cursor-pointer hover:file:bg-red-800"
                            accept="image/*" 
                            onChange={handleFileChange}
                            disabled={loading}
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                            Máximo 5MB. Formatos: JPG, PNG, WEBP
                        </p>
                    </div>

                    {/* O Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-neutral-800"></div>
                        <span className="text-neutral-600 text-sm">o</span>
                        <div className="flex-1 h-px bg-neutral-800"></div>
                    </div>

                    {/* URL de Imagen */}
                    <div>
                        <label className="block text-neutral-400 text-sm mb-2">
                            URL de Imagen
                        </label>
                        <input 
                            type="url" 
                            className="w-full bg-neutral-950 border border-neutral-700 focus:border-red-900 rounded p-3 text-white outline-none transition-colors"
                            placeholder="https://ejemplo.com/imagen.jpg"
                            value={url} 
                            onChange={handleUrlChange}
                            disabled={loading}
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                        <button 
                            type="button" 
                            onClick={handleClose}
                            disabled={loading}
                            className="px-5 py-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    Guardando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SagaModal;