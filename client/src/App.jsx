import { useState, useEffect } from 'react';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SagaList from './components/SagaList';
import SagaDetail from './components/SagaDetail'; // Importamos el detalle

import CharacterForm from './components/CharacterForm';
import CharacterList from './components/CharacterList';
import LoreView from './components/LoreView';
// Placeholder solo para Lore
const Placeholder = ({ title }) => (
    <div className="text-center mt-5 text-white">
        <h1>🚧 {title}</h1>
        <p className="text-muted">En construcción...</p>
    </div>
);

function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('sagas');
    const [loading, setLoading] = useState(true);
    const [selectedSagaId, setSelectedSagaId] = useState(null);

    useEffect(() => {
        fetch('/api/current_user')
            .then(res => res.json())
            .then(data => {
                if (data.success) setUser({ username: data.username, role: data.role });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleLogout = () => {
        fetch('/api/logout').then(() => {
            setUser(null);
            setView('sagas');
        });
    };

    if (loading) return <div className="text-white text-center mt-5">Cargando...</div>;
    if (!user) return <Login onLoginSuccess={(u) => setUser(u)} />;

return (
    <div className="app-container fade-in">
        {/* NAVBAR: Actualizado para limpiar la saga seleccionada al cambiar de menú */}
        <Navbar 
            user={user} 
            setView={(v) => { setView(v); setSelectedSagaId(null); }} 
            currentView={view} 
            onLogout={handleLogout} 
        />

        <div className="container py-5">
            
            {/* --- SECCIÓN SAGAS (NUEVA LÓGICA) --- */}
            
            {/* 1. Si estamos en 'sagas' y NO hay ninguna seleccionada -> Mostrar LISTA */}
            {view === 'sagas' && !selectedSagaId && (
                <SagaList 
                    user={user} 
                    onSelectSaga={(id) => setSelectedSagaId(id)} 
                />
            )}

            {/* 2. Si estamos en 'sagas' y SÍ hay una seleccionada -> Mostrar DETALLE */}
            {view === 'sagas' && selectedSagaId && (
                <SagaDetail 
                    sagaId={selectedSagaId} 
                    user={user} 
                    onBack={() => setSelectedSagaId(null)} 
                />
            )}


            {/* --- SECCIÓN PERSONAJES (YA LA TENÍAS) --- */}
            {view === 'characters' && (
                <div className="row">
                    <div className="col-12 mb-4 text-end">
                         <button className="btn btn-outline-danger me-2" onClick={() => setView('create-char')}>+ Nuevo Vástago</button>
                         <button className="btn btn-outline-secondary" onClick={() => setView('characters')}>Ver Lista</button>
                    </div>
                    <CharacterList user={user} />
                </div>
            )}

            {view === 'create-char' && (
                <CharacterForm onSuccess={() => setView('characters')} />
            )}

            {/* --- SECCIÓN LORE --- */}
           {view === 'lore' && <LoreView user={user} />}
            
        </div>
    </div>
);
}

export default App;