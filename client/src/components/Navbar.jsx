import { Link } from 'react-router-dom';
import { FaBookDead, FaUsers, FaScroll, FaSignOutAlt } from 'react-icons/fa'; // Iconos

function Navbar({ user, onLogout }) {
    return (
        <nav className="bg-black border-b border-red-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold text-red-600 hover:text-red-500 no-underline font-serif">
                VTM 5E
            </Link>
            
            {/* Menú */}
            <div className="flex gap-6">
                <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors no-underline">
                    <FaBookDead /> Sagas
                </Link>
                <Link to="/characters" className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors no-underline">
                    <FaUsers /> Personajes
                </Link>
                <Link to="/lore" className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors no-underline">
                    <FaScroll /> Archivos
                </Link>
            </div>

            {/* Usuario */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                    {user.username} <span className="bg-neutral-800 px-2 py-0.5 rounded text-xs border border-neutral-600">{user.role}</span>
                </span>
                <button onClick={onLogout} className="text-red-600 hover:text-white transition-colors" title="Salir">
                    <FaSignOutAlt />
                </button>
            </div>
        </nav>
    );
}

export default Navbar;