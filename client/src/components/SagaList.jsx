import { useState, useEffect } from 'react';
import SagaModal from './SagaModal'; // Importamos el modal

function SagaList({ user, onSelectSaga }) { // Recibimos onSelectSaga del padre
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
        e.stopPropagation(); // Para no entrar a la saga al hacer clic en borrar
        if (!confirm("⚠️ ¿Eliminar crónica y toda su historia?")) return;
        await fetch(`/api/chronicles/${id}`, { method: 'DELETE' });
        fetchSagas();
    };

    const handleEdit = (e, saga) => {
        e.stopPropagation();
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
        <div className="view-section fade-in">
            <div className="row g-4 justify-content-center">
                
                {/* Botón Nueva Crónica (Solo Admin) */}
                {user.role === 'admin' && (
                    <div className="col-md-3 col-sm-6">
                        <div className="saga-card d-flex align-items-center justify-content-center" 
                             onClick={handleCreate}
                             style={{border: '2px dashed #444', cursor: 'pointer', height: '100%', minHeight: '300px'}}>
                           <div className="text-center text-muted">
                                <h1 className="m-0">+</h1>
                                <small>Nueva Crónica</small>
                           </div>
                        </div>
                    </div>
                )}

                {/* Lista de Sagas */}
                {sagas.map(saga => (
                    <div key={saga.id} className="col-md-3 col-sm-6">
                        <div className="saga-card position-relative" 
                             onClick={() => onSelectSaga(saga.id)} // <--- Navegar al detalle
                             style={{cursor: 'pointer', overflow: 'hidden', border: '1px solid #333'}}>
                            
                            {/* Botones Admin */}
                            {user.role === 'admin' && (
                                <div className="position-absolute top-0 end-0 p-2" style={{zIndex: 10}}>
                                    <button className="btn btn-sm btn-dark border border-secondary me-1" 
                                            onClick={(e) => handleEdit(e, saga)}>✏️</button>
                                    <button className="btn btn-sm btn-danger" 
                                            onClick={(e) => handleDelete(e, saga.id)}>🗑️</button>
                                </div>
                            )}

                            <img src={saga.cover_image || 'https://via.placeholder.com/300'} 
                                 className="saga-img w-100 h-100" style={{objectFit: 'cover', opacity: 0.6, transition: '0.3s'}}
                                 onMouseOver={e => e.currentTarget.style.opacity = 1}
                                 onMouseOut={e => e.currentTarget.style.opacity = 0.6}
                                 alt={saga.title} />
                            
                            <div className="position-absolute bottom-0 w-100 text-center p-2 bg-black bg-opacity-75 border-top border-danger">
                                <h5 className="text-white m-0" style={{fontFamily: 'Cinzel'}}>{saga.title}</h5>
                            </div>
                        </div>
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