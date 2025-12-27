import React from 'react';
import { FaTrash, FaEdit, FaArrowUp, FaArrowDown } from 'react-icons/fa';

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
    // Función para renderizar HTML seguro (negritas, cursivas, saltos de línea)
    const renderContent = (content) => {
        const sanitized = content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&lt;b&gt;/g, '<b>')
            .replace(/&lt;\/b&gt;/g, '</b>')
            .replace(/&lt;i&gt;/g, '<i>')
            .replace(/&lt;\/i&gt;/g, '</i>')
            .replace(/&lt;h3&gt;/g, '<h3>')
            .replace(/&lt;\/h3&gt;/g, '</h3>')
            .replace(/\n/g, '<br />');
        return { __html: sanitized };
    };

    return (
        <article className="relative bg-neutral-900/20 p-8 rounded-lg border-l-2 border-red-900/20 hover:border-red-900/60 transition-colors group">
            
            {/* --- CONTROLES DE ADMINISTRADOR --- */}
            {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded backdrop-blur-sm">
                    {/* Reordenar */}
                    <div className="flex flex-col gap-1 border-r border-neutral-700 pr-2 mr-2">
                        <button 
                            onClick={() => !isFirst && onMoveUp(section.id)} 
                            disabled={isFirst}
                            className={`text-neutral-400 hover:text-white ${isFirst ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="Mover arriba"
                        >
                            <FaArrowUp size={12} />
                        </button>
                        <button 
                            onClick={() => !isLast && onMoveDown(section.id)} 
                            disabled={isLast}
                            className={`text-neutral-400 hover:text-white ${isLast ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title="Mover abajo"
                        >
                            <FaArrowDown size={12} />
                        </button>
                    </div>

                    {/* Editar / Borrar */}
                    <button 
                        onClick={() => onEdit(section)}
                        className="text-yellow-600 hover:text-yellow-400 p-1"
                        title="Editar capítulo"
                    >
                        <FaEdit />
                    </button>
                    <button 
                        onClick={() => onDelete(section.id)}
                        className="text-red-600 hover:text-red-400 p-1"
                        title="Borrar capítulo"
                    >
                        <FaTrash />
                    </button>
                </div>
            )}
            
            {/* --- TÍTULO --- */}
            <h2 className="text-3xl font-serif text-neutral-200 mb-6 flex items-center gap-3">
                <span className="text-red-900 text-2xl">§</span> {section.title}
            </h2>
            
            {/* --- IMAGEN CON TAMAÑO PERSONALIZADO --- */}
            {section.image_url && (
                <div className="mb-8 flex justify-center">
                    <img 
                        src={section.image_url} 
                        alt={`Ilustración de ${section.title}`}
                        style={{
                            width: section.image_width || '100%',
                            height: section.image_height || 'auto',
                            maxWidth: '100%',
                            objectFit: 'contain'
                        }}
                        className="rounded border border-neutral-800 shadow-lg"
                        loading="lazy"
                    />
                </div>
            )}
            
            {/* --- CONTENIDO --- */}
            <div 
                className="text-neutral-400 leading-relaxed font-sans text-lg prose prose-invert max-w-none text-justify"
                dangerouslySetInnerHTML={renderContent(section.content || '')} 
            />
        </article>
    );
};

export default ChronicleSection;