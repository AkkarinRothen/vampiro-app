import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw'; // <--- IMPORTANTE: El plugin para leer HTML/Colores
import Icons from '../ui/Icons'; 

const ChronicleSection = ({ 
    section, 
    isAdmin, 
    isFirst, 
    isLast, 
    onEdit, 
    onDelete, 
    onMoveUp, 
    onMoveDown 
}) => {
    
    // Validación de seguridad: si no hay datos, no renderizamos nada
    if (!section) return null;

    // --- PROCESADOR DE SINTAXIS PERSONALIZADA (Obsidian Style) ---
    // Esta lógica debe ser IDÉNTICA a la de SectionForm.jsx para coherencia visual
    const processCustomSyntax = (text) => {
        if (!text) return '';
        return text
            // 1. Resaltado ==texto==
            .replace(/==([^=]+)==/g, '<mark class="bg-yellow-600/30 text-yellow-100 px-1 rounded shadow-sm border border-yellow-600/40">$1</mark>')
            
            // 2. Notas Flotantes ^[texto]
            .replace(/\^\[([^\]]+)\]/g, (match, noteContent) => {
                return `
                    <span class="relative group cursor-help inline-block text-red-400 border-b border-dashed border-red-500/50 align-baseline mx-1">
                        <sup class="font-bold text-[10px] ml-0.5">?</sup>
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 border border-neutral-700 rounded shadow-2xl text-neutral-300 text-sm font-sans leading-tight opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 backdrop-blur-md">
                            ${noteContent}
                            <span class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-900"></span>
                        </span>
                    </span>
                `;
            });
    };

    // Configuración de Estilos Markdown (Tema Vampiro V5)
    const markdownComponents = {
        // Párrafos
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-neutral-300" {...props} />,
        
        // Títulos
        h1: ({node, ...props}) => <h1 className="text-3xl font-serif text-red-500 mt-6 mb-4 border-b border-red-900/30 pb-2" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-2xl font-serif text-red-400 mt-5 mb-3" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-xl font-serif text-red-400/80 mt-4 mb-2 italic" {...props} />,
        
        // Formato de texto
        strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
        em: ({node, ...props}) => <em className="text-red-200" {...props} />,
        
        // Listas (Balas rojas)
        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-1 marker:text-red-600" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 marker:text-red-600" {...props} />,
        li: ({node, ...props}) => <li className="pl-1" {...props} />,
        
        // Citas (Estilo "Lore" o carta)
        blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-red-900 pl-4 py-2 my-6 bg-red-900/10 italic text-neutral-400 rounded-r shadow-inner" {...props} />
        ),
        
        // Separadores
        hr: ({node, ...props}) => <hr className="border-red-900/30 my-8" {...props} />,
        
        // Enlaces
        a: ({node, ...props}) => <a className="text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors" {...props} target="_blank" rel="noopener noreferrer" />,

        // IMPORTANTE: Permitir etiquetas span, mark y sup para los colores y sintaxis custom
        span: ({node, ...props}) => <span {...props} />,
        mark: ({node, ...props}) => <mark {...props} />,
        sup: ({node, ...props}) => <sup {...props} />
    };

    return (
        <article className="relative bg-neutral-900/20 p-6 md:p-8 rounded-lg border-l-2 border-red-900/20 hover:border-red-900/60 transition-all duration-300 group hover:bg-neutral-900/40">
            
            {/* --- CONTROLES DE ADMINISTRADOR (Flotantes) --- */}
            {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/80 p-1.5 rounded-lg backdrop-blur-md border border-neutral-800 shadow-xl z-10">
                    <div className="flex flex-col gap-1 border-r border-neutral-700 pr-2 mr-2 justify-center">
                        <button 
                            onClick={() => !isFirst && onMoveUp(section.id)} 
                            disabled={isFirst}
                            className={`p-1 hover:bg-neutral-700 rounded transition-colors ${isFirst ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'}`}
                            title="Mover arriba"
                        >
                            <Icons.ChevronUp />
                        </button>
                        <button 
                            onClick={() => !isLast && onMoveDown(section.id)} 
                            disabled={isLast}
                            className={`p-1 hover:bg-neutral-700 rounded transition-colors ${isLast ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'}`}
                            title="Mover abajo"
                        >
                            <Icons.ChevronDown />
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => onEdit(section)}
                            className="p-2 text-yellow-600 hover:text-white hover:bg-yellow-600/80 rounded transition-all"
                            title="Editar capítulo"
                        >
                            <Icons.Edit />
                        </button>
                        <button 
                            onClick={() => onDelete(section.id)}
                            className="p-2 text-red-600 hover:text-white hover:bg-red-600/80 rounded transition-all"
                            title="Borrar capítulo"
                        >
                            <Icons.Trash />
                        </button>
                    </div>
                </div>
            )}
            
            {/* --- TÍTULO --- */}
            <h2 className="text-2xl md:text-3xl font-serif text-neutral-200 mb-6 flex items-start gap-3">
                <span className="text-red-900 text-2xl mt-1 select-none">§</span> 
                {section.title}
            </h2>
            
            {/* --- IMAGEN --- */}
            {section.image_url && (
                <div className="mb-8 flex justify-center w-full">
                    <div className="relative rounded-lg overflow-hidden border border-neutral-800 shadow-lg bg-black">
                        <img 
                            src={section.image_url} 
                            alt={`Ilustración de ${section.title}`}
                            style={{
                                width: section.image_width || '100%',
                                height: section.image_height || 'auto',
                                maxWidth: '100%',
                                objectFit: 'contain'
                            }}
                            className="block"
                            loading="lazy"
                            onError={(e) => { e.target.style.display='none'; }} // Ocultar si falla la carga
                        />
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none rounded-lg"></div>
                    </div>
                </div>
            )}
            
            {/* --- CONTENIDO MARKDOWN (Renderizado con HTML) --- */}
            <div className="font-sans text-lg text-justify selection:bg-red-900 selection:text-white">
                <ReactMarkdown 
                    rehypePlugins={[rehypeRaw]} // <--- ESTO ACTIVA LOS COLORES HTML
                    components={markdownComponents}
                >
                    {processCustomSyntax(section.content || '')}
                </ReactMarkdown>
            </div>

            {/* --- FOOTER (Fecha) --- */}
            {section.created_at && (
                <div className="mt-8 pt-4 border-t border-neutral-800/50 flex justify-end">
                    <span className="text-xs text-neutral-600 font-serif italic flex items-center gap-2">
                        <Icons.Clock />
                        {new Date(section.created_at).toLocaleDateString()}
                    </span>
                </div>
            )}
        </article>
    );
};

export default ChronicleSection;