import React, { useState, useEffect } from 'react';
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

    // 1. Carga inicial desde la API
    useEffect(() => {
        fetchSagas();
    }, []);

    // 2. Efecto para Filtrado y Ordenamiento (Se mantiene igual, operando sobre los datos ya cargados)
    useEffect(() => {
        let result = [...sagas];
        
        // Filtrar
        if (searchTerm) {
            result = result.filter(saga => 
                saga.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Ordenar
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
            default: break;
        }

        setFilteredSagas(result);
    }, [sagas, searchTerm, sortBy]);

    // --- LÓGICA DE DATOS (CONECTADA AL BACKEND) ---

    const fetchSagas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/chronicles', { credentials: 'include' });
            
            if (response.ok) {
                const data = await response.json();
                setSagas(data);
                setError(null);
            } else {
                throw new Error('Error al obtener datos del servidor');
            }
        } catch (err) {
            console.error('Error fetching sagas:', err);
            setError('No se pudo conectar con la red de la Camarilla.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSaga = async (sagaData) => {
        try {
            let url, method;
            
            // Determinar si es Crear o Editar basado en si tiene ID
            if (sagaData.id) {
                url = `/api/chronicles/${sagaData.id}`;
                method = 'PUT';
            } else {
                url = '/api/chronicles';
                method = 'POST';
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: sagaData.title,
                    cover_image: sagaData.cover_image
                }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Error al guardar la crónica');

            const result = await response.json();
            // El backend devuelve { success: true, chronicle: {...} }
            const savedSaga = result.chronicle || result; 

            // Actualizar estado local para reflejar cambios sin recargar
            if (sagaData.id) {
                setSagas(prev => prev.map(s => s.id === savedSaga.id ? savedSaga : s));
            } else {
                setSagas(prev => [savedSaga, ...prev]);
            }
            
            // Retornamos true para que el Modal sepa que se guardó bien
            return true;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        if (!window.confirm("⚠️ ¿Eliminar crónica y toda su historia de la base de datos?")) return;

        try {
            const response = await fetch(`/api/chronicles/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                setSagas(prev => prev.filter(s => s.id !== id));
            } else {
                alert('No se pudo eliminar la crónica.');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión al eliminar.');
        }
    };

    const handleEditClick = (e, saga) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingSaga(saga);
        setShowModal(true);
    };

    // --- RENDER (VISUAL IDÉNTICO AL TUYO) ---
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

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-red-500 bg-red-900/10 p-8 rounded border border-red-900/30">
                    <p className="text-xl mb-2 font-serif">Fallo en la Sangre</p>
                    <p className="text-sm text-neutral-400 mb-4">{error}</p>
                    <button onClick={fetchSagas} className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded transition-colors">
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Barra de Herramientas */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 backdrop-blur-sm">
                <div className="relative w-full md:w-64">
                    <span className="absolute left-3 top-2.5 text-neutral-500"><Icons.Search /></span>
                    <input 
                        type="text" 
                        placeholder="Buscar crónica..." 
                        className="w-full bg-black border border-neutral-700 rounded-full py-2 pl-10 pr-4 text-sm focus:border-red-900 outline-none text-neutral-300 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <select 
                        className="bg-black border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-400 focus:border-red-900 outline-none"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="recent">Más recientes</option>
                        <option value="oldest">Más antiguos</option>
                        <option value="alpha">Alfabético</option>
                    </select>
                </div>
            </div>

            {/* Grid de Crónicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                
                {/* Botón Nueva Crónica (Solo si hay usuario o admin) */}
                {(user?.role === 'admin' || user) && (
                    <button
                        onClick={() => { setEditingSaga(null); setShowModal(true); }}
                        className="group h-80 border-2 border-dashed border-neutral-800 rounded-lg flex flex-col items-center justify-center text-neutral-600 hover:text-red-500 hover:border-red-900/50 hover:bg-red-900/5 cursor-pointer transition-all duration-300"
                    >
                        <div className="transform group-hover:scale-110 transition-transform duration-300 mb-2 p-4 rounded-full bg-neutral-900 group-hover:bg-red-900 group-hover:text-white">
                            <Icons.Plus />
                        </div>
                        <span className="font-serif tracking-wider text-sm uppercase">Nueva Crónica</span>
                    </button>
                )}

                {/* Lista de Cards */}
                {filteredSagas.length === 0 && filteredSagas.length !== 0 ? (
                     <div className="col-span-full text-center py-12 text-neutral-500">
                        <p className="text-xl font-serif">No se encontraron crónicas.</p>
                    </div>
                ) : (
                    filteredSagas.map(saga => (
                        <div 
                            key={saga.id} 
                            className="relative group h-80 rounded-lg overflow-hidden border border-neutral-800 hover:border-red-600/50 transition-all shadow-lg bg-black hover:shadow-red-900/20 hover:shadow-2xl"
                        >
                            {/* Botones Flotantes (Admin) */}
                            {user?.role === 'admin' && (
                                <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-[-10px] group-hover:translate-y-0">
                                    <button 
                                        onClick={(e) => handleEditClick(e, saga)}
                                        className="p-2 bg-neutral-900/90 text-yellow-500 rounded hover:bg-yellow-600 hover:text-white border border-neutral-600 transition-colors shadow-lg"
                                        title="Editar detalles"
                                    >
                                        <Icons.Edit />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(e, saga.id)}
                                        className="p-2 bg-neutral-900/90 text-red-500 rounded hover:bg-red-600 hover:text-white border border-neutral-600 transition-colors shadow-lg"
                                        title="Eliminar permanentemente"
                                    >
                                        <Icons.Trash />
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
                                        src={saga.cover_image || 'https://via.placeholder.com/300x400/0a0a0a/333333?text=VTM'} 
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110 filter grayscale group-hover:grayscale-0"
                                        alt={saga.title}
                                        loading="lazy"
                                    />
                                    {/* Overlay Gradiente */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-60 transition-opacity duration-500" />
                                </div>
                                
                                {/* Contenido del Card */}
                                <div className="absolute bottom-0 w-full p-4 border-t border-red-900/0 group-hover:border-red-900/50 transition-colors duration-500 bg-gradient-to-t from-black via-black/90 to-transparent">
                                    <h2 className="text-white font-serif text-xl tracking-wide drop-shadow-md mb-1 group-hover:text-red-500 transition-colors">
                                        {saga.title}
                                    </h2>
                                    <p className="text-xs text-neutral-400 font-sans">
                                        {/* Nota: si el backend no envía 'sections' en el listado, mostrará 0. Es normal. */}
                                        {saga.sections?.length || 0} CAPÍTULOS
                                    </p>
                                    <div className="h-0.5 w-0 group-hover:w-full bg-red-600 transition-all duration-700 mt-2"></div>
                                </div>
                            </Link>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            <SagaModal 
                show={showModal} 
                onClose={() => {
                    setShowModal(false);
                    setEditingSaga(null);
                }} 
                onSave={handleSaveSaga} 
                sagaToEdit={editingSaga} 
            />
        </div>
    );
}

export default SagaList;