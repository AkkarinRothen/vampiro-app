// ============================================
// SagaDetail.jsx - Mejorado
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// Como están en la misma carpeta 'components', usamos ./
import ChronicleSection from './ChronicleSection';
import SectionForm from './SectionForm';

function SagaDetail({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Estado de datos
    const [chronicle, setChronicle] = useState(null);
    const [sections, setSections] = useState([]);
    const [roster, setRoster] = useState([]);
    const [allCharacters, setAllCharacters] = useState([]);
    
    // Estados de UI
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAddChar, setShowAddChar] = useState(false);
    const [selectedCharToAdd, setSelectedCharToAdd] = useState('');
    const [showSectionForm, setShowSectionForm] = useState(false);
    
    // Estado de formularios
    const [editData, setEditData] = useState({ title: '', cover_image: '' });
    const [newSection, setNewSection] = useState({ title: '', content: '', image_url: '' });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`/api/chronicles/${id}`);
            
            if (!response.ok) {
                throw new Error('Crónica no encontrada');
            }
            
            const data = await response.json();
            
            setChronicle(data.info);
            setSections(data.sections || []);
            setRoster(data.characters || []);
            setEditData({ 
                title: data.info.title, 
                cover_image: data.info.cover_image || '' 
            });
        } catch (err) {
            console.error('Error fetching chronicle:', err);
            setError(err.message);
            
            // Redirigir al home después de 3 segundos
            setTimeout(() => navigate('/'), 3000);
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    const fetchAllCharacters = useCallback(async () => {
        try {
            const response = await fetch('/api/characters');
            const data = await response.json();
            
            // Combinar PCs y NPCs
            setAllCharacters([...(data.pcs || []), ...(data.npcs || [])]);
        } catch (err) {
            console.error('Error fetching characters:', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
        if (user?.role === 'admin') {
            fetchAllCharacters();
        }
    }, [fetchData, fetchAllCharacters, user]);

    // --- GESTIÓN DE ELENCO (ROSTER) ---
    const handleAddCharacter = async () => {
        if (!selectedCharToAdd) {
            alert('Selecciona un personaje');
            return;
        }
        
        try {
            const response = await fetch(`/api/chronicles/${id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_id: selectedCharToAdd })
            });
            
            if (!response.ok) {
                throw new Error('Error al agregar personaje');
            }
            
            await fetchData();
            setShowAddChar(false);
            setSelectedCharToAdd('');
        } catch (err) {
            console.error('Error adding character:', err);
            alert('Error al agregar el personaje');
        }
    };

    const handleRemoveCharacter = async (charId) => {
        if (!window.confirm("¿Sacar a este personaje de la crónica?")) return;
        
        try {
            const response = await fetch(`/api/chronicles/${id}/roster/${charId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Error al remover personaje');
            }
            
            await fetchData();
        } catch (err) {
            console.error('Error removing character:', err);
            alert('Error al remover el personaje');
        }
    };

    // --- EDITOR DE TEXTO ---
    const insertTag = (field, tagStart, tagEnd = '') => {
        const textarea = document.getElementById(field);
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = newSection[field] || '';
        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);
        
        const newText = `${before}${tagStart}${selected}${tagEnd}${after}`;
        setNewSection({ ...newSection, [field]: newText });
        
        // Mantener el foco en el textarea
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + tagStart.length, 
                start + tagStart.length + selected.length
            );
        }, 0);
    };

    const renderContent = (content) => {
        // Sanitizar y convertir saltos de línea
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

    // --- GESTIÓN DE CRÓNICA ---
    const handleSaveChronicle = async () => {
        if (!editData.title.trim()) {
            alert('El título es obligatorio');
            return;
        }
        
        try {
            const response = await fetch(`/api/chronicles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editData.title.trim(),
                    cover_image: editData.cover_image.trim() || null
                })
            });
            
            if (!response.ok) {
                throw new Error('Error al actualizar crónica');
            }
            
            setIsEditing(false);
            await fetchData();
        } catch (err) {
            console.error('Error saving chronicle:', err);
            alert('Error al guardar los cambios');
        }
    };

    const handleDeleteChronicle = async () => {
        if (!window.confirm("⚠️ ¿Borrar esta crónica permanentemente? Esta acción no se puede deshacer.")) return;
        
        try {
            const response = await fetch(`/api/chronicles/${id}`, { 
                method: 'DELETE' 
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar crónica');
            }
            
            navigate('/');
        } catch (err) {
            console.error('Error deleting chronicle:', err);
            alert('Error al eliminar la crónica');
        }
    };

    // --- GESTIÓN DE SECCIONES ---
    const handleAddSection = async (e) => {
        e.preventDefault();
        
        if (!newSection.title.trim()) {
            alert('El título del capítulo es obligatorio');
            return;
        }
        
        try {
            const response = await fetch(`/api/chronicles/${id}/sections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newSection.title.trim(),
                    content: newSection.content.trim() || '',
                    image_url: newSection.image_url.trim() || null
                })
            });
            
            if (!response.ok) {
                throw new Error('Error al crear sección');
            }
            
            setNewSection({ title: '', content: '', image_url: '' });
            setShowSectionForm(false);
            await fetchData();
        } catch (err) {
            console.error('Error adding section:', err);
            alert('Error al crear el capítulo');
        }
    };
    
    const handleDeleteSection = async (secId) => {
        if (!window.confirm("¿Borrar este capítulo?")) return;
        
        try {
            const response = await fetch(`/api/chronicles/sections/${secId}`, { 
                method: 'DELETE' 
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar sección');
            }
            
            await fetchData();
        } catch (err) {
            console.error('Error deleting section:', err);
            alert('Error al eliminar el capítulo');
        }
    };

    // Estados de carga y error
    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Cargando crónica...</p>
                </div>
            </div>
        );
    }

    if (error || !chronicle) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center text-red-500">
                    <p className="text-xl mb-2">{error || 'Crónica no encontrada'}</p>
                    <p className="text-sm text-neutral-400 mb-4">Redirigiendo al inicio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 pb-20">
            {/* PORTADA Y TÍTULO */}
            <div className="max-w-5xl mx-auto relative mb-12">
                <div className="h-64 md:h-96 w-full overflow-hidden rounded-xl border-b-4 border-red-900 relative shadow-2xl group">
                    <img 
                        src={chronicle.cover_image || 'https://via.placeholder.com/800x400/1a1a1a/666666?text=Sin+Imagen'} 
                        alt={`Portada de ${chronicle.title}`}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent"></div>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                        {isEditing ? (
                            <div className="bg-black/90 p-6 rounded-lg backdrop-blur-md border border-red-900/30">
                                <input 
                                    type="text"
                                    value={editData.title}
                                    onChange={e => setEditData({...editData, title: e.target.value})}
                                    className="w-full bg-transparent text-3xl font-serif text-red-500 border-b border-red-900 focus:outline-none mb-4"
                                    placeholder="Título de la crónica"
                                    required
                                />
                                <input 
                                    type="url"
                                    value={editData.cover_image}
                                    onChange={e => setEditData({...editData, cover_image: e.target.value})}
                                    placeholder="URL de imagen de portada"
                                    className="w-full bg-neutral-800 text-sm text-neutral-300 p-2 rounded mb-4"
                                />
                                <div className="flex gap-3 justify-end">
                                    <button 
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditData({ 
                                                title: chronicle.title, 
                                                cover_image: chronicle.cover_image || '' 
                                            });
                                        }} 
                                        className="px-4 py-2 text-sm bg-neutral-700 rounded hover:bg-neutral-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSaveChronicle} 
                                        className="px-4 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-600 shadow-lg shadow-red-900/20 transition-colors"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-end">
                                <h1 className="text-4xl md:text-6xl font-serif text-red-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wide">
                                    {chronicle.title}
                                </h1>
                                {user?.role === 'admin' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsEditing(true)} 
                                            className="p-3 bg-neutral-900/80 hover:bg-yellow-900/30 text-yellow-600 rounded-full border border-yellow-900/30 transition-all"
                                            title="Editar crónica"
                                            aria-label="Editar crónica"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button 
                                            onClick={handleDeleteChronicle} 
                                            className="p-3 bg-neutral-900/80 hover:bg-red-900/30 text-red-600 rounded-full border border-red-900/30 transition-all"
                                            title="Eliminar crónica"
                                            aria-label="Eliminar crónica"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMNA IZQUIERDA: HISTORIA (2/3 ancho) */}
                <div className="lg:col-span-2 space-y-12">
                    {sections.length === 0 && user?.role !== 'admin' ? (
                        <div className="text-center py-12 text-neutral-500">
                            <p className="text-xl font-serif">Aún no hay capítulos escritos</p>
                            <p className="text-sm mt-2">La historia está por comenzar...</p>
                        </div>
                    ) : (
                        sections.map(sec => (
                            <article 
                                key={sec.id} 
                                className="relative bg-neutral-900/20 p-8 rounded-lg border-l-2 border-red-900/20 hover:border-red-900/60 transition-colors"
                            >
                                {user?.role === 'admin' && (
                                    <button 
                                        onClick={() => handleDeleteSection(sec.id)}
                                        className="absolute top-4 right-4 text-neutral-700 hover:text-red-500 transition-colors"
                                        title="Borrar capítulo"
                                        aria-label={`Borrar capítulo ${sec.title}`}
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                )}
                                
                                <h2 className="text-3xl font-serif text-neutral-200 mb-6 flex items-center gap-3">
                                    <span className="text-red-900 text-2xl">§</span> {sec.title}
                                </h2>
                                
                                {sec.image_url && (
                                    <img 
                                        src={sec.image_url} 
                                        alt={`Ilustración de ${sec.title}`}
                                        className="w-full rounded mb-8 border border-neutral-800 shadow-lg opacity-90 hover:opacity-100 transition-opacity"
                                        loading="lazy"
                                    />
                                )}
                                
                                <div 
                                    className="text-neutral-400 leading-relaxed font-sans text-lg prose prose-invert max-w-none text-justify"
                                    dangerouslySetInnerHTML={renderContent(sec.content || '')} 
                                />
                            </article>
                        ))
                    )}

                    {/* FORMULARIO NUEVA SECCIÓN */}
                    {user?.role === 'admin' && (
                        <div className="pt-8 border-t border-neutral-900">
                            {!showSectionForm ? (
                                <button 
                                    onClick={() => setShowSectionForm(true)}
                                    className="w-full py-6 border-2 border-dashed border-neutral-800 hover:border-red-900/50 text-neutral-500 hover:text-red-500 rounded-lg flex flex-col items-center gap-2 transition-all group"
                                >
                                    <FaPlus size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="font-serif text-lg">Escribir nuevo capítulo</span>
                                </button>
                            ) : (
                                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 shadow-2xl">
                                    <h3 className="text-xl font-serif text-red-500 mb-6 border-b border-neutral-800 pb-2">
                                        Nuevo Capítulo
                                    </h3>
                                    <form onSubmit={handleAddSection} className="space-y-4">
                                        <input 
                                            type="text" 
                                            placeholder="Título del Capítulo" 
                                            className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded text-neutral-200 focus:border-red-900 outline-none text-lg"
                                            value={newSection.title}
                                            onChange={e => setNewSection({...newSection, title: e.target.value})}
                                            required
                                        />
                                        
                                        <div className="flex gap-1 bg-neutral-950 p-2 rounded-t border-x border-t border-neutral-800">
                                            <button 
                                                type="button" 
                                                onClick={() => insertTag('content', '<b>', '</b>')} 
                                                className="p-2 hover:bg-neutral-800 rounded text-neutral-400 transition-colors" 
                                                title="Negrita"
                                            >
                                                <FaBold />
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => insertTag('content', '<i>', '</i>')} 
                                                className="p-2 hover:bg-neutral-800 rounded text-neutral-400 transition-colors" 
                                                title="Cursiva"
                                            >
                                                <FaItalic />
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => insertTag('content', '<h3>', '</h3>')} 
                                                className="p-2 hover:bg-neutral-800 rounded text-neutral-400 transition-colors" 
                                                title="Subtítulo"
                                            >
                                                <FaHeading />
                                            </button>
                                        </div>
                                        
                                        <textarea 
                                            id="content"
                                            placeholder="Relata los hechos..." 
                                            className="w-full bg-neutral-950 border border-neutral-800 p-4 rounded-b min-h-[250px] text-neutral-300 focus:border-red-900 outline-none font-sans leading-relaxed"
                                            value={newSection.content}
                                            onChange={e => setNewSection({...newSection, content: e.target.value})}
                                            required
                                        />

                                        <input 
                                            type="url"
                                            placeholder="URL de Imagen (Opcional)" 
                                            className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm text-neutral-400 focus:border-red-900 outline-none"
                                            value={newSection.image_url}
                                            onChange={e => setNewSection({...newSection, image_url: e.target.value})}
                                        />

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setShowSectionForm(false);
                                                    setNewSection({ title: '', content: '', image_url: '' });
                                                }} 
                                                className="px-5 py-2 text-neutral-500 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded shadow-lg transition-all"
                                            >
                                                Publicar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: DRAMATIS PERSONAE (1/3 ancho) */}
                <aside className="space-y-8">
                    <div className="bg-neutral-900/50 p-6 rounded-lg border border-red-900/10 sticky top-8">
                        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                            <h3 className="text-xl font-serif text-red-500">Dramatis Personae</h3>
                            {user?.role === 'admin' && (
                                <button 
                                    onClick={() => setShowAddChar(!showAddChar)} 
                                    className="text-neutral-500 hover:text-red-500 transition-colors"
                                    title="Añadir personaje existente"
                                    aria-label={showAddChar ? "Cancelar" : "Añadir personaje"}
                                >
                                    {showAddChar ? <FaTimes /> : <FaUserPlus />}
                                </button>
                            )}
                        </div>

                        {/* SELECTOR DE AÑADIR (Solo Admin) */}
                        {showAddChar && (
                            <div className="mb-6 bg-black/40 p-3 rounded border border-neutral-700">
                                <select 
                                    className="w-full bg-neutral-800 text-neutral-300 p-2 rounded mb-2 text-sm outline-none border border-neutral-700 focus:border-red-900"
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
                                    ))}
                                </select>
                                <button 
                                    onClick={handleAddCharacter}
                                    disabled={!selectedCharToAdd}
                                    className="w-full py-1 bg-red-900/50 hover:bg-red-900 text-xs text-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Invocar a la Crónica
                                </button>
                            </div>
                        )}

                        {/* LISTA DE PERSONAJES */}
                        <div className="space-y-4">
                            {roster.length === 0 ? (
                                <p className="text-neutral-600 italic text-sm text-center py-4">
                                    Nadie se ha presentado aún...
                                </p>
                            ) : (
                                roster.map(char => (
                                    <div 
                                        key={char.id} 
                                        className="group flex items-center gap-3 bg-black/20 p-2 rounded hover:bg-red-900/10 transition-colors relative"
                                    >
                                        <Link 
                                            to={`/character/${char.id}`} 
                                            className="flex items-center gap-3 flex-1"
                                        >
                                            <img 
                                                src={char.image_url || 'https://via.placeholder.com/50/1a1a1a/666666?text=?'} 
                                                alt={char.name}
                                                className="w-10 h-10 rounded-full object-cover border border-neutral-700 group-hover:border-red-800 transition-colors"
                                                loading="lazy"
                                            />
                                            <div>
                                                <p className="font-serif text-neutral-200 text-sm group-hover:text-red-400 transition-colors">
                                                    {char.name}
                                                </p>
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                                                    {char.clan}
                                                </p>
                                            </div>
                                        </Link>
                                        
                                        {user?.role === 'admin' && (
                                            <button 
                                                onClick={() => handleRemoveCharacter(char.id)}
                                                className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                                                title="Sacar de la crónica"
                                                aria-label={`Remover ${char.name}`}
                                            >
                                                <FaTimes size={14} />
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
}

export default SagaDetail;