import { useState, useEffect } from 'react';
import { 
    FaUsers, 
    FaUserShield, 
    FaUser, 
    FaTrash, 
    FaSync,
    FaPlus,
    FaExclamationTriangle,
    FaTimes,
    FaCheck
} from 'react-icons/fa';

/**
 * Panel de gestión de usuarios
 * Permite crear, editar roles y eliminar usuarios
 */
export default function UserManager({ currentUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [msgType, setMsgType] = useState('success');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'player' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', { credentials: 'include' });
            
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else if (response.status === 403) {
                showMessage('No tienes permisos para ver usuarios', 'error');
            }
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            showMessage('Error al cargar usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        const user = users.find(u => u.id === userId);
        
        if (!window.confirm(`¿Cambiar rol de "${user.username}" a "${newRole}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                showMessage(data.message, 'success');
                await fetchUsers();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Error al cambiar rol', 'error');
            }
        } catch (err) {
            console.error("Error cambiando rol:", err);
            showMessage('Error de conexión', 'error');
        }
    };

    const handleDeleteUser = async (userId) => {
        const user = users.find(u => u.id === userId);
        
        if (!window.confirm(`¿ELIMINAR definitivamente al usuario "${user.username}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                showMessage(data.message, 'success');
                await fetchUsers();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Error al eliminar usuario', 'error');
            }
        } catch (err) {
            console.error("Error eliminando usuario:", err);
            showMessage('Error de conexión', 'error');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        
        if (!newUser.username || !newUser.password) {
            showMessage('Usuario y contraseña son requeridos', 'error');
            return;
        }

        try {
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                showMessage(data.message, 'success');
                setShowCreateModal(false);
                setNewUser({ username: '', password: '', role: 'player' });
                await fetchUsers();
            } else {
                const error = await response.json();
                showMessage(error.error || 'Error al crear usuario', 'error');
            }
        } catch (err) {
            console.error("Error creando usuario:", err);
            showMessage('Error de conexión', 'error');
        }
    };

    const showMessage = (text, type = 'success') => {
        setMsg(text);
        setMsgType(type);
        setTimeout(() => setMsg(null), 4000);
    };

    if (loading) {
        return (
            <div className="bg-neutral-900 border border-red-900/30 rounded-lg p-8 shadow-xl">
                <div className="flex items-center justify-center gap-3 text-neutral-500 animate-pulse">
                    <FaSync className="animate-spin" />
                    <span>Cargando registro de sangre...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900 border border-red-900/30 rounded-lg p-6 shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-red-900/30 pb-4">
                <h2 className="text-2xl text-red-600 font-serif flex items-center gap-2">
                    <FaUsers className="text-xl" /> 
                    Registro de Linajes
                </h2>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchUsers}
                        disabled={loading}
                        className="text-xs bg-neutral-800 text-neutral-400 border border-neutral-700 px-3 py-1.5 rounded hover:bg-neutral-700 hover:text-neutral-200 transition-colors flex items-center gap-2"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                        Refrescar
                    </button>
                    
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="text-xs bg-red-900/20 text-red-400 border border-red-900 px-3 py-1.5 rounded hover:bg-red-900/40 transition-colors flex items-center gap-2"
                    >
                        <FaPlus />
                        Crear Usuario
                    </button>
                </div>
            </div>

            {/* Mensaje */}
            {msg && (
                <div className={`mb-4 p-3 rounded text-sm border ${
                    msgType === 'success' ? 'bg-green-900/20 border-green-900/50 text-green-400' :
                    msgType === 'error' ? 'bg-red-900/20 border-red-900/50 text-red-400' :
                    'bg-blue-900/20 border-blue-900/50 text-blue-400'
                }`}>
                    {msg}
                </div>
            )}

            {/* Lista de usuarios */}
            <div className="space-y-2">
                {users.map(user => (
                    <div 
                        key={user.id}
                        className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 hover:bg-neutral-800 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            {/* Info del usuario */}
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${
                                    user.role === 'admin' 
                                        ? 'bg-red-900/20 text-red-400' 
                                        : 'bg-blue-900/20 text-blue-400'
                                }`}>
                                    {user.role === 'admin' ? <FaUserShield /> : <FaUser />}
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-neutral-200 font-medium">
                                            {user.username}
                                        </span>
                                        {user.id === currentUser?.id && (
                                            <span className="text-xs bg-yellow-900/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-900/50">
                                                Tú
                                            </span>
                                        )}
                                        {user.has_google_auth && (
                                            <span className="text-xs bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50">
                                                Google
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-neutral-500">
                                        Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-3">
                                {/* Selector de rol */}
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    disabled={user.id === currentUser?.id}
                                    className="bg-neutral-700 border border-neutral-600 text-neutral-200 px-3 py-1.5 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-600 transition-colors"
                                >
                                    <option value="admin">Admin (Narrador)</option>
                                    <option value="player">Player (Jugador)</option>
                                </select>

                                {/* Botón eliminar */}
                                <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={user.id === currentUser?.id}
                                    className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={user.id === currentUser?.id ? "No puedes eliminarte a ti mismo" : "Eliminar usuario"}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {users.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                        <FaExclamationTriangle className="text-4xl mx-auto mb-3 text-neutral-600" />
                        <p>No hay usuarios registrados</p>
                    </div>
                )}
            </div>

            {/* Modal de crear usuario */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-red-900/30 rounded-lg p-6 max-w-md w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-4 border-b border-neutral-800 pb-3">
                            <h3 className="text-xl text-red-500 font-serif flex items-center gap-2">
                                <FaPlus /> Abrazar Nuevo Vástago
                            </h3>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">
                                    Nombre de Usuario
                                </label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-900"
                                    placeholder="Ej: jugador1"
                                    required
                                    minLength="3"
                                    maxLength="50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-900"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    minLength="6"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">
                                    Rol Inicial
                                </label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                    className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-900"
                                >
                                    <option value="player">Player (Jugador)</option>
                                    <option value="admin">Admin (Narrador)</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-red-900/20 text-red-400 border border-red-900 px-4 py-2 rounded hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FaCheck /> Crear Usuario
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-neutral-800 text-neutral-400 border border-neutral-700 px-4 py-2 rounded hover:bg-neutral-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-neutral-800">
                <p className="text-xs text-neutral-600 text-center">
                    Total de vástagos registrados: <span className="text-red-400 font-semibold">{users.length}</span>
                </p>
            </div>
        </div>
    );
}