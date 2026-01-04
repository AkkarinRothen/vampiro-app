import { useState, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";

// --- ESTILOS Y TEMA ---
import "./vtm-theme.css"; 

// --- PROVEEDORES Y UI ---
import { ToastProvider, useToast } from "./components/ui/Toast";
import Navbar from "./components/ui/Navbar";
import Login from "./components/auth/Login";

// --- COMPONENTES DE ADMINISTRACIÓN ---
import MaintenancePanel from "./components/admin/MaintenancePanel";
import PermissionsManager from "./components/admin/PermissionsManager";

// --- CRÓNICAS Y CONTENIDO ---
import SagaList from "./components/dashboard/SagaList";
import ChronicleView from "./components/chronicle/ChronicleView"; // Asegúrate de que esta ruta sea correcta
import Characters from "./pages/Characters";
import CharacterDetail from "./components/CharacterDetail";
import LoreView from "./components/LoreView";
import GalleryView from "./components/GalleryView";

// ==========================================
// 1. PANTALLA DE CARGA GÓTICA
// ==========================================
const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center font-serif relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--blood-primary)_0%,_transparent_70%)] opacity-20 animate-pulse"></div>
    <div className="relative z-10 text-center">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 tracking-widest mb-4 animate-fade-in">
        VTM 5E
      </h1>
      <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-glow"></div>
      <p className="mt-4 text-xs tracking-[0.4em] text-neutral-500 uppercase animate-pulse">
        Despertando la Sangre...
      </p>
    </div>
  </div>
);

// ==========================================
// 2. ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Fallo Crítico:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 text-center font-serif">
          <div className="max-w-md border border-red-900/50 p-8 rounded bg-black/50 backdrop-blur-sm">
            <h2 className="text-3xl text-red-600 mb-4">Fallo en el Sistema</h2>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-900 text-white rounded">Reiniciar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 3. WRAPPERS DE RUTAS
// ==========================================

const ProtectedAdminRoute = ({ user, children }) => {
  const toast = useToast();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PublicRoute = ({ user, children }) => {
  return user ? <Navigate to="/" replace /> : children;
};

const SagaListWrapper = ({ user }) => {
  const navigate = useNavigate();
  const userWithNavigation = {
    ...user,
    onSelectSaga: (saga) => navigate(`/chronicle/${saga.id}`)
  };
  return <SagaList user={userWithNavigation} />;
};

// [CORRECCIÓN CRÍTICA] Recibimos 'user' como prop
const ChronicleRouteWrapper = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sagaData, setSagaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaga = async () => {
      try {
        const response = await fetch(`/api/chronicles/${id}`, { credentials: 'include' });
        
        if (!response.ok) {
           if (response.status === 404) {
             toast.error("La crónica no existe.");
             navigate('/'); 
             return;
           }
           if (response.status === 403) {
             toast.error("No tienes permiso.");
             navigate('/');
             return;
           }
           throw new Error('Error de conexión');
        }

        const data = await response.json();
        setSagaData(data); 

      } catch (error) {
        toast.error("Error al cargar crónica.");
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSaga();
  }, [id, navigate, toast]);

  if (loading) return <LoadingScreen />;
  if (!sagaData) return null;

  // [CORRECCIÓN CRÍTICA] Pasamos 'user' al componente de vista
  return (
    <ChronicleView 
      saga={sagaData.info} 
      initialSections={sagaData.sections} 
      user={user} 
      onBack={() => navigate('/')} 
    />
  );
};

// ==========================================
// 4. APP CONTENT
// ==========================================

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/current_user", { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Error sesión:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: 'include' });
      toast.info("Sesión cerrada.");
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      setUser(null);
      window.location.href = '/login';
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-vtm-texture text-neutral-200 font-sans selection:bg-red-900 selection:text-white">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {user && <Navbar user={user} onLogout={handleLogout} />}

        <main className="container mx-auto px-4 py-8 flex-1">
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={
                <PublicRoute user={user}>
                  <Login setUser={setUser} />
                </PublicRoute>
              } />

              <Route path="/" element={
                user ? <SagaListWrapper user={user} /> : <Navigate to="/login" replace />
              } />
              
              {/* [CORRECCIÓN CRÍTICA] Pasamos 'user' al wrapper */}
              <Route path="/chronicle/:id" element={
                user ? <ChronicleRouteWrapper user={user} /> : <Navigate to="/login" replace />
              } />

              <Route path="/characters" element={user ? <Characters user={user} /> : <Navigate to="/login" replace />} />
              <Route path="/character/:id" element={user ? <CharacterDetail user={user} /> : <Navigate to="/login" replace />} />
              <Route path="/lore" element={user ? <LoreView user={user} /> : <Navigate to="/login" replace />} />
              <Route path="/gallery" element={user ? <GalleryView user={user} /> : <Navigate to="/login" replace />} />

              <Route path="/admin" element={
                <ProtectedAdminRoute user={user}>
                  <MaintenancePanel user={user} />
                </ProtectedAdminRoute>
              } />
              
              <Route path="/admin/permissions" element={
                <ProtectedAdminRoute user={user}>
                  <div className="max-w-4xl mx-auto">
                     <PermissionsManager />
                  </div>
                </ProtectedAdminRoute>
              } />

              <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;