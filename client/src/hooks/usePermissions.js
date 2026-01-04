// client/src/hooks/usePermissions.js
import { useState, useEffect } from 'react';

/**
 * Hook para verificar si el usuario tiene un permiso específico
 * @param {string} permission - Nombre del permiso a verificar
 * @returns {object} { hasPermission, loading, error }
 */
export function usePermission(permission) {
    const [hasPermission, setHasPermission] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkPermission = async () => {
            try {
                const response = await fetch('/api/current_user', { 
                    credentials: 'include' 
                });
                
                if (!response.ok) {
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }

                const data = await response.json();
                
                // Los admins siempre tienen todos los permisos
                if (data.user?.role === 'admin') {
                    setHasPermission(true);
                    setLoading(false);
                    return;
                }

                // Para otros roles, verificar el permiso específico
                // Podrías agregar un endpoint /api/check-permission si lo necesitas
                // Por ahora, asumimos que solo admin tiene acceso completo
                setHasPermission(false);

            } catch (err) {
                console.error('Error verificando permiso:', err);
                setError(err.message);
                setHasPermission(false);
            } finally {
                setLoading(false);
            }
        };

        checkPermission();
    }, [permission]);

    return { hasPermission, loading, error };
}

/**
 * Hook para obtener todos los permisos del usuario actual
 * @returns {object} { permissions, role, loading, error }
 */
export function useUserPermissions() {
    const [permissions, setPermissions] = useState([]);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await fetch('/api/current_user', { 
                    credentials: 'include' 
                });
                
                if (!response.ok) {
                    setLoading(false);
                    return;
                }

                const data = await response.json();
                
                if (data.user) {
                    setRole(data.user.role);
                    
                    // Si es admin, tiene todos los permisos
                    if (data.user.role === 'admin') {
                        setPermissions([
                            'manage_users',
                            'edit_chronicles',
                            'delete_chronicles',
                            'view_hidden',
                            'create_characters',
                            'delete_characters',
                            'manage_lore',
                            'export_data',
                            'upload_files',
                            'view_chronicles'
                        ]);
                    } else {
                        // Para otros roles, podrías hacer otra llamada al backend
                        // para obtener los permisos específicos
                        setPermissions([]);
                    }
                }
            } catch (err) {
                console.error('Error cargando permisos:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    return { permissions, role, loading, error };
}