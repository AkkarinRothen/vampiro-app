
// ============================================
// ChronicleSection.jsx
// Componente de sección CON controles de edición y movimiento
// ============================================

import React from 'react';

const ChronicleSection = ({ 
    section, 
    isAdmin, 
    isFirst, 
    isLast, 
    onEdit, 
    onDelete, 
    onMoveUp, 
    onMoveDown 
}) => {
    const handleDelete = () => {
        if (window.confirm(`¿Estás seguro de eliminar la sección "${section.title}"?`)) {
            onDelete(section.id);
        }
    };

    return (
        <div className="chronicle-section">
            {isAdmin && (
                <div className="section-admin-controls">
                    {/* Controles de edición */}
                    <div className="section-edit-controls">
                        <button 
                            onClick={() => onEdit(section)} 
                            className="btn-edit"
                            title="Editar sección"
                        >
                            ✏️ Editar
                        </button>
                        <button 
                            onClick={handleDelete} 
                            className="btn-delete"
                            title="Eliminar sección"
                        >
                            🗑️ Eliminar
                        </button>
                    </div>
                    
                    {/* Controles de movimiento */}
                    <div className="section-move-controls">
                        <button
                            onClick={() => onMoveUp(section.id)}
                            disabled={isFirst}
                            className="btn-move"
                            title="Mover arriba"
                        >
                            ⬆️
                        </button>
                        <button
                            onClick={() => onMoveDown(section.id)}
                            disabled={isLast}
                            className="btn-move"
                            title="Mover abajo"
                        >
                            ⬇️
                        </button>
                    </div>
                </div>
            )}
            
            <h3 className="section-title">{section.title}</h3>
            
            {section.image_url && (
                <div className="section-image">
                    <img
                        src={section.image_url}
                        alt={section.title}
                        style={{
                            width: section.image_width || '100%',
                            height: section.image_height || 'auto',
                            objectFit: 'contain'
                        }}
                        loading="lazy"
                    />
                </div>
            )}
            
            <div className="section-content">
                {section.content.split('\n').map((paragraph, idx) => (
                    paragraph.trim() && <p key={idx}>{paragraph}</p>
                ))}
            </div>
        </div>
    );
};

export default ChronicleSection;
