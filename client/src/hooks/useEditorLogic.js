import { useState, useEffect, useRef } from 'react';

// Utilidad para convertir imagen a Base64
const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};

export const useEditorLogic = (section, onSave) => {
    // Estado del formulario
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image_url: '',
        image_width: '100%',
        image_height: 'auto'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Cargar datos iniciales
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

    // Actualizar contadores
    const updateCounts = (text) => {
        setCharCount(text.length);
        setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
    };

    // Manejadores de cambios
    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setFormData(prev => ({ ...prev, content: newContent }));
        updateCounts(newContent);
        if (error) setError('');
    };

    const handleTitleChange = (e) => {
        setFormData(prev => ({ ...prev, title: e.target.value }));
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

        try {
            const base64 = await convertToBase64(file);
            setFormData(prev => ({ ...prev, image_url: base64 }));
            setError('');
        } catch (err) {
            setError("Error al procesar la imagen.");
        }
    };

    // Inserción de texto (Negrita, Cursiva, etc.)
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

    // Guardado
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
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

    return {
        formData,
        setFormData,
        error,
        setError,
        isSubmitting,
        charCount,
        wordCount,
        textareaRef,
        fileInputRef,
        handleTitleChange,
        handleContentChange,
        handleFileChange,
        insertText,
        handleSubmit
    };
};