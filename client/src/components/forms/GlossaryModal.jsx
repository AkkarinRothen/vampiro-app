import React, { useState, useEffect } from 'react';
import Icons from '../ui/Icons';

const GlossaryModal = ({ isOpen, onClose, onSave, onDelete, glossary = [] }) => {
    // Estados del formulario
    const [term, setTerm] = useState('');
    const [definition, setDefinition] = useState('');
    const [isGlobal, setIsGlobal] = useState(false);
    
    // Estado para saber qué nota estamos editando (si hay alguna seleccionada)
    const [selectedId, setSelectedId] = useState(null); 

    // Estado para el buscador lateral
    const [filter, setFilter] = useState('');

    // Reiniciar estados al cerrar o abrir
    useEffect(() => {
        if (isOpen) {
            handleNewNote();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- MANEJADORES ---

    const handleNewNote = () => {
        setTerm('');
        setDefinition('');
        setIsGlobal(false);
        setSelectedId(null);
    };

    const handleSelectNote = (note) => {
        setTerm(note.term);
        setDefinition(note.definition);
        // Si chronicle_id es null, es global
        setIsGlobal(note.chronicle_id === null);
        setSelectedId(note.id);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!term.trim() || !definition.trim()) return;

        // Llamamos al padre (LoreView) para guardar
        // Nota: El backend usa el NOMBRE del término para decidir si actualiza o crea,
        // así que no necesitamos enviar el ID en el onSave, pero sí el flag isGlobal.
        onSave(term, definition, isGlobal);
        
        // Opcional: Limpiar tras guardar o dejarlo para seguir editando
        // handleNewNote(); 
    };

    const handleDelete = () => {
        if (selectedId && onDelete) {
            if (window.confirm(`¿Seguro que quieres borrar la nota "${term}"?`)) {
                onDelete(selectedId); // Pasamos el ID real para borrar
                handleNewNote();      // Limpiamos el formulario
            }
        }
    };

    // Filtrar la lista lateral (asegurando que glossary sea un array)
    const safeGlossary = Array.isArray(glossary) ? glossary : [];
    const filteredTerms = safeGlossary.filter(item => 
        item.term.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl rounded-lg shadow-2xl flex flex-col h-[80vh]">
                
                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-neutral-800 bg-neutral-900/50">
                    <h3 className="text-xl font-serif text-purple-400 flex items-center gap-2">
                        <Icons.StickyNote /> Glosario & Lore
                    </h3>
                    <div className="flex gap-2">
                        {/* Botón Nueva Nota (móvil y desktop) */}
                        <button 
                            onClick={handleNewNote} 
                            className="text-xs uppercase font-bold text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1 rounded transition-colors"
                        >
                            + Nueva
                        </button>
                        <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
                            <Icons.X />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* SIDEBAR (LISTA) */}
                    <div className="w-1/3 border-r border-neutral-800 flex flex-col bg-black/20">
                        <div className="p-3 border-b border-neutral-800/50">
                            <input 
                                type="text" 
                                placeholder="Buscar nota..." 
                                className="bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-white w-full focus:border-purple-500 outline-none" 
                                value={filter} 
                                onChange={e => setFilter(e.target.value)} 
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                            {filteredTerms.length === 0 && (
                                <p className="text-neutral-600 text-xs text-center mt-4 italic">No hay notas</p>
                            )}
                            {filteredTerms.map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => handleSelectNote(item)} 
                                    className={`block w-full text-left text-sm p-2 rounded truncate transition-all border border-transparent ${
                                        selectedId === item.id 
                                        ? 'bg-purple-900/30 text-purple-200 border-purple-800/50' 
                                        : 'text-neutral-400 hover:text-purple-300 hover:bg-neutral-800'
                                    }`}
                                >
                                    {item.term}
                                    {item.chronicle_id === null && (
                                        <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-300 px-1 rounded border border-blue-800/30">GLOBAL</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MAIN (FORMULARIO) */}
                    <div className="w-2/3 p-6 flex flex-col overflow-y-auto bg-neutral-900">
                        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto w-full">
                            
                            {/* TÍTULO */}
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">
                                    Término / Título
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded text-white focus:border-purple-500 outline-none font-serif text-lg" 
                                        placeholder="Ej: La Camarilla" 
                                        value={term} 
                                        onChange={e => setTerm(e.target.value)} 
                                        required 
                                    />
                                    {selectedId && (
                                        <span className="absolute right-3 top-3 text-xs text-green-500 font-mono">
                                            EDITANDO
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* DEFINICIÓN */}
                            <div className="flex-1">
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">
                                    Definición / Contenido
                                </label>
                                <textarea 
                                    className="w-full bg-neutral-950 border border-neutral-700 p-4 rounded text-neutral-300 h-64 focus:border-purple-500 outline-none resize-none leading-relaxed" 
                                    placeholder="Escribe aquí la descripción..." 
                                    value={definition} 
                                    onChange={e => setDefinition(e.target.value)} 
                                    required
                                ></textarea>
                            </div>

                            {/* OPCIONES */}
                            <div className="flex items-center justify-between bg-neutral-800/30 p-4 rounded border border-neutral-800">
                                
                                {/* Checkbox Global */}
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="isGlobalTerm" 
                                        className="accent-purple-600 w-4 h-4 cursor-pointer"
                                        checked={isGlobal}
                                        onChange={(e) => setIsGlobal(e.target.checked)}
                                    />
                                    <label htmlFor="isGlobalTerm" className="text-sm text-neutral-300 cursor-pointer select-none">
                                        Es una nota <strong>Global</strong>
                                    </label>
                                </div>

                                {/* Botones de Acción */}
                                <div className="flex items-center gap-3">
                                    {/* Botón Borrar (Solo si hay ID seleccionado) */}
                                    {selectedId && (
                                        <button 
                                            type="button" 
                                            onClick={handleDelete}
                                            className="text-red-400 hover:text-red-300 text-sm px-4 py-2 hover:bg-red-900/20 rounded transition-colors border border-transparent hover:border-red-900/50"
                                        >
                                            <Icons.Trash className="inline w-4 h-4 mr-1"/> Borrar
                                        </button>
                                    )}

                                    {/* Botón Guardar */}
                                    <button 
                                        type="submit" 
                                        className="bg-purple-700 hover:bg-purple-600 text-white px-6 py-2 rounded shadow-lg shadow-purple-900/20 transition-all transform active:scale-95 font-medium"
                                    >
                                        <Icons.Check className="inline w-4 h-4 mr-1"/>
                                        {selectedId ? 'Actualizar' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Helper Text */}
                            <p className="text-[10px] text-neutral-600 text-center pt-2">
                                {selectedId 
                                    ? "Estás editando una nota existente. Los cambios afectarán a cómo se ve en el listado."
                                    : "Estás creando una nota nueva. Si el nombre coincide con una global, la sobrescribirá localmente."
                                }
                            </p>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlossaryModal;