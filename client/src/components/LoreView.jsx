import { useState, useEffect } from 'react';

function LoreView({ user }) {
    const [loreList, setLoreList] = useState([]);
    const [selectedLore, setSelectedLore] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Estado del formulario
    const [formData, setFormData] = useState({ title: '', category: 'Sesión', content: '' });

    // Cargar datos
   // Cargar datos (VERSIÓN BLINDADA)
    const fetchLore = () => {
        fetch('/api/lore')
            .then(res => {
                // Si el servidor da error (500, 404, etc), lanzamos error para que lo atrape el catch
                if (!res.ok) throw new Error("Error en el servidor");
                return res.json();
            })
            .then(data => {
                // DOBLE CHEQUEO: Solo guardamos si es un Array real
                if (Array.isArray(data)) {
                    setLoreList(data);
                    
                    if (selectedLore) {
                        const updated = data.find(l => l.id === selectedLore.id);
                        if (updated) setSelectedLore(updated);
                    }
                } else {
                    console.error("El servidor no devolvió una lista:", data);
                    setLoreList([]); // Evita que explote el .map
                }
            })
            .catch(err => {
                console.error("Error cargando lore:", err);
                setLoreList([]); // En caso de error, lista vacía para que no rompa
            });
    };

    // --- ACCIONES ---

    const handleSelect = (item) => {
        setSelectedLore(item);
        setIsEditing(false); // Salir de modo edición si cambiamos de archivo
    };

    const handleNew = () => {
        setFormData({ title: '', category: 'Sesión', content: '' });
        setSelectedLore(null); // Deseleccionar para limpiar el panel derecho
        setIsEditing(true);    // Activar modo edición/creación
    };

    const handleEdit = () => {
        if (!selectedLore) return;
        setFormData({
            title: selectedLore.title,
            category: selectedLore.category,
            content: selectedLore.content
        });
        setIsEditing(true);
    };

    const handleDelete = async () => {
        if (!selectedLore || !confirm("¿Quemar este documento para siempre?")) return;
        
        await fetch(`/api/lore/${selectedLore.id}`, { method: 'DELETE' });
        setSelectedLore(null); // Limpiar lector
        setIsEditing(false);
        fetchLore();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const url = (selectedLore && selectedLore.id && !isEditingNew()) 
            ? `/api/lore/${selectedLore.id}` 
            : '/api/lore';
        
        const method = (selectedLore && selectedLore.id && !isEditingNew()) ? 'PUT' : 'POST';

        // Pequeño truco: si estamos en "New", selectedLore es null, así que es POST.
        // Si estamos editando uno existente, selectedLore tiene datos.
        
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        setIsEditing(false);
        fetchLore();
        
        // Si era nuevo, limpiamos selección. Si era edit, se actualiza solo en fetchLore
        if (isEditingNew()) setSelectedLore(null);
    };

    // Helper para saber si estamos creando uno totalmente nuevo
    const isEditingNew = () => isEditing && !selectedLore;

    return (
        <div className="fade-in">
            <h2 className="text-danger mb-4">Archivos de la Ciudad</h2>
            <div className="row">
                
                {/* COLUMNA IZQUIERDA: LISTA */}
                <div className="col-md-4 mb-4">
                    <button className="btn btn-danger w-100 mb-3 fw-bold" onClick={handleNew}>
                        + Nuevo Documento
                    </button>
                    
                    <div className="list-group rounded-0" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                        {loreList.map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => handleSelect(item)}
                                className={`list-group-item list-group-item-action bg-dark text-white border-secondary d-flex justify-content-between align-items-center ${selectedLore?.id === item.id ? 'active border-danger' : ''}`}
                            >
                                <div>
                                    <strong className={selectedLore?.id === item.id ? 'text-white' : 'text-warning'}>
                                        {item.category === 'Sesión' ? '📖' : item.category === 'Carta' ? '✉️' : '📜'} {item.title}
                                    </strong>
                                    <br/>
                                    <small className="text-muted" style={{fontSize:'0.7em'}}>{item.category}</small>
                                </div>
                                <span className="text-danger">➤</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: LECTOR O EDITOR */}
                <div className="col-md-8">
                    <div className="card p-4 bg-dark border border-secondary" style={{minHeight: '500px'}}>
                        
                        {/* MODO 1: FORMULARIO (Crear o Editar) */}
                        {isEditing ? (
                            <form onSubmit={handleSave} className="fade-in">
                                <h4 className="text-info mb-3">{selectedLore ? 'Editar Archivo' : 'Nuevo Archivo'}</h4>
                                <div className="mb-3">
                                    <input type="text" className="form-control" placeholder="Título" required
                                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <select className="form-select" 
                                        value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="Sesión">Diario de Sesión</option>
                                        <option value="Lore">Lore / Pista</option>
                                        <option value="Carta">Carta / Mensaje</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <textarea className="form-control" rows="10" placeholder="Escribe el contenido..." required
                                        value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}></textarea>
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-info flex-grow-1">Guardar</button>
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setIsEditing(false)}>Cancelar</button>
                                </div>
                            </form>
                        ) : (
                            /* MODO 2: LECTOR (Ver contenido) */
                            selectedLore ? (
                                <div className="fade-in h-100 d-flex flex-column">
                                    <div className="border-bottom border-secondary pb-3 mb-3">
                                        <h2 className="text-danger m-0">{selectedLore.title}</h2>
                                        <small className="text-muted fst-italic">Categoría: {selectedLore.category}</small>
                                    </div>
                                    
                                    <div className="flex-grow-1" style={{fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', whiteSpace: 'pre-wrap', color: '#ddd'}}>
                                        {selectedLore.content}
                                    </div>

                                    {/* Controles Admin */}
                                    {user.role === 'admin' && (
                                        <div className="mt-4 pt-3 border-top border-secondary text-end">
                                            <button className="btn btn-sm btn-outline-info me-2" onClick={handleEdit}>Editar</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={handleDelete}>Quemar</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* MODO 3: VACÍO */
                                <div className="text-center text-muted mt-5 h-100 d-flex flex-column justify-content-center align-items-center">
                                    <h1 style={{opacity: 0.2, fontSize: '4rem'}}>⚜️</h1>
                                    <p>Selecciona un archivo del registro.</p>
                                </div>
                            )
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoreView;