import React, { useState, useEffect } from 'react';
import Icons from '../ui/Icons';
import SectionForm from '../forms/SectionForm';
import ChronicleSection from './ChronicleSection';

const ChronicleView = ({ saga, initialSections, onBack }) => {
    // Estado local para las secciones
    const [sections, setSections] = useState(initialSections || []);
    const [isEditing, setIsEditing] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Función auxiliar para recargar secciones desde la BD y mantener la sincronía
    const refreshSections = async () => {
        try {
            const res = await fetch(`/api/chronicles/${saga.id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSections(data.sections); // Actualizamos con el orden real de la BD
            }
        } catch (err) {
            console.error("Error refrescando secciones:", err);
        }
    };

    // GUARDAR (Crear o Editar)
    const handleSaveSection = async (formData) => {
        setIsLoading(true);
        try {
            let url, method;
            
            if (activeSection) {
                // EDITAR: PUT /api/chronicles/sections/:id
                url = `/api/chronicles/sections/${activeSection.id}`;
                method = 'PUT';
            } else {
                // CREAR: POST /api/chronicles/:id/sections
                url = `/api/chronicles/${saga.id}/sections`;
                method = 'POST';
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Error al guardar sección');

            // Recargamos datos para asegurar orden e IDs correctos
            await refreshSections();
            
            setIsEditing(false);
            setActiveSection(null);
        } catch (error) {
            console.error(error);
            alert("Error al guardar cambios. Revisa la consola.");
        } finally {
            setIsLoading(false);
        }
    };

    // ELIMINAR
    const handleDeleteSection = async (id) => {
        if(!window.confirm("¿Eliminar este capítulo de la base de datos?")) return;

        try {
            const response = await fetch(`/api/chronicles/sections/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                // Optimista: filtramos localmente para respuesta instantánea
                setSections(prev => prev.filter(s => s.id !== id));
                // Luego refrescamos para asegurar posiciones
                refreshSections();
            } else {
                alert("No se pudo eliminar el capítulo.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    // MOVER (Reordenar)
    const moveSection = async (id, direction) => {
        // Optimismo visual: movemos la UI primero
        const index = sections.findIndex(s => s.id === id);
        if (index < 0) return;
        
        const newSections = [...sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        }
        setSections(newSections);

        // Llamada a la API en segundo plano
        try {
            // Endpoints: /api/chronicles/sections/:id/move-up (o move-down)
            const endpoint = direction === 'up' ? 'move-up' : 'move-down';
            await fetch(`/api/chronicles/sections/${id}/${endpoint}`, {
                method: 'PUT',
                credentials: 'include'
            });
            // No refrescamos inmediatamente para no causar "saltos" visuales,
            // pero la próxima carga traerá el orden correcto.
        } catch (error) {
            console.error("Error moviendo sección:", error);
            // Si falla, revertimos (aquí podrías llamar a refreshSections para corregir)
            refreshSections();
        }
    };

    return (
        <div className="animate-fade-in relative">
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-lg">
                    <span className="text-red-500 font-serif animate-pulse">Guardando en sangre...</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-neutral-800">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors"
                >
                    <Icons.ArrowLeft />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-serif text-red-500">{saga.title}</h1>
                    <p className="text-neutral-500 text-sm">Administrador de Crónica</p>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => { setActiveSection(null); setIsEditing(true); }}
                        className="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                    >
                        <Icons.Plus /> Nuevo Capítulo
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto space-y-6">
                {isEditing ? (
                    <SectionForm 
                        section={activeSection} 
                        onSave={handleSaveSection} 
                        onCancel={() => { setIsEditing(false); setActiveSection(null); }}
                    />
                ) : (
                    <div className="space-y-6 pb-20">
                        {sections.length === 0 && (
                            <div className="text-center py-12 text-neutral-600 italic border border-dashed border-neutral-800 rounded-lg">
                                La historia aún no ha sido escrita. <br/>
                                <span className="text-sm">Presiona "Nuevo Capítulo" para comenzar.</span>
                            </div>
                        )}
                        {sections.map((section, index) => (
                            <ChronicleSection 
                                key={section.id} 
                                section={section} 
                                isAdmin={true}
                                isFirst={index === 0}
                                isLast={index === sections.length - 1}
                                onEdit={(s) => { setActiveSection(s); setIsEditing(true); }}
                                onDelete={handleDeleteSection}
                                onMoveUp={(id) => moveSection(id, 'up')}
                                onMoveDown={(id) => moveSection(id, 'down')}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChronicleView;