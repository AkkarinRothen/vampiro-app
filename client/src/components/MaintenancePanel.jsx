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
// Agrega estas funciones dentro de MaintenancePanel
const exportData = async () => {
    const res = await fetch('/api/export-data');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vampiro_backup_${new Date().toLocaleDateString()}.json`;
    a.click();
};

const importData = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
        const data = JSON.parse(event.target.result);
        const res = await fetch('/api/import-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        alert(result.message);
    };
    reader.readAsText(file);
};

// Y en el return del componente, agrega estos botones:
<div className="mt-4 flex flex-col gap-2">
    <button onClick={exportData} className="bg-blue-900/40 border border-blue-800 p-2 rounded text-xs hover:bg-blue-800">
        📥 Descargar Respaldo (JSON)
    </button>
    <label className="bg-green-900/40 border border-green-800 p-2 rounded text-xs hover:bg-green-800 cursor-pointer text-center">
        📤 Subir Respaldo a Neon
        <input type="file" onChange={importData} className="hidden" />
    </label>
</div>
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