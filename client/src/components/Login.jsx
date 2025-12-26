import { useState } from 'react';

function Login({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegister ? '/api/register' : '/api/login';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                if (isRegister) {
                    alert(data.message);
                    setIsRegister(false); // Volver al login tras registro
                } else {
                    // ¡Éxito! Avisamos a App.jsx pasando los datos del usuario
                    onLoginSuccess({ username: data.username, role: data.role });
                }
            } else {
                setError(data.message || 'Error de autenticación');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        }
    };

    return (
        <div id="login-screen" className="d-flex justify-content-center align-items-center" 
             style={{height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 1000}}>
            <div className="card bg-dark text-white p-4 shadow-lg" style={{width: '380px'}}>
                <div className="text-center mb-4">
                    <h2 className="text-danger fw-bold">VTM 5E</h2>
                    <small className="text-muted">{isRegister ? 'Nuevo Vástago' : 'Gestor de Crónica'}</small>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <input type="text" className="form-control" placeholder="Usuario" 
                               value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                        <input type="password" className="form-control" placeholder="Contraseña" 
                               value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {error && <p className="text-danger small text-center">{error}</p>}
                    
                    <button type="submit" className="btn btn-danger w-100 fw-bold">
                        {isRegister ? 'CREAR CUENTA' : 'ENTRAR'}
                    </button>
                </form>

                <div className="mt-3 text-center">
                    <button className="btn btn-link text-secondary text-decoration-none btn-sm" 
                            onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                        {isRegister ? '¿Ya tienes cuenta? Volver' : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;