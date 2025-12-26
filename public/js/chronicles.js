import { state, setChronicleId } from './state.js';
import { switchView, convertToBase64 } from './utils.js';

export async function loadSagasHome() {
    try {
        const res = await fetch('/api/chronicles');
        const list = await res.json();
        const container = document.getElementById('view-sagas').querySelector('.row');
        
        const staticCard = `
            <div class="col-md-3 col-sm-6">
                <div class="saga-card">
                   <div class="saga-title text-muted">Nueva Crónica...</div>
                </div>
            </div>`;

        const dynamicCards = list.map(saga => `
            <div class="col-md-3 col-sm-6">
                <div class="saga-card" onclick="window.openChronicle(${saga.id})">
                    <img src="${saga.cover_image || 'https://via.placeholder.com/300'}" class="saga-img">
                    <div class="saga-title">${saga.title}</div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = dynamicCards + staticCard;
    } catch(e) { console.error(e); }
}

export async function openChronicle(id) {
    setChronicleId(id);
    switchView('view-chronicle-detail');

    const res = await fetch(`/api/chronicles/${id}`);
    const data = await res.json();

    document.getElementById('detail-title').innerText = data.info.title;

    // Roster
    const rosterDiv = document.getElementById('detail-roster');
    rosterDiv.innerHTML = data.characters.map(c => {
        let removeBtn = '';
        if (state.role === 'admin') {
            removeBtn = `<div class="btn-remove-char" onclick="window.removeCharFromChronicle(${c.id}, event)">✕</div>`;
        }
        return `
        <div class="char-token" title="${c.name}">
            ${removeBtn}
            <img src="${c.image_url}">
        </div>`;
    }).join('');

    // ... dentro de openChronicle(id) ...

    // C. Secciones de Historia (LÓGICA MEJORADA)
    const contentDiv = document.getElementById('detail-content');
    
    if (data.sections.length === 0) {
        contentDiv.innerHTML = '<p class="text-muted text-center fst-italic mt-5">La historia aún no ha sido escrita...</p>';
    } else {
        // 1. SEPARAMOS LA PRIMERA (Premisa) DEL RESTO (Eventos)
        const [premise, ...timeline] = data.sections;

        // Renderizamos la Premisa (Estilo Grande)
        let html = renderSection(premise, 'story-premise');

        // Renderizamos el resto dentro de un contenedor indentado
        if (timeline.length > 0) {
            html += `<div class="story-timeline">`; // Inicio del contenedor indentado
            html += timeline.map(s => renderSection(s, 'story-event')).join('');
            html += `</div>`;
        }

        contentDiv.innerHTML = html;
    }


    // Controles
    const adminControls = document.getElementById('admin-story-controls');
    const addCharBtn = document.getElementById('btn-add-char');
    if (state.role === 'admin') {
        adminControls.style.display = 'block';
        addCharBtn.style.display = 'block';
    } else {
        adminControls.style.display = 'none';
        addCharBtn.style.display = 'none';
    }
}

export async function addStorySection() {
    const title = document.getElementById('new-section-title').value;
    const text = document.getElementById('new-section-text').value;
    const fileInput = document.getElementById('new-section-file');
    const urlInput = document.getElementById('new-section-url');
    
    let finalImg = urlInput.value;
    if (fileInput.files.length > 0) finalImg = await convertToBase64(fileInput.files[0]);

    await fetch(`/api/chronicles/${state.currentChronicleId}/sections`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, content: text, image_url: finalImg })
    });
    openChronicle(state.currentChronicleId);
    
    document.getElementById('new-section-title').value = '';
    document.getElementById('new-section-text').value = '';
}

export async function removeCharFromChronicle(charId, event) {
    event.stopPropagation(); 
    if (!confirm("¿Sacar a este personaje de esta crónica?")) return;
    await fetch(`/api/chronicles/${state.currentChronicleId}/roster/${charId}`, { method: 'DELETE' });
    openChronicle(state.currentChronicleId); 
}

export async function deleteStorySection(sectionId) {
    if (!confirm("¿Eliminar este evento?")) return;
    await fetch(`/api/chronicles/sections/${sectionId}`, { method: 'DELETE' });
    openChronicle(state.currentChronicleId);
}

export function openEditStory(id, title, imgUrl) {
    document.getElementById('edit-section-id').value = id;
    document.getElementById('edit-section-title').value = title;
    const rawContent = document.getElementById(`raw-content-${id}`).innerText;
    document.getElementById('edit-section-content').value = rawContent;
    document.getElementById('edit-section-old-img').value = imgUrl;
    
    const modal = new bootstrap.Modal(document.getElementById('edit-story-modal'));
    modal.show();
}

export async function submitEditStory() {
    const id = document.getElementById('edit-section-id').value;
    const title = document.getElementById('edit-section-title').value;
    const content = document.getElementById('edit-section-content').value;
    const fileInput = document.getElementById('edit-section-file');
    const urlInput = document.getElementById('edit-section-url');
    const oldImg = document.getElementById('edit-section-old-img').value;
    
    let finalImg = oldImg;
    if (fileInput.files.length > 0) {
        finalImg = await convertToBase64(fileInput.files[0]);
    } else if (urlInput.value) {
        finalImg = urlInput.value;
    }

    await fetch(`/api/chronicles/sections/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title, content, image_url: finalImg })
    });

    document.querySelector('#edit-story-modal .btn-close').click();
    openChronicle(state.currentChronicleId);
}

export async function openRosterModal() {
    const res = await fetch('/api/characters');
    const data = await res.json();
    const allChars = [...data.pcs, ...data.npcs];
    
    const select = document.getElementById('roster-select');
    select.innerHTML = allChars.map(c => `<option value="${c.id}">${c.name} (${c.clan})</option>`).join('');
    
    const modal = new bootstrap.Modal(document.getElementById('roster-modal'));
    modal.show();
}

export async function addToRoster() {
    const charId = document.getElementById('roster-select').value;
    await fetch(`/api/chronicles/${state.currentChronicleId}/join`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ character_id: charId })
    });
    document.querySelector('#roster-modal .btn-close').click();
    openChronicle(state.currentChronicleId);
}

// Función auxiliar para generar el HTML de una sección
function renderSection(s, cssClass) {
    let adminBtns = '';
    
    // Verificamos rol desde el estado (importado de state.js)
    // Asegúrate de tener: import { state } from './state.js'; al principio
    if (state.role === 'admin') {
        const safeTitle = s.title.replace(/'/g, "\\'");
        adminBtns = `
            <div class="story-controls">
                <button class="btn btn-sm btn-outline-info me-2" onclick="window.openEditStory(${s.id}, '${safeTitle}', '${s.image_url}')">Editar</button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteStorySection(${s.id})">Borrar</button>
                <div style="display:none" id="raw-content-${s.id}">${s.content}</div>
            </div>
        `;
    }

    return `
    <div class="${cssClass} fade-in">
        <div class="story-img-container">
            <img src="${s.image_url}" class="img-fluid" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="story-text w-100">
            <div class="story-title">${s.title}</div>
            <div id="display-content-${s.id}" style="white-space: pre-wrap;">${s.content}</div> ${adminBtns}
        </div>
    </div>`;
}