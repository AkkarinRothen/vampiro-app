import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import CampaignManager from "./components/dashboard/CampaignManager";

// --- COMPONENTES DE ESTRUCTURA Y UI ---
// Asumiendo que moviste Navbar y Login a carpetas organizadas, si no, ajusta estas rutas
import Navbar from "./components/ui/Navbar"; 
import Login from "./components/auth/Login"; 
import MaintenancePanel from "./components/admin/MaintenancePanel";

// --- CRÓNICAS (SISTEMA NUEVO) ---
import SagaList from "./components/dashboard/SagaList";
import ChronicleView from "./components/chronicle/ChronicleView";

// --- PERSONAJES Y LORE (MANTENIDOS) ---
import Characters from "./pages/Characters";
import CharacterDetail from "./components/CharacterDetail";
import LoreView from "./components/LoreView";
import GalleryView from "./components/GalleryView";

// --- COMPONENTES UTILITARIOS ---

// Componente de carga reutilizable
const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-900 animate-pulse font-serif">
    <span className="text-3xl border-b-2 border-red-900 pb-2 mb-4">VTM 5E</span>
    <span className="text-sm tracking-[0.3em] uppercase text-neutral-500">
      Despertando la Sangre...
    </span>
  </div>
);

// --- WRAPPERS DE RUTAS ---

// Ruta protegida para Admin
const ProtectedAdminRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

// Ruta pública (redirige si ya está logueado)
const PublicRoute = ({ user, children }) => {
  return user ? <Navigate to="/" replace /> : children;
};

// [NUEVO] Wrapper para conectar la URL /chronicle/:id con el componente ChronicleView
// [ACTUALIZADO] Wrapper que conecta con la API real
const ChronicleRouteWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sagaData, setSagaData] = useState(null); // Guardará { info, sections, characters }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaga = async () => {
      try {
        // Llamada a tu backend: GET /api/chronicles/:id
        const response = await fetch(`/api/chronicles/${id}`, { credentials: 'include' });
        
        if (!response.ok) {
           if (response.status === 404) {
             console.error("Crónica no encontrada");
             navigate('/'); 
             return;
           }
           throw new Error('Error de red');
        }

        const data = await response.json();
        // El backend devuelve: { info, characters, sections }
        setSagaData(data); 

      } catch (error) {
        console.error("Error cargando crónica", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSaga();
  }, [id, navigate]);

  if (loading) return <LoadingScreen />;
  if (!sagaData) return null;

  return (
    <ChronicleView 
      saga={sagaData.info}       // Info general (título, imagen)
      initialSections={sagaData.sections} // Secciones que vienen de la BD
      onBack={() => navigate('/')} 
    />
  );
};
// [NUEVO] Wrapper para SagaList que inyecta la navegación
const SagaListWrapper = ({ user }) => {
  const navigate = useNavigate();
  
  // Extendemos el objeto usuario para incluir la función de navegación
  // que SagaList espera en "user.onSelectSaga"
  const userWithNavigation = {
    ...user,
    onSelectSaga: (saga) => navigate(`/chronicle/${saga.id}`)
  };

  return <SagaList user={userWithNavigation} />;
};


// --- APP PRINCIPAL ---

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar sesión al cargar la app
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Simulación o llamada real a tu API
        const response = await fetch("/api/current_user", { credentials: 'include' });
        
        if (!response.ok) {
            // Fallback para desarrollo sin backend: descomentar para probar UI
            // setUser({ id: '1', username: 'Narrador', role: 'admin' });
            setLoading(false);
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.user) {
          setUser(data.user);
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

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: 'include' });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      setUser(null);
      window.location.href = '/login';
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 font-serif">
        <span className="text-2xl mb-4">Fallo en la red de la Camarilla</span>
        <span className="text-sm mb-4">{error}</span>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-red-900 selection:text-white relative overflow-hidden">
        
        {/* FONDO ANIMADO Y DECORACIÓN */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-black opacity-90"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          {/* Ruido de textura para efecto fílmico */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar user={user} onLogout={handleLogout} />

          <div className="container mx-auto px-4 py-8 flex-1">
            <Routes>
              {/* --- AUTENTICACIÓN --- */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute user={user}>
                    <Login setUser={setUser} />
                  </PublicRoute>
                } 
              />

              {/* --- GESTIÓN DE CRÓNICAS (Actualizado) --- */}
              <Route 
                path="/" 
                element={
                  user ? <SagaListWrapper user={user} /> : <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/chronicle/:id" 
                element={
                  user ? <ChronicleRouteWrapper /> : <Navigate to="/login" replace />
                } 
              />

              {/* --- PERSONAJES (Mantenido) --- */}
              <Route 
                path="/characters" 
                element={user ? <Characters user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/character/:id" 
                element={user ? <CharacterDetail user={user} /> : <Navigate to="/login" replace />} 
              />

              {/* --- EXTRAS (Mantenido) --- */}
              <Route 
                path="/lore" 
                element={user ? <LoreView user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/gallery" 
                element={user ? <GalleryView user={user} /> : <Navigate to="/login" replace />} 
              />

              {/* --- ADMIN --- */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedAdminRoute user={user}>
                    <MaintenancePanel />
                  </ProtectedAdminRoute>
                } 
              />

              {/* Default */}
              <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
            </Routes>
          </div>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;