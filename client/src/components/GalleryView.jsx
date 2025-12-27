import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaTimes, FaStar, FaSkull, FaSort, FaExclamationTriangle } from 'react-icons/fa';

// Función helper para parsear disciplinas
const getDisciplines = (jsonString) => {
    if (!jsonString) return [];
    try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

// Opciones de ordenamiento
const SORT_OPTIONS = {
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
    RATING_DESC: 'rating_desc',
    RATING_ASC: 'rating_asc',
    GENERATION_ASC: 'generation_asc',
    GENERATION_DESC: 'generation_desc'
};

function GalleryView({ user }) { 
    const [chars, setChars] = useState([]);
    const [selectedChar, setSelectedChar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState(SORT_OPTIONS.NAME_ASC);
    const [updatingRating, setUpdatingRating] = useState(false);

    const fetchChars = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/characters');
            
            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            
            if (!data.pcs || !Array.isArray(data.pcs)) {
                throw new Error('Formato de datos inválido');
            }
            
            setChars(data.pcs);
        } catch (err) {
            console.error("Error cargando personajes:", err);
            setError(err.message || "Error al cargar personajes");
            setChars([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChars();
    }, [fetchChars]);

    // Función para guardar estrellas con manejo de errores
    const handleRate = useCallback(async (e, charId, rating) => {
        e.stopPropagation();
        
        if (user?.role !== 'admin') return;
        if (updatingRating) return; // Prevenir múltiples clics

        // Validación
        if (rating < 0 || rating > 5) {
            console.error('Rating inválido:', rating);
            return;
        }

        setUpdatingRating(true);

        try {
            // Actualización optimista (UI primero)
            const previousChars = [...chars];
            const updatedChars = chars.map(c => 
                c.id === charId ? { ...c, stars: rating } : c
            );
            setChars(updatedChars);
            
            if (selectedChar?.id === charId) {
                setSelectedChar({ ...selectedChar, stars: rating });
            }

            // Guardar en servidor
            const res = await fetch(`/api/characters/${charId}/rate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stars: rating })
            });

            if (!res.ok) {
                throw new Error('Error al actualizar calificación');
            }

            // Verificar respuesta
            const data = await res.json().catch(() => null);
            if (data) {
                // Actualizar con datos del servidor si están disponibles
                const serverUpdatedChars = chars.map(c => 
                    c.id === charId ? { ...c, stars: data.stars ?? rating } : c
                );
                setChars(serverUpdatedChars);
                
                if (selectedChar?.id === charId) {
                    setSelectedChar({ ...selectedChar, stars: data.stars ?? rating });
                }
            }
        } catch (err) {
            console.error("Error actualizando calificación:", err);
            
            // Revertir cambios en caso de error
            setChars(previousChars);
            if (selectedChar?.id === charId) {
                const originalChar = previousChars.find(c => c.id === charId);
                if (originalChar) {
                    setSelectedChar({ ...selectedChar, stars: originalChar.stars });
                }
            }
            
            setError('Error al actualizar calificación');
            setTimeout(() => setError(null), 3000);
        } finally {
            setUpdatingRating(false);
        }
    }, [chars, selectedChar, user, updatingRating]);

    // Componente de Estrellas Reutilizable mejorado
    const StarRating = useCallback(({ stars, charId, size = "text-sm" }) => {
        const isAdmin = user?.role === 'admin';
        
        return (
            <div className={`flex items-center gap-1 ${size}`}>
                <div className="flex gap-1 text-yellow-600">
                    {[1, 2, 3, 4, 5].map((starIndex) => (
                        <button
                            key={starIndex}
                            type="button"
                            className={`transition-all duration-200 ${
                                starIndex <= (stars || 0) 
                                    ? "opacity-100 scale-110 drop-shadow-[0_0_3px_rgba(234,179,8,0.8)]" 
                                    : "opacity-20"
                            } ${
                                isAdmin 
                                    ? 'cursor-pointer hover:text-yellow-400 hover:scale-125 active:scale-110' 
                                    : 'cursor-default'
                            } ${updatingRating ? 'pointer-events-none' : ''}`}
                            onClick={(e) => isAdmin && handleRate(e, charId, starIndex)}
                            disabled={!isAdmin || updatingRating}
                            aria-label={`Calificar con ${starIndex} estrella${starIndex > 1 ? 's' : ''}`}
                        >
                            <FaStar />
                        </button>
                    ))}
                </div>
                
                {/* Opción para borrar estrellas */}
                {isAdmin && stars > 0 && (
                    <button
                        type="button"
                        className="text-xs text-neutral-600 hover:text-red-500 ml-1 transition-colors disabled:opacity-50"
                        onClick={(e) => handleRate(e, charId, 0)}
                        disabled={updatingRating}
                        title="Quitar calificación"
                    >
                        ✕
                    </button>
                )}
            </div>
        );
    }, [user, handleRate, updatingRating]);

    // Ordenamiento optimizado con useMemo
    const sortedChars = useMemo(() => {
        const sorted = [...chars];
        
        switch (sortBy) {
            case SORT_OPTIONS.NAME_ASC:
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case SORT_OPTIONS.NAME_DESC:
                return sorted.sort((a, b) => b.name.localeCompare(a.name));
            case SORT_OPTIONS.RATING_DESC:
                return sorted.sort((a, b) => (b.stars || 0) - (a.stars || 0));
            case SORT_OPTIONS.RATING_ASC:
                return sorted.sort((a, b) => (a.stars || 0) - (b.stars || 0));
            case SORT_OPTIONS.GENERATION_ASC:
                return sorted.sort((a, b) => (a.generation || 99) - (b.generation || 99));
            case SORT_OPTIONS.GENERATION_DESC:
                return sorted.sort((a, b) => (b.generation || 0) - (a.generation || 0));
            default:
                return sorted;
        }
    }, [chars, sortBy]);

    // Cerrar modal con Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && selectedChar) {
                setSelectedChar(null);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [selectedChar]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 font-serif text-2xl mb-4 animate-pulse">
                        Invocando espíritus...
                    </div>
                    <div className="w-16 h-16 border-4 border-red-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-20 px-4">
            {/* HEADER */}
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-serif text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] mb-2">
                    Galería de Sangre
                </h1>
                <p className="text-neutral-400 font-serif italic">
                    Los protagonistas de nuestra crónica
                </p>
            </div>

            {/* ERROR */}
            {error && (
                <div className="max-w-4xl mx-auto mb-6 bg-red-900/20 border border-red-900 text-red-400 p-4 rounded-lg flex items-start gap-3">
                    <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                    <button 
                        onClick={() => setError(null)}
                        className="text-neutral-400 hover:text-white"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* CONTROLES DE ORDENAMIENTO */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-neutral-500 text-sm">
                    {chars.length} personaje{chars.length !== 1 ? 's' : ''}
                </div>
                
                <div className="flex items-center gap-2">
                    <FaSort className="text-neutral-600" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors text-sm"
                    >
                        <option value={SORT_OPTIONS.NAME_ASC}>Nombre (A-Z)</option>
                        <option value={SORT_OPTIONS.NAME_DESC}>Nombre (Z-A)</option>
                        <option value={SORT_OPTIONS.RATING_DESC}>Mejor valorados</option>
                        <option value={SORT_OPTIONS.RATING_ASC}>Menor valorados</option>
                        <option value={SORT_OPTIONS.GENERATION_ASC}>Generación (baja-alta)</option>
                        <option value={SORT_OPTIONS.GENERATION_DESC}>Generación (alta-baja)</option>
                    </select>
                </div>
            </div>

            {/* GRID DE PERSONAJES */}
            {chars.length === 0 ? (
                <div className="text-center text-neutral-600 py-20">
                    <div className="text-6xl mb-4 opacity-20">🦇</div>
                    <p className="text-xl font-serif italic">
                        No hay personajes en la galería
                    </p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedChars.map((char, index) => (
                        <CharacterCard
                            key={char.id}
                            char={char}
                            index={index}
                            onSelect={() => setSelectedChar(char)}
                            StarRating={StarRating}
                        />
                    ))}
                </div>
            )}

            {/* MODAL DE DETALLE */}
            {selectedChar && (
                <CharacterModal
                    char={selectedChar}
                    onClose={() => setSelectedChar(null)}
                    StarRating={StarRating}
                    getDisciplines={getDisciplines}
                />
            )}
        </div>
    );
}

// Componente de tarjeta separado para mejor rendimiento
function CharacterCard({ char, index, onSelect, StarRating }) {
    const [imageError, setImageError] = useState(false);

    return (
        <div 
            onClick={onSelect}
            className="group relative h-32 bg-gradient-to-r from-black to-neutral-900 border border-red-900/50 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:border-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] flex"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            aria-label={`Ver detalles de ${char.name}`}
        >
            {/* Número de índice */}
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-red-700 text-white font-bold flex items-center justify-center rounded-full z-20 border-2 border-black shadow-lg text-sm">
                {index + 1}
            </div>

            {/* Imagen */}
            <div className="w-1/3 h-full relative overflow-hidden">
                <img 
                    src={imageError ? 'https://via.placeholder.com/150?text=No+Image' : (char.image_url || 'https://via.placeholder.com/150')}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    alt={char.name}
                    onError={() => setImageError(true)}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/80"></div>
            </div>

            {/* Información */}
            <div className="w-2/3 p-3 flex flex-col justify-center relative z-10">
                <h2 className="text-xl font-serif font-bold text-gray-200 group-hover:text-red-400 transition-colors truncate">
                    {char.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-red-600 font-bold uppercase tracking-widest mb-1">
                    <span className="truncate">{char.clan}</span>
                    <span className="text-neutral-600">•</span>
                    <span>Gen {char.generation || '?'}</span>
                </div>
                
                {/* Estrellas */}
                <StarRating stars={char.stars} charId={char.id} />
            </div>
        </div>
    );
}

// Modal de detalle del personaje
function CharacterModal({ char, onClose, StarRating, getDisciplines }) {
    const [imageError, setImageError] = useState(false);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className="bg-neutral-900 border-2 border-red-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col md:flex-row" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón cerrar */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 z-50 text-neutral-400 hover:text-white bg-black/50 hover:bg-red-600 rounded-full p-2 transition-all"
                    aria-label="Cerrar modal"
                >
                    <FaTimes size={20} />
                </button>

                {/* Imagen */}
                <div className="w-full md:w-1/2 h-64 md:h-auto relative">
                    <img 
                        src={imageError ? 'https://via.placeholder.com/600x800?text=No+Image' : char.image_url}
                        className="w-full h-full object-cover" 
                        alt={char.name}
                        onError={() => setImageError(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r"></div>
                </div>

                {/* Información */}
                <div className="w-full md:w-1/2 p-8 flex flex-col">
                    <h2 id="modal-title" className="text-3xl md:text-4xl font-serif text-red-600 mb-1">
                        {char.name}
                    </h2>
                    
                    {/* Estrellas grandes */}
                    <div className="mb-4">
                        <StarRating stars={char.stars} charId={char.id} size="text-2xl" />
                    </div>

                    <p className="text-xl text-neutral-400 font-serif italic mb-6 border-b border-neutral-800 pb-4">
                        {char.clan}
                        {char.predator_type && (
                            <span className="text-sm not-italic ml-2 text-neutral-600">
                                ({char.predator_type})
                            </span>
                        )}
                    </p>

                    <div className="space-y-4 font-serif text-gray-300">
                        <div className="flex justify-between border-b border-neutral-800 pb-2">
                            <span className="text-red-800 font-bold">Generación:</span>
                            <span>{char.generation || 'Desconocida'}</span>
                        </div>
                        
                        {getDisciplines(char.disciplines).length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-yellow-600 font-bold mb-2 flex items-center gap-2">
                                    <FaSkull /> Disciplinas Conocidas
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {getDisciplines(char.disciplines).map((d, i) => (
                                        <span 
                                            key={i} 
                                            className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm text-gray-300 hover:border-red-500 hover:text-white transition-colors"
                                        >
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GalleryView;