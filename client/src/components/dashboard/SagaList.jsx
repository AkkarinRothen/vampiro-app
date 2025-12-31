import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icons from '../ui/Icons';
import SagaModal from '../forms/SagaModal';

const SagaList = ({ user }) => {
    const [sagas, setSagas] = useState([]);
    const [filteredSagas, setFilteredSagas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados para UI
    const [showModal, setShowModal] = useState(false);
    const [editingSaga, setEditingSaga] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [deleteLoading, setDeleteLoading] = useState(null);

    // Carga inicial desde la API
    useEffect(() => {
        fetchSagas();
    }, []);

    // Filtrado y Ordenamiento optimizado
    useEffect(() => {
        let result = [...sagas];
        
        // Filtrar por término de búsqueda
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            result = result.filter(saga => 
                saga.title.toLowerCase().includes(searchLower) ||
                saga.description?.toLowerCase().includes(searchLower) ||
                saga.storyteller?.toLowerCase().includes(searchLower)
            );
        }

        // Ordenar según criterio seleccionado
        switch(sortBy) {
            case 'recent':
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'alpha':
                result.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'sessions':
                result.sort((a, b) => (b.sessions || 0) - (a.sessions || 0));
                break;
            default:
                break;
        }

        setFilteredSagas(result);
    }, [sagas, searchTerm, sortBy]);

    // Fetch de crónicas con mejor manejo de errores
    const fetchSagas = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/chronicles', { 
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
            const data = await response.json();
            setSagas(Array.isArray(data) ? data : data.chronicles || []);
        } catch (err) {
            console.error('Error fetching sagas:', err);
            setError(err.message || 'No se pudo conectar con la red de la Camarilla.');
        } finally {
            setLoading(false);
        }
    };

    // Guardar crónica (crear o editar)
    const handleSaveSaga = async (sagaData) => {
        try {
            const isEditing = Boolean(sagaData.id);
            const url = isEditing ? `/api/chronicles/${sagaData.id}` : '/api/chronicles';
            const method = isEditing ? 'PUT' : 'POST';

            // Preparar datos para enviar
            const dataToSend = {
                title: sagaData.title?.trim(),
                cover_image: sagaData.cover_image?.trim(),
                description: sagaData.description?.trim(),
                storyteller: sagaData.storyteller?.trim(),
                players: sagaData.players?.trim(),
                sessions: sagaData.sessions || 0,
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
                throw new Error(errorData.message || 'Error al guardar la crónica');
            }

            const result = await response.json();
            const savedSaga = result.chronicle || result;

            // Actualizar estado local de manera optimista
            if (isEditing) {
                setSagas(prev => prev.map(s => s.id === savedSaga.id ? savedSaga : s));
            } else {
                setSagas(prev => [savedSaga, ...prev]);
            }
            
            return true;
        } catch (err) {
            console.error('Error saving saga:', err);
            throw err;
        }
    };

    // Eliminar crónica con confirmación mejorada
    const handleDelete = async (e, saga) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        const confirmMessage = `⚠️ ¿Estás seguro de eliminar "${saga.title}"?\n\nEsta acción eliminará la crónica y todo su contenido de forma permanente.\n\nNo se puede deshacer.`;
        
        if (!window.confirm(confirmMessage)) return;

        try {
            setDeleteLoading(saga.id);
            
            const response = await fetch(`/api/chronicles/${saga.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al eliminar');
            }

            // Actualizar estado local
            setSagas(prev => prev.filter(s => s.id !== saga.id));
            
        } catch (err) {
            console.error('Error deleting saga:', err);
            alert(`Error: ${err.message || 'No se pudo eliminar la crónica'}`);
        } finally {
            setDeleteLoading(null);
        }
    };

    // Abrir modal de edición
    const handleEditClick = (e, saga) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingSaga(saga);
        setShowModal(true);
    };

    // Cerrar modal
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setEditingSaga(null);
    }, []);

    // Limpiar búsqueda
    const handleClearSearch = () => {
        setSearchTerm('');
    };

    // Renderizado de loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-900 mx-auto mb-4"></div>
                    <p className="text-neutral-500 font-serif tracking-widest text-sm">DESPERTANDO CRÓNICAS...</p>
                </div>
            </div>
        );
    }

    // Renderizado de error
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-red-500 bg-red-900/10 p-8 rounded border border-red-900/30 max-w-md">
                    <div className="mb-4 text-5xl">
                        💀
                    </div>
                    <p className="text-xl mb-2 font-serif">Fallo en la Sangre</p>
                    <p className="text-sm text-neutral-400 mb-4">{error}</p>
                    <button 
                        onClick={fetchSagas} 
                        className="px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded transition-colors inline-flex items-center gap-2"
                    >
                        <Icons.RefreshCw className="w-4 h-4" />
                        Reintentar Conexión
                    </button>
                </div>
            </div>
        );
    }

    const canCreateEdit = user?.role === 'admin' || user;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header con estadísticas */}
            <div className="bg-gradient-to-r from-red-900/20 via-neutral-900/50 to-red-900/20 p-6 rounded-lg border border-red-900/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif text-red-500 mb-2 flex items-center gap-3">
                            <span className="text-4xl">📚</span>
                            Crónicas de Vampiro
                        </h1>
                        <p className="text-neutral-400 text-sm">
                            {sagas.length} {sagas.length === 1 ? 'crónica disponible' : 'crónicas disponibles'}
                            {filteredSagas.length !== sagas.length && ` • ${filteredSagas.length} filtradas`}
                        </p>
                    </div>
                    {canCreateEdit && (
                        <button
                            onClick={() => { setEditingSaga(null); setShowModal(true); }}
                            className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors flex items-center gap-2 font-serif tracking-wide"
                        >
                            <Icons.Plus className="w-5 h-5" />
                            Nueva Crónica
                        </button>
                    )}
                </div>
            </div>

            {/* Barra de Herramientas Mejorada */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 backdrop-blur-sm">
                <div className="relative w-full md:w-80">
                    <span className="absolute left-3 top-2.5 text-neutral-500">
                        <Icons.Search className="w-5 h-5" />
                    </span>
                    <input 
                        type="text" 
                        placeholder="Buscar por título, narrador o descripción..." 
                        className="w-full bg-black border border-neutral-700 rounded-full py-2 pl-10 pr-10 text-sm focus:border-red-900 focus:ring-1 focus:ring-red-900/50 outline-none text-neutral-300 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-2.5 text-neutral-500 hover:text-red-500 transition-colors"
                            title="Limpiar búsqueda"
                        >
                            <Icons.X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <select 
                        className="bg-black border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-400 focus:border-red-900 focus:ring-1 focus:ring-red-900/50 outline-none cursor-pointer"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="recent">📅 Más recientes</option>
                        <option value="oldest">🕰️ Más antiguos</option>
                        <option value="alpha">🔤 Alfabético</option>
                        <option value="sessions">🎲 Por sesiones</option>
                    </select>
                    
                    <button
                        onClick={fetchSagas}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg transition-colors flex items-center gap-2"
                        title="Recargar crónicas"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Grid de Crónicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                
                {/* Botón Nueva Crónica - Card Especial */}
                {canCreateEdit && (
                    <button
                        onClick={() => { setEditingSaga(null); setShowModal(true); }}
                        className="group h-80 border-2 border-dashed border-neutral-800 rounded-lg flex flex-col items-center justify-center text-neutral-600 hover:text-red-500 hover:border-red-900/50 hover:bg-red-900/5 cursor-pointer transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/0 via-red-900/0 to-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="transform group-hover:scale-110 transition-transform duration-300 mb-3 p-5 rounded-full bg-neutral-900 group-hover:bg-red-900 group-hover:text-white shadow-lg">
                                <Icons.Plus className="w-8 h-8" />
                            </div>
                            <span className="font-serif tracking-wider text-sm uppercase">Nueva Crónica</span>
                            <span className="text-xs text-neutral-700 group-hover:text-neutral-500 mt-2">
                                Crear una nueva historia
                            </span>
                        </div>
                    </button>
                )}

                {/* Mensaje cuando no hay resultados */}
                {filteredSagas.length === 0 && sagas.length > 0 && (
                    <div className="col-span-full text-center py-16 bg-neutral-900/30 rounded-lg border border-neutral-800">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-xl font-serif text-neutral-500 mb-2">
                            No se encontraron crónicas
                        </p>
                        <p className="text-sm text-neutral-600 mb-4">
                            Intenta con otros términos de búsqueda
                        </p>
                        <button
                            onClick={handleClearSearch}
                            className="text-red-500 hover:text-red-400 text-sm underline"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {/* Mensaje cuando no hay crónicas */}
                {sagas.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-gradient-to-br from-neutral-900/50 to-black rounded-lg border border-red-900/20">
                        <div className="text-7xl mb-4">📖</div>
                        <p className="text-2xl font-serif text-neutral-500 mb-2">
                            Aún no hay crónicas
                        </p>
                        <p className="text-sm text-neutral-600 mb-6">
                            {canCreateEdit 
                                ? 'Comienza creando tu primera crónica de Vampiro la Mascarada' 
                                : 'No hay crónicas disponibles en este momento'}
                        </p>
                        {canCreateEdit && (
                            <button
                                onClick={() => { setEditingSaga(null); setShowModal(true); }}
                                className="px-6 py-3 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                                <Icons.Plus className="w-5 h-5" />
                                Crear Primera Crónica
                            </button>
                        )}
                    </div>
                )}

                {/* Cards de Crónicas */}
                {filteredSagas.map(saga => (
                    <div 
                        key={saga.id} 
                        className="relative group h-80 rounded-lg overflow-hidden border border-neutral-800 hover:border-red-600/50 transition-all shadow-lg bg-black hover:shadow-red-900/20 hover:shadow-2xl"
                    >
                        {/* Badge de Estado */}
                        {saga.status && (
                            <div className="absolute top-2 left-2 z-20">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                                    saga.status === 'active' ? 'bg-green-900/70 text-green-300' :
                                    saga.status === 'paused' ? 'bg-yellow-900/70 text-yellow-300' :
                                    'bg-gray-700/70 text-gray-300'
                                }`}>
                                    {saga.status === 'active' ? '● Activa' :
                                     saga.status === 'paused' ? '⏸ Pausada' : '✓ Completada'}
                                </span>
                            </div>
                        )}

                        {/* Botones de Acción (Admin) */}
                        {user?.role === 'admin' && (
                            <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-[-10px] group-hover:translate-y-0">
                                <button 
                                    onClick={(e) => handleEditClick(e, saga)}
                                    className="p-2 bg-neutral-900/90 backdrop-blur-sm text-yellow-500 rounded hover:bg-yellow-600 hover:text-white border border-neutral-600 transition-all shadow-lg hover:scale-110"
                                    title="Editar crónica"
                                    disabled={deleteLoading === saga.id}
                                >
                                    <Icons.Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, saga)}
                                    className="p-2 bg-neutral-900/90 backdrop-blur-sm text-red-500 rounded hover:bg-red-600 hover:text-white border border-neutral-600 transition-all shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Eliminar permanentemente"
                                    disabled={deleteLoading === saga.id}
                                >
                                    {deleteLoading === saga.id ? (
                                        <span className="inline-block animate-spin">⟳</span>
                                    ) : (
                                        <Icons.Trash className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Enlace Principal */}
                        <Link 
                            to={`/chronicle/${saga.id}`} 
                            className="block w-full h-full"
                        >
                            {/* Imagen de Portada */}
                            <div className="w-full h-full relative">
                                <img 
                                    src={saga.cover_image || saga.image_url || 'https://via.placeholder.com/300x400/0a0a0a/333333?text=VTM'} 
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110 filter grayscale group-hover:grayscale-0"
                                    alt={saga.title}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/300x400/0a0a0a/333333?text=VTM';
                                    }}
                                />
                                {/* Overlay Gradiente */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-60 transition-opacity duration-500" />
                            </div>
                            
                            {/* Contenido del Card */}
                            <div className="absolute bottom-0 w-full p-4 border-t border-red-900/0 group-hover:border-red-900/50 transition-colors duration-500 bg-gradient-to-t from-black via-black/95 to-transparent">
                                <h2 className="text-white font-serif text-xl tracking-wide drop-shadow-md mb-1 group-hover:text-red-500 transition-colors line-clamp-2">
                                    {saga.title}
                                </h2>
                                
                                {saga.storyteller && (
                                    <p className="text-xs text-neutral-500 mb-1">
                                        Narrador: {saga.storyteller}
                                    </p>
                                )}
                                
                                <div className="flex items-center gap-3 text-xs text-neutral-400 font-sans">
                                    <span>{saga.sections?.length || saga.sessions || 0} sesiones</span>
                                    {saga.players && (
                                        <span>• {saga.players.split(',').length} jugadores</span>
                                    )}
                                </div>
                                
                                <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 transition-all duration-700 mt-3"></div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Modal de Creación/Edición */}
            <SagaModal 
                show={showModal} 
                onClose={handleCloseModal} 
                onSave={handleSaveSaga} 
                sagaToEdit={editingSaga} 
            />
        </div>
    );
};

export default SagaList;