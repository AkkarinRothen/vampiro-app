import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaSave, FaEyeSlash, FaEye, FaSkull, FaUserTie, FaArrowLeft } from 'react-icons/fa';

function CharacterDetail({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Estados
    const [char, setChar] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Estado del formulario
    const [formData, setFormData] = useState({
        name: '', clan: '', generation: '', type: '', 
        image_url: '', disciplines: [], predator_type: '',
        is_hidden: false, creature_type: 'vampire'
    });

    useEffect(() => {
        fetchChar();
    }, [id]);

    const fetchChar = async () => {
        setIsLoading(true);
        try {
            // Intentamos obtener el personaje individual
            const res = await fetch(`/api/characters/${id}`); 
            
            if (res.ok) {
                const data = await res.json();
                setupChar(data);
            } else {
                // Fallback: Si falla, buscamos en la lista completa (seguridad)
                const all = await fetch('/api/characters');
                const data = await all.json();
                const found = [...data.pcs, ...data.npcs].find(c => c.id === parseInt(id));
                
                if (found) { 
                    setupChar(found); 
                } else {
                    console.error("Personaje no encontrado");
                    navigate('/characters');
                }
            }
        } catch (err) { 
            console.error(err); 
        } finally {
            setIsLoading(false);
        }
    };

    const setupChar = (data) => {
        setChar(data);
        setFormData({
            name: data.name,
            clan: data.clan,
            generation: data.generation || '',
            type: data.type,
            image_url: data.image_url,
            disciplines: typeof data.disciplines === 'string' ? JSON.parse(data.disciplines) : data.disciplines || [],
            predator_type: data.predator_type || '',
            is_hidden: data.is_hidden || false,
            creature_type: data.creature_type || 'vampire'
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/characters/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            const updated = await res.json();
            setupChar(updated);
            setIsEditing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de eliminar a este personaje para siempre? No habrá vuelta atrás.")) return;
        await fetch(`/api/characters/${id}`, { method: 'DELETE' });
        navigate('/characters');
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-red-800 font-serif animate-pulse">Invocando presencia...</div>;
    if (!char) return null;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 flex justify-center p-4 md:p-10 animate-fade-in pb-20">
            
            {/* Botón Volver (Móvil) */}
            <button onClick={() => navigate('/characters')} className="fixed top-4 left-4 z-50 md:hidden bg-neutral-900 p-2 rounded-full border border-neutral-700 shadow-lg text-neutral-400">
                <FaArrowLeft />
            </button>

            <div className="w-full max-w-6xl bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col lg:flex-row h-fit">
                
                {/* COLUMNA IZQUIERDA: IMAGEN */}
                <div className="lg:w-5/12 relative h-[50vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-neutral-800 group bg-black">
                    <img 
                        src={formData.image_url || 'https://via.placeholder.com/600x800?text=Sin+Imagen'} 
                        alt="Character" 
                        className="w-full h-full object-cover opacity-90 transition-opacity duration-500 hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-80"></div>
                    
                    {/* Botones Admin (Siempre visibles en escritorio, flotantes) */}
                    {user?.role === 'admin' && !isEditing && (
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="p-3 bg-neutral-900/90 text-yellow-500 hover:text-white hover:bg-yellow-600 rounded-full border border-neutral-600 shadow-lg transition-all"
                                title="Editar Personaje"
                            >
                                <FaEdit />
                            </button>
                            <button 
                                onClick={handleDelete} 
                                className="p-3 bg-neutral-900/90 text-red-600 hover:text-white hover:bg-red-600 rounded-full border border-neutral-600 shadow-lg transition-all"
                                title="Borrar Personaje"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    )}

                    {/* Badges de Estado */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                         {char.is_hidden && (
                            <div className="bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded backdrop-blur shadow-lg flex items-center gap-2 border border-red-400">
                                <FaEyeSlash /> EN BÓVEDA
                            </div>
                        )}
                        {char.creature_type === 'human' && (
                            <div className="bg-blue-900/90 text-blue-100 text-xs font-bold px-3 py-1.5 rounded backdrop-blur shadow-lg border border-blue-400">
                                MORTAL
                            </div>
                        )}
                        {char.creature_type === 'ghoul' && (
                            <div className="bg-orange-900/90 text-orange-100 text-xs font-bold px-3 py-1.5 rounded backdrop-blur shadow-lg border border-orange-400">
                                GHOUL
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: DATOS */}
                <div className="lg:w-7/12 p-6 md:p-10 flex flex-col">
                    
                    {isEditing ? (
                        /* --- MODO EDICIÓN --- */
                        <form onSubmit={handleUpdate} className="space-y-6 flex-1">
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                                <h2 className="text-2xl font-serif text-red-500">Editando Ficha</h2>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm text-neutral-300">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800 text-sm flex items-center gap-2 shadow-lg"><FaSave /> Guardar Cambios</button>
                                </div>
                            </div>

                            {/* PANEL DE CONTROL NARRADOR */}
                            <div className="bg-black/30 p-5 rounded-lg border border-red-900/30">
                                <label className="text-xs text-red-500 font-bold uppercase mb-3 block tracking-wider">Permisos de Realidad</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, is_hidden: !formData.is_hidden})} 
                                        className={`p-3 rounded border text-sm flex items-center justify-center gap-2 transition-all font-bold ${formData.is_hidden ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-green-900/20 border-green-700 text-green-400 hover:bg-green-900/40'}`}
                                    >
                                        {formData.is_hidden ? <><FaEyeSlash /> Oculto (Solo Admin)</> : <><FaEye /> Visible (Público)</>}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData({...formData, creature_type: formData.creature_type === 'vampire' ? 'human' : 'vampire'})} 
                                        className={`p-3 rounded border text-sm flex items-center justify-center gap-2 transition-all font-bold ${formData.creature_type === 'vampire' ? 'bg-neutral-800 border-neutral-600 text-neutral-300' : 'bg-blue-900/30 border-blue-500 text-blue-200'}`}
                                    >
                                        {formData.creature_type === 'vampire' ? <><FaSkull /> Es un Vástago</> : <><FaUserTie /> Es Mortal / Ghoul</>}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-neutral-500 font-bold uppercase">Nombre</label>
                                        <input className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded focus:border-red-600 outline-none transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-neutral-500 font-bold uppercase">{formData.creature_type === 'vampire' ? 'Clan' : 'Concepto / Trabajo'}</label>
                                        <input className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded focus:border-red-600 outline-none transition-colors" value={formData.clan} onChange={e => setFormData({...formData, clan: e.target.value})} />
                                    </div>
                                </div>
                                
                                {formData.creature_type === 'vampire' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-neutral-500 font-bold uppercase">Generación</label>
                                            <input type="number" className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded focus:border-red-600 outline-none transition-colors" value={formData.generation} onChange={e => setFormData({...formData, generation: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-neutral-500 font-bold uppercase">Tipo de Depredador</label>
                                            <input className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded focus:border-red-600 outline-none transition-colors" value={formData.predator_type} onChange={e => setFormData({...formData, predator_type: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-500 font-bold uppercase">URL de Imagen</label>
                                    <input className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded focus:border-red-600 outline-none text-sm transition-colors" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} />
                                </div>
                            </div>
                        </form>
                    ) : (
                        /* --- MODO LECTURA --- */
                        <div className="flex-1 flex flex-col justify-center space-y-8">
                            <div>
                                <h1 className="text-5xl md:text-7xl font-serif text-red-600 mb-4 drop-shadow-lg tracking-tight leading-none">{char.name}</h1>
                                
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-2xl font-bold tracking-[0.2em] uppercase text-neutral-300">{char.clan}</span>
                                    
                                    <div className="h-6 w-px bg-neutral-700 mx-2"></div>
                                    
                                    {char.creature_type === 'vampire' && char.generation && (
                                        <span className="bg-neutral-800 text-neutral-400 text-xs px-3 py-1 rounded border border-neutral-700 font-bold tracking-widest">
                                            {char.generation}ª GENERACIÓN
                                        </span>
                                    )}
                                    {char.type === 'PC' && (
                                        <span className="bg-yellow-900/30 text-yellow-500 text-xs px-3 py-1 rounded border border-yellow-800 font-bold tracking-widest">
                                            JUGADOR
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8 mt-8">
                                {/* Bloque de Info */}
                                <div className="bg-neutral-950/50 p-6 rounded-lg border border-neutral-800 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
                                    <h3 className="text-red-500 font-serif border-b border-neutral-800 mb-4 pb-2 uppercase tracking-widest text-sm font-bold">Datos Esenciales</h3>
                                    <ul className="space-y-4 text-sm text-neutral-400">
                                        <li className="flex justify-between border-b border-neutral-900 pb-2">
                                            <span className="text-neutral-600 uppercase font-bold text-xs">Arquetipo</span> 
                                            <span className="text-neutral-300">{char.predator_type || 'Desconocido'}</span>
                                        </li>
                                        <li className="flex justify-between border-b border-neutral-900 pb-2">
                                            <span className="text-neutral-600 uppercase font-bold text-xs">Rol</span> 
                                            <span className="text-neutral-300">{char.type === 'PC' ? 'Personaje Jugador' : 'Personaje Narrador'}</span>
                                        </li>
                                        <li className="flex justify-between border-b border-neutral-900 pb-2">
                                            <span className="text-neutral-600 uppercase font-bold text-xs">Visibilidad</span> 
                                            <span className={char.is_hidden ? "text-red-500 font-bold" : "text-green-500"}>
                                                {char.is_hidden ? 'Solo Admin' : 'Público'}
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Disciplinas (Solo Vampiros) */}
                                {char.creature_type === 'vampire' && (
                                    <div className="bg-neutral-950/50 p-6 rounded-lg border border-neutral-800 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-900/50"></div>
                                        <h3 className="text-red-500 font-serif border-b border-neutral-800 mb-4 pb-2 uppercase tracking-widest text-sm font-bold">Poderes de la Sangre</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {char.disciplines && char.disciplines.length > 0 ? (
                                                char.disciplines.map((d, i) => (
                                                    <span key={i} className="text-xs bg-red-950/30 text-red-400 px-4 py-2 rounded border border-red-900/20 uppercase tracking-widest font-bold hover:bg-red-900/20 transition-colors cursor-default">
                                                        {d.name || d}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-neutral-600 italic">No se han registrado disciplinas.</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CharacterDetail;