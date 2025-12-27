import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// --- COMPONENTES DE ESTRUCTURA ---
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import MaintenancePanel from "./components/MaintenancePanel";

// --- CRÓNICAS (SAGAS) ---
import SagaList from "./components/SagaList";
import SagaDetail from "./components/SagaDetail";

// --- PERSONAJES ---
import Characters from "./pages/Characters";
import CharacterDetail from "./components/CharacterDetail";

// --- LORE Y EXTRAS ---
import LoreView from "./components/LoreView";
import GalleryView from "./components/GalleryView";

// Componente de carga reutilizable
const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-900 animate-pulse font-serif">
    <span className="text-3xl">VTM 5E</span>
    <span className="text-sm mt-2 tracking-widest uppercase">
      Despertando la Sangre...
    </span>
  </div>
);

// Componente de ruta protegida para Admin
const ProtectedAdminRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Componente de ruta pública (redirige si ya está logueado)
const PublicRoute = ({ user, children }) => {
  return user ? <Navigate to="/" replace /> : children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar sesión al cargar la app
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/current_user", {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.warn('No hay sesión activa');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Respuesta de sesión:', data); // Debug
        
        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            username: data.user.username,
            role: data.user.role
          });
          console.log('Usuario autenticado:', data.user.username, 'Rol:', data.user.role);
        } else {
          console.log('No hay sesión activa');
        }
      } catch (err) {
        console.error('Error verificando sesión:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: 'include'
      });
      
      if (response.ok) {
        setUser(null);
        window.location.href = '/login'; // Redirigir al login
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      // Intentar de todas formas limpiar el estado local
      setUser(null);
      window.location.href = '/login';
    }
  };

  // Pantalla de carga inicial
  if (loading) {
    return <LoadingScreen />;
  }

  // Pantalla de error (opcional)
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 font-serif">
        <span className="text-2xl mb-4">Error de Conexión</span>
        <span className="text-sm">{error}</span>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-900 hover:bg-red-800 transition-colors rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-red-900 selection:text-white relative overflow-hidden">
        
        {/* FONDO ANIMADO */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-black opacity-90"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        {/* CONTENIDO */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar user={user} onLogout={handleLogout} />

          <div className="container mx-auto px-4 py-8 flex-1">
            <Routes>
              {/* Rutas públicas */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute user={user}>
                    <Login setUser={setUser} />
                  </PublicRoute>
                } 
              />

              {/* Rutas protegidas - requieren login */}
              <Route 
                path="/" 
                element={user ? <SagaList user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/chronicle/:id" 
                element={user ? <SagaDetail user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/characters" 
                element={user ? <Characters user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/character/:id" 
                element={user ? <CharacterDetail user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/lore" 
                element={user ? <LoreView user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/gallery" 
                element={user ? <GalleryView user={user} /> : <Navigate to="/login" replace />} 
              />

              {/* Ruta de admin - solo para administradores */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedAdminRoute user={user}>
                    <MaintenancePanel />
                  </ProtectedAdminRoute>
                } 
              />

              {/* Ruta por defecto */}
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
            </Routes>
          </div>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;