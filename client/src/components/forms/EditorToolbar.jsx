import React, { useState } from 'react';
import Icons from '../ui/Icons';

const EditorToolbar = ({ onInsert, wordCount, charCount }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [currentColor, setCurrentColor] = useState('#ef4444');
    
    // Lista de colores favoritos (persistida o default)
    const favoriteColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];

    const applyColor = (color) => {
        onInsert(`<span style="color: ${color}">`, `</span>`);
        setShowColorPicker(false);
    };

    return (
        <div className="hidden md:flex flex-wrap gap-1 bg-neutral-900 p-2 border-b border-neutral-800 rounded-t items-center relative z-20">
            {/* Formato Básico */}
            <button type="button" onClick={() => onInsert('**', '**')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white font-bold" title="Negrita (Ctrl+B)">B</button>
            <button type="button" onClick={() => onInsert('*', '*')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white italic" title="Cursiva (Ctrl+I)">I</button>
            
            <div className="w-px h-5 bg-neutral-800 mx-2"></div>
            
            {/* Herramientas Especiales */}
            <button type="button" onClick={() => onInsert('==', '==')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-yellow-400" title="Resaltar"><Icons.Highlighter /></button>
            <button type="button" onClick={() => onInsert('^[', ']')} className="p-2 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400" title="Nota"><Icons.StickyNote /></button>

            <div className="w-px h-5 bg-neutral-800 mx-2"></div>

            {/* Notas Tipadas */}
            <div className="flex gap-1 bg-neutral-950 rounded px-1">
                <button type="button" onClick={() => onInsert('^info[', ']')} className="p-2 hover:bg-neutral-800 rounded text-blue-400 text-sm" title="Info">ℹ</button>
                <button type="button" onClick={() => onInsert('^warning[', ']')} className="p-2 hover:bg-neutral-800 rounded text-yellow-400 text-sm" title="Warning">⚠</button>
                <button type="button" onClick={() => onInsert('^lore[', ']')} className="p-2 hover:bg-neutral-800 rounded text-purple-400 text-sm" title="Lore">📖</button>
                <button type="button" onClick={() => onInsert('^secret[', ']')} className="p-2 hover:bg-neutral-800 rounded text-red-400 text-sm" title="Secreto">👁</button>
            </div>

            <div className="w-px h-5 bg-neutral-800 mx-2"></div>

            {/* Selector de Color */}
            <div className="relative">
                <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 rounded flex items-center gap-2 text-neutral-400 hover:bg-neutral-800">
                    <Icons.Palette /> 
                    <div className="w-3 h-3 rounded-full border border-neutral-500" style={{ backgroundColor: currentColor }}></div>
                </button>
                
                {showColorPicker && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-48 z-50">
                        <div className="flex gap-2 mb-2">
                            {favoriteColors.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    className="w-6 h-6 rounded-full border border-neutral-600 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => { setCurrentColor(color); applyColor(color); }}
                                />
                            ))}
                        </div>
                        <input 
                            type="color" 
                            value={currentColor} 
                            onChange={(e) => setCurrentColor(e.target.value)}
                            className="w-full h-8 bg-transparent cursor-pointer"
                        />
                    </div>
                )}
            </div>
            
            {/* Backdrop para cerrar color picker */}
            {showColorPicker && <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)}></div>}

            <div className="flex-1"></div>
            
            {/* Contadores */}
            <div className="flex gap-3 text-[10px] text-neutral-600 font-mono px-2 select-none">
                <span>{wordCount} palabras</span>
                <span>{charCount} carac.</span>
            </div>
        </div>
    );
};

export default EditorToolbar;