import { useState, useEffect } from 'react';
import { VTM_DATA } from '../data'; // Importamos los datos
import { convertToBase64 } from '../utils'; // Importamos la utilidad

function CharacterForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        name: '', gen: '', clan: '', predator_type: '', type: 'PC', image: ''
    });
    const [selectedDiscs, setSelectedDiscs] = useState([]);

    // Efecto mágico: Cuando cambia el clan, pre-seleccionamos disciplinas
    useEffect(() => {
        if (formData.clan && VTM_DATA.clans[formData.clan]) {
            // Agregamos las disciplinas del clan a las seleccionadas
            const clanDiscs = VTM_DATA.clans[formData.clan];
            // Combinamos las actuales con las nuevas sin duplicar
            setSelectedDiscs(prev => [...new Set([...prev, ...clanDiscs])]);
        }
    }, [formData.clan]);

    const handleImage = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const base64 = await convertToBase64(file);
            setFormData({ ...formData, image: base64 });
        }
    };

    const handleDiscToggle = (disc) => {
        if (selectedDiscs.includes(disc)) {
            setSelectedDiscs(selectedDiscs.filter(d => d !== disc));
        } else {
            setSelectedDiscs([...selectedDiscs, disc]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                clan: formData.clan,
                generation: formData.gen,
                type: formData.type,
                predator_type: formData.predator_type,
                image_url: formData.image,
                disciplines: selectedDiscs
            };

            const res = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert("Vástago abrazado correctamente.");
                // Limpiar form
                setFormData({ name: '', gen: '', clan: '', predator_type: '', type: 'PC', image: '' });
                setSelectedDiscs([]);
                if (onSuccess) onSuccess(); // Avisar al padre para cambiar de vista
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="row justify-content-center fade-in">
            <div className="col-md-8">
                <h4 className="text-white mb-4 border-bottom border-secondary pb-2">Registro de Vástago</h4>
                <div className="card bg-dark border border-secondary p-4 shadow">
                    <form onSubmit={handleSubmit}>
                        {/* Datos Básicos */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="text-muted small">Nombre</label>
                                <input type="text" className="form-control" required
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="col-md-6">
                                <label className="text-muted small">Generación</label>
                                <input type="number" className="form-control" 
                                    value={formData.gen} onChange={e => setFormData({...formData, gen: e.target.value})} />
                            </div>
                        </div>

                        {/* Selectores */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="text-warning small">Clan</label>
                                <select className="form-select" value={formData.clan} onChange={e => setFormData({...formData, clan: e.target.value})}>
                                    <option value="">Selecciona...</option>
                                    {Object.keys(VTM_DATA.clans).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="text-muted small">Depredador</label>
                                <select className="form-select" value={formData.predator_type} onChange={e => setFormData({...formData, predator_type: e.target.value})}>
                                    <option value="">Selecciona...</option>
                                    {VTM_DATA.predator_types.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Disciplinas */}
                        <div className="mb-4">
                            <label className="text-danger small fw-bold mb-2">Disciplinas</label>
                            <div className="p-3 border border-secondary rounded" style={{background: 'rgba(0,0,0,0.3)'}}>
                                {VTM_DATA.all_disciplines.map(d => (
                                    <div key={d} className="form-check form-check-inline">
                                        <input className="form-check-input" type="checkbox" 
                                            checked={selectedDiscs.includes(d)}
                                            onChange={() => handleDiscToggle(d)} />
                                        <label className={`form-check-label small ${selectedDiscs.includes(d) ? 'text-warning fw-bold' : 'text-muted'}`}>
                                            {d}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Imagen y Tipo */}
                        <div className="row mb-4">
                            <div className="col-md-8">
                                <label className="text-muted small">Imagen</label>
                                <input type="file" className="form-control" accept="image/*" onChange={handleImage} />
                            </div>
                            <div className="col-md-4">
                                <label className="text-muted small">Tipo</label>
                                <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="PC">Jugador</option>
                                    <option value="NPC">Narrador</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-danger w-100 fw-bold">ABRAZAR</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CharacterForm;