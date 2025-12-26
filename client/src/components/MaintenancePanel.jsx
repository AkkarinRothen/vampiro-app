import { FaDatabase, FaTools, FaExclamationTriangle } from 'react-icons/fa';

function MaintenancePanel({ user }) {
    if (user?.role !== 'admin') return null;

    const runSetup = async (endpoint, label) => {
        if (!confirm(`¿Ejecutar ${label}? Esto afectará la base de datos.`)) return;
        try {
            const res = await fetch(`/${endpoint}`);
            const text = await res.text();
            alert(`Resultado: ${text}`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="mt-10 p-6 bg-neutral-950 border border-red-900/30 rounded-lg">
            <h2 className="text-xl font-serif text-red-600 mb-4 flex items-center gap-2">
                <FaTools /> Panel de Control del Narrador
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
                Herramientas para la migración a Neon y reparación de tablas.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => runSetup('setup-chronicles', 'Setup Inicial')}
                    className="flex items-center justify-center gap-2 p-3 bg-neutral-900 hover:bg-red-900/20 border border-neutral-800 rounded transition-all text-sm"
                >
                    <FaDatabase className="text-yellow-600" /> Forjar Tablas (Sagas/PJ)
                </button>
                
                <button 
                    onClick={() => runSetup('fix-lore-table', 'Reparar Lore')}
                    className="flex items-center justify-center gap-2 p-3 bg-neutral-900 hover:bg-red-900/20 border border-neutral-800 rounded transition-all text-sm"
                >
                    <FaExclamationTriangle className="text-red-600" /> Reparar Tabla de Archivos
                </button>
            </div>
        </div>
    );
}

export default MaintenancePanel;