// ============================================
// UserRoleBadge.jsx
// Badge visual que muestra el rol del usuario
// ============================================

import React from 'react';
import { FaCrown, FaBookOpen, FaUser, FaShieldAlt } from 'react-icons/fa';

const UserRoleBadge = ({ user, showTooltip = true, size = 'md' }) => {
    if (!user) return null;

    const roleConfig = {
        admin: {
            label: 'Príncipe',
            icon: FaCrown,
            bgColor: 'bg-gradient-to-r from-yellow-900 to-amber-900',
            textColor: 'text-yellow-300',
            borderColor: 'border-yellow-700',
            glowColor: 'shadow-yellow-900/50',
            description: 'Control total sobre la crónica'
        },
        storyteller: {
            label: 'Narrador',
            icon: FaBookOpen,
            bgColor: 'bg-gradient-to-r from-purple-900 to-violet-900',
            textColor: 'text-purple-300',
            borderColor: 'border-purple-700',
            glowColor: 'shadow-purple-900/50',
            description: 'Puede crear y editar crónicas'
        },
        player: {
            label: 'Vástago',
            icon: FaUser,
            bgColor: 'bg-gradient-to-r from-red-900 to-red-800',
            textColor: 'text-red-300',
            borderColor: 'border-red-700',
            glowColor: 'shadow-red-900/50',
            description: 'Puede ver y seguir las crónicas'
        }
    };

    const config = roleConfig[user.role] || roleConfig.player;
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs gap-1',
        md: 'px-3 py-1.5 text-sm gap-2',
        lg: 'px-4 py-2 text-base gap-2'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <div className="relative group">
            <div 
                className={`
                    ${config.bgColor} 
                    ${config.textColor} 
                    ${config.borderColor}
                    ${config.glowColor}
                    ${sizeClasses[size]}
                    inline-flex items-center justify-center
                    rounded-full border-2 font-serif font-semibold
                    shadow-lg backdrop-blur-sm
                    transition-all duration-300
                    hover:scale-105 hover:shadow-xl
                    cursor-default
                `}
            >
                <Icon className={iconSizes[size]} />
                <span className="uppercase tracking-wider">
                    {config.label}
                </span>
            </div>

            {/* Tooltip al hacer hover */}
            {showTooltip && (
                <div className="
                    absolute left-1/2 -translate-x-1/2 top-full mt-2
                    opacity-0 group-hover:opacity-100
                    pointer-events-none transition-opacity duration-200
                    z-50
                ">
                    <div className="
                        bg-neutral-900 border border-neutral-700
                        rounded-lg px-3 py-2 shadow-xl
                        text-xs text-neutral-300
                        whitespace-nowrap
                        backdrop-blur-md
                    ">
                        <p className="font-bold text-white mb-1">{user.username}</p>
                        <p className="text-neutral-400">{config.description}</p>
                        {/* Flecha del tooltip */}
                        <div className="
                            absolute left-1/2 -translate-x-1/2 -top-1
                            w-2 h-2 bg-neutral-900 border-t border-l border-neutral-700
                            rotate-45
                        "></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Variante compacta solo con icono
export const UserRoleIcon = ({ user }) => {
    if (!user) return null;

    const roleConfig = {
        admin: { icon: FaCrown, color: 'text-yellow-400' },
        storyteller: { icon: FaBookOpen, color: 'text-purple-400' },
        player: { icon: FaUser, color: 'text-red-400' }
    };

    const config = roleConfig[user.role] || roleConfig.player;
    const Icon = config.icon;

    return (
        <div className={`${config.color} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
        </div>
    );
};

// Componente para mostrar permisos (útil en páginas de admin)
export const PermissionIndicator = ({ hasPermission, label }) => {
    return (
        <div className="flex items-center gap-2 text-sm">
            <div className={`
                w-2 h-2 rounded-full
                ${hasPermission ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}
            `} />
            <span className={hasPermission ? 'text-green-400' : 'text-neutral-500'}>
                {label}
            </span>
        </div>
    );
};

export default UserRoleBadge;