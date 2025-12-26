import { state, setUser } from './state.js';
import { loadAllData, showApp } from './main.js'; // Referencia circular manejada

let isRegisterMode = false;

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
                location.reload();
            }
        } else {
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (err) { console.error(err); }
}

export async function checkSession() {
    try {
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app-screen');
        
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'none';

        const res = await fetch('/api/current_user');
        const data = await res.json();
        
        if (data.success) {
            setUser(data.username, data.role);
            showApp(); 
        } else {
            if(loginScreen) loginScreen.style.display = 'flex';
        }
    } catch (e) {
        if(document.getElementById('login-screen')) 
            document.getElementById('login-screen').style.display = 'flex';
    }
}

export function logout() { window.location.href = '/api/logout'; }