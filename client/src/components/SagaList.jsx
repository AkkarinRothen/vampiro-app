import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SagaModal from './SagaModal';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'; // Iconos nuevos

function SagaList({ user }) {
    const [sagas, setSagas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSaga, setEditingSaga] = useState(null);

    const fetchSagas = () => {
        fetch('/api/chronicles')
            .then(res => res.json())
            .then(data => setSagas(data))
            .catch(err => console.error(err));
    };

    useEffect(() => { fetchSagas(); }, []);

    // --- ACCIONES ---
    const handleDelete = async (e, id) => {
        e.preventDefault(); // Evita que el Link se active
        if (!confirm("⚠️ ¿Eliminar crónica y toda su historia?")) return;
        await fetch(`/api/chronicles/${id}`, { method: 'DELETE' });
        fetchSagas();
    };

    const handleEdit = (e, saga) => {
        e.preventDefault(); // Evita que el Link se active
        setEditingSaga(saga);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingSaga(null);
        setShowModal(true);
    };

    const saveSaga = async (sagaData) => {
        const url = sagaData.id ? `/api/chronicles/${sagaData.id}` : '/api/chronicles';
        const method = sagaData.id ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sagaData)
        });
        fetchSagas();
    };

    return (
        <div className="animate-fade-in">
            {/* Grid Layout con Tailwind */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                
                {/* 1. Tarjeta "Nueva Crónica" (Solo Admin) */}
                {user.role === 'admin' && (
                    <div 
                        onClick={handleCreate}
                        className="h-80 border-2 border-dashed border-neutral-700 rounded-lg flex flex-col items-center justify-center text-neutral-500 hover:text-red-500 hover:border-red-500 cursor-pointer transition-all bg-neutral-900/50"
                    >
                        <FaPlus className="text-4xl mb-2" />
                        <span className="font-serif tracking-wider">Nueva Crónica</span>
                    </div>
                )}

                {/* 2. Lista de Sagas */}
                {sagas.map(saga => (
                    <div key={saga.id} className="relative group h-80 rounded-lg overflow-hidden border border-neutral-800 hover:border-red-600 transition-all shadow-lg bg-black">
                        
                        {/* Botones Admin (Flotantes) */}
                        {user.role === 'admin' && (
                            <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleEdit(e, saga)}
                                    className="p-2 bg-neutral-900 text-yellow-500 rounded hover:bg-white hover:text-black border border-neutral-600"
                                    title="Editar"
                                >
                                    <FaEdit />
                                </button>
                                <button 
                                    onClick={(e) => handleDelete(e, saga.id)}
                                    className="p-2 bg-neutral-900 text-red-500 rounded hover:bg-red-600 hover:text-white border border-neutral-600"
                                    title="Borrar"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        )}

                        {/* El Enlace envuelve la imagen y el título */}
                        <Link to={`/sagas/${saga.id}`} className="block w-full h-full">
                            {/* Imagen */}
                            <img 
                                src={saga.cover_image || 'https://via.placeholder.com/300'} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-105"
                                alt={saga.title} 
                            />
                            
                            {/* Título Overlay */}
                            <div className="absolute bottom-0 w-full p-3 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-red-900/50 text-center">
                                <h5 className="text-white font-serif text-lg tracking-wide drop-shadow-md m-0">
                                    {saga.title}
                                </h5>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Modal de Crear/Editar */}
            <SagaModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                onSave={saveSaga} 
                sagaToEdit={editingSaga} 
            />
        </div>
    );
}

export default SagaList;