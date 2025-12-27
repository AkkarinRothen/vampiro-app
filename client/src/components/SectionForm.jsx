
// ============================================
// SectionForm.jsx
// Formulario para crear/editar secciones
// ============================================

import React, { useState, useEffect } from 'react';
import ImageSizeControls from './ImageSizeControls';

const SectionForm = ({ section, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image_url: '',
        image_width: '100%',
        image_height: 'auto'
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.title.trim()) {
            newErrors.title = 'El título es obligatorio';
        }
        
        if (formData.image_url && !isValidUrl(formData.image_url)) {
            newErrors.image_url = 'URL de imagen inválida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleImageSizeChange = (width, height) => {
        setFormData(prev => ({
            ...prev,
            image_width: width,
            image_height: height
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error al guardar:', error);
            setErrors({ submit: 'Error al guardar la sección' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Limpiar error del campo cuando se modifica
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="section-form">
            <div className="form-header">
                <h3>{section ? '✏️ Editar Sección' : '➕ Nueva Sección'}</h3>
            </div>
            
            {/* Título */}
            <div className="form-group">
                <label htmlFor="title">
                    Título <span className="required">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    placeholder="Título de la sección"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={errors.title ? 'error' : ''}
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
            </div>
            
            {/* Contenido */}
            <div className="form-group">
                <label htmlFor="content">Contenido</label>
                <textarea
                    id="content"
                    placeholder="Escribe el contenido de la sección..."
                    value={formData.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                    rows={8}
                />
            </div>
            
            {/* URL de Imagen */}
            <div className="form-group">
                <label htmlFor="image_url">URL de Imagen</label>
                <input
                    id="image_url"
                    type="text"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    className={errors.image_url ? 'error' : ''}
                />
                {errors.image_url && <span className="error-message">{errors.image_url}</span>}
            </div>

            {/* Controles de tamaño de imagen */}
            {formData.image_url && (
                <ImageSizeControls
                    imageWidth={formData.image_width}
                    imageHeight={formData.image_height}
                    onChange={handleImageSizeChange}
                />
            )}

            {/* Vista previa de la imagen */}
            {formData.image_url && isValidUrl(formData.image_url) && (
                <div className="image-preview">
                    <h4>Vista Previa:</h4>
                    <div className="preview-container">
                        <img
                            src={formData.image_url}
                            alt="Preview"
                            style={{
                                width: formData.image_width,
                                height: formData.image_height,
                                objectFit: 'contain'
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <div className="preview-error" style={{ display: 'none' }}>
                            ⚠️ No se pudo cargar la imagen
                        </div>
                    </div>
                </div>
            )}

            {/* Error de envío */}
            {errors.submit && (
                <div className="error-message submit-error">{errors.submit}</div>
            )}

            {/* Botones */}
            <div className="form-actions">
                <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? '⏳ Guardando...' : '💾 Guardar Sección'}
                </button>
                {onCancel && (
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="btn-secondary"
                        disabled={isSubmitting}
                    >
                        ❌ Cancelar
                    </button>
                )}
            </div>
        </form>
    );
};

export default SectionForm;

