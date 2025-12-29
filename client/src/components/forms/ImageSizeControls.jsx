import React from 'react';
import Icons from '../ui/Icons'; // Usamos tu librería base para el icono principal

// Iconos SVG específicos para este componente (para no inflar la librería principal)
const ResizeIcons = {
    Horizontal: () => (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
    ),
    Vertical: () => (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
    )
};

const ImageSizeControls = ({ width, height, onChange }) => {
    const presets = [
        { label: 'Pequeña', w: '300px', h: 'auto' },
        { label: 'Mediana', w: '500px', h: 'auto' },
        { label: 'Grande', w: '800px', h: 'auto' },
        { label: 'Full', w: '100%', h: 'auto' },
    ];

    return (
        <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800 mt-2">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-red-500 uppercase tracking-wider">
                <Icons.Image /> {/* Usamos el icono de imagen genérico */}
                Ajustar Tamaño
            </div>

            {/* Presets Rápidos */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                {presets.map((preset, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onChange(preset.w, preset.h)}
                        className={`
                            px-3 py-1 text-xs rounded border transition-all whitespace-nowrap
                            ${width === preset.w 
                                ? 'bg-red-900/80 text-white border-red-800' 
                                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                            }
                        `}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Inputs Manuales */}
            <div className="grid grid-cols-2 gap-4">
                {/* Ancho */}
                <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1 mb-1">
                        <ResizeIcons.Horizontal /> Ancho
                    </label>
                    <input
                        type="text"
                        value={width || '100%'}
                        onChange={(e) => onChange(e.target.value, height)}
                        className="w-full bg-black border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:border-red-900 focus:ring-1 focus:ring-red-900/50 outline-none transition-colors placeholder-neutral-700 font-mono"
                        placeholder="ej. 100%, 500px"
                    />
                </div>
                
                {/* Alto */}
                <div>
                    <label className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1 mb-1">
                        <ResizeIcons.Vertical /> Alto
                    </label>
                    <input
                        type="text"
                        value={height || 'auto'}
                        onChange={(e) => onChange(width, e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded p-2 text-xs text-neutral-200 focus:border-red-900 focus:ring-1 focus:ring-red-900/50 outline-none transition-colors placeholder-neutral-700 font-mono"
                        placeholder="ej. auto, 300px"
                    />
                </div>
            </div>
            
            {/* Vista previa mini (Feedback visual) */}
            <div className="mt-2 text-[10px] text-neutral-600 text-right font-mono flex justify-end items-center gap-2">
                <span>Dimensiones actuales:</span>
                <span className="text-red-900/70 bg-black px-1 rounded">
                    {width} x {height}
                </span>
            </div>
        </div>
    );
};

export default ImageSizeControls;