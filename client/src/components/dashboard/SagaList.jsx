import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icons from '../ui/Icons';
import SagaModal from '../forms/SagaModal';
// [MEJORA 1] Importamos el hook de notificaciones
import { useToast } from '../ui/Toast'; 

const SagaList = ({ user }) => {
    // --- ESTADOS DE DATOS ---
    const [sagas, setSagas] = useState([]);
    const [filteredSagas, setFilteredSagas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- ESTADOS DE INTERFAZ ---
    const [showModal, setShowModal] = useState(false);
    const [editingSaga, setEditingSaga] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [deleteLoading, setDeleteLoading] = useState(null); // ID de la saga siendo borrada

    // --- HOOKS ---
    const toast = useToast();

    // --- PERMISOS ---
    // Narradores y Admins pueden crear/editar
    const canCreateEdit = user?.role === 'admin' || user?.role === 'storyteller';
    // Solo el Príncipe (Admin) puede destruir historias permanentemente
    const isAdmin = user?.role === 'admin';

    // 1. Carga Inicial
    useEffect(() => {
        let isMounted = true; // Evitar actualización de estado si el componente se desmonta

        const fetchSagas = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await fetch('/api/chronicles', { 
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!response.ok) {
                    throw new Error(`Error en la red de la Camarilla: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (isMounted) {
                    // Soporte robusto para diferentes estructuras de respuesta
                    setSagas(Array.isArray(data) ? data : data.chronicles || []);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Error fetching sagas:', err);
                    setError(err.message || 'No se pudo conectar con los Archivos.');
                    // No usamos toast aquí para no saturar al entrar
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSagas();

        return () => { isMounted = false; };
    }, []);

    // 2. Filtrado y Ordenamiento (Memoizado implícitamente por useEffect)
    useEffect(() => {
        let result = [...sagas];
        
        // Filtro de búsqueda
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(saga => 
                saga.title.toLowerCase().includes(searchLower) ||
                (saga.description && saga.description.toLowerCase().includes(searchLower)) ||
                (saga.storyteller && saga.storyteller.toLowerCase().includes(searchLower))
            );
        }

        // Ordenamiento
        switch(sortBy) {
            case 'recent':
                result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
                break;
            case 'alpha':
                result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'sessions':
                result.sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
                break;
            default:
                break;
        }

        setFilteredSagas(result);
    }, [sagas, searchTerm, sortBy]);

    // 3. Crear / Editar Crónica
    const handleSaveSaga = async (sagaData) => {
        if (!canCreateEdit) {
            toast.error('Tus credenciales no permiten modificar los registros.');
            return false;
        }

        try {
            const isEditing = Boolean(sagaData.id);
            const url = isEditing ? `/api/chronicles/${sagaData.id}` : '/api/chronicles';
            const method = isEditing ? 'PUT' : 'POST';

            // Limpieza de datos antes de enviar
            const dataToSend = {
                title: sagaData.title?.trim(),
                cover_image: sagaData.cover_image?.trim(),
                description: sagaData.description?.trim(),
                storyteller: sagaData.storyteller?.trim(),
                players: sagaData.players?.trim(),
                sessions: parseInt(sagaData.sessions) || 0,
                status: sagaData.status || 'active'
            };

            const response = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(dataToSend),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // Manejo especial para errores de permisos (403)
                if (response.status === 403) {
                    throw new Error("Permisos insuficientes en el servidor.");
                }
                throw new Error(errorData.error || errorData.message || 'Error al guardar la crónica');
            }

            const result = await response.json();
            const savedSaga = result.chronicle || result; // Adaptable a tu API

            // Actualización optimista del estado local
            if (isEditing) {
                setSagas(prev => prev.map(s => s.id === savedSaga.id ? savedSaga : s));
                toast.success(`Crónica "${savedSaga.title}" actualizada.`);
            } else {
                setSagas(prev => [savedSaga, ...prev]);
                toast.success('Nueva crónica inaugurada.');
            }
            
            return true; // Éxito para cerrar el modal
        } catch (err) {
            console.error('Error saving saga:', err);
            toast.error(err.message);
            throw err;
        }
    };

    // 4. Eliminar Crónica
    const handleDelete = async (e, saga) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        if (!isAdmin) {
            toast.warning('Solo el Príncipe puede decretar la destrucción final.');
            return;
        }
        
        // Usamos confirm nativo por seguridad rápida, podría ser un modal custom
        const confirmMessage = `⚠️ ¿Confirmas la destrucción de "${saga.title}"?\n\nEsta acción eliminará todos los registros, personajes y secretos asociados.\n\nEs irreversible.`;
        
        if (!window.confirm(confirmMessage)) return;

        try {
            setDeleteLoading(saga.id);
            
            const response = await fetch(`/api/chronicles/${saga.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.status === 403) {
                throw new Error("No tienes autoridad para esto.");
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || 'Error al eliminar');
            }

            setSagas(prev => prev.filter(s => s.id !== saga.id));
            toast.info(`La crónica "${saga.title}" ha sido eliminada.`);
            
        } catch (err) {
            console.error('Error deleting saga:', err);
            toast.error(err.message);
        } finally {
            setDeleteLoading(null);
        }
    };

    // --- MANEJADORES DE UI ---
    const handleEditClick = (e, saga) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!canCreateEdit) {
            toast.warning('Acceso de edición denegado.');
            return;
        }
        
        setEditingSaga(saga);
        setShowModal(true);
    };

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setEditingSaga(null);
    }, []);

    const handleClearSearch = () => setSearchTerm('');

    const handleReload = () => {
        // Forzamos recarga simple volviendo a llamar fetch dentro del componente no es ideal sin extraer la función, 
        // pero podemos recargar la página o extraer fetchSagas fuera del useEffect si fuera necesario.
        // Por simplicidad en este patrón robusto:
        window.location.reload(); 
    };

    // --- RENDERIZADO ---

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <div className="mb-4 text-4xl text-blood">🩸</div>
                <p className="text-neutral-500 font-serif tracking-widest text-sm">LEYENDO ARCHIVOS...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-red-500 bg-red-950/30 p-8 rounded border border-red-900/30 max-w-md backdrop-blur-sm">
                    <div className="mb-4 text-5xl">💀</div>
                    <h3 className="text-xl mb-2 font-serif text-blood-bright">Fallo en la Sangre</h3>
                    <p className="text-sm text-neutral-400 mb-6">{error}</p>
                    <button 
                        onClick={handleReload} 
                        className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded transition-colors inline-flex items-center gap-2 border border-red-700"
                    >
                        <Icons.RefreshCw className="w-4 h-4" />
                        Reintentar Conexión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Banner Principal */}
            <div className="bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-red-950/40 p-6 rounded-lg border border-red-900/30 backdrop-blur-md shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-blood mb-2 flex items-center gap-3 drop-shadow-md">
                            <span className="text-3xl">🧛</span>
                            Crónicas de la Estirpe
                        </h1>
                        <p className="text-neutral-400 text-sm font-mono">
                            {sagas.length} {sagas.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                            {filteredSagas.length !== sagas.length && ` • ${filteredSagas.length} visibles`}
                        </p>
                    </div>
                    
                    {/* Botón Crear (Visible solo para roles autorizados) */}
                    {canCreateEdit && (
                        <button
                            onClick={() => { setEditingSaga(null); setShowModal(true); }}
                            className="px-5 py-2.5 bg-blood hover:bg-blood-light text-white rounded shadow-[0_0_15px_rgba(185,28,28,0.3)] transition-all hover:scale-105 flex items-center gap-2 font-serif tracking-wide text-sm border border-red-800"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            Nueva Crónica
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de Herramientas (Búsqueda y Filtros) */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 backdrop-blur-sm">
                {/* Buscador */}
                <div className="relative w-full md:w-96 group">
                    <span className="absolute left-3 top-2.5 text-neutral-500 group-focus-within:text-blood transition-colors">
                        <Icons.Search className="w-5 h-5" />
                    </span>
                    <input 
                        type="text" 
                        placeholder="Buscar por título, narrador..." 
                        className="w-full bg-black/50 border border-neutral-700 rounded-full py-2 pl-10 pr-10 text-sm focus:border-blood focus:ring-1 focus:ring-blood/50 outline-none text-neutral-200 transition-all placeholder-neutral-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-2.5 text-neutral-500 hover:text-red-500 transition-colors"
                            title="Limpiar búsqueda"
                        >
                            <Icons.X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                {/* Filtros */}
                <div className="flex gap-3 w-full md:w-auto">
                    <select 
                        className="bg-black/50 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-300 focus:border-blood focus:ring-1 focus:ring-blood/50 outline-none cursor-pointer hover:bg-neutral-800/50 transition-colors"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="recent">📅 Recientes</option>
                        <option value="oldest">🕰️ Antiguos</option>
                        <option value="alpha">🔤 A-Z</option>
                        <option value="sessions">🎲 Sesiones</option>
                    </select>
                </div>
            </div>

            {/* Grid de Resultados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Card Especial: Crear Nueva (Acceso Rápido) */}
                {canCreateEdit && (
                    <button
                        onClick={() => { setEditingSaga(null); setShowModal(true); }}
                        className="group h-80 border-2 border-dashed border-neutral-800 hover:border-blood/60 rounded-lg flex flex-col items-center justify-center text-neutral-600 hover:text-blood-light hover:bg-red-950/10 cursor-pointer transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="w-16 h-16 rounded-full bg-neutral-900 group-hover:bg-blood flex items-center justify-center mb-4 transition-colors shadow-xl group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                            <Icons.Plus className="w-8 h-8 text-neutral-500 group-hover:text-white" />
                        </div>
                        <span className="font-serif tracking-wider text-sm uppercase font-bold">Inaugurar Crónica</span>
                        <span className="text-xs text-neutral-600 group-hover:text-neutral-400 mt-2">Añadir nueva historia</span>
                    </button>
                )}

                {/* Mensaje Vacío Filtro */}
                {filteredSagas.length === 0 && sagas.length > 0 && (
                    <div className="col-span-full text-center py-16 bg-neutral-900/20 rounded-lg border border-neutral-800 border-dashed">
                        <div className="text-4xl mb-4 opacity-50">🕸️</div>
                        <p className="text-neutral-500 font-serif">No se encontraron resultados en los archivos.</p>
                        <button onClick={handleClearSearch} className="mt-2 text-blood hover:underline text-sm">Limpiar búsqueda</button>
                    </div>
                )}

                {/* Mensaje Vacío Total */}
                {sagas.length === 0 && !loading && (
                    <div className="col-span-full text-center py-20">
                        <div className="text-6xl mb-6 opacity-30 grayscale">🏰</div>
                        <p className="text-xl font-serif text-neutral-500">Los archivos están vacíos.</p>
                        {canCreateEdit && <p className="text-sm text-neutral-600 mt-2">Sé el primero en documentar la historia.</p>}
                    </div>
                )}

                {/* Tarjetas de Crónicas */}
                {filteredSagas.map(saga => (
                    <div 
                        key={saga.id} 
                        className="relative group h-80 rounded-lg overflow-hidden border border-neutral-800 hover:border-blood/50 transition-all duration-500 shadow-lg bg-black hover:shadow-[0_0_25px_rgba(139,0,0,0.15)]"
                    >
                        {/* Estado (Activa/Pausada) */}
                        <div className="absolute top-2 left-2 z-20">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                                saga.status === 'active' ? 'bg-green-950/80 text-green-400 border-green-900' :
                                saga.status === 'paused' ? 'bg-yellow-950/80 text-yellow-400 border-yellow-900' :
                                'bg-neutral-800/80 text-neutral-400 border-neutral-700'
                            }`}>
                                {saga.status === 'active' ? '● En Curso' : saga.status === 'paused' ? '⏸ Pausada' : '✓ Finalizada'}
                            </span>
                        </div>

                        {/* Botones Admin (Hover) */}
                        {canCreateEdit && (
                            <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                                <button 
                                    onClick={(e) => handleEditClick(e, saga)}
                                    className="p-1.5 bg-black/80 backdrop-blur-sm text-yellow-500 rounded hover:bg-yellow-600 hover:text-white border border-neutral-700 transition-colors"
                                    title="Editar"
                                    disabled={!!deleteLoading}
                                >
                                    <Icons.Edit className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                    <button 
                                        onClick={(e) => handleDelete(e, saga)}
                                        className="p-1.5 bg-black/80 backdrop-blur-sm text-red-500 rounded hover:bg-red-600 hover:text-white border border-neutral-700 transition-colors disabled:opacity-50"
                                        title="Eliminar"
                                        disabled={deleteLoading === saga.id}
                                    >
                                        {deleteLoading === saga.id ? (
                                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full"></div>
                                        ) : (
                                            <Icons.Trash className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Área Clickeable */}
                        <Link to={`/chronicle/${saga.id}`} className="block w-full h-full relative">
                            {/* Imagen de Fondo */}
                            <div className="w-full h-full overflow-hidden">
                                <img 
                                    src={saga.cover_image || saga.image_url || '/images/default-cover.jpg'} 
                                    className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110 filter grayscale group-hover:grayscale-0"
                                    alt={saga.title}
                                    loading="lazy"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600/1a0505/555?text=VTM'; }}
                                />
                            </div>
                            
                            {/* Gradientes y Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:via-black/20 transition-all duration-500" />
                            
                            {/* Info Texto */}
                            <div className="absolute bottom-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                <h2 className="text-white font-serif text-lg tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1 group-hover:text-blood-bright transition-colors line-clamp-1">
                                    {saga.title}
                                </h2>
                                
                                <div className="flex flex-col gap-0.5 text-xs text-neutral-400 font-sans opacity-80 group-hover:opacity-100 transition-opacity">
                                    {saga.storyteller && (
                                        <span className="text-neutral-300 font-medium">Narrador: {saga.storyteller}</span>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                                        <span>{saga.sessions || 0} Sesiones</span>
                                        {saga.players && <span>• {saga.players.split(',').length} PJs</span>}
                                    </div>
                                </div>
                                
                                {/* Barra Decorativa */}
                                <div className="h-0.5 w-0 group-hover:w-full bg-blood mt-3 transition-all duration-700 ease-out"></div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Modal de Formulario */}
            {canCreateEdit && (
                <SagaModal 
                    show={showModal} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveSaga} 
                    sagaToEdit={editingSaga} 
                />
            )}
        </div>
    );
};

export default SagaList;