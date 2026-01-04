import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from './ui/Toast';
import Icons from './ui/Icons';
import ChronicleSection from './chronicle/ChronicleSection';
import SectionForm from './forms/SectionForm';

const ChroniclePage = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    // --- ESTADOS DE DATOS ---
    const [chronicle, setChronicle] = useState(null);
    const [sections, setSections] = useState([]);
    
    // --- ESTADOS DE UI ---
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingSection, setEditingSection] = useState(null);

    // 🔒 PERMISOS: Solo Admin o Narrador pueden editar
    // Si el usuario es 'player', canEdit será false
    const canEdit = user?.role === 'admin' || user?.role === 'storyteller';

    // 1. Carga de Datos
    useEffect(() => {
        let isMounted = true;

        const loadChronicle = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/chronicles/${id}`, { credentials: 'include' });
                
                if (!response.ok) {
                    if (response.status === 404) throw new Error('La crónica no existe.');
                    if (response.status === 403) throw new Error('Acceso denegado.');
                    throw new Error('Error de conexión.');
                }
                
                const data = await response.json();
                
                if (isMounted) {
                    setChronicle(data.info || data);
                    setSections(data.sections || []);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message);
                    toast.error(err.message);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadChronicle();
        return () => { isMounted = false; };
    }, [id, toast]);

    // 2. Guardar Sección
    const handleSaveSection = async (formData) => {
        if (!canEdit) return; // Protección extra

        try {
            const isEditing = !!editingSection;
            const url = isEditing
                ? `/api/chronicles/sections/${editingSection.id}`
                : `/api/chronicles/${id}/sections`;
            
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Error al guardar');
            
            const savedSection = await response.json();
            
            // Actualizar estado localmente
            if (isEditing) {
                setSections(prev => prev.map(s => s.id === savedSection.id ? savedSection : s));
                toast.success("Capítulo actualizado.");
            } else {
                setSections(prev => [...prev, savedSection]);
                toast.success("Nuevo capítulo creado.");
            }
            
            handleCancelForm();
        } catch (err) {
            toast.error("No se pudo guardar el capítulo.");
        }
    };

    // 3. Eliminar Sección
    const handleDeleteSection = async (sectionId) => {
        if (!canEdit) return;
        if (!window.confirm('¿Borrar este capítulo permanentemente?')) return;

        try {
            setActionLoading(sectionId);
            const response = await fetch(`/api/chronicles/sections/${sectionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Error al eliminar');
            
            setSections(prev => prev.filter(s => s.id !== sectionId));
            toast.info("Capítulo eliminado.");
        } catch (err) {
            toast.error("Error al eliminar.");
        } finally {
            setActionLoading(null);
        }
    };

    // 4. Mover Secciones
    const moveSection = async (sectionId, direction) => {
        if (!canEdit || actionLoading) return;

        try {
            setActionLoading(sectionId);
            const endpoint = direction === 'up' ? 'move-up' : 'move-down';
            await fetch(`/api/chronicles/sections/${sectionId}/${endpoint}`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            // Recargar para asegurar orden correcto
            const refreshRes = await fetch(`/api/chronicles/${id}`, { credentials: 'include' });
            const refreshData = await refreshRes.json();
            setSections(refreshData.sections);
            
        } catch (err) {
            toast.error("Error al reordenar.");
        } finally {
            setActionLoading(null);
        }
    };

    // UI Handlers
    const handleEditSection = (section) => {
        if (!canEdit) return;
        setEditingSection(section);
        setShowForm(true);
        setTimeout(() => document.getElementById('section-editor')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleAddNewSection = () => {
        if (!canEdit) return;
        setEditingSection(null);
        setShowForm(true);
        setTimeout(() => document.getElementById('section-editor')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingSection(null);
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-900">
            <Icons.Loader className="animate-spin w-8 h-8 mb-4" />
            <p className="font-serif tracking-widest animate-pulse">CARGANDO...</p>
        </div>
    );

    if (error || !chronicle) return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center border border-red-900/30 p-8 rounded bg-neutral-900">
                <h2 className="text-2xl font-serif text-red-600 mb-4">Registro No Encontrado</h2>
                <Link to="/" className="text-neutral-400 hover:text-white underline">Volver al inicio</Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 pb-20">
            {/* HERO HEADER */}
            <div className="relative w-full h-64 md:h-80 overflow-hidden shadow-2xl border-b border-red-900/20">
                <div className="absolute inset-0 bg-black/50 z-10"></div>
                <img 
                    src={chronicle.cover_image || '/images/default-chronicle.jpg'} 
                    alt={chronicle.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent z-20 flex flex-col justify-end p-6 md:p-12">
                    <div className="container mx-auto">
                        <Link to="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-red-500 mb-4 transition-colors">
                            <Icons.ArrowLeft className="w-4 h-4" /> Volver
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-[0_2px_4px_rgba(220,38,38,0.8)] mb-2">
                            {chronicle.title}
                        </h1>
                        {chronicle.storyteller && (
                            <p className="text-red-500 font-mono text-sm uppercase tracking-wider">
                                Narrado por {chronicle.storyteller}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                
                {/* 🔒 BOTÓN DE CREAR - OCULTO PARA PLAYERS */}
                {/* Solo se renderiza si canEdit es true y el formulario no está visible */}
                {canEdit && !showForm && (
                    <div className="flex justify-end mb-8 sticky top-20 z-30">
                        <button 
                            onClick={handleAddNewSection}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg shadow-red-900/20 transition-all hover:scale-105"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            <span className="font-serif tracking-wide">Escribir Nuevo Capítulo</span>
                        </button>
                    </div>
                )}

                {/* FORMULARIO DE EDICIÓN - PROTEGIDO */}
                {canEdit && showForm && (
                    <div id="section-editor" className="mb-12 bg-neutral-900 border border-red-900/30 rounded-lg p-6 animate-fade-in shadow-2xl">
                        <h3 className="text-xl font-serif text-red-500 mb-6 flex items-center gap-2 border-b border-red-900/30 pb-2">
                            {editingSection ? <Icons.Edit className="w-5 h-5" /> : <Icons.Plus className="w-5 h-5" />}
                            {editingSection ? 'Reescribiendo Historia' : 'Nuevo Registro'}
                        </h3>
                        <SectionForm
                            section={editingSection}
                            onSave={handleSaveSection}
                            onCancel={handleCancelForm}
                        />
                    </div>
                )}

                {/* LISTA DE SECCIONES */}
                <div className="space-y-12">
                    {sections.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-lg">
                            <p className="text-neutral-500 font-serif text-lg">Las páginas de esta historia están en blanco.</p>
                            {canEdit && <p className="text-neutral-600 text-sm mt-2">Usa el botón superior para comenzar la crónica.</p>}
                        </div>
                    ) : (
                        sections.map((section, index) => (
                            <div key={section.id} className="relative">
                                {/* Línea de tiempo decorativa */}
                                {index !== sections.length - 1 && (
                                    <div className="absolute left-4 top-16 bottom-[-48px] w-px bg-gradient-to-b from-red-900/50 to-transparent z-0 hidden md:block"></div>
                                )}
                                
                                <ChronicleSection
                                    section={section}
                                    canEdit={canEdit} // Pasamos el permiso al componente hijo
                                    isFirst={index === 0}
                                    isLast={index === sections.length - 1}
                                    onEdit={handleEditSection}
                                    onDelete={handleDeleteSection}
                                    onMoveUp={() => moveSection(section.id, 'up')}
                                    onMoveDown={() => moveSection(section.id, 'down')}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChroniclePage;