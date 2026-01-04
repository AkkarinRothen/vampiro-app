import { useState, useEffect } from 'react';
import { FaLock, FaLockOpen, FaShieldAlt, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { useToast } from '../ui/Toast'; // Importa el hook

/**
 * Etiquetas legibles para cada permiso del sistema
 */
const PERMISSION_LABELS = {
    // === GESTIÓN DE USUARIOS ===
    manage_users: "Gestionar Usuarios",
    
    // === CRÓNICAS ===
    view_chronicles: "Ver Crónicas",
    edit_chronicles: "Editar/Crear Crónicas",
    delete_chronicles: "Eliminar Crónicas",
    
    // === PERSONAJES ===
    view_characters: "Ver Personajes",
    create_characters: "Crear Personajes",
    edit_characters: "Editar Personajes",
    delete_characters: "Eliminar Personajes",
    view_hidden: "Ver Contenido Oculto (Bóveda)",
    
    // === LORE ===
    view_lore: "Ver Contenido de Lore",
    manage_lore: "Gestionar Lore",
    delete_lore: "Eliminar Lore",
    
    // === SISTEMA ===
    upload_files: "Subir Imágenes/Archivos",
    export_data: "Exportar Datos del Sistema",
    import_data: "Importar Datos al Sistema",
    manage_permissions: "Gestionar Permisos de Roles"
};

/**
 * Roles disponibles en el sistema
 */
const ROLES = ['admin', 'player'];

/**
 * Componente para gestionar permisos por rol
 * Permite visualizar y modificar qué acciones puede realizar cada rol
 */
export default function PermissionsManager() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [msgType, setMsgType] = useState('success'); // 'success' | 'error' | 'info'

    useEffect(() => {
        fetchPermissions();
    }, []);

    /**
     * Carga los permisos desde el backend
     */
    const fetchPermissions = async () => {
        try {
            const response = await fetch('/api/permissions', { 
                credentials: 'include' 
            });
            
            if (response.ok) {
                const data = await response.json();
                setPermissions(data);
                
                // Si no hay permisos, mostrar sugerencia de inicializar
                if (data.length === 0) {
                    showMessage('No hay permisos configurados. Haz clic en "Inicializar BD" para crear la estructura.', 'info');
                }
            } else if (response.status === 403) {
                showMessage('No tienes permisos para ver esta sección', 'error');
            } else {
                showMessage('Error al cargar permisos', 'error');
            }
        } catch (error) {
            console.error("Error cargando permisos:", error);
            showMessage('Error de conexión al cargar permisos', 'error');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Inicializa la tabla de permisos en la base de datos
     */
    const handleInitTable = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/permissions/init', { 
                method: 'POST', 
                credentials: 'include' 
            });
            
            if (response.ok) {
                const data = await response.json();
                showMessage(data.message || 'Tabla inicializada correctamente', 'success');
                await fetchPermissions();
            } else {
                showMessage('Error al inicializar la tabla', 'error');
            }
        } catch (err) {
            console.error("Error inicializando:", err);
            showMessage('Error de conexión al inicializar', 'error');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Alterna el estado de un permiso específico
     * @param {string} role - Rol a modificar (admin/player)
     * @param {string} permKey - Clave del permiso
     */
    const togglePermission = async (role, permKey) => {
        const currentVal = isAllowed(role, permKey);
        const newVal = !currentVal;

        // Actualización optimista de UI
        const updated = [...permissions];
        const idx = updated.findIndex(p => p.role === role && p.permission === permKey);
        
        if (idx >= 0) {
            updated[idx].is_allowed = newVal;
        } else {
            updated.push({ role, permission: permKey, is_allowed: newVal });
        }
        setPermissions(updated);

        // Guardar cambio en backend
        try {
            const response = await fetch('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    role, 
                    permission: permKey, 
                    is_allowed: newVal 
                }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                showMessage(`Permiso actualizado: ${PERMISSION_LABELS[permKey]}`, 'success');
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (err) {
            console.error("Error guardando permiso:", err);
            showMessage('Error al guardar el cambio. Revirtiendo...', 'error');
            // Revertir cambio en caso de error
            await fetchPermissions();
        }
    };

    /**
     * Verifica si un rol tiene un permiso habilitado
     * @param {string} role - Rol a verificar
     * @param {string} key - Clave del permiso
     * @returns {boolean}
     */
    const isAllowed = (role, key) => {
        const p = permissions.find(item => item.role === role && item.permission === key);
        return p ? p.is_allowed : false;
    };

    /**
     * Muestra un mensaje temporal
     * @param {string} text - Texto del mensaje
     * @param {string} type - Tipo: 'success' | 'error' | 'info'
     */
    const showMessage = (text, type = 'success') => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(null), 4000);
    };

    /**
     * Refresca los permisos manualmente
     */
    const handleRefresh = async () => {
        setLoading(true);
        await fetchPermissions();
    };

    // Estados de carga
    if (loading) {
        return (
            <div className="bg-neutral-900 border border-red-900/30 rounded-lg p-8 shadow-xl mb-8">
                <div className="flex items-center justify-center gap-3 text-neutral-500 animate-pulse">
                    <FaSync className="animate-spin" />
                    <span>Cargando protocolos de seguridad...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900 border border-red-900/30 rounded-lg p-6 shadow-xl mb-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-red-900/30 pb-4">
                <h2 className="text-2xl text-red-600 font-serif flex items-center gap-2">
                    <FaShieldAlt className="text-xl" /> 
                    Protocolos de Dominio
                </h2>
                
                <div className="flex items-center gap-2">
                    {/* Botón de refrescar */}
                    <button 
                        onClick={handleRefresh}
                        disabled={loading}
                        className="text-xs bg-neutral-800 text-neutral-400 border border-neutral-700 px-3 py-1.5 rounded hover:bg-neutral-700 hover:text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Recargar permisos"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        Refrescar
                    </button>

                    {/* Botón de inicializar (solo si no hay permisos) */}
                    {permissions.length === 0 && (
                        <button 
                            onClick={handleInitTable}
                            disabled={saving}
                            className="text-xs bg-red-900/20 text-red-400 border border-red-900 px-3 py-1.5 rounded hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <FaExclamationTriangle />
                            {saving ? 'Inicializando...' : 'Inicializar BD'}
                        </button>
                    )}
                </div>
            </div>

            {/* Mensaje de estado */}
            {msg && (
                <div className={`mb-4 p-3 rounded text-sm border ${
                    msgType === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' :
                    msgType === 'error' ? 'bg-red-900/20 border-red-900/50 text-red-400' :
                    'bg-blue-900/20 border-blue-900/50 text-blue-400'
                }`}>
                    {msg}
                </div>
            )}

            {/* Tabla de permisos */}
            {permissions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="p-3 text-neutral-400 font-sans text-xs uppercase tracking-widest border-b border-neutral-800">
                                    Acción
                                </th>
                                {ROLES.map(role => (
                                    <th 
                                        key={role} 
                                        className="p-3 text-center text-red-500 font-serif text-lg border-b border-neutral-800 capitalize"
                                    >
                                        {role}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(PERMISSION_LABELS).map(([permKey, label]) => (
                                <tr 
                                    key={permKey} 
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="p-4 border-b border-neutral-800">
                                        <span className="text-neutral-200 font-medium block">
                                            {label}
                                        </span>
                                        <span className="text-[10px] text-neutral-600 font-mono mt-0.5 block">
                                            {permKey}
                                        </span>
                                    </td>
                                    {ROLES.map(role => {
                                        const active = isAllowed(role, permKey);
                                        return (
                                            <td 
                                                key={`${role}-${permKey}`} 
                                                className="p-4 border-b border-neutral-800 text-center"
                                            >
                                                {/* Toggle Switch */}
                                                <button
                                                    onClick={() => togglePermission(role, permKey)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
                                                        active 
                                                            ? 'bg-red-700 hover:bg-red-600' 
                                                            : 'bg-neutral-700 hover:bg-neutral-600'
                                                    }`}
                                                    title={active ? 'Desactivar permiso' : 'Activar permiso'}
                                                >
                                                    <span
                                                        className={`${
                                                            active ? 'translate-x-6' : 'translate-x-1'
                                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`}
                                                    />
                                                </button>
                                                
                                                {/* Indicador visual */}
                                                <div className="mt-2 text-xs text-neutral-500 flex items-center justify-center gap-1">
                                                    {active ? (
                                                        <>
                                                            <FaLockOpen className="text-red-400" />
                                                            <span className="text-red-400 font-medium">Permitido</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaLock className="text-neutral-500" />
                                                            <span className="text-neutral-500">Bloqueado</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-neutral-500">
                    <FaExclamationTriangle className="text-4xl mx-auto mb-3 text-neutral-600" />
                    <p className="text-lg mb-2">No hay permisos configurados</p>
                    <p className="text-sm">Inicializa la base de datos para crear la estructura de permisos</p>
                </div>
            )}

            {/* Footer informativo */}
            <div className="mt-6 pt-4 border-t border-neutral-800">
                <p className="text-xs text-neutral-600 text-center">
                    Los cambios se aplican inmediatamente. Los usuarios deben cerrar sesión y volver a iniciar para que los cambios surtan efecto.
                </p>
            </div>
        </div>
    );
}