import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Navbar from './components/Navbar';
import SagaList from './components/SagaList';
import SagaDetail from './components/SagaDetail';
import CharacterList from './components/CharacterList';
import CharacterForm from './components/CharacterForm';
import LoreView from './components/LoreView';
import GalleryView from './components/GalleryView';


function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Verificar sesión al cargar
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
        fetch('/api/logout').then(() => setUser(null));
    };

    // Pantalla de Carga (Estilo Tailwind)
    if (loading) return (
        <div className="h-screen bg-black flex items-center justify-center">
            <div className="text-red-600 text-xl animate-pulse font-serif">Cargando la sangre...</div>
        </div>
    );

    // Si no hay usuario, mostrar Login
    if (!user) return <Login onLoginSuccess={(u) => setUser(u)} />;

    return (
        <div className="min-h-screen bg-neutral-900 text-gray-200 font-sans">
            
            {/* NAVBAR: Ya no necesita 'setView', usa Links internos */}
            <Navbar user={user} onLogout={handleLogout} />

            <div className="container mx-auto p-4 max-w-7xl">
                <Routes>
                    {/* 1. Ruta Principal (Sagas) */}
                    <Route path="/" element={<SagaList user={user} />} />

                    {/* 2. Detalle de Saga (URL dinámica con ID) */}
                    <Route path="/sagas/:id" element={<SagaDetail user={user} />} />

                    {/* 3. Personajes (Lista) */}
                    <Route path="/characters" element={<CharacterList user={user} />} />

                    {/* 4. Crear Personaje */}
                    {/* Creamos un componente wrapper para manejar la redirección al guardar */}
                    <Route path="/create-char" element={<CreateCharacterWrapper />} />

                    {/* 5. Lore / Archivos */}
                    <Route path="/lore" element={<LoreView user={user} />} />

                    {/* 6. Galeria */}
                    <Route path="/gallery" element={<GalleryView user={user} />} /> 
                    
                    {/* 7. Panel de Mantenimiento (Solo Admin) */}
                    <Route path="/admin" element={<MaintenancePanel user={user} />} />
                    {/* Ruta por defecto: Redirigir a inicio si no existe */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
        </div>
    );
}

// Pequeño componente auxiliar para manejar la redirección después de crear un PJ
function CreateCharacterWrapper() {
    const navigate = useNavigate();
    return <CharacterForm onSuccess={() => navigate('/characters')} />;
}

export default App;