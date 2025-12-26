import { useState, useEffect } from 'react';

function CharacterList({ user }) {
    const [pcs, setPcs] = useState([]);
    const [npcs, setNpcs] = useState([]);

    const fetchChars = () => {
        fetch('/api/characters')
            .then(res => res.json())
            .then(data => {
                // Aseguramos que data.pcs y data.npcs existan para evitar errores
                setPcs(data.pcs || []);
                setNpcs(data.npcs || []);
            })
            .catch(err => console.error("Error cargando personajes:", err));
    };

    useEffect(() => {
        fetchChars();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm("¿Enviar al cementerio?")) return;
        await fetch(`/api/characters/${id}`, { method: 'DELETE' });
        fetchChars(); 
    };

    // --- AQUÍ ESTABA EL ERROR: BLINDAJE DE CHARCARD ---
    const CharCard = ({ char, color }) => {
        let disciplines = [];
        
        try { 
            // 1. Intentamos parsear
            const parsed = JSON.parse(char.disciplines);
            // 2. Verificamos que sea una lista real (Array). Si es null, usamos []
            if (Array.isArray(parsed)) {
                disciplines = parsed;
            }
        } catch (e) {
            // Si el JSON estaba roto, no pasa nada, disciplines se queda como []
            console.warn(`Error leyendo disciplinas de ${char.name}`);
        }

        return (
            <div className="col-md-6 col-lg-4">
                <div className="card bg-dark border border-secondary h-100 position-relative overflow-hidden">
                    {/* Botón Borrar */}
                    {(user.role === 'admin' || char.created_by === user.username) && (
                        <button onClick={() => handleDelete(char.id)} 
                                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" 
                                style={{zIndex: 10}}>✕</button>
                    )}
                    
                    <div className="row g-0 h-100">
                        <div className="col-5">
                            <img src={char.image_url || 'https://via.placeholder.com/150'} 
                                 className="img-fluid w-100 h-100" style={{objectFit: 'cover'}} />
                        </div>
                        <div className="col-7">
                            <div className="card-body py-2 px-3">
                                <h5 className={`card-title ${color} text-truncate mb-1`}>{char.name}</h5>
                                <h6 className="card-subtitle text-muted mb-1 small">{char.clan || 'Desconocido'}</h6>
                                
                                <div className="mb-2">
                                    {/* Ahora disciplines SIEMPRE es un array, así que esto no fallará */}
                                    {disciplines.length > 0 ? (
                                        disciplines.slice(0, 4).map((d, i) => (
                                            <span key={i} className="badge bg-dark border border-secondary text-secondary me-1" style={{fontSize: '0.6rem'}}>
                                                {d.substring(0,3).toUpperCase()}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="small text-muted fst-italic">- Sin disciplinas -</span>
                                    )}
                                </div>
                                
                                <p className="card-text small mb-0 text-muted">Gen: {char.generation || '?'} | {char.predator_type || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in">
            <h4 className="text-danger border-bottom border-secondary pb-2 mb-4">Coterie & Aliados</h4>
            <div className="row g-4 mb-5">
                {pcs.length > 0 ? (
                    pcs.map(char => <CharCard key={char.id} char={char} color="text-danger" />)
                ) : (
                    <p className="text-muted text-center">No hay personajes jugadores aún.</p>
                )}
            </div>

            <h4 className="text-warning border-bottom border-secondary pb-2 mb-4">Antagonistas & NPCs</h4>
            <div className="row g-4">
                {npcs.length > 0 ? (
                    npcs.map(char => <CharCard key={char.id} char={char} color="text-warning" />)
                ) : (
                    <p className="text-muted text-center">No hay NPCs registrados.</p>
                )}
            </div>
        </div>
    );
}

export default CharacterList;