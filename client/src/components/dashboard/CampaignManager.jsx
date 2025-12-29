import React from 'react';
import { useNavigate } from 'react-router-dom';
import SagaList from './SagaList';
import Icons from '../ui/Icons';

const CampaignManager = ({ user }) => {
    const navigate = useNavigate();

    // Configuración del usuario para incluir la navegación
    // Esto conecta el evento "Abrir" de la lista con la ruta de React Router
    const userWithNavigation = {
        ...user,
        onSelectSaga: (saga) => navigate(`/chronicle/${saga.id}`)
    };

    // Función para obtener un saludo basado en la hora (Toque inmersivo)
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 6) return "La noche es profunda";
        if (hour < 12) return "El sol amenaza";
        if (hour < 20) return "El atardecer se acerca";
        return "La noche comienza";
    };

    return (
        <div className="animate-fade-in space-y-8">
            {/* --- HEADER DEL DASHBOARD --- */}
            <header className="relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-red-500 mb-2 font-bold tracking-widest text-xs uppercase">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            Sistema de Narración V5
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif text-white mb-2">
                            {getGreeting()}, <span className="text-red-600">{user?.username || 'Narrador'}</span>.
                        </h1>
                        <p className="text-neutral-400 font-serif italic max-w-2xl">
                            "La ciudad es un tablero de ajedrez donde las piezas se mueven por sangre y secretos. 
                            ¿Qué historias se tejerán esta noche?"
                        </p>
                    </div>

                    {/* Botón de Acción Rápida (Opcional) */}
                    <div className="hidden md:block">
                        <div className="p-4 bg-black/40 rounded-lg border border-neutral-800 backdrop-blur-sm text-center min-w-[150px]">
                            <span className="block text-2xl font-serif text-white">VTM</span>
                            <span className="text-xs text-neutral-500 uppercase tracking-widest">5ª Edición</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- ÁREA DE CONTENIDO (LISTA DE CRÓNICAS) --- */}
            <section>
                <div className="flex items-center gap-2 mb-6 text-neutral-500 border-b border-neutral-800 pb-2">
                    <Icons.Heading />
                    <span className="text-sm font-bold uppercase tracking-wider">Tus Crónicas Activas</span>
                </div>
                
                {/* Renderizamos la lista actualizada */}
                <SagaList user={userWithNavigation} />
            </section>
        </div>
    );
};

export default CampaignManager;