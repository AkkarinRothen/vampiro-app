// ============================================
// SagaList.jsx - Mejorado
// ============================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SagaModal from './SagaModal';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

function SagaList({ user }) {
    const [sagas, setSagas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingSaga, setEditingSaga] = useState(null);

    useEffect(() => {
        fetchSagas();
    }, []);

    const fetchSagas = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/chronicles');
            
            if (!response.ok) {
                throw new Error('Error al cargar las crónicas');
            }
            
            const data = await response.json();
            setSagas(data);
        } catch (err) {
            console.error('Error fetching sagas:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!window.confirm("⚠️ ¿Eliminar crónica y toda su historia?")) return;
        
        try {
            const response = await fetch(`/api/chronicles/${id}`, { 
                method: 'DELETE' 
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar crónica');
            }
            
            await fetchSagas();
        } catch (err) {
            console.error('Error deleting saga:', err);
            alert('Error al eliminar la crónica');
        }
    };

    const handleEdit = (e, saga) => {
        e.preventDefault();
        e.stopPropagation();
        
        setEditingSaga(saga);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingSaga(null);
        setShowModal(true);
    };

    const saveSaga = async (sagaData) => {
        try {
            const url = sagaData.id 
                ? `/api/chronicles/${sagaData.id}` 
                : '/api/chronicles';
            const method = sagaData.id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sagaData)
            });
            
            if (!response.ok) {
                throw new Error('Error al guardar crónica');
            }
            
            await fetchSagas();
        } catch (err) {
            console.error('Error saving saga:', err);
            throw err;
        }
    };

    // Estados de carga y error
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Cargando crónicas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-red-500">
                    <p className="text-xl mb-2">Error al cargar las crónicas</p>
                    <p className="text-sm text-neutral-400 mb-4">{error}</p>
                    <button 
                        onClick={fetchSagas}
                        className="px-4 py-2 bg-red-900 hover:bg-red-800 rounded transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                
                {/* Tarjeta "Nueva Crónica" (Solo Admin) */}
                {user?.role === 'admin' && (
                    <button
                        onClick={handleCreate}
                        className="h-80 border-2 border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center text-neutral-500 hover:text-red-500 hover:border-red-500 cursor-pointer transition-all bg-neutral-900/50 hover:bg-neutral-900/70"
                        aria-label="Crear nueva crónica"
                    >
                        <FaPlus className="text-4xl mb-2" />
                        <span className="font-serif tracking-wider">Nueva Crónica</span>
                    </button>
                )}

                {/* Lista de Sagas */}
                {sagas.length === 0 && user?.role !== 'admin' ? (
                    <div className="col-span-full text-center py-12 text-neutral-500">
                        <p className="text-xl font-serif">No hay crónicas disponibles</p>
                    </div>
                ) : (
                    sagas.map(saga => (
                        <div 
                            key={saga.id} 
                            className="relative group h-80 rounded-lg overflow-hidden border border-neutral-800 hover:border-red-600 transition-all shadow-lg bg-black"
                        >
                            {/* Botones Admin (Flotantes) */}
                            {user?.role === 'admin' && (
                                <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => handleEdit(e, saga)}
                                        className="p-2 bg-neutral-900/90 text-yellow-500 rounded hover:bg-yellow-600 hover:text-white border border-neutral-600 transition-colors"
                                        title="Editar crónica"
                                        aria-label={`Editar ${saga.title}`}
                                    >
                                        <FaEdit />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(e, saga.id)}
                                        className="p-2 bg-neutral-900/90 text-red-500 rounded hover:bg-red-600 hover:text-white border border-neutral-600 transition-colors"
                                        title="Borrar crónica"
                                        aria-label={`Borrar ${saga.title}`}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            )}

                            {/* Link a la crónica */}
                            <Link 
                                to={`/chronicle/${saga.id}`} 
                                className="block w-full h-full"
                                aria-label={`Ver crónica ${saga.title}`}
                            >
                                {/* Imagen de portada */}
                                <img 
                                    src={saga.cover_image || 'https://via.placeholder.com/300x400/1a1a1a/666666?text=Sin+Imagen'} 
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-105"
                                    alt={`Portada de ${saga.title}`}
                                    loading="lazy"
                                />
                                
                                {/* Título Overlay */}
                                <div className="absolute bottom-0 w-full p-3 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-red-900/50">
                                    <h2 className="text-white font-serif text-lg tracking-wide drop-shadow-md m-0 text-center">
                                        {saga.title}
                                    </h2>
                                </div>
                            </Link>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Crear/Editar */}
            <SagaModal 
                show={showModal} 
                onClose={() => {
                    setShowModal(false);
                    setEditingSaga(null);
                }} 
                onSave={saveSaga} 
                sagaToEdit={editingSaga} 
            />
        </div>
    );
}

export default SagaList;