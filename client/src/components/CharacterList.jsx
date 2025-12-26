import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTrash, FaUserPlus, FaSkull } from 'react-icons/fa';

function CharacterList({ user }) {
    const [pcs, setPcs] = useState([]);
    const [npcs, setNpcs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChars = () => {
        fetch('/api/characters')
            .then(res => res.json())
            .then(data => {
                setPcs(data.pcs || []);
                setNpcs(data.npcs || []);
                setLoading(false);
            })
            .catch(err => console.error("Error cargando personajes:", err));
    };

    useEffect(() => {
        fetchChars();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("¿Enviar al cementerio? Esta acción es irreversible.")) return;
        await fetch(`/api/characters/${id}`, { method: 'DELETE' });
        fetchChars(); 
    };

    // Sub-componente para la Tarjeta (Estilo Tailwind)
    const CharCard = ({ char, type }) => {
        let disciplines = [];
        try { 
            const parsed = JSON.parse(char.disciplines);
            if (Array.isArray(parsed)) disciplines = parsed;
        } catch (e) { /* Ignorar errores de JSON */ }

        // Colores según tipo (PC = Rojo, NPC = Amarillo)
        const accentColor = type === 'PC' ? 'text-red-500 border-red-900' : 'text-yellow-500 border-yellow-900';
        const borderColor = type === 'PC' ? 'hover:border-red-600' : 'hover:border-yellow-600';

        return (
            <div className={`relative group bg-neutral-900 border border-neutral-800 ${borderColor} rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/50 flex flex-col`}>
                
                {/* Botón Borrar (Solo admin o dueño) */}
                {(user.role === 'admin' || char.created_by === user.username) && (
                    <button 
                        onClick={() => handleDelete(char.id)} 
                        className="absolute top-2 right-2 z-10 p-2 bg-black/50 text-neutral-500 hover:text-red-500 hover:bg-black rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                    >
                        <FaTrash size={12} />
                    </button>
                )}
                
                {/* Imagen y Datos Principales */}
                <div className="flex h-32">
                    {/* Imagen */}
                    <div className="w-1/3 relative">
                        <img 
                            src={char.image_url || 'https://via.placeholder.com/150'} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                            alt={char.name}
                        />
                        <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900`}></div>
                    </div>

                    {/* Info */}
                    <div className="w-2/3 p-3 flex flex-col justify-center">
                        <h5 className={`font-serif text-lg font-bold truncate ${accentColor.split(' ')[0]}`}>
                            {char.name}
                        </h5>
                        <div className="text-xs text-neutral-400 font-serif mb-1 uppercase tracking-wider">
                            {char.clan || 'Caitiff'}
                        </div>
                        <div className="text-xs text-neutral-500 flex gap-2">
                            <span>Gen: {char.generation || '?'}</span>
                            <span>•</span>
                            <span className="truncate">{char.predator_type || 'Depredador'}</span>
                        </div>
                    </div>
                </div>

                {/* Disciplinas (Footer de la carta) */}
                <div className="bg-black/40 p-2 border-t border-neutral-800 flex flex-wrap gap-1 min-h-[40px] items-center">
                    {disciplines.length > 0 ? (
                        disciplines.slice(0, 3).map((d, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] uppercase tracking-wide bg-neutral-800 text-neutral-300 rounded border border-neutral-700">
                                {d.substring(0,3)}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-neutral-600 italic pl-1">Sin disciplinas conocidas</span>
                    )}
                    {disciplines.length > 3 && (
                        <span className="text-[10px] text-neutral-500">+{disciplines.length - 3}</span>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="text-center mt-10 text-red-800 animate-pulse font-serif">Rastreando sangre...</div>;

    return (
        <div className="animate-fade-in pb-10">
            {/* Cabecera y Botón Nuevo */}
            <div className="flex justify-between items-end mb-8 border-b border-neutral-800 pb-4">
                <div>
                    <h2 className="text-3xl font-serif text-neutral-200">Dramatis Personae</h2>
                    <p className="text-neutral-500 text-sm">Registro de Vástagos conocidos en la ciudad.</p>
                </div>
                
                <Link to="/create-char" className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded transition-colors no-underline shadow-lg shadow-red-900/20">
                    <FaUserPlus /> 
                    <span className="font-bold text-sm">ABRAZAR</span>
                </Link>
            </div>

            {/* SECCIÓN 1: COTERIE (PCs) */}
            <div className="mb-12">
                <h3 className="text-xl font-serif text-red-600 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full inline-block"></span>
                    Coterie & Aliados
                </h3>
                
                {pcs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pcs.map(char => <CharCard key={char.id} char={char} type="PC" />)}
                    </div>
                ) : (
                    <div className="p-8 border border-dashed border-neutral-800 rounded text-center text-neutral-600 italic">
                        No hay personajes jugadores registrados.
                    </div>
                )}
            </div>

            {/* SECCIÓN 2: ANTAGONISTAS (NPCs) */}
            <div>
                <h3 className="text-xl font-serif text-yellow-600 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full inline-block"></span>
                    Antagonistas & NPCs
                </h3>
                
                {npcs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {npcs.map(char => <CharCard key={char.id} char={char} type="NPC" />)}
                    </div>
                ) : (
                    <div className="text-neutral-600 text-sm italic pl-4">
                        Las sombras parecen vacías... por ahora.
                    </div>
                )}
            </div>
        </div>
    );
}

export default CharacterList;