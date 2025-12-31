import { Link, useNavigate, useLocation } from "react-router-dom";
// Se importa FaTools para el icono del panel
import { FaBookDead, FaUsers, FaScroll, FaSignOutAlt, FaGem, FaSkull, FaTools } from "react-icons/fa";

function Navbar({ user }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Lógica para saber si un link está activo
    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = "/login";
        } catch (err) {
            console.error("Error al salir", err);
        }
    };

    // Estilos de botones (Escritorio vs Movil)
    const getLinkClasses = (path, isMobile = false) => {
        const base = "transition-colors flex items-center justify-center";
        
        if (isMobile) {
            // Estilo Botón Móvil (Icono grande, columna)
            return isActive(path)
                ? `${base} flex-col text-red-500`
                : `${base} flex-col text-neutral-500 hover:text-red-400`;
        } else {
            // Estilo Escritorio (Fila, fondo al activar)
            const deskBase = "gap-2 px-3 py-2 rounded font-serif tracking-wide text-sm no-underline";
            return isActive(path)
                ? `${base} ${deskBase} text-red-500 bg-red-900/20`
                : `${base} ${deskBase} text-neutral-400 hover:text-red-400 hover:bg-neutral-800`;
        }
    };

    return (
        <>
            {/* ================================================= */}
            {/* 1. BARRA SUPERIOR (LOGO + PERFIL)                 */}
            {/* ================================================= */}
            <nav className="bg-neutral-900/90 backdrop-blur-md border-b border-red-900/30 px-4 py-3 md:px-6 md:py-4 flex justify-between items-center sticky top-0 z-50 shadow-lg shadow-black/50">
                {/* Logo */}
                <Link 
                    to="/" 
                    className="flex items-center gap-2 text-xl md:text-2xl font-bold text-red-600 hover:text-red-500 transition-colors no-underline font-serif tracking-widest"
                >
                    <FaSkull /> <span className="hidden xs:inline">VTM 5E</span>
                </Link>
                
                {user ? (
                    <>
                        {/* MENÚ DE ESCRITORIO (Oculto en móvil) */}
                        <div className="hidden md:flex gap-2">
                            <Link to="/" className={getLinkClasses('/')}><FaBookDead /> Sagas</Link>
                            <Link to="/characters" className={getLinkClasses('/characters')}><FaUsers /> Personajes</Link>
                            <Link to="/gallery" className={getLinkClasses('/gallery')}><FaGem /> Galería</Link>
                            <Link to="/lore" className={getLinkClasses('/lore')}><FaScroll /> Archivos</Link>
                            
                            {/* BOTÓN ADMIN (Solo visible para admins) */}
                            {user.role === 'admin' && (
                                <Link to="/admin" className={getLinkClasses('/admin')}>
                                    <FaTools /> Mantenimiento
                                </Link>
                            )}
                        </div>

                        {/* Perfil y Logout (Siempre visible arriba a la derecha) */}
                        <div className="flex items-center gap-3 md:gap-4 md:border-l md:border-neutral-700 md:pl-4 md:ml-4">
                            <div className="hidden sm:flex flex-col items-end leading-tight">
                                <span className="text-sm font-bold text-neutral-200">{user.username}</span>
                                <span className="text-[10px] text-red-500 uppercase tracking-widest border border-red-900/50 px-1 rounded bg-black/30">
                                    {user.role}
                                </span>
                            </div>
                            <button 
                                onClick={handleLogout} 
                                className="text-neutral-400 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-900/20 border border-transparent hover:border-red-900/50" 
                                title="Cerrar sesión"
                            >
                                <FaSignOutAlt size={18} />
                            </button>
                        </div>
                    </>
                ) : (
                    <Link to="/login" className="text-neutral-400 hover:text-white font-serif text-sm">Iniciar Sesión</Link>
                )}
            </nav>

            {/* ================================================= */}
            {/* 2. BARRA INFERIOR MÓVIL (Solo visible en celular) */}
            {/* ================================================= */}
            {user && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-red-900/30 flex justify-around items-center p-3 z-50 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                    <Link to="/" className={getLinkClasses('/', true)}>
                        <FaBookDead size={20} className="mb-1" />
                        <span className="text-[10px] font-serif uppercase tracking-wider">Sagas</span>
                    </Link>
                    
                    <Link to="/characters" className={getLinkClasses('/characters', true)}>
                        <FaUsers size={20} className="mb-1" />
                        <span className="text-[10px] font-serif uppercase tracking-wider">PJs</span>
                    </Link>
                    
                    <Link to="/gallery" className={getLinkClasses('/gallery', true)}>
                        <FaGem size={20} className="mb-1" />
                        <span className="text-[10px] font-serif uppercase tracking-wider">Fotos</span>
                    </Link>
                    
                    <Link to="/lore" className={getLinkClasses('/lore', true)}>
                        <FaScroll size={20} className="mb-1" />
                        <span className="text-[10px] font-serif uppercase tracking-wider">Lore</span>
                    </Link>

                    {/* BOTÓN ADMIN MÓVIL (Solo visible para admins) */}
                    {user.role === 'admin' && (
                        <Link to="/admin" className={getLinkClasses('/admin', true)}>
                            <FaTools size={20} className="mb-1" />
                            <span className="text-[10px] font-serif uppercase tracking-wider">Admin</span>
                        </Link>
                    )}
                </div>
            )}
        </>
    );
}

export default Navbar;