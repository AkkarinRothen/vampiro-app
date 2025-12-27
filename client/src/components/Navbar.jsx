import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaBookDead, FaUsers, FaScroll, FaSignOutAlt, FaGem, FaSkull } from "react-icons/fa";

function Navbar({ user }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Lógica para saber si un link está activo
    const isActive = (path) => location.pathname === path;

    // Función interna de Logout
    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = "/login";
        } catch (err) {
            console.error("Error al salir", err);
        }
    };

    // Estilos para los links
    const getLinkClasses = (path) => {
        const baseClasses = "flex items-center gap-2 transition-colors no-underline px-3 py-2 rounded font-serif tracking-wide text-sm";
        return isActive(path)
            ? `${baseClasses} text-red-500 bg-red-900/20`
            : `${baseClasses} text-neutral-400 hover:text-red-400 hover:bg-neutral-800`;
    };

    return (
        <nav className="bg-neutral-900/90 backdrop-blur-md border-b border-red-900/30 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-lg shadow-black/50">
            {/* Logo */}
            <Link 
                to="/" 
                className="flex items-center gap-2 text-2xl font-bold text-red-600 hover:text-red-500 transition-colors no-underline font-serif tracking-widest"
            >
                <FaSkull /> VTM 5E
            </Link>
            
            {/* LOGICA CONDICIONAL: ¿Hay usuario? */}
            {user ? (
                <>
                    {/* Menú Central (Solo visible si hay usuario) */}
                    <div className="hidden md:flex gap-2">
                        <Link to="/" className={getLinkClasses('/')}>
                            <FaBookDead /> Sagas
                        </Link>
                        <Link to="/characters" className={getLinkClasses('/characters')}>
                            <FaUsers /> Personajes
                        </Link>
                        <Link to="/gallery" className={getLinkClasses('/gallery')}>
                            <FaGem /> Galería
                        </Link>
                        <Link to="/lore" className={getLinkClasses('/lore')}>
                            <FaScroll /> Archivos
                        </Link>
                    </div>

                    {/* Usuario y Logout */}
                    <div className="flex items-center gap-4 border-l border-neutral-700 pl-4 ml-4">
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
                            <FaSignOutAlt />
                        </button>
                    </div>
                </>
            ) : (
                /* Si NO hay usuario (o es null), mostramos el botón de entrar */
                <Link 
                    to="/login" 
                    className="text-neutral-400 hover:text-white font-serif text-sm transition-colors"
                >
                    Iniciar Sesión
                </Link>
            )}
        </nav>
    );
}

export default Navbar;