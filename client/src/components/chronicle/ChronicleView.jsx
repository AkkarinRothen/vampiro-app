import React, { useState, useEffect } from 'react';
import Icons from '../ui/Icons';
import SectionForm from '../forms/SectionForm';
import GlossaryModal from '../forms/GlossaryModal';
import ChronicleSection from './ChronicleSection';

const ChronicleView = ({ saga, initialSections, onBack }) => {
    const [sections, setSections] = useState(initialSections || []);
    const [glossary, setGlossary] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [showGlossary, setShowGlossary] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchGlossary();
    }, [saga.id]);

    const fetchGlossary = async () => {
        try {
            const res = await fetch(`/api/chronicles/${saga.id}/glossary`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setGlossary(data);
            }
        } catch (err) {
            console.error("Error cargando glosario:", err);
        }
    };

      // Actualiza esta función:
    const handleSaveGlossaryTerm = async (term, definition, isGlobal) => { 
        try {
            const res = await fetch(`/api/chronicles/${saga.id}/glossary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term, definition, isGlobal }), 
                credentials: 'include'
            });

            if (res.ok) {
                setGlossary(prev => ({ ...prev, [term]: definition }));
                // Opcional: Descomenta la siguiente línea si quieres cerrar el modal al guardar con éxito
                // setShowGlossary(false); 
            } else {
                // Capturar y mostrar el error real del backend
                const errorData = await res.json().catch(() => ({}));
                console.error("Error del servidor:", errorData);
                alert(`No se pudo guardar: ${errorData.error || res.statusText || 'Error desconocido'}`);
            }
        } catch (err) {
            console.error("Error de red:", err);
            alert("Error de conexión al guardar definición. Revisa tu servidor.");
        }
    };

    const refreshSections = async () => {
        try {
            const res = await fetch(`/api/chronicles/${saga.id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSections(data.sections);
            }
        } catch (err) {
            console.error("Error refrescando secciones:", err);
        }
    };

    const handleSaveSection = async (formData) => {
        setIsLoading(true);
        try {
            let url, method;
            if (activeSection) {
                url = `/api/chronicles/sections/${activeSection.id}`;
                method = 'PUT';
            } else {
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
            await refreshSections();
            setIsEditing(false);
            setActiveSection(null);
        } catch (error) {
            alert("Error al guardar cambios.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSection = async (id) => {
        if(!window.confirm("¿Eliminar este capítulo de la base de datos?")) return;
        try {
            const response = await fetch(`/api/chronicles/sections/${id}`, { method: 'DELETE', credentials: 'include' });
            if (response.ok) {
                setSections(prev => prev.filter(s => s.id !== id));
                refreshSections();
            } else {
                alert("No se pudo eliminar el capítulo.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const moveSection = async (id, direction) => {
        const index = sections.findIndex(s => s.id === id);
        if (index < 0) return;
        const newSections = [...sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        }
        setSections(newSections);
        try {
            const endpoint = direction === 'up' ? 'move-up' : 'move-down';
            await fetch(`/api/chronicles/sections/${id}/${endpoint}`, { method: 'PUT', credentials: 'include' });
        } catch (error) {
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
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-neutral-800">
                <button onClick={onBack} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors"><Icons.ArrowLeft /></button>
                <div className="flex-1">
                    <h1 className="text-3xl font-serif text-red-500">{saga.title}</h1>
                    <div className="flex items-center gap-2 text-neutral-500 text-sm">
                        <span>Administrador de Crónica</span>
                        <span className="text-neutral-700">•</span>
                        <button onClick={() => setShowGlossary(true)} className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 transition-colors"><Icons.StickyNote /> Gestionar Glosario ({Object.keys(glossary).length})</button>
                    </div>
                </div>
                {!isEditing && <button onClick={() => { setActiveSection(null); setIsEditing(true); }} className="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded flex items-center gap-2 shadow-lg transition-transform hover:scale-105"><Icons.Plus /> Nuevo Capítulo</button>}
            </div>
            <div className="max-w-4xl mx-auto space-y-6">
                {isEditing ? (
                    <SectionForm section={activeSection} onSave={handleSaveSection} onCancel={() => { setIsEditing(false); setActiveSection(null); }} />
                ) : (
                    <div className="space-y-6 pb-20">
                        {sections.length === 0 && <div className="text-center py-12 text-neutral-600 italic border border-dashed border-neutral-800 rounded-lg">La historia aún no ha sido escrita.<br/><span className="text-sm">Presiona "Nuevo Capítulo" para comenzar.</span></div>}
                        {sections.map((section, index) => (
                            <ChronicleSection key={section.id} section={section} glossary={glossary} isAdmin={true} isFirst={index === 0} isLast={index === sections.length - 1} onEdit={(s) => { setActiveSection(s); setIsEditing(true); }} onDelete={handleDeleteSection} onMoveUp={(id) => moveSection(id, 'up')} onMoveDown={(id) => moveSection(id, 'down')} />
                        ))}
                    </div>
                )}
            </div>
            <GlossaryModal isOpen={showGlossary} onClose={() => setShowGlossary(false)} onSave={handleSaveGlossaryTerm} glossary={glossary} />
        </div>
    );
};

export default ChronicleView;