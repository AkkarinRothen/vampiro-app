// --- VARIABLES GLOBALES ---
let currentUserRole = null;
let currentUsername = null;
let isRegisterMode = false;

// --- 1. GESTIÓN DE SESIÓN Y VISTAS ---

async function checkSession() {
    try {
        // Al cargar, ocultamos todo para evitar parpadeo
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('app-screen');
        
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'none';

        const res = await fetch('/api/current_user');
        const data = await res.json();
        
        if (data.success) {
            // YA LOGUEADO
            currentUserRole = data.role;
            currentUsername = data.username;
            showApp(); 
        } else {
            // NO LOGUEADO -> Mostrar Login
            if(loginScreen) loginScreen.style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

function showApp() {
    // Ocultar login, mostrar app
    document.getElementById('login-screen').style.display = 'none'; 
    document.getElementById('app-screen').style.display = 'block';
    
    // Actualizar UI
    const userDisplay = document.getElementById('user-display');
    if(userDisplay) userDisplay.innerText = `${currentUsername}`;
    
    // Cargar datos
    loadCharacters();
    if(currentUserRole === 'admin') loadGraveyard();
loadSagasHome(); // <--- AGREGAR ESTO PARA QUE CARGUE LAS CARTAS DESDE LA DB
    // Ir al Home
    switchView('view-sagas');
}

function switchView(viewId, navElement) {
    // Ocultar todas las secciones
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    // Mostrar la elegida
    const view = document.getElementById(viewId);
    if(view) view.style.display = 'block';

    // Actualizar clase active en el menú
    if (navElement) {
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        navElement.classList.add('active');
    }
}

// --- 2. LOGIN Y REGISTRO ---

function toggleMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('login-title');
    const btn = document.getElementById('btn-action');
    const txt = document.getElementById('toggle-text');
    
    if (isRegisterMode) {
        title.innerText = "Nuevo Vástago"; // Cambiamos texto
        btn.innerText = "CREAR CUENTA";
        txt.innerText = "Volver al Login";
    } else {
        title.innerText = "VTM 5E"; 
        btn.innerText = "ENTRAR";
        txt.innerText = "¿No tienes cuenta? Regístrate";
    }
}

async function handleAuth() {
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
                toggleMode(); // Volver a login
            } else {
                // Login exitoso -> Forzar recarga para limpiar estado
                location.reload();
            }
        } else {
            errorMsg.innerText = data.message;
            errorMsg.style.display = 'block';
        }
    } catch (err) { console.error(err); }
}

function logout() { window.location.href = '/api/logout'; }

// --- 3. LÓGICA DE DATOS (CRUD) ---

// Helper para convertir archivo a Base64
const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

async function saveCharacter() {
    const fileInput = document.getElementById('image_file');
    const urlInput = document.getElementById('image_url');
    let finalImage = '';

    // Procesar imagen (Archivo > URL)
    if (fileInput.files.length > 0) {
        try { finalImage = await convertToBase64(fileInput.files[0]); } 
        catch (e) { alert("Error procesando imagen"); return; }
    } else {
        finalImage = urlInput.value;
    }

    const char = {
        name: document.getElementById('name').value,
        clan: document.getElementById('clan').value,
        generation: document.getElementById('gen').value,
        type: document.getElementById('type').value,
        image_url: finalImage
    };

    if(!char.name) { alert("Ponle un nombre al vástago."); return; }

    try {
        await fetch('/api/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(char)
        });
        
        // Limpiar y redirigir a la lista
        document.getElementById('name').value = '';
        document.getElementById('image_file').value = '';
        document.getElementById('image_url').value = '';
        
        loadCharacters();
        // Opcional: Llevar al usuario a ver su personaje creado
        switchView('view-list', document.querySelectorAll('.nav-link')[2]);
        alert("Personaje creado exitosamente.");
    } catch (err) { console.error(err); }
}

async function loadCharacters() {
    const res = await fetch('/api/characters');
    const data = await res.json();
    renderList('pc-list', data.pcs, 'info');
    renderList('npc-list', data.npcs, 'warning');
}

function renderList(elementId, list, color) {
    document.getElementById(elementId).innerHTML = list.map(char => {
        const image = char.image_url || 'https://i.pinimg.com/564x/0d/1b/9d/0d1b9d233499119bb9df387033500204.jpg';
        
        let deleteBtn = '';
        if (currentUserRole === 'admin' || char.created_by === currentUsername) {
            deleteBtn = `<button onclick="deleteCharacter(${char.id})" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 shadow" style="z-index: 10;">✕</button>`;
        }

        return `
        <div class="col-md-6 col-lg-4">
            <div class="card bg-dark border border-secondary h-100 position-relative overflow-hidden">
                ${deleteBtn}
                <div class="row g-0 h-100">
                    <div class="col-5">
                        <img src="${image}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                    </div>
                    <div class="col-7">
                        <div class="card-body py-2 px-3">
                            <h5 class="card-title text-${color} text-truncate mb-1">${char.name}</h5>
                            <h6 class="card-subtitle text-muted mb-2 small">${char.clan}</h6>
                            <p class="card-text small mb-1">Gen: ${char.generation}</p>
                            <div class="small text-secondary fst-italic mt-2" style="font-size: 0.7rem;">
                                Jugador: ${char.created_by || '?'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function deleteCharacter(id) {
    if (!confirm("¿Enviar al cementerio?")) return;
    await fetch(`/api/characters/${id}`, { method: 'DELETE' });
    loadCharacters();
    if(currentUserRole === 'admin') loadGraveyard();
}

// --- 4. CEMENTERIO (ADMIN) ---
async function loadGraveyard() {
    const res = await fetch('/api/graveyard');
    const list = await res.json();
    const graveyardSection = document.getElementById('graveyard-section');
    if(graveyardSection) graveyardSection.style.display = list.length ? 'block' : 'none';
    
    document.getElementById('graveyard-list').innerHTML = list.map(c => `
        <div class="col-6 col-md-3">
            <div class="card bg-secondary text-white opacity-50 p-2 text-center">
                <small>${c.name}</small>
                <button onclick="restore(${c.id})" class="btn btn-success btn-sm py-0 mt-1" style="font-size:0.7rem">Revivir</button>
            </div>
        </div>
    `).join('');
}
async function restore(id) {
    await fetch(`/api/restore/${id}`, { method: 'PUT' });
    loadCharacters();
    loadGraveyard();
}
// --- SISTEMA DE CRÓNICAS DINÁMICAS ---

let currentChronicleId = null;

// 1. Cargar la lista de Sagas en el HOME (Reemplaza las cartas estáticas)
async function loadSagasHome() {
    try {
        const res = await fetch('/api/chronicles');
        const list = await res.json();
        
        const container = document.getElementById('view-sagas').querySelector('.row');
        // Mantenemos la carta de "Nueva Crónica" si quieres, o limpiamos todo
        container.innerHTML = list.map(saga => `
            <div class="col-md-3 col-sm-6">
                <div class="saga-card" onclick="openChronicle(${saga.id})">
                    <img src="${saga.cover_image || 'https://via.placeholder.com/300'}" class="saga-img">
                    <div class="saga-title">${saga.title}</div>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

// 2. Abrir el DETALLE (La vista nueva)
async function openChronicle(id) {
    currentChronicleId = id;
    switchView('view-chronicle-detail'); // Cambiamos vista

    const res = await fetch(`/api/chronicles/${id}`);
    const data = await res.json();

    // A. Poner Título
    document.getElementById('detail-title').innerText = data.info.title;

    // B. Poner Personajes (Círculos)
    const rosterDiv = document.getElementById('detail-roster');
    rosterDiv.innerHTML = data.characters.map(c => `
        <div class="char-token" title="${c.name} (${c.clan})">
            <img src="${c.image_url}">
        </div>
    `).join('');

    // C. Poner Secciones de Historia
    const contentDiv = document.getElementById('detail-content');
    contentDiv.innerHTML = data.sections.map(s => `
        <div class="story-section fade-in">
            <div class="story-img-container">
                <img src="${s.image_url}">
            </div>
            <div class="story-text">
                <div class="story-title">${s.title}</div>
                ${s.content.replace(/\n/g, '<br>')}
            </div>
        </div>
    `).join('');

    // D. Mostrar controles de Admin si corresponde
    const adminControls = document.getElementById('admin-story-controls');
    const addCharBtn = document.getElementById('btn-add-char');
    
    if (currentUserRole === 'admin') {
        adminControls.style.display = 'block';
        addCharBtn.style.display = 'block';
    } else {
        adminControls.style.display = 'none';
        addCharBtn.style.display = 'none';
    }
}

// 3. Agregar Sección de Historia (Admin)
async function addStorySection() {
    const title = document.getElementById('new-section-title').value;
    const text = document.getElementById('new-section-text').value;
    const fileInput = document.getElementById('new-section-file');
    const urlInput = document.getElementById('new-section-url');
    
    let finalImg = urlInput.value;
    if (fileInput.files.length > 0) {
        finalImg = await convertToBase64(fileInput.files[0]);
    }

    await fetch(`/api/chronicles/${currentChronicleId}/sections`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, content: text, image_url: finalImg })
    });

    // Recargar para ver cambios
    openChronicle(currentChronicleId);
    
    // Limpiar inputs
    document.getElementById('new-section-title').value = '';
    document.getElementById('new-section-text').value = '';
    document.getElementById('new-section-url').value = '';
}

// 4. Modal para agregar personajes
async function openRosterModal() {
    // Cargar todos los personajes disponibles para elegir
    const res = await fetch('/api/characters');
    const data = await res.json();
    const allChars = [...data.pcs, ...data.npcs];
    
    const select = document.getElementById('roster-select');
    select.innerHTML = allChars.map(c => `<option value="${c.id}">${c.name} (${c.clan})</option>`).join('');
    
    const modal = new bootstrap.Modal(document.getElementById('roster-modal'));
    modal.show();
}

async function addToRoster() {
    const charId = document.getElementById('roster-select').value;
    await fetch(`/api/chronicles/${currentChronicleId}/join`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ character_id: charId })
    });
    // Cerrar modal y recargar
    document.querySelector('#roster-modal .btn-close').click();
    openChronicle(currentChronicleId);
}
// INICIAR
checkSession();