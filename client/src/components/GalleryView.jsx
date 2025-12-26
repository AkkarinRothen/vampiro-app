import { useState, useEffect } from 'react';
import { FaTimes, FaStar, FaSkull } from 'react-icons/fa';

// Recibimos 'user' para saber si puede editar las estrellas
function GalleryView({ user }) { 
    const [chars, setChars] = useState([]);
    const [selectedChar, setSelectedChar] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChars();
    }, []);

    const fetchChars = () => {
        fetch('/api/characters')
            .then(res => res.json())
            .then(data => {
                setChars(data.pcs || []);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    // Función para guardar estrellas
    const handleRate = async (e, charId, rating) => {
        e.stopPropagation(); // Evitar abrir el modal si clicamos en la tarjeta
        if (user?.role !== 'admin') return; // Solo admin puede votar

        // Actualizamos visualmente rápido (Optimistic UI)
        const updatedChars = chars.map(c => c.id === charId ? { ...c, stars: rating } : c);
        setChars(updatedChars);
        if (selectedChar && selectedChar.id === charId) {
            setSelectedChar({ ...selectedChar, stars: rating });
        }

        // Guardamos en el servidor
        await fetch(`/api/characters/${charId}/rate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stars: rating })
        });
    };

    const getDisciplines = (jsonString) => {
        try { return JSON.parse(jsonString) || []; } catch { return []; }
    };

    // Componente de Estrellas Reutilizable
    const StarRating = ({ stars, charId, size = "text-sm" }) => (
        <div className={`flex gap-1 ${size} text-yellow-600`}>
            {[1, 2, 3, 4, 5].map((starIndex) => (
                <FaStar 
                    key={starIndex} 
                    className={`transition-all duration-200 ${starIndex <= (stars || 0) ? "opacity-100 scale-110 drop-shadow-[0_0_3px_rgba(234,179,8,0.8)]" : "opacity-20"} ${user?.role === 'admin' ? 'cursor-pointer hover:text-yellow-400 hover:scale-125' : ''}`}
                    onClick={(e) => handleRate(e, charId, starIndex)} 
                />
            ))}
            {/* Opción para borrar estrellas (clic en un icono pequeño o lógica de toggle) */}
            {user?.role === 'admin' && (
                <span className="text-xs text-neutral-600 cursor-pointer hover:text-red-500 ml-1" onClick={(e) => handleRate(e, charId, 0)}>✕</span>
            )}
        </div>
    );

    if (loading) return <div className="text-center mt-20 text-red-600 animate-pulse font-serif text-2xl">Invocando espíritus...</div>;

    return (
        <div className="animate-fade-in pb-20">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-serif text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] mb-2">Galería de Sangre</h1>
                <p className="text-neutral-400 font-serif italic">Los protagonistas de nuestra crónica</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {chars.map((char, index) => (
                    <div 
                        key={char.id}
                        onClick={() => setSelectedChar(char)}
                        className="group relative h-32 bg-gradient-to-r from-black to-neutral-900 border border-red-900/50 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:border-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] flex"
                    >
                        <div className="absolute -top-3 -left-3 w-8 h-8 bg-red-700 text-white font-bold flex items-center justify-center rounded-full z-20 border-2 border-black shadow-lg">
                            {index + 1}
                        </div>

                        <div className="w-1/3 h-full relative overflow-hidden">
                            <img src={char.image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={char.name} />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/80"></div>
                        </div>

                        <div className="w-2/3 p-3 flex flex-col justify-center relative z-10">
                            <h2 className="text-xl font-serif font-bold text-gray-200 group-hover:text-red-400 transition-colors truncate">{char.name}</h2>
                            <div className="flex items-center gap-2 text-xs text-red-600 font-bold uppercase tracking-widest mb-1">
                                <span>{char.clan}</span>
                                <span className="text-neutral-600">•</span>
                                <span>Gen {char.generation || '?'}</span>
                            </div>
                            
                            {/* ESTRELLAS INTERACTIVAS */}
                            <StarRating stars={char.stars} charId={char.id} />
                        </div>
                    </div>
                ))}
            </div>

            {selectedChar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedChar(null)}>
                    <div className="bg-neutral-900 border-2 border-red-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedChar(null)} className="absolute top-3 right-3 z-50 text-neutral-400 hover:text-white bg-black/50 hover:bg-red-600 rounded-full p-2 transition-all"><FaTimes size={20} /></button>

                        <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                            <img src={selectedChar.image_url} className="w-full h-full object-cover" alt={selectedChar.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r"></div>
                        </div>

                        <div className="w-full md:w-1/2 p-8 flex flex-col">
                            <h2 className="text-4xl font-serif text-red-600 mb-1">{selectedChar.name}</h2>
                            
                            {/* Estrellas grandes en el modal */}
                            <div className="mb-4">
                                <StarRating stars={selectedChar.stars} charId={selectedChar.id} size="text-2xl" />
                            </div>

                            <p className="text-xl text-neutral-400 font-serif italic mb-6 border-b border-neutral-800 pb-4">
                                {selectedChar.clan} <span className="text-sm not-italic ml-2 text-neutral-600">({selectedChar.predator_type})</span>
                            </p>

                            <div className="space-y-4 font-serif text-gray-300">
                                <div className="flex justify-between border-b border-neutral-800 pb-2">
                                    <span className="text-red-800 font-bold">Generación:</span>
                                    <span>{selectedChar.generation || 'Desconocida'}</span>
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-yellow-600 font-bold mb-2 flex items-center gap-2"><FaSkull /> Disciplinas Conocidas</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {getDisciplines(selectedChar.disciplines).map((d, i) => (
                                            <span key={i} className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-gray-300 hover:border-red-500 hover:text-white transition-colors cursor-default">{d}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GalleryView;