import { setUser } from './state.js';

let isRegisterMode = false;

// Alternar entre Login y Registro
export function toggleMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('login-title');
    const btn = document.getElementById('btn-action');
    const txt = document.getElementById('toggle-text');
    
    if (isRegisterMode) {
        title.innerText = "Nuevo Vástago";
        btn.innerText = "CREAR CUENTA";
        txt.innerText = "Volver al Login";
    } else {
        title.innerText = "VTM 5E";
        btn.innerText = "ENTRAR";
        txt.innerText = "¿No tienes cuenta? Regístrate";
    }
}

// Manejar el botón "ENTRAR"
export async function handleAuth() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();

        if (data.success) {
            if (isRegisterMode) {
                alert(data.message);
                toggleMode(); 
            } else {
                // ÉXITO: Recargamos la página. 
                // Al recargar, main.js arrancará de nuevo y checkSession detectará el usuario.
                location.reload();
            }
        } else {
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (err) { console.error(err); }
}

// Verificar sesión (Solo devuelve true/false, NO toca la pantalla)
export async function checkSession() {
    try {
        // Ocultar visualmente mientras carga
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app-screen');
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'none';

        const res = await fetch('/api/current_user');
        const data = await res.json();
        
        if (data.success) {
            setUser(data.username, data.role);
            return true; // Está logueado
        } else {
            return false; // No está logueado
        }
    } catch (e) {
        return false;
    }
}

export function logout() { window.location.href = '/api/logout'; }