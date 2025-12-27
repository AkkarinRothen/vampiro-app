import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaExclamationTriangle, FaBook, FaEnvelope, FaScroll } from 'react-icons/fa';

// Constantes
const CATEGORIES = {
    SESSION: 'Sesión',
    LORE: 'Lore',
    LETTER: 'Carta'
};

const CATEGORY_ICONS = {
    [CATEGORIES.SESSION]: FaBook,
    [CATEGORIES.LORE]: FaScroll,
    [CATEGORIES.LETTER]: FaEnvelope
};

const INITIAL_FORM_STATE = {
    title: '',
    category: CATEGORIES.SESSION,
    content: ''
};

function LoreView({ user }) {
    const [loreList, setLoreList] = useState([]);
    const [selectedLore, setSelectedLore] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    
    // Estado del formulario
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Cargar datos con manejo robusto de errores
    const fetchLore = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/lore');
            
            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            
            if (!Array.isArray(data)) {
                console.error("El servidor no devolvió una lista:", data);
                throw new Error("Formato de datos inválido");
            }
            
            setLoreList(data);
            
            // Actualizar item seleccionado si existe
            if (selectedLore) {
                const updated = data.find(l => l.id === selectedLore.id);
                if (updated) {
                    setSelectedLore(updated);
                } else {
                    // Si el item fue eliminado, limpiar selección
                    setSelectedLore(null);
                }
            }
        } catch (err) {
            console.error("Error cargando lore:", err);
            setError(err.message || "Error al cargar documentos");
            setLoreList([]);
        } finally {
            setLoading(false);
        }
    }, [selectedLore]);

    useEffect(() => {
        fetchLore();
    }, []);

    // --- ACCIONES ---

    const handleSelect = useCallback((item) => {
        setSelectedLore(item);
        setIsEditing(false);
        setError(null);
    }, []);

    const handleNew = useCallback(() => {
        setFormData(INITIAL_FORM_STATE);
        setSelectedLore(null);
        setIsEditing(true);
        setError(null);
    }, []);

    const handleEdit = useCallback(() => {
        if (!selectedLore) return;
        
        setFormData({
            title: selectedLore.title,
            category: selectedLore.category,
            content: selectedLore.content
        });
        setIsEditing(true);
        setError(null);
    }, [selectedLore]);

    const handleDelete = async () => {
        if (!selectedLore) return;
        
        if (!confirm("¿Quemar este documento para siempre?")) return;
        
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/lore/${selectedLore.id}`, { 
                method: 'DELETE' 
            });

            if (!res.ok) {
                throw new Error('Error al eliminar documento');
            }

            setSelectedLore(null);
            setIsEditing(false);
            await fetchLore();
        } catch (err) {
            console.error("Error eliminando documento:", err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        // Validaciones
        if (!formData.title.trim()) {
            setError('El título es requerido');
            return;
        }

        if (!formData.content.trim()) {
            setError('El contenido es requerido');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const isNewDocument = !selectedLore?.id;
            const url = isNewDocument ? '/api/lore' : `/api/lore/${selectedLore.id}`;
            const method = isNewDocument ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al guardar documento');
            }

            setIsEditing(false);
            await fetchLore();
            
            if (isNewDocument) {
                setSelectedLore(null);
                setFormData(INITIAL_FORM_STATE);
            }
        } catch (err) {
            console.error("Error guardando documento:", err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setFormData(INITIAL_FORM_STATE);
        setError(null);
    }, []);

    // Filtrado optimizado
    const filteredLore = useMemo(() => {
        return loreList.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 item.content.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [loreList, searchTerm, filterCategory]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 font-serif text-2xl mb-4 animate-pulse">
                        Descifrando grimorio...
                    </div>
                    <div className="w-16 h-16 border-4 border-red-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in min-h-screen pb-20">
            {/* HEADER */}
            <div className="mb-8 border-b border-red-900/30 pb-6">
                <h2 className="text-4xl font-serif text-red-600 mb-2 drop-shadow-md">
                    Archivos de la Ciudad
                </h2>
                <p className="text-neutral-500 font-serif italic">
                    Crónicas, secretos y mensajes del pasado
                </p>
            </div>

            {/* ERROR GLOBAL */}
            {error && (
                <div className="bg-red-900/20 border border-red-900 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3">
                    <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                    <button 
                        onClick={() => setError(null)}
                        className="text-neutral-400 hover:text-white"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMNA IZQUIERDA: LISTA */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4">
                        {/* Botón Nuevo */}
                        <button 
                            className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-lg font-serif flex items-center justify-center gap-2 mb-4 transition-all hover:scale-105 active:scale-95 shadow-lg"
                            onClick={handleNew}
                            disabled={submitting}
                        >
                            <FaPlus /> Nuevo Documento
                        </button>

                        {/* Búsqueda y Filtros */}
                        <div className="space-y-3 mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 p-3 pl-10 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors"
                                />
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setFilterCategory('all')}
                                    className={`py-2 rounded text-sm transition-colors ${
                                        filterCategory === 'all'
                                            ? 'bg-red-900 text-white'
                                            : 'bg-neutral-900 text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    Todos
                                </button>
                                {Object.values(CATEGORIES).map(cat => {
                                    const Icon = CATEGORY_ICONS[cat];
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setFilterCategory(cat)}
                                            className={`py-2 rounded text-sm transition-colors flex items-center justify-center gap-1 ${
                                                filterCategory === cat
                                                    ? 'bg-red-900 text-white'
                                                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                                            }`}
                                        >
                                            <Icon size={12} /> {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Lista de documentos */}
                        <div className="bg-neutral-900 rounded-lg border border-neutral-800 max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar">
                            {filteredLore.length === 0 ? (
                                <div className="text-center text-neutral-600 p-8">
                                    <p className="text-4xl mb-2">📜</p>
                                    <p className="text-sm italic">
                                        {searchTerm || filterCategory !== 'all' 
                                            ? 'No se encontraron documentos'
                                            : 'No hay documentos registrados'}
                                    </p>
                                </div>
                            ) : (
                                filteredLore.map(item => {
                                    const Icon = CATEGORY_ICONS[item.category] || FaScroll;
                                    const isSelected = selectedLore?.id === item.id;
                                    
                                    return (
                                        <button 
                                            key={item.id} 
                                            onClick={() => handleSelect(item)}
                                            className={`w-full text-left p-4 border-b border-neutral-800 transition-colors flex items-center gap-3 group ${
                                                isSelected 
                                                    ? 'bg-red-900/20 border-l-4 border-l-red-600' 
                                                    : 'hover:bg-neutral-800/50'
                                            }`}
                                        >
                                            <Icon className={`flex-shrink-0 ${isSelected ? 'text-red-500' : 'text-yellow-600'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-neutral-500">
                                                    {item.category}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="text-red-500">→</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Contador */}
                        <div className="text-center text-xs text-neutral-600 mt-3">
                            {filteredLore.length} de {loreList.length} documentos
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: LECTOR O EDITOR */}
                <div className="lg:col-span-2">
                    <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 min-h-[600px] flex flex-col">
                        
                        {/* MODO 1: FORMULARIO (Crear o Editar) */}
                        {isEditing ? (
                            <form onSubmit={handleSave} className="flex flex-col h-full space-y-4">
                                <h4 className="text-2xl font-serif text-red-500 mb-2">
                                    {selectedLore ? 'Editar Archivo' : 'Nuevo Archivo'}
                                </h4>
                                
                                <div>
                                    <label className="text-xs text-neutral-500 uppercase font-bold mb-1 block">
                                        Título <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors"
                                        placeholder="Título del documento"
                                        value={formData.title} 
                                        onChange={e => setFormData({...formData, title: e.target.value})} 
                                        required
                                        maxLength={200}
                                        disabled={submitting}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-neutral-500 uppercase font-bold mb-1 block">
                                        Categoría
                                    </label>
                                    <select 
                                        className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors"
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        disabled={submitting}
                                    >
                                        {Object.values(CATEGORIES).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <label className="text-xs text-neutral-500 uppercase font-bold mb-1 block">
                                        Contenido <span className="text-red-500">*</span>
                                    </label>
                                    <textarea 
                                        className="flex-1 w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors resize-none font-serif"
                                        placeholder="Escribe el contenido del documento..."
                                        value={formData.content} 
                                        onChange={e => setFormData({...formData, content: e.target.value})}
                                        required
                                        disabled={submitting}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-neutral-800">
                                    <button 
                                        type="submit" 
                                        className="flex-1 bg-red-900 hover:bg-red-800 text-white py-3 rounded font-serif disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Guardando...' : 'Guardar'}
                                    </button>
                                    <button 
                                        type="button" 
                                        className="px-6 py-3 text-neutral-400 hover:text-white transition-colors"
                                        onClick={handleCancel}
                                        disabled={submitting}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* MODO 2: LECTOR (Ver contenido) */
                            selectedLore ? (
                                <div className="flex flex-col h-full">
                                    <div className="border-b border-neutral-800 pb-4 mb-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h2 className="text-3xl font-serif text-red-600 mb-1">
                                                    {selectedLore.title}
                                                </h2>
                                                <div className="flex items-center gap-2 text-sm text-neutral-500">
                                                    {(() => {
                                                        const Icon = CATEGORY_ICONS[selectedLore.category] || FaScroll;
                                                        return <Icon />;
                                                    })()}
                                                    <span className="italic">Categoría: {selectedLore.category}</span>
                                                </div>
                                            </div>

                                            {/* Controles Admin */}
                                            {user?.role === 'admin' && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
                                                        onClick={handleEdit}
                                                        title="Editar"
                                                        disabled={submitting}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button 
                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                                                        onClick={handleDelete}
                                                        title="Eliminar"
                                                        disabled={submitting}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <div className="font-serif text-lg leading-relaxed text-neutral-300 whitespace-pre-wrap">
                                            {selectedLore.content}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* MODO 3: VACÍO */
                                <div className="flex-1 flex flex-col items-center justify-center text-neutral-600">
                                    <div className="text-8xl mb-4 opacity-20">
                                        📜
                                    </div>
                                    <p className="text-lg font-serif italic">
                                        Selecciona un archivo del registro
                                    </p>
                                    <p className="text-sm mt-2">
                                        o crea uno nuevo para comenzar
                                    </p>
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