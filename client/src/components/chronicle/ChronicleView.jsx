import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icons from '../ui/Icons';
import { useToast } from '../ui/Toast';
import SectionForm from '../forms/SectionForm';
import GlossaryModal from '../forms/GlossaryModal';
import ChronicleSection from './ChronicleSection';

const ChronicleView = ({ saga, initialSections = [], user, onBack }) => {
    const toast = useToast();
    
    // --- ESTADOS DE DATOS ---
    const [sections, setSections] = useState(initialSections || []);
    const [glossary, setGlossary] = useState([]); 
    
    // --- ESTADOS DE INTERFAZ ---
    const [isEditing, setIsEditing] = useState(false); // Controla la visibilidad del formulario
    const [activeSection, setActiveSection] = useState(null); // Sección que se está editando (null = nueva)
    const [showGlossary, setShowGlossary] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // ID de la sección en proceso (borrar/mover)

    // 🔒 PERMISOS: Solo Admin o Narrador pueden editar
    const canEdit = user?.role === 'admin' || user?.role === 'storyteller';

    // Efecto para sincronizar secciones si cambian las props
    useEffect(() => {
        setSections(initialSections);
    }, [initialSections]);

    // Efecto para cargar el glosario de la crónica
    useEffect(() => {
        if (saga?.id) {
            fetchGlossary();
        }
    }, [saga]);

    // --- API: GLOSARIO ---
    const fetchGlossary = async () => {
        try {
            const res = await fetch(`/api/chronicles/${saga.id}/glossary`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setGlossary(data || []); 
            }
        } catch (err) {
            console.error("Error cargando glosario:", err);
        }
    };

    const handleSaveGlossaryTerm = async (termData) => {
        if (!canEdit) return;
        try {
            const res = await fetch(`/api/chronicles/${saga.id}/glossary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(termData),
                credentials: 'include'
            });
            if (res.ok) {
                await fetchGlossary();
                toast.success("Término registrado en los archivos.");
            }
        } catch (err) {
            toast.error("Error al guardar término.");
        }
    };

    const handleDeleteGlossaryTerm = async (termId) => {
        if (!canEdit) return;
        try {
            await fetch(`/api/chronicles/${saga.id}/glossary/${termId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            await fetchGlossary();
            toast.info("Término eliminado.");
        } catch (err) {
            toast.error("Error al eliminar término.");
        }
    };

    // --- API: SECCIONES (CRUD) ---

    const handleSaveSection = async (formData) => {
        if (!canEdit) {
            toast.warning("No tienes permiso para editar la crónica.");
            return;
        }

        try {
            const isUpdate = !!activeSection;
            const url = isUpdate
                ? `/api/chronicles/sections/${activeSection.id}`
                : `/api/chronicles/${saga.id}/sections`;
            
            const method = isUpdate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Error en la petición');

            const savedSection = await response.json();

            if (isUpdate) {
                setSections(prev => prev.map(s => s.id === savedSection.id ? savedSection : s));
                toast.success("Capítulo reescrito correctamente.");
            } else {
                setSections(prev => [...prev, savedSection]);
                toast.success("Nuevo capítulo añadido a la historia.");
            }

            handleCancelEdit();
        } catch (err) {
            console.error(err);
            toast.error("La sangre rechaza este cambio. Inténtalo de nuevo.");
        }
    };

    const handleDeleteSection = async (sectionId) => {
        if (!canEdit) return;
        
        if (!window.confirm("⚠️ ¿Destruir este capítulo permanentemente?\nEsta acción no se puede deshacer.")) return;

        try {
            setActionLoading(sectionId);
            const response = await fetch(`/api/chronicles/sections/${sectionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Error al eliminar');

            setSections(prev => prev.filter(s => s.id !== sectionId));
            toast.info("El capítulo ha sido borrado de la existencia.");
        } catch (err) {
            toast.error("Error al intentar eliminar.");
        } finally {
            setActionLoading(null);
        }
    };

    const moveSection = async (sectionId, direction) => {
        if (!canEdit || actionLoading) return;

        try {
            setActionLoading(sectionId);
            const endpoint = direction === 'up' ? 'move-up' : 'move-down';
            
            await fetch(`/api/chronicles/sections/${sectionId}/${endpoint}`, {
                method: 'PUT',
                credentials: 'include'
            });

            // Recarga completa para asegurar sincronía de orden
            const refreshRes = await fetch(`/api/chronicles/${saga.id}`, { credentials: 'include' });
            const refreshData = await refreshRes.json();
            if (refreshData.sections) {
                setSections(refreshData.sections);
            }
            
        } catch (err) {
            toast.error("No se pudo reordenar la crónica.");
        } finally {
            setActionLoading(null);
        }
    };

    // --- MANEJADORES DE UI ---

    const handleCreateNew = () => {
        if (!canEdit) return;
        setActiveSection(null);
        setIsEditing(true);
        // Scroll suave hacia el editor
        setTimeout(() => document.getElementById('section-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    };

    const handleEditStart = (section) => {
        if (!canEdit) return;
        setActiveSection(section);
        setIsEditing(true);
        setTimeout(() => document.getElementById('section-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setActiveSection(null);
    };

    // --- RENDERIZADO ---

    return (
        <div className="min-h-screen bg-vtm-texture text-neutral-200 pb-20 animate-fade-in">
            
            {/* HERO HEADER */}
            <div className="relative w-full h-64 md:h-80 overflow-hidden shadow-2xl border-b border-red-900/30">
                <div className="absolute inset-0 bg-black/60 z-10"></div>
                <img 
                    src={saga?.cover_image || '/images/default-chronicle.jpg'} 
                    alt={saga?.title}
                    className="w-full h-full object-cover filter blur-[2px] scale-105"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent z-20 flex flex-col justify-end p-6 md:p-12">
                    <div className="container mx-auto">
                        <div className="flex justify-between items-end">
                            <div>
                                <button 
                                    onClick={onBack} 
                                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-red-500 mb-4 transition-colors group text-sm font-serif tracking-widest uppercase"
                                >
                                    <Icons.ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                                    Volver a Sagas
                                </button>
                                <h1 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mb-2 leading-tight">
                                    {saga?.title}
                                </h1>
                                {saga?.storyteller && (
                                    <p className="text-red-500 font-mono text-sm uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                                        Narrado por {saga.storyteller}
                                    </p>
                                )}
                            </div>
                            
                            {/* Botón Glosario */}
                            <button 
                                onClick={() => setShowGlossary(true)}
                                className="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-300 transition-all"
                            >
                                <Icons.BookOpen className="w-4 h-4 text-purple-400" />
                                <span>Glosario & Lore</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                
                {/* BARRA DE HERRAMIENTAS MÓVIL */}
                <div className="md:hidden mb-6 flex justify-end">
                    <button 
                        onClick={() => setShowGlossary(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-full text-sm shadow-lg"
                    >
                        <Icons.BookOpen className="w-4 h-4 text-purple-400" /> Glosario
                    </button>
                </div>

                {/* 🔒 BOTÓN DE CREAR (Solo Admin/Storyteller) */}
                {canEdit && !isEditing && (
                    <div className="flex justify-end mb-8 sticky top-20 z-30 pointer-events-none">
                        <button 
                            onClick={handleCreateNew}
                            className="pointer-events-auto group flex items-center gap-2 px-5 py-2.5 bg-blood hover:bg-blood-light text-white rounded shadow-lg shadow-red-900/20 hover:shadow-red-900/40 transition-all hover:-translate-y-0.5 border border-red-800/50"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            <span className="font-serif tracking-wide text-sm font-bold">Nuevo Capítulo</span>
                        </button>
                    </div>
                )}

                {/* 🔒 FORMULARIO DE EDICIÓN */}
                {canEdit && isEditing && (
                    <div id="section-editor" className="mb-16 bg-neutral-900/80 border border-red-900/40 rounded-lg p-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-in-right backdrop-blur-sm">
                        <div className="bg-neutral-950 rounded p-6">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-red-900/20">
                                <h3 className="text-xl font-serif text-blood flex items-center gap-2">
                                    {activeSection ? <Icons.Edit className="w-5 h-5"/> : <Icons.Plus className="w-5 h-5"/>}
                                    {activeSection ? 'Reescribiendo la Historia' : 'Nuevo Registro'}
                                </h3>
                                <button onClick={handleCancelEdit} className="text-neutral-500 hover:text-white transition-colors">
                                    <Icons.X />
                                </button>
                            </div>
                            
                            <SectionForm
                                section={activeSection}
                                onSave={handleSaveSection}
                                onCancel={handleCancelEdit}
                            />
                        </div>
                    </div>
                )}

                {/* LISTADO DE CAPÍTULOS */}
                <div className="space-y-12 relative">
                    {/* Línea de Tiempo Decorativa */}
                    {sections.length > 0 && (
                        <div className="absolute left-[1.65rem] top-8 bottom-8 w-px bg-gradient-to-b from-red-900/20 via-red-900/50 to-red-900/20 hidden md:block pointer-events-none"></div>
                    )}

                    {sections.length === 0 ? (
                        <div className="text-center py-24 border-2 border-dashed border-neutral-800 rounded-lg bg-black/20">
                            <div className="text-5xl mb-4 opacity-30 grayscale">🦇</div>
                            <p className="text-neutral-500 font-serif text-xl mb-2">Las páginas están en blanco.</p>
                            <p className="text-neutral-600 text-sm">La historia espera ser escrita.</p>
                            {canEdit && (
                                <button onClick={handleCreateNew} className="mt-6 text-blood hover:text-blood-bright underline decoration-dotted underline-offset-4 text-sm">
                                    Comenzar la crónica ahora
                                </button>
                            )}
                        </div>
                    ) : (
                        sections.map((section, index) => (
                            <div 
                                key={section.id} 
                                className="relative animate-fade-in" 
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Marcador de Capítulo en la línea de tiempo */}
                                <div className="absolute left-6 top-8 w-3 h-3 bg-neutral-900 border-2 border-red-900/50 rounded-full z-10 hidden md:block shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                
                                <ChronicleSection
                                    section={section}
                                    glossary={glossary}
                                    canEdit={canEdit} // [CRÍTICO] Pasamos el permiso para que la sección oculte sus botones
                                    isFirst={index === 0}
                                    isLast={index === sections.length - 1}
                                    onEdit={handleEditStart}
                                    onDelete={handleDeleteSection}
                                    onMoveUp={() => moveSection(section.id, 'up')}
                                    onMoveDown={() => moveSection(section.id, 'down')}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            {/* Modal de Glosario */}
            <GlossaryModal 
                isOpen={showGlossary} 
                onClose={() => setShowGlossary(false)} 
                onSave={handleSaveGlossaryTerm} 
                onDelete={handleDeleteGlossaryTerm}
                glossary={glossary}
                canEdit={canEdit} // Permitimos editar el lore si tiene permisos
            />
        </div>
    );
};

export default ChronicleView;