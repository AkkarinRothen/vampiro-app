import { usePermission } from '../../hooks/usePermissions';

/**
 * Componente que renderiza sus hijos solo si el usuario tiene el permiso
 * @param {string} permission - Permiso requerido
 * @param {React.ReactNode} children - Contenido a mostrar
 * @param {React.ReactNode} fallback - Contenido alternativo (opcional)
 */
export default function ProtectedAction({ permission, children, fallback = null }) {
    const { hasPermission, loading } = usePermission(permission);

    if (loading) {
        return null; // O un skeleton/spinner si prefieres
    }

    if (!hasPermission) {
        return fallback;
    }

    return children;
}

/**
 * Ejemplo de uso:
 * 
 * 
 *   Eliminar
 * 
 * 
 * // Con fallback
 * Sin acceso}
 * >
 *   Editar
 * 
 */