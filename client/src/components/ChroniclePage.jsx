
// ============================================
// ChroniclePage.jsx
// Página principal CON edición y reordenamiento
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChronicleSection from './ChronicleSection';
import SectionForm from './SectionForm';

const ChroniclePage = ({ isAdmin }) => {
    const { id } = useParams();
    const [chronicle, setChronicle] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingSection, setEditingSection] = useState(null);

    useEffect(() => {
        loadChronicle();
    }, [id]);

    const loadChronicle = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/chronicles/${id}`);
            
            if (!response.ok) {
                throw new Error('Error al cargar la crónica');
            }
            
            const data = await response.json();
            setChronicle(data.info);
            setSections(data.sections);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSection = async (formData) => {
        try {
            const url = editingSection
                ? `/api/chronicles/sections/${editingSection.id}`
                : `/api/chronicles/${id}/sections`;
            
            const method = editingSection ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error('Error al guardar la sección');
            }
            
            await loadChronicle();
            setShowForm(false);
            setEditingSection(null);
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    };

    const handleDeleteSection = async (sectionId) => {
        try {
            const response = await fetch(`/api/chronicles/sections/${sectionId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar la sección');
            }
            
            await loadChronicle();
        } catch (err) {
            console.error('Error:', err);
            alert('Error al eliminar la sección');
        }
    };

    const handleMoveUp = async (sectionId) => {
        try {
            const response = await fetch(`/api/chronicles/sections/${sectionId}/move-up`, {
                method: 'PUT'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al mover la sección');
            }
            
            await loadChronicle();
        } catch (err) {
            console.error('Error:', err);
            alert(err.message);
        }
    };

    const handleMoveDown = async (sectionId) => {
        try {
            const response = await fetch(`/api/chronicles/sections/${sectionId}/move-down`, {
                method: 'PUT'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al mover la sección');
            }
            
            await loadChronicle();
        } catch (err) {
            console.error('Error:', err);
            alert(err.message);
        }
    };

    const handleEditSection = (section) => {
        setEditingSection(section);
        setShowForm(true);
        
        // Scroll suave hacia el formulario
        setTimeout(() => {
            document.querySelector('.section-form')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingSection(null);
    };

    const handleAddNewSection = () => {
        setEditingSection(null);
        setShowForm(true);
        
        // Scroll suave hacia el formulario
        setTimeout(() => {
            document.querySelector('.section-form')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <p>Cargando crónica...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>❌ Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!chronicle) {
        return (
            <div className="error-container">
                <h2>❌ No encontrado</h2>
                <p>Crónica no encontrada</p>
            </div>
        );
    }

    return (
        <div className="chronicle-page">
            <div className="chronicle-header">
                <h1>{chronicle.title}</h1>
                {chronicle.description && (
                    <p className="chronicle-description">{chronicle.description}</p>
                )}
            </div>

            {isAdmin && !showForm && (
                <button 
                    onClick={handleAddNewSection}
                    className="btn-add-section"
                >
                    ➕ Agregar Nueva Sección
                </button>
            )}

            {showForm && (
                <div className="form-container">
                    <SectionForm
                        section={editingSection}
                        onSave={handleSaveSection}
                        onCancel={handleCancelForm}
                    />
                </div>
            )}

            <div className="sections-container">
                {sections.length === 0 ? (
                    <div className="no-sections">
                        <p>📝 No hay secciones todavía.</p>
                        {isAdmin && <p>¡Agrega la primera sección para comenzar!</p>}
                    </div>
                ) : (
                    sections.map((section, index) => (
                        <ChronicleSection
                            key={section.id}
                            section={section}
                            isAdmin={isAdmin}
                            isFirst={index === 0}
                            isLast={index === sections.length - 1}
                            onEdit={handleEditSection}
                            onDelete={handleDeleteSection}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ChroniclePage;
