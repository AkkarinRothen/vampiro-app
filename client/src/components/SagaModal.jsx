import { useState, useEffect } from 'react';
import { convertToBase64 } from '../utils';

function SagaModal({ show, onClose, onSave, sagaToEdit }) {
    const [title, setTitle] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');

    // Cuando abre el modal, si es edición, cargamos los datos
    useEffect(() => {
        if (show) {
            if (sagaToEdit) {
                setTitle(sagaToEdit.title);
                setImagePreview(sagaToEdit.cover_image || '');
            } else {
                // Modo crear: limpiar todo
                setTitle('');
                setImagePreview('');
                setFile(null);
                setUrl('');
            }
        }
    }, [show, sagaToEdit]);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const base64 = await convertToBase64(selectedFile);
            setImagePreview(base64);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) return alert('El título es obligatorio');

        let finalImage = imagePreview; // Por defecto la que ya había
        
        // Si subió archivo nuevo, ya lo tenemos en imagePreview gracias al change
        // Si puso URL manual:
        if (!file && url) {
            finalImage = url;
        }

        await onSave({
            id: sagaToEdit ? sagaToEdit.id : null,
            title,
            cover_image: finalImage
        });
        
        onClose();
    };

    if (!show) return null;

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog">
                <div className="modal-content bg-dark text-white border-danger">
                    <div className="modal-header border-secondary">
                        <h5 className="modal-title text-danger">
                            {sagaToEdit ? 'Editar Crónica' : 'Nueva Crónica'}
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label text-muted">Título</label>
                            <input type="text" className="form-control" 
                                   value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        
                        {/* Previsualización */}
                        {imagePreview && (
                            <div className="text-center mb-3">
                                <img src={imagePreview} alt="Preview" className="img-thumbnail" style={{maxHeight: '150px'}} />
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label text-muted">Subir Imagen</label>
                            <input type="file" className="form-control" accept="image/*" onChange={handleFileChange} />
                        </div>
                        <div className="mb-3">
                            <label className="form-label text-muted">O URL de Imagen</label>
                            <input type="text" className="form-control" placeholder="https://..." 
                                   value={url} onChange={(e) => setUrl(e.target.value)} />
                        </div>
                    </div>
                    <div className="modal-footer border-secondary">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="button" className="btn btn-danger" onClick={handleSubmit}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SagaModal;