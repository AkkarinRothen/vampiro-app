// ============================================
// AppHeader.jsx (o Navbar.jsx)
// Header mejorado con badge de rol
// ============================================

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserRoleBadge from './UserRoleBadge';
import { FaSignOutAlt, FaHome, FaBook, FaUsers } from 'react-icons/fa';

const AppHeader = ({ user }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-red-900/30 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    
                    {/* Logo / Título */}
                    <Link 
                        to="/" 
                        className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                    >
                        <div className="text-3xl">🩸</div>
                        <div>
                            <h1 className="text-xl font-serif font-bold text-red-600 tracking-wide">
                                VTM 5E
                            </h1>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                                Mundo de Tinieblas
                            </p>
                        </div>
                    </Link>

                    {/* Navegación */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link 
                            to="/" 
                            className="flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors text-sm font-serif"
                        >
                            <FaHome className="w-4 h-4" />
                            <span>Crónicas</span>
                        </Link>
                        <Link 
                            to="/characters" 
                            className="flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors text-sm font-serif"
                        >
                            <FaUsers className="w-4 h-4" />
                            <span>Vástagos</span>
                        </Link>
                        <Link 
                            to="/lore" 
                            className="flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors text-sm font-serif"
                        >
                            <FaBook className="w-4 h-4" />
                            <span>Lore</span>
                        </Link>
                    </nav>

                    {/* Usuario y Logout */}
                    {user ? (
                        <div className="flex items-center gap-4">
                            {/* Badge de Rol */}
                            <UserRoleBadge user={user} size="md" />
                            
                            {/* Botón Logout */}
                            <button
                                onClick={handleLogout}
                                className="
                                    flex items-center gap-2 px-4 py-2
                                    bg-neutral-900 hover:bg-red-900/30
                                    text-neutral-400 hover:text-red-400
                                    border border-neutral-800 hover:border-red-900/50
                                    rounded-lg transition-all
                                    text-sm font-serif
                                "
                                title="Cerrar Sesión"
                            >
                                <FaSignOutAlt className="w-4 h-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="
                                px-4 py-2 bg-red-900 hover:bg-red-800
                                text-red-100 rounded-lg transition-colors
                                text-sm font-serif
                            "
                        >
                            Iniciar Sesión
                        </Link>
                    )}
                </div>
            </div>

            {/* Navegación móvil */}
            <div className="md:hidden border-t border-neutral-800">
                <nav className="flex justify-around py-2">
                    <Link 
                        to="/" 
                        className="flex flex-col items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors p-2"
                    >
                        <FaHome className="w-5 h-5" />
                        <span className="text-xs">Inicio</span>
                    </Link>
                    <Link 
                        to="/characters" 
                        className="flex flex-col items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors p-2"
                    >
                        <FaUsers className="w-5 h-5" />
                        <span className="text-xs">Vástagos</span>
                    </Link>
                    <Link 
                        to="/lore" 
                        className="flex flex-col items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors p-2"
                    >
                        <FaBook className="w-5 h-5" />
                        <span className="text-xs">Lore</span>
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default AppHeader;