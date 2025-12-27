import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSkull, FaUser, FaLock, FaSpinner } from 'react-icons/fa';

function Login({ setUser }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validación básica
        if (!username.trim() || !password) {
            setError('Por favor completa todos los campos');
            setLoading(false);
            return;
        }

        try {
            const endpoint = isLogin ? '/api/login' : '/api/register';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // IMPORTANTE: Incluir cookies
                body: JSON.stringify({ username: username.trim(), password })
            });

            const data = await response.json();
            console.log('Respuesta del servidor:', data); // Debug

            if (response.ok && data.success) {
                if (isLogin) {
                    // Login exitoso
                    setUser({
                        id: data.id,
                        username: data.username,
                        role: data.role
                    });
                    console.log('Usuario logueado:', data.username, 'Rol:', data.role); // Debug
                    navigate('/');
                } else {
                    // Registro exitoso
                    setError('');
                    alert('Usuario registrado. Ahora puedes iniciar sesión.');
                    setIsLogin(true);
                    setPassword('');
                }
            } else {
                // Error del servidor
                setError(data.message || 'Error en la operación');
            }
        } catch (err) {
            console.error('Error en la petición:', err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = '/auth/google';
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Card principal */}
                <div className="bg-neutral-900 border border-red-900/30 rounded-lg shadow-2xl shadow-red-900/20 overflow-hidden">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-950 to-black p-6 text-center border-b border-red-900/50">
                        <FaSkull className="text-5xl text-red-600 mx-auto mb-3" />
                        <h1 className="text-3xl font-bold text-red-500 font-serif tracking-wider">
                            VTM 5E
                        </h1>
                        <p className="text-gray-400 text-sm mt-2">
                            {isLogin ? 'Accede al Dominio' : 'Únete a la Familia'}
                        </p>
                    </div>

                    {/* Formulario */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Campo Usuario */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <FaUser className="inline mr-2" />
                                    Usuario
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg 
                                             text-gray-200 placeholder-gray-500 
                                             focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/50
                                             transition-all"
                                    placeholder="Ingresa tu usuario"
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>

                            {/* Campo Contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <FaLock className="inline mr-2" />
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg 
                                             text-gray-200 placeholder-gray-500 
                                             focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/50
                                             transition-all"
                                    placeholder="Ingresa tu contraseña"
                                    disabled={loading}
                                    autoComplete={isLogin ? "current-password" : "new-password"}
                                />
                            </div>

                            {/* Mensaje de Error */}
                            {error && (
                                <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Botón Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg
                                         transition-all duration-200 transform hover:scale-[1.02]
                                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                         flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    isLogin ? 'Entrar' : 'Registrarse'
                                )}
                            </button>
                        </form>

                        {/* Divisor */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-neutral-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-neutral-900 text-gray-500">o continúa con</span>
                            </div>
                        </div>

                        {/* Google Login */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-lg
                                     border border-gray-300 transition-all duration-200 transform hover:scale-[1.02]
                                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                     flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>

                        {/* Toggle Login/Register */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setPassword('');
                                }}
                                disabled={loading}
                                className="text-red-500 hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                            >
                                {isLogin 
                                    ? '¿No tienes cuenta? Regístrate aquí' 
                                    : '¿Ya tienes cuenta? Inicia sesión'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nota de pie */}
                <p className="text-center text-gray-600 text-xs mt-6">
                    Vampire: The Masquerade 5th Edition
                </p>
            </div>
        </div>
    );
}

export default Login;