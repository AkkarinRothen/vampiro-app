import React from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
// Iconos temáticos
import { 
    FaBookDead, 
    FaUsers, 
    FaScroll, 
    FaSignOutAlt, 
    FaGem, 
    FaSkull, 
    FaTools 
} from "react-icons/fa";

// Importamos el componente de rango (Asegúrate de que la ruta sea correcta)
import UserRoleBadge from "../admin/UserRoleBadge"; 

function Navbar({ user }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Lógica robusta para determinar si un link está activo
    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            // Forzamos recarga para limpiar estados de memoria y cache
            window.location.href = "/login";
        } catch (err) {
            console.error("Error crítico al cerrar sesión", err);
            // Fallback en caso de error de red
            window.location.href = "/login";
        }
    };

    // Generador de clases CSS dinámicas (Optimizado para Tailwind + VTM Theme)
    const getLinkClasses = (path, isMobile = false) => {
        const baseTransition = "transition-all duration-300 ease-out";
        
        if (isMobile) {
            // --- ESTILO MÓVIL (Barra Inferior) ---
            const baseMobile = `${baseTransition} flex flex-col items-center justify-center w-full h-full`;
            
            return isActive(path)
                ? `${baseMobile} text-blood scale-110 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]`
                : `${baseMobile} text-neutral-500 hover:text-neutral-300 active:text-blood-light`;
        } else {
            // --- ESTILO ESCRITORIO (Barra Superior) ---
            const baseDesk = `${baseTransition} flex items-center gap-2 px-4 py-2 rounded-md font-serif tracking-wide text-sm no-underline border border-transparent`;
            
            return isActive(path)
                ? `${baseDesk} text-blood bg-red-950/20 border-red-900/30 shadow-[0_0_15px_rgba(139,0,0,0.2)] transform scale-105`
                : `${baseDesk} text-neutral-400 hover:text-blood-light hover:bg-neutral-800/50 hover:border-neutral-700`;
        }
    };

    return (
        <>
            {/* ================================================= */}
            {/* 1. NAVEGACIÓN DE ESCRITORIO (Top Bar)             */}
            {/* ================================================= */}
            <nav className="bg-neutral-950/95 backdrop-blur-xl border-b border-red-900/30 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center sticky top-0 z-50 shadow-2xl shadow-black/90">
                
                {/* LOGO PRINCIPAL */}
                <Link 
                    to="/" 
                    className="flex items-center gap-3 text-xl md:text-2xl font-bold group no-underline"
                >
                    <div className="relative">
                        <FaSkull className="text-neutral-400 group-hover:text-blood transition-colors duration-500 drop-shadow-md" />
                        <div className="absolute inset-0 bg-red-500 blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full"></div>
                    </div>
                    <span className="font-serif tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-400 group-hover:from-red-500 group-hover:to-red-800 transition-all duration-500 hidden xs:block">
                        VTM 5E
                    </span>
                </Link>
                
                {user ? (
                    <>
                        {/* LINKS CENTRALES (Solo Desktop) */}
                        <div className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                            <Link to="/" className={getLinkClasses('/')}>
                                <FaBookDead className={isActive('/') ? "animate-pulse" : ""} /> 
                                <span>Sagas</span>
                            </Link>
                            
                            <Link to="/characters" className={getLinkClasses('/characters')}>
                                <FaUsers /> 
                                <span>Personajes</span>
                            </Link>
                            
                            <Link to="/gallery" className={getLinkClasses('/gallery')}>
                                <FaGem /> 
                                <span>Galería</span>
                            </Link>
                            
                            <Link to="/lore" className={getLinkClasses('/lore')}>
                                <FaScroll /> 
                                <span>Archivos</span>
                            </Link>
                            
                            {/* Panel Admin: Visible para Admin y Narradores */}
                            {(user.role === 'admin' || user.role === 'storyteller') && (
                                <div className="w-px h-6 bg-neutral-800 mx-1"></div>
                            )}
                            
                            {(user.role === 'admin' || user.role === 'storyteller') && (
                                <Link to="/admin" className={getLinkClasses('/admin')}>
                                    <FaTools /> 
                                    <span>Gestión</span>
                                </Link>
                            )}
                        </div>

                        {/* ÁREA DE USUARIO */}
                        <div className="flex items-center gap-4 md:border-l md:border-red-900/30 md:pl-6 md:ml-2">
                            {/* Info Usuario + Badge */}
                            <div className="hidden sm:flex flex-col items-end leading-none gap-1.5">
                                <span className="text-sm font-bold text-neutral-200 tracking-wider font-serif">
                                    {user.username}
                                </span>
                                {/* Componente de Badge Visual */}
                                <div className="transform origin-right scale-90">
                                    <UserRoleBadge user={user} size="sm" showTooltip={false} />
                                </div>
                            </div>
                            
                            {/* Botón Salir */}
                            <button 
                                onClick={handleLogout} 
                                className="group relative p-2 text-neutral-500 hover:text-blood-bright transition-colors rounded-full hover:bg-red-900/10 focus:outline-none focus:ring-2 focus:ring-red-900/50" 
                                title="Abandonar la sesión"
                                aria-label="Cerrar sesión"
                            >
                                <FaSignOutAlt size={20} className="relative z-10 transform group-hover:translate-x-0.5 transition-transform" />
                                <div className="absolute inset-0 bg-red-500/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                            </button>
                        </div>
                    </>
                ) : (
                    /* LOGIN (Usuario no autenticado) */
                    <Link 
                        to="/login" 
                        className="text-neutral-400 hover:text-blood font-serif text-sm tracking-widest uppercase border border-neutral-800 hover:border-blood/50 px-5 py-2 rounded transition-all duration-300 hover:shadow-[0_0_10px_rgba(220,38,38,0.2)]"
                    >
                        Entrar al Refugio
                    </Link>
                )}
            </nav>

            {/* ================================================= */}
            {/* 2. NAVEGACIÓN MÓVIL (Bottom Bar)                  */}
            {/* ================================================= */}
            {user && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-red-900/40 flex justify-between items-center px-2 py-1 z-50 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
                    
                    <Link to="/" className={getLinkClasses('/', true)}>
                        <FaBookDead size={20} className="mb-1" />
                        <span className="text-[9px] font-serif uppercase tracking-widest">Sagas</span>
                    </Link>
                    
                    <Link to="/characters" className={getLinkClasses('/characters', true)}>
                        <FaUsers size={20} className="mb-1" />
                        <span className="text-[9px] font-serif uppercase tracking-widest">PJs</span>
                    </Link>
                    
                    {/* Botón Central Destacado (Galería) */}
                    <div className="relative -top-5">
                        <Link 
                            to="/gallery" 
                            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 ${isActive('/gallery') ? 'bg-neutral-900 border-blood text-blood shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-neutral-900 border-neutral-700 text-neutral-400'} transition-all duration-300 shadow-xl`}
                        >
                            <FaGem size={20} />
                        </Link>
                    </div>
                    
                    <Link to="/lore" className={getLinkClasses('/lore', true)}>
                        <FaScroll size={20} className="mb-1" />
                        <span className="text-[9px] font-serif uppercase tracking-widest">Lore</span>
                    </Link>

                    {/* Lógica condicional para mostrar Admin o Logout en móvil */}
                    {(user.role === 'admin' || user.role === 'storyteller') ? (
                        <Link to="/admin" className={getLinkClasses('/admin', true)}>
                            <FaTools size={20} className="mb-1" />
                            <span className="text-[9px] font-serif uppercase tracking-widest">Admin</span>
                        </Link>
                    ) : (
                        <button onClick={handleLogout} className={getLinkClasses('/logout', true)}>
                            <FaSignOutAlt size={20} className="mb-1" />
                            <span className="text-[9px] font-serif uppercase tracking-widest">Salir</span>
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

export default Navbar;