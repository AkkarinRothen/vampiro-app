import { useState } from 'react';
import { 
    FaDatabase, 
    FaTools, 
    FaExclamationTriangle, 
    FaDownload, 
    FaUpload, 
    FaKey, 
    FaTerminal, 
    FaSkull,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaTrash,
    FaSync,
    FaEye,
    FaEyeSlash,
    FaShieldAlt,
    FaUsers,
    FaCog
} from 'react-icons/fa';

// Componentes de gestión
import PermissionsManager from './PermissionsManager';
import UserManager from './UserManager';

/**
 * Panel de Mantenimiento del Sistema con pestañas
 * Permite al administrador gestionar la base de datos, usuarios, permisos y backups
 */
const MaintenancePanel = ({ user }) => {
    // --- VALIDACIÓN DE USUARIO ---
    if (!user) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center text-neutral-500">
                    <FaExclamationTriangle className="text-5xl mx-auto mb-4 text-yellow-600" />
                    <h2 className="text-2xl font-serif mb-2">Usuario no detectado</h2>
                    <p>El objeto user es null o undefined</p>
                </div>
            </div>
        );
    }

    if (user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center text-neutral-500">
                    <FaExclamationTriangle className="text-5xl mx-auto mb-4 text-red-600" />
                    <h2 className="text-2xl font-serif mb-2">Acceso Denegado</h2>
                    <p>Usuario actual: {user.username}</p>
                    <p>Rol: {user.role}</p>
                </div>
            </div>
        );
    }

    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState('permissions');
    const [loading, setLoading] = useState(false);
    const [secretKey, setSecretKey] = useState('');
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState(null);
    const [outputType, setOutputType] = useState('info');
    const [lastCommand, setLastCommand] = useState('');

    // --- CONFIGURACIÓN DE PESTAÑAS ---
    const tabs = [
        { id: 'permissions', label: 'Permisos', icon: FaShieldAlt },
        { id: 'users', label: 'Usuarios', icon: FaUsers },
        { id: 'system', label: 'Sistema', icon: FaCog }
    ];

    // --- UTILIDADES DE CONSOLA ---
    const clearConsole = () => {
        setConsoleOutput(null);
        setOutputType('info');
        setLastCommand('');
    };

    const logToConsole = (message, type = 'info') => {
        setConsoleOutput(message);
        setOutputType(type);
    };

    // --- SCRIPTS DE SISTEMA ---
    const runSystemScript = async (endpoint, label, warningMsg = null) => {
        if (!secretKey || secretKey.trim() === '') {
            logToConsole(
                "⚠️ Error de Autorización\n\nSe requiere la Llave Maestra (DB_RESET_KEY) para ejecutar rituales de sistema.\n\nEsta clave se define en las variables de entorno del servidor.",
                'error'
            );
            return;
        }

        const defaultWarning = `⚠️ ADVERTENCIA CRÍTICA\n\n¿Estás seguro de ejecutar: ${label}?\n\nEsta operación puede:\n- Alterar la estructura de la base de datos\n- Eliminar datos existentes\n- Requiere tiempo de inactividad\n\n¿Deseas continuar?`;
        
        if (!window.confirm(warningMsg || defaultWarning)) return;
        
        setLoading(true);
        setLastCommand(label);
        logToConsole(`⚙️ Iniciando: ${label}\n\nConectando con el servidor...`, 'info');

        try {
            const res = await fetch(`/${endpoint}?key=${encodeURIComponent(secretKey)}`, {
                credentials: 'include'
            });
            
            const contentType = res.headers.get("content-type");
            let result;

            if (contentType && contentType.indexOf("application/json") !== -1) {
                const json = await res.json();
                result = `${label} - Resultado:\n\n${JSON.stringify(json, null, 2)}`;
            } else {
                result = await res.text();
            }

            if (!res.ok) {
                throw new Error(result || `Error HTTP ${res.status}: ${res.statusText}`);
            }

            logToConsole(result, 'success');

        } catch (err) {
            logToConsole(
                `❌ Error Crítico en ${label}\n\n` +
                `Descripción: ${err.message}\n\n` +
                `Posibles causas:\n` +
                `- Clave maestra incorrecta\n` +
                `- Problema de conexión con la base de datos\n` +
                `- Permisos insuficientes\n\n` +
                `Revisa los logs del servidor para más detalles.`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // --- EXPORTAR DATOS ---
    const exportData = async () => {
        setLoading(true);
        setLastCommand('Exportar Datos');
        logToConsole('📦 Preparando exportación de datos...', 'info');

        try {
            const res = await fetch('/api/export-data', { 
                credentials: 'include' 
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Fallo al exportar datos");
            }
            
            const data = await res.json();
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `vtm_backup_${timestamp}_v${data.version || '1.0'}.json`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            logToConsole(
                `✅ Respaldo Completado\n\n` +
                `Archivo: ${filename}\n` +
                `Fecha: ${data.backup_date}\n` +
                `Versión: ${data.version}\n\n` +
                `Registros exportados:\n` +
                `- Personajes: ${data.characters?.length || 0}\n` +
                `- Crónicas: ${data.chronicles?.length || 0}\n` +
                `- Secciones: ${data.sections?.length || 0}\n` +
                `- Lore: ${data.lore?.length || 0}\n` +
                `- Vínculos: ${data.chronicle_characters?.length || 0}`,
                'success'
            );
        } catch (err) {
            logToConsole(
                `❌ Error de Exportación\n\n${err.message}\n\n` +
                `Verifica que tengas permisos de administrador y que el servidor esté funcionando correctamente.`,
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // --- IMPORTAR DATOS ---
    const importData = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            logToConsole('❌ Formato de archivo inválido. Solo se aceptan archivos .json', 'error');
            e.target.value = null;
            return;
        }

        const confirmMsg = 
            `⚠️ ADVERTENCIA CRÍTICA - SOBRESCRITURA DE DATOS\n\n` +
            `Estás a punto de importar: ${file.name}\n\n` +
            `Esta acción:\n` +
            `- SOBRESCRIBIRÁ datos existentes\n` +
            `- Es IRREVERSIBLE\n` +
            `- Puede tomar varios minutos\n\n` +
            `RECOMENDACIÓN: Exporta un backup actual antes de continuar.\n\n` +
            `¿Deseas proceder con la importación?`;

        if (!window.confirm(confirmMsg)) {
            e.target.value = null;
            return;
        }

        setLoading(true);
        setLastCommand('Importar Datos');
        logToConsole(`📥 Leyendo archivo: ${file.name}...`, 'info');

        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!data.characters && !data.chronicles && !data.lore) {
                    throw new Error('Archivo JSON inválido o vacío. Debe contener al menos una de las siguientes propiedades: characters, chronicles, lore');
                }

                logToConsole('📤 Enviando datos al servidor...', 'info');

                const res = await fetch('/api/import-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    credentials: 'include'
                });
                
                const result = await res.json();
                
                if (!res.ok) {
                    throw new Error(result.error || result.details || "Error desconocido en la importación");
                }
                
                logToConsole(
                    `✅ Importación Completada\n\n` +
                    `${result.message}\n\n` +
                    `Registros procesados:\n` +
                    `- Personajes: ${result.stats?.characters || 0}\n` +
                    `- Crónicas: ${result.stats?.chronicles || 0}\n` +
                    `- Secciones: ${result.stats?.sections || 0}\n` +
                    `- Lore: ${result.stats?.lore || 0}\n` +
                    `- Vínculos: ${result.stats?.links || 0}\n\n` +
                    `Recarga la página para ver los cambios.`,
                    'success'
                );
            } catch (err) {
                logToConsole(
                    `❌ Error de Importación\n\n` +
                    `${err.message}\n\n` +
                    `Causas comunes:\n` +
                    `- Archivo JSON corrupto o mal formateado\n` +
                    `- Versión incompatible del backup\n` +
                    `- Conflictos en la base de datos\n` +
                    `- Permisos insuficientes`,
                    'error'
                );
            } finally {
                setLoading(false);
                e.target.value = null;
            }
        };

        reader.onerror = () => {
            logToConsole('❌ Error al leer el archivo. Intenta nuevamente.', 'error');
            setLoading(false);
            e.target.value = null;
        };

        reader.readAsText(file);
    };

    // --- RENDERIZADO ---
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-6 pb-20">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* CABECERA */}
                <header className="text-center border-b border-red-900/50 pb-6 mb-8">
                    <h1 className="text-4xl md:text-5xl font-serif text-red-600 mb-3 flex justify-center items-center gap-4">
                        <FaSkull className="animate-pulse" /> 
                        Panel del Narrador
                    </h1>
                    <p className="text-neutral-500 italic font-serif text-lg">
                        "Quis custodiet ipsos custodes?"
                    </p>
                    <p className="text-neutral-600 text-sm mt-2">
                        Gestión avanzada del sistema • Usuario: <span className="text-red-500 font-bold">{user.username}</span>
                    </p>
                </header>

                {/* SISTEMA DE PESTAÑAS */}
                <div className="flex gap-2 mb-6 border-b border-neutral-800 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'text-red-400 border-b-2 border-red-600 bg-red-900/10'
                                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'
                            }`}
                        >
                            <tab.icon />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* CONTENIDO DE LAS PESTAÑAS */}
                <div className="space-y-6">
                    {/* PESTAÑA: PERMISOS */}
                    {activeTab === 'permissions' && (
                        <section>
                            <PermissionsManager />
                        </section>
                    )}

                    {/* PESTAÑA: USUARIOS */}
                    {activeTab === 'users' && (
                        <section>
                            <UserManager currentUser={user} />
                        </section>
                    )}

                    {/* PESTAÑA: SISTEMA */}
                    {activeTab === 'system' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* COLUMNA IZQUIERDA: CONTROLES */}
                            <aside className="lg:col-span-1 space-y-6">
                                
                                {/* PANEL DE MANTENIMIENTO DB */}
                                <div className="bg-neutral-900/50 border border-red-900/30 rounded-lg p-6 shadow-lg">
                                    <h3 className="text-xl text-red-500 font-serif mb-4 flex items-center gap-2">
                                        <FaDatabase /> Rituales de Sangre
                                    </h3>
                                    
                                    {/* Input de Llave Maestra */}
                                    <div className="mb-6">
                                        <label className="text-xs uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-2">
                                            <FaKey className="text-red-500" />
                                            Llave Maestra <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type={showSecretKey ? "text" : "password"}
                                                value={secretKey}
                                                onChange={(e) => setSecretKey(e.target.value)}
                                                placeholder="Ingrese DB_RESET_KEY..."
                                                className="w-full bg-black border border-neutral-700 rounded py-2.5 px-3 pr-10 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/50 outline-none transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSecretKey(!showSecretKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                                                title={showSecretKey ? "Ocultar clave" : "Mostrar clave"}
                                            >
                                                {showSecretKey ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-neutral-600 mt-1.5">
                                            Variable de entorno del servidor
                                        </p>
                                    </div>

                                    {/* Botones de Acción */}
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => runSystemScript(
                                                'setup-master', 
                                                'Setup Maestro (Reset Total)',
                                                '⚠️ PELIGRO: Setup Maestro\n\nEsta operación:\n- ELIMINARÁ todas las tablas existentes\n- Creará una estructura completamente nueva\n- BORRARÁ todos los datos actuales\n- Creará un usuario admin por defecto\n\n¡SOLO usar en instalaciones nuevas o para reset completo!\n\n¿Continuar?'
                                            )}
                                            disabled={loading}
                                            className="w-full flex items-center justify-between p-3 bg-red-900/10 hover:bg-red-900/30 border border-red-900/50 hover:border-red-500 rounded transition-all text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="flex items-center gap-2">
                                                <FaDatabase className="text-red-600" /> 
                                                Inicializar BD
                                            </span>
                                            <FaExclamationTriangle className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                        
                                        <button 
                                            onClick={() => runSystemScript(
                                                'fix-db-structure', 
                                                'Reparar Estructura',
                                                '⚙️ Parche de Estructura\n\nEsta operación:\n- Añadirá columnas faltantes\n- Creará índices de optimización\n- NO eliminará datos existentes\n- Es seguro ejecutar varias veces\n\n¿Continuar?'
                                            )}
                                            disabled={loading}
                                            className="w-full flex items-center justify-start gap-2 p-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500 rounded transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <FaTools className="text-yellow-500" /> 
                                            Parchear Tablas
                                        </button>
                                    </div>
                                </div>

                                {/* PANEL DE BACKUPS */}
                                <div className="bg-neutral-900/50 border border-blue-900/30 rounded-lg p-6 shadow-lg">
                                    <h3 className="text-xl text-blue-500 font-serif mb-4 flex items-center gap-2">
                                        <FaSync /> Respaldos
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={exportData} 
                                            disabled={loading}
                                            className="flex items-center justify-center gap-2 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-800 hover:border-blue-600 p-3 rounded text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                            <FaDownload /> Descargar Respaldo
                                        </button>
                                        
                                        <label className={`flex items-center justify-center gap-2 bg-green-900/20 hover:bg-green-900/40 border border-green-800 hover:border-green-600 p-3 rounded text-sm transition-all font-medium ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <FaUpload /> Restaurar Respaldo
                                            <input 
                                                type="file" 
                                                onChange={importData} 
                                                accept=".json" 
                                                className="hidden" 
                                                disabled={loading} 
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-neutral-600 mt-3 border-t border-neutral-800 pt-3">
                                        Los backups incluyen todos los datos del sistema: personajes, crónicas, secciones, lore y vínculos.
                                    </p>
                                </div>
                            </aside>

                            {/* COLUMNA DERECHA: CONSOLA */}
                            <section className="lg:col-span-2">
                                <div className="bg-black border border-neutral-800 rounded-lg h-full min-h-[500px] flex flex-col font-mono text-sm shadow-2xl relative overflow-hidden">
                                    
                                    {/* Header de la Consola */}
                                    <div className="bg-neutral-900 p-3 border-b border-neutral-800 flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-neutral-400 text-xs uppercase tracking-widest font-bold">
                                            <FaTerminal className="text-green-500" /> 
                                            Consola del Sistema
                                            {lastCommand && (
                                                <span className="text-neutral-600 font-normal normal-case">
                                                    • {lastCommand}
                                                </span>
                                            )}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            {loading && (
                                                <span className="text-red-500 animate-pulse text-xs font-bold flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                                    PROCESANDO
                                                </span>
                                            )}
                                            {consoleOutput && (
                                                <button
                                                    onClick={clearConsole}
                                                    className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                                                    title="Limpiar consola"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Contenido de la Consola */}
                                    <div className="flex-1 p-4 overflow-auto">
                                        {!consoleOutput ? (
                                            <div className="h-full flex flex-col items-center justify-center text-neutral-700">
                                                <FaSkull size={48} className="mb-4 opacity-30" />
                                                <p className="text-sm">Esperando comandos...</p>
                                                <p className="text-xs mt-2 text-neutral-800">
                                                    Los resultados de las operaciones aparecerán aquí
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className={`mb-3 font-bold flex items-center gap-2 text-base ${
                                                    outputType === 'error' ? 'text-red-500' : 
                                                    outputType === 'success' ? 'text-green-500' : 'text-blue-400'
                                                }`}>
                                                    {outputType === 'error' ? <FaTimesCircle /> : 
                                                     outputType === 'success' ? <FaCheckCircle /> : <FaInfoCircle />}
                                                    {outputType === 'error' ? 'ERROR' : 
                                                     outputType === 'success' ? 'ÉXITO' : 'INFORMACIÓN'}
                                                </div>

                                                <div className="whitespace-pre-wrap break-words text-neutral-300 leading-relaxed text-xs">
                                                    {typeof consoleOutput === 'string' 
                                                        ? consoleOutput 
                                                        : JSON.stringify(consoleOutput, null, 2)
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* FOOTER INFORMATIVO */}
                <footer className="text-center text-neutral-600 text-xs border-t border-neutral-900 pt-6">
                    <p>Panel de Administración • Vampire: The Masquerade System</p>
                    <p className="mt-1">Todas las operaciones son registradas • Usa con precaución</p>
                </footer>
            </div>
        </div>
    );
};

export default MaintenancePanel;