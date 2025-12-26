import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Hook para leer la URL
import { FaArrowLeft, FaPlus, FaSkull } from 'react-icons/fa'; // Iconos nuevos

function SagaDetail({ user }) {
    const { id } = useParams(); // Obtenemos el ID desde la ruta /sagas/:id
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/chronicles/${id}`)
            .then(res => res.json())
            .then(result => {
                setData(result);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, [id]);

    // Estados de Carga y Error estilizados
    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-red-600 animate-pulse">
            <FaSkull className="text-4xl mb-2" />
            <span className="font-serif tracking-widest">ABRIENDO EL TOMO...</span>
        </div>
    );

    if (!data || !data.info) return (
        <div className="text-center text-red-500 mt-10 p-4 border border-red-900 rounded bg-black">
            Error al cargar la crónica o no existe.
        </div>
    );

    const { info, characters, sections } = data;

    return (
        <div className="animate-fade-in pb-20">
            
            {/* --- CABECERA --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-yellow-900 pb-6 gap-4">
                
                {/* Título y Botón Volver */}
                <div className="flex flex-col gap-2">
                    <Link to="/" className="flex items-center gap-2 text-neutral-500 hover:text-red-500 transition-colors text-sm uppercase tracking-wider no-underline w-fit">
                        <FaArrowLeft /> Volver al Refugio
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-serif text-yellow-600 m-0 tracking-tight drop-shadow-md">
                        {info.title}
                    </h1>
                </div>
                
                {/* Roster (Círculos Superpuestos) */}
                <div className="flex items-center pl-3">
                    {characters.map(char => (
                        <div key={char.id} className="relative group -ml-3 transition-transform hover:-translate-y-1 hover:z-10 cursor-help">
                            <div className="w-12 h-12 rounded-full border-2 border-yellow-800 overflow-hidden bg-neutral-900 shadow-lg">
                                <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                            </div>
                            {/* Tooltip simple */}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-neutral-700 pointer-events-none">
                                {char.name}
                            </span>
                        </div>
                    ))}
                    
                    {/* Botón Invocar (Solo Admin) */}
                    {user.role === 'admin' && (
                        <button className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-dashed border-neutral-600 text-neutral-500 hover:text-yellow-500 hover:border-yellow-500 flex items-center justify-center -ml-3 z-0 transition-all ml-2">
                            <FaPlus />
                        </button>
                    )}
                </div>
            </div>

            {/* --- HISTORIA --- */}
            <div className="max-w-4xl mx-auto">
                {sections.length === 0 ? (
                    <div className="text-center py-20 text-neutral-600 italic font-serif">
                        <FaBookDead className="mx-auto text-4xl mb-4 opacity-30" />
                        "Las páginas de esta historia aún están en blanco..."
                    </div>
                ) : (
                    sections.map((section, index) => {
                        // Estilo diferente para la Premisa (primera sección) vs el resto
                        const isPremise = index === 0;
                        
                        return (
                            <div key={section.id} 
                                 className={`mb-12 transition-all duration-500 ${
                                    isPremise 
                                        ? 'bg-gradient-to-br from-neutral-900 to-black border border-red-900/50 p-6 md:p-8 rounded-lg shadow-2xl shadow-red-900/10' 
                                        : 'pl-6 md:pl-10 border-l-2 border-neutral-800 ml-2 md:ml-0'
                                 }`}>
                                
                                <div className="grid md:grid-cols-12 gap-6">
                                    {/* Imagen (Opcional) */}
                                    {section.image_url && (
                                        <div className={`md:col-span-4 ${isPremise ? 'order-first' : ''}`}>
                                            <img src={section.image_url} className="rounded border border-neutral-800 shadow-lg w-full object-cover h-auto" />
                                        </div>
                                    )}

                                    {/* Texto */}
                                    <div className={`${section.image_url ? 'md:col-span-8' : 'md:col-span-12'}`}>
                                        <h3 className={`font-serif text-2xl mb-4 ${isPremise ? 'text-red-600 border-b border-red-900/30 pb-2' : 'text-yellow-600'}`}>
                                            {section.title}
                                        </h3>
                                        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed font-serif text-lg">
                                            {section.content}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// Icono temporal para caso vacío
const FaBookDead = ({className}) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
);

export default SagaDetail;