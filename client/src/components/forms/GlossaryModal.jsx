import React, { useState } from 'react';
import Icons from '../ui/Icons';

const GlossaryModal = ({ isOpen, onClose, onSave, glossary = {} }) => {
    const [term, setTerm] = useState('');
    const [definition, setDefinition] = useState('');
    const [isGlobal, setIsGlobal] = useState(false); // <--- NUEVO ESTADO
    const [filter, setFilter] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!term.trim() || !definition.trim()) return;
        // Pasamos el tercer argumento isGlobal
        onSave(term, definition, isGlobal); 
        setTerm('');
        setDefinition('');
        setIsGlobal(false);
    };

    const existingTerms = Object.keys(glossary).sort().filter(t => t.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-700 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b border-neutral-800">
                    <h3 className="text-xl font-serif text-purple-400 flex items-center gap-2"><Icons.StickyNote /> Glosario & Lore</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white"><Icons.X /></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/3 border-r border-neutral-800 p-4 flex flex-col bg-black/20">
                        <input type="text" placeholder="Buscar..." className="bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-white mb-4 w-full" value={filter} onChange={e => setFilter(e.target.value)} />
                        <div className="overflow-y-auto flex-1 space-y-2">
                            {existingTerms.map(t => (
                                <button key={t} onClick={() => { setTerm(t); setDefinition(glossary[t]); }} className="block w-full text-left text-sm text-neutral-400 hover:text-purple-300 hover:bg-neutral-800 p-2 rounded truncate transition-colors">{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="w-2/3 p-6 flex flex-col overflow-y-auto">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">Término</label>
                                <input type="text" className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded text-white focus:border-purple-500 outline-none" placeholder="Ej: Camarilla" value={term} onChange={e => setTerm(e.target.value)} required />
                            </div>
                            
                            <div>
                                <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">Definición</label>
                                <textarea className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded text-neutral-300 h-32 focus:border-purple-500 outline-none resize-none" placeholder="Descripción..." value={definition} onChange={e => setDefinition(e.target.value)} required></textarea>
                            </div>

                            {/* CHECKBOX GLOBAL */}
                            <div className="flex items-center gap-2 p-3 bg-neutral-800/50 rounded border border-neutral-700/50">
                                <input 
                                    type="checkbox" 
                                    id="isGlobalTerm" 
                                    className="accent-purple-600 w-4 h-4 cursor-pointer"
                                    checked={isGlobal}
                                    onChange={(e) => setIsGlobal(e.target.checked)}
                                />
                                <label htmlFor="isGlobalTerm" className="text-sm text-neutral-300 cursor-pointer select-none">
                                    Hacer término <strong>Global</strong> (visible en todas las crónicas)
                                </label>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button type="submit" className="bg-purple-900/50 hover:bg-purple-800 text-purple-100 px-6 py-2 rounded border border-purple-700/50 transition-colors shadow-lg">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlossaryModal;