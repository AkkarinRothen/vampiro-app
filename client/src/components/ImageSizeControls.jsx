// ============================================
// ImageSizeControls.jsx
// Componente para controlar dimensiones de imágenes
// ============================================

import React from 'react';

const ImageSizeControls = ({ imageWidth, imageHeight, onChange }) => {
    const presets = [
        { label: 'Pequeña', width: '300px', height: 'auto' },
        { label: 'Mediana', width: '500px', height: 'auto' },
        { label: 'Grande', width: '700px', height: 'auto' },
        { label: 'Completa', width: '100%', height: 'auto' },
        { label: 'Cuadrada', width: '400px', height: '400px' }
    ];

    const handlePresetClick = (width, height) => {
        onChange(width, height);
    };

    const isPresetActive = (width, height) => {
        return imageWidth === width && imageHeight === height;
    };

    return (
        <div className="image-size-controls">
            <h4>Tamaño de Imagen</h4>
            
            {/* Presets rápidos */}
            <div className="size-presets">
                {presets.map((preset, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetClick(preset.width, preset.height)}
                        className={`preset-btn ${isPresetActive(preset.width, preset.height) ? 'active' : ''}`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Controles personalizados */}
            <div className="custom-size">
                <label>
                    Ancho:
                    <input
                        type="text"
                        value={imageWidth || ''}
                        onChange={(e) => onChange(e.target.value, imageHeight)}
                        placeholder="ej: 500px, 80%, auto"
                    />
                </label>
                <label>
                    Alto:
                    <input
                        type="text"
                        value={imageHeight || ''}
                        onChange={(e) => onChange(imageWidth, e.target.value)}
                        placeholder="ej: 400px, auto"
                    />
                </label>
            </div>

            {/* Vista previa del tamaño */}
            {imageWidth && imageHeight && (
                <div className="size-info">
                    <small className="size-preview">
                        📏 Vista previa: {imageWidth} × {imageHeight}
                    </small>
                </div>
            )}
        </div>
    );
};

export default ImageSizeControls;




// ============================================
// NOTAS DE IMPLEMENTACIÓN
// ============================================

/*
CARACTERÍSTICAS AGREGADAS:

✅ Edición de secciones
   - Botón "Editar" en cada sección (solo admin)
   - Carga los datos de la sección en el formulario
   - Guarda cambios vía PUT al backend

✅ Reordenamiento de secciones
   - Botones ⬆️ arriba y ⬇️ abajo en cada sección
   - Se deshabilitan en primera/última posición
   - Usa rutas /move-up y /move-down del backend

✅ Eliminación mejorada
   - Confirmación antes de eliminar
   - Reajuste automático de posiciones

✅ UX mejorada
   - Scroll automático al formulario al editar
   - Indicadores visuales de carga
   - Mensajes de error claros
   - Estados disabled en botones apropiados

PRÓXIMOS PASOS:
1. Copiar el SQL de migración al principio
2. Reemplazar chronicles.js con la versión actualizada
3. Copiar estos componentes React a tu proyecto
4. Copiar los estilos CSS del siguiente artifact
*/