import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaUserPlus, FaTimes, FaPlus, FaArrowLeft } from 'react-icons/fa';

import ChronicleSection from './ChronicleSection';
import SectionForm from './SectionForm';

const SagaDetail = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [chronicle, setChronicle] = useState(null);
    const [sections, setSections] = useState([]);
    const [roster, setRoster] = useState([]);
    const [allCharacters, setAllCharacters] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editData, setEditData] = useState({ title: '', cover_image: '' });
    
    const [showSectionForm, setShowSectionForm] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    
    const [showAddChar, setShowAddChar] = useState(false);
    const [selectedCharToAdd, setSelectedCharToAdd] = useState('');

    // 🔒 VERIFICACIÓN DE PERMISOS
    const canEdit = user?.role === 'admin' || user?.role === 'storyteller';
    const isAdmin = user?.role === 'admin';

    // ==========================================
    // 1. CARGA DE DATOS
    // ==========================================
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/chronicles/${id}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Crónica no encontrada');
            
            const data = await response.json();
            setChronicle(data.info);
            setSections(data.sections || []);
            setRoster(data.characters || []);
            
            setEditData({ 
                title: data.info.title, 
                cover_image: data.info.cover_image || '' 
            });

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
        if (canEdit) {
            fetch('/api/characters', { credentials: 'include' })
                .then(res => res.json())
                .then(data => setAllCharacters([...(data.pcs || []), ...(data.npcs || [])]))
                .catch(console.error);
        }
    }, [fetchData, canEdit]);

    // ==========================================
    // 2. GESTIÓN DE CRÓNICA (Info Principal)
    // ==========================================
    const handleSaveInfo = async () => {
        if (!canEdit) {
            alert('No tienes permisos para editar la crónica');
            return;
        }

        if (!editData.title.trim()) return alert("El título es obligatorio");
        
        try {
            const res = await fetch(`/api/chronicles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editData)
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al actualizar');
            }
            
            setIsEditingInfo(false);
            fetchData();
        } catch (err) { 
            alert(err.message); 
        }
    };

    const handleDeleteChronicle = async () => {
        if (!isAdmin) {
            alert('Solo los administradores pueden eliminar crónicas');
            return;
        }

        if (!window.confirm("⚠️ ¿Borrar esta crónica y toda su historia permanentemente?")) return;
        
        try {
            const res = await fetch(`/api/chronicles/${id}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al eliminar');
            }
            
            navigate('/');
        } catch (err) { 
            alert(err.message); 
        }
    };

    // ==========================================
    // 3. GESTIÓN DE PERSONAJES (Roster)
    // ==========================================
    const handleAddCharacter = async () => {
        if (!canEdit) {
            alert('No tienes permisos para añadir personajes');
            return;
        }

        if (!selectedCharToAdd) return;
        
        try {
            const res = await fetch(`/api/chronicles/${id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ character_id: selectedCharToAdd })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al agregar');
            }
            
            setShowAddChar(false);
            setSelectedCharToAdd('');
            fetchData();
        } catch (err) { 
            alert(err.message || 'Error al agregar personaje'); 
        }
    };

    const handleRemoveCharacter = async (charId) => {
        if (!canEdit) {
            alert('No tienes permisos para remover personajes');
            return;
        }

        if (!window.confirm("¿Sacar a este personaje de la crónica?")) return;
        
        try {
            const res = await fetch(`/api/chronicles/${id}/roster/${charId}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al remover');
            }
            
            fetchData();
        } catch (err) { 
            alert(err.message || 'Error al remover personaje'); 
        }
    };

    // ==========================================
    // 4. GESTIÓN DE SECCIONES (Capítulos)
    // ==========================================
    
    const handleSaveSection = async (formData) => {
        if (!canEdit) {
            alert('No tienes permisos para editar secciones');
            return;
        }

        try {
            const url = editingSection
                ? `/api/chronicles/sections/${editingSection.id}`
                : `/api/chronicles/${id}/sections`;
            
            const method = editingSection ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al guardar sección');
            }
            
            await fetchData();
            setShowSectionForm(false);
            setEditingSection(null);
        } catch (err) { 
            console.error(err);
            alert(err.message || "Error al guardar"); 
        }
    };

    const handleDeleteSection = async (secId) => {
        if (!canEdit) return;

        if (!window.confirm("¿Borrar este capítulo permanentemente?")) return;
        
        try {
            const res = await fetch(`/api/chronicles/sections/${secId}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al eliminar');
            }
            
            fetchData();
        } catch (err) { 
            alert(err.message); 
        }
    };

    const handleMoveSection = async (secId, direction) => {
        if (!canEdit) return;

        try {
            const res = await fetch(`/api/chronicles/sections/${secId}/move-${direction}`, { 
                method: 'PUT',
                credentials: 'include'
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'No se pudo mover');
            }
            
            fetchData();
        } catch (err) { 
            alert(err.message); 
        }
    };

    const openNewSection = () => {
        if (!canEdit) return;
        
        setEditingSection(null);
        setShowSectionForm(true);
        setTimeout(() => document.getElementById('section-form-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const openEditSection = (section) => {
        if (!canEdit) return;
        
        setEditingSection(section);
        setShowSectionForm(true);
        setTimeout(() => document.getElementById('section-form-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // ==========================================
    // 5. RENDERIZADO
    // ==========================================
    
    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mb-4"></div>
        </div>
    );

    if (error || !chronicle) return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-red-500 gap-4">
            <h2 className="text-2xl font-serif">{error || 'Crónica no encontrada'}</h2>
            <Link to="/" className="text-neutral-400 hover:text-white underline">Volver al inicio</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 pb-24 animate-fade-in">
            
            <Link to="/" className="md:hidden fixed top-4 left-4 z-50 bg-neutral-900 p-2 rounded-full border border-neutral-700 text-neutral-400 shadow-lg">
                <FaArrowLeft />
            </Link>

            {/* --- CABECERA --- */}
            <div className="max-w-6xl mx-auto relative mb-12">
                <div className="h-64 md:h-96 w-full overflow-hidden rounded-xl border-b-4 border-red-900 relative shadow-2xl group bg-black">
                    <img 
                        src={chronicle.cover_image || 'https://via.placeholder.com/800x400?text=Sin+Imagen'} 
                        alt="Portada"
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent"></div>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                        {isEditingInfo ? (
                            <div className="bg-black/90 p-6 rounded-lg backdrop-blur-md border border-red-900/30">
                                <label className="text-xs text-neutral-500 uppercase font-bold">Título</label>
                                <input 
                                    className="w-full bg-transparent text-3xl font-serif text-red-500 border-b border-red-900 focus:outline-none mb-4"
                                    value={editData.title}
                                    onChange={e => setEditData({...editData, title: e.target.value})}
                                />
                                <label className="text-xs text-neutral-500 uppercase font-bold">URL Portada</label>
                                <input 
                                    className="w-full bg-neutral-800 text-sm text-neutral-300 p-2 rounded mb-4 border border-neutral-700 focus:border-red-600 outline-none"
                                    value={editData.cover_image}
                                    onChange={e => setEditData({...editData, cover_image: e.target.value})}
                                />
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setIsEditingInfo(false)} className="px-4 py-2 text-sm bg-neutral-700 rounded hover:bg-neutral-600">Cancelar</button>
                                    <button onClick={handleSaveInfo} className="px-4 py-2 text-sm bg-red-900 text-white rounded hover:bg-red-800 shadow-lg">Guardar</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-end">
                                <h1 className="text-4xl md:text-6xl font-serif text-red-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wide">
                                    {chronicle.title}
                                </h1>
                                {/* 🔒 BOTONES SOLO PARA QUIEN PUEDE EDITAR */}
                                {canEdit && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditingInfo(true)} className="p-3 bg-neutral-900/80 text-yellow-600 rounded-full border border-yellow-900/30 hover:bg-yellow-900/20 transition-all"><FaEdit /></button>
                                        {/* Solo admin puede borrar */}
                                        {isAdmin && (
                                            <button onClick={handleDeleteChronicle} className="p-3 bg-neutral-900/80 text-red-600 rounded-full border border-red-900/30 hover:bg-red-900/20 transition-all"><FaTrash /></button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- HISTORIA --- */}
                <div className="lg:col-span-2 space-y-12">
                    
                    {/* 🔒 BOTÓN AGREGAR - Solo si puede editar */}
                    {canEdit && !showSectionForm && (
                        <button 
                            onClick={openNewSection}
                            className="w-full py-6 border-2 border-dashed border-neutral-800 hover:border-red-900/50 text-neutral-500 hover:text-red-500 rounded-lg flex flex-col items-center gap-2 transition-all bg-neutral-900/20 hover:bg-neutral-900/50 group"
                        >
                            <FaPlus size={24} className="group-hover:scale-110 transition-transform" />
                            <span className="font-serif text-lg">Escribir nuevo capítulo</span>
                        </button>
                    )}

                    <div id="section-form-anchor">
                        {canEdit && showSectionForm && (
                            <SectionForm 
                                section={editingSection}
                                onSave={handleSaveSection}
                                onCancel={() => { setShowSectionForm(false); setEditingSection(null); }}
                            />
                        )}
                    </div>

                    <div className="space-y-12">
                        {sections.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500 bg-neutral-900/20 rounded border border-neutral-800 border-dashed">
                                <p className="text-xl font-serif italic">Aún no hay capítulos escritos.</p>
                            </div>
                        ) : (
                            sections.map((sec, index) => (
                                <ChronicleSection 
                                    key={sec.id}
                                    section={sec}
                                    isAdmin={canEdit}  // Pasamos canEdit
                                    isFirst={index === 0}
                                    isLast={index === sections.length - 1}
                                    onEdit={openEditSection}
                                    onDelete={handleDeleteSection}
                                    onMoveUp={(id) => handleMoveSection(id, 'up')}
                                    onMoveDown={(id) => handleMoveSection(id, 'down')}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* --- DRAMATIS PERSONAE --- */}
                <aside className="space-y-8">
                    <div className="bg-neutral-900/50 p-6 rounded-lg border border-red-900/10 sticky top-24 shadow-xl">
                        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                            <h3 className="text-xl font-serif text-red-500">Dramatis Personae</h3>
                            {/* 🔒 BOTÓN AÑADIR - Solo si puede editar */}
                            {canEdit && (
                                <button onClick={() => setShowAddChar(!showAddChar)} className="text-neutral-500 hover:text-red-500 transition-colors">
                                    {showAddChar ? <FaTimes /> : <FaUserPlus />}
                                </button>
                            )}
                        </div>

                        {showAddChar && canEdit && (
                            <div className="mb-6 bg-black/40 p-3 rounded border border-neutral-700 animate-fade-in">
                                <select 
                                    className="w-full bg-neutral-800 text-neutral-300 p-2 rounded mb-2 text-sm border border-neutral-700 focus:border-red-900 outline-none"
                                    value={selectedCharToAdd}
                                    onChange={e => setSelectedCharToAdd(e.target.value)}
                                >
                                    <option value="">Selecciona un vástago...</option>
                                    {allCharacters
                                        .filter(c => !roster.find(r => r.id === c.id))
                                        .map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.clan})
                                            </option>
                                        ))
                                    }
                                </select>
                                <button onClick={handleAddCharacter} disabled={!selectedCharToAdd} className="w-full py-1 bg-red-900/50 hover:bg-red-900 text-xs text-red-100 rounded transition-colors disabled:opacity-50">
                                    Invocar
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {roster.length === 0 ? (
                                <p className="text-neutral-600 italic text-sm text-center py-4">
                                    Nadie se ha presentado aún...
                                </p>
                            ) : (
                                roster.map(char => (
                                    <div key={char.id} className="group flex items-center gap-3 bg-black/20 p-2 rounded hover:bg-red-900/10 transition-colors relative border border-transparent hover:border-red-900/30">
                                        <Link to={`/character/${char.id}`} className="flex items-center gap-3 flex-1 no-underline">
                                            <img 
                                                src={char.image_url || 'https://via.placeholder.com/50'} 
                                                alt={char.name}
                                                className="w-10 h-10 rounded-full object-cover border border-neutral-700 group-hover:border-red-800 transition-colors"
                                            />
                                            <div>
                                                <p className="font-serif text-neutral-200 text-sm group-hover:text-red-400 transition-colors">{char.name}</p>
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{char.clan}</p>
                                            </div>
                                        </Link>
                                        
                                        {/* 🔒 BOTÓN REMOVER - Solo si puede editar */}
                                        {canEdit && (
                                            <button onClick={() => handleRemoveCharacter(char.id)} className="text-neutral-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Sacar de la crónica">
                                                <FaTimes size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
};

export default SagaDetail;