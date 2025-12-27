import React from 'react';
import { FaArrowsAltH, FaArrowsAltV, FaRulerCombined } from 'react-icons/fa';
import '../ImageSizeControls.css'; // <--- AQUÍ SE IMPORTA EL CSS

const ImageSizeControls = ({ width, height, onChange }) => {
    const presets = [
        { label: 'Pequeña', w: '300px', h: 'auto' },
        { label: 'Mediana', w: '500px', h: 'auto' },
        { label: 'Grande', w: '800px', h: 'auto' },
        { label: 'Full', w: '100%', h: 'auto' },
    ];

    return (
        <div className="image-size-controls-container">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-red-500 uppercase tracking-wider">
                <FaRulerCombined /> Ajustar Imagen
            </div>

            {/* Presets Rápidos */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {presets.map((preset, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onChange(preset.w, preset.h)}
                        className="px-3 py-1 bg-neutral-800 hover:bg-red-900/50 text-neutral-300 hover:text-white text-xs rounded border border-neutral-700 transition-colors whitespace-nowrap"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Inputs Manuales */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1 mb-1">
                        <FaArrowsAltH /> Ancho
                    </label>
                    <input
                        type="text"
                        value={width || '100%'}
                        onChange={(e) => onChange(e.target.value, height)}
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-xs text-white focus:border-red-500 outline-none"
                        placeholder="ej. 100%, 500px"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1 mb-1">
                        <FaArrowsAltV /> Alto
                    </label>
                    <input
                        type="text"
                        value={height || 'auto'}
                        onChange={(e) => onChange(width, e.target.value)}
                        className="w-full bg-black border border-neutral-700 rounded p-2 text-xs text-white focus:border-red-500 outline-none"
                        placeholder="ej. auto, 300px"
                    />
                </div>
            </div>
            
            {/* Vista previa mini */}
            <div className="mt-2 text-[10px] text-neutral-600 text-right font-mono">
                {width} x {height}
            </div>
        </div>
    );
};

export default ImageSizeControls;