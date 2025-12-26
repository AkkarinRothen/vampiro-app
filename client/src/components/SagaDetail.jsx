import { useState, useEffect } from 'react';

function SagaDetail({ sagaId, onBack, user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/chronicles/${sagaId}`)
            .then(res => res.json())
            .then(result => {
                setData(result);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, [sagaId]);

    if (loading) return <div className="text-white text-center mt-5">Abriendo el tomo...</div>;
    if (!data) return <div className="text-danger text-center">Error al cargar la crónica.</div>;

    const { info, characters, sections } = data;

    return (
        <div className="fade-in">
            {/* Cabecera */}
            <div className="d-flex justify-content-between align-items-center mb-5 border-bottom border-warning pb-3">
                <div className="d-flex align-items-center">
                    <button className="btn btn-outline-secondary me-3" onClick={onBack}>← Volver</button>
                    <h1 className="text-warning m-0">{info.title}</h1>
                </div>
                
                {/* Roster (Círculos) */}
                <div className="d-flex">
                    {characters.map(char => (
                        <div key={char.id} className="char-token" title={char.name} 
                             style={{width:'50px', height:'50px', borderRadius:'50%', overflow:'hidden', border:'2px solid #c5a059', marginLeft:'-10px'}}>
                            <img src={char.image_url} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        </div>
                    ))}
                    {/* Botón invocar (Solo admin) */}
                    {user.role === 'admin' && (
                        <button className="btn btn-sm btn-outline-warning ms-3 rounded-circle" style={{width:'40px', height:'40px'}}>+</button>
                    )}
                </div>
            </div>

            {/* Historia */}
            <div className="container">
                {sections.length === 0 ? (
                    <p className="text-muted text-center fst-italic">La historia aún no ha sido escrita...</p>
                ) : (
                    sections.map((section, index) => (
                        <div key={section.id} className={`fade-in mb-5 ${index === 0 ? 'story-premise p-4 border border-danger bg-dark bg-opacity-50' : 'story-timeline ms-5 ps-4 border-start border-secondary'}`}>
                            <div className="row">
                                {section.image_url && (
                                    <div className="col-md-4 mb-3">
                                        <img src={section.image_url} className="img-fluid border border-secondary" />
                                    </div>
                                )}
                                <div className={section.image_url ? "col-md-8" : "col-12"}>
                                    <h3 className={index === 0 ? "text-danger" : "text-warning"}>{section.title}</h3>
                                    <div style={{whiteSpace: 'pre-wrap', color: '#ddd'}}>{section.content}</div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default SagaDetail;