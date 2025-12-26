import { state, setChronicleId } from './state.js';
import { switchView, convertToBase64 } from './utils.js';

// 1. CARGAR SAGAS (Con controles de Admin)
// 1. CARGAR SAGAS (CORREGIDO: Sin stopPropagation)
export async function loadSagasHome() {
    try {
        const res = await fetch('/api/chronicles');
        const list = await res.json();
        
        // Guardamos en el estado para usarlo al editar
        if (typeof setSagas === 'function') {
            setSagas(list);
        }
        
        const container = document.getElementById('view-sagas').querySelector('.row');
        
        // Tarjeta de "Nueva Crónica"
        let createCard = '';
        if (state.role === 'admin') {
            createCard = `
            <div class="col-md-3 col-sm-6">
                <div class="saga-card d-flex align-items-center justify-content-center" 
                     data-action="openChronicleModal"
                     data-params='[]'
                     style="border: 2px dashed #444; cursor: pointer;">
                   <div class="text-center text-muted" style="pointer-events: none;">
                        <h1 class="m-0">+</h1>
                        <small>Nueva Crónica</small>
                   </div>
                </div>
            </div>`;
        }

        const dynamicCards = list.map(saga => {
            let adminActions = '';
            
            if (state.role === 'admin') {
                // CORRECCIÓN AQUÍ: Quitamos 'onclick="event.stopPropagation();"'
                // El sistema de delegation de main.js se encarga de detectar el botón correcto.
                adminActions = `
                <div style="position:absolute; top:10px; right:10px; z-index:20;">
                    <button class="btn btn-sm btn-dark border border-secondary" 
                        data-action="openChronicleModal" 
                        data-params='[${saga.id}]' 
                        title="Editar crónica">✏️</button>
                    <button class="btn btn-sm btn-danger" 
                        data-action="deleteChronicle" 
                        data-params='[${saga.id}]'
                        title="Eliminar crónica">🗑️</button>
                </div>`;
            }

            return `
            <div class="col-md-3 col-sm-6">
                <div class="saga-card position-relative" 
                     data-action="openChronicle" 
                     data-params='[${saga.id}]'
                     style="cursor: pointer;">
                    ${adminActions}
                    <img src="${saga.cover_image || 'https://via.placeholder.com/300'}" 
                         class="saga-img"
                         alt="${saga.title}">
                    <div class="saga-title">${saga.title}</div>
                </div>
            </div>`;
        }).join('');
        
        container.innerHTML = dynamicCards + createCard;
    } catch(e) { 
        console.error('Error al cargar sagas:', e); 
    }
}

// 2. ABRIR CRÓNICA (Detalle)
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
            removeBtn = `
                <div class="btn-remove-char" 
                     data-action="removeCharFromChronicle" 
                     data-params='[${c.id}]'
                     style="cursor: pointer;">✕</div>`;
        }
        return `
        <div class="char-token" title="${c.name}">
            ${removeBtn}
            <img src="${c.image_url}" alt="${c.name}">
        </div>`;
    }).join('');

    // Secciones de Historia
    const contentDiv = document.getElementById('detail-content');
    
    if (data.sections.length === 0) {
        contentDiv.innerHTML = '<p class="text-muted text-center fst-italic mt-5">La historia aún no ha sido escrita...</p>';
    } else {
        // Separamos Premisa de Timeline
        const [premise, ...timeline] = data.sections;

        let html = renderSection(premise, 'story-premise');

        if (timeline.length > 0) {
            html += `<div class="story-timeline">`;
            html += timeline.map(s => renderSection(s, 'story-event')).join('');
            html += `</div>`;
        }
        contentDiv.innerHTML = html;
    }

    // Controles Admin
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

// 3. AUXILIAR PARA RENDERIZAR SECCIONES
function renderSection(s, cssClass) {
    const safeTitle = s.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const safeImg = (s.image_url || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
    let adminBtns = '';
    if (state.role === 'admin') {
        adminBtns = `
            <div class="story-controls">
                <button class="btn btn-sm btn-outline-info me-2" 
                        data-action="openEditStory" 
                        data-params='[${s.id}, "${safeTitle}", "${safeImg}"]'>Editar</button>
                <button class="btn btn-sm btn-outline-danger" 
                        data-action="deleteStorySection" 
                        data-params='[${s.id}]'>Borrar</button>
                <div style="display:none" id="raw-content-${s.id}">${s.content}</div>
            </div>
        `;
    }

    return `
    <div class="${cssClass} fade-in">
        <div class="story-img-container">
            <img src="${s.image_url}" class="img-fluid" style="width:100%; height:100%; object-fit:cover;" alt="${s.title}">
        </div>
        <div class="story-text w-100">
            <div class="story-title">${s.title}</div>
            <div id="display-content-${s.id}" style="white-space: pre-wrap;">${s.content}</div> 
            ${adminBtns}
        </div>
    </div>`;
}

// 4. FUNCIONES DE MODALES Y ACCIONES

/**
 * Abre el modal de crear/editar crónica
 * @param {number|null} id - ID de la crónica (null para crear nueva)
 * @param {string} title - Título de la crónica
 * @param {string} img - URL de la imagen
 */
export function openChronicleModal(id = null, title = '', img = '') {
    console.log('openChronicleModal llamado:', { id, title, img }); // Debug
    
    const modalTitle = document.getElementById('chronicle-modal-title');
    const modalElement = document.getElementById('chronicle-modal');
    
    if (!modalElement) {
        console.error('Modal #chronicle-modal no encontrado en el DOM');
        return;
    }
    
    // Limpiar y establecer valores
    document.getElementById('chronicle-id').value = id || '';
    document.getElementById('chronicle-title').value = title || '';
    document.getElementById('chronicle-old-img').value = img || '';
    document.getElementById('chronicle-url').value = '';
    document.getElementById('chronicle-file').value = '';

    modalTitle.innerText = id ? "Editar Crónica" : "Nueva Crónica";
    
    // Mostrar preview de imagen actual si existe
    const previewDiv = document.getElementById('chronicle-img-preview');
    if (previewDiv && img) {
        previewDiv.innerHTML = `
            <div class="mb-2">
                <small class="text-muted">Imagen actual:</small><br>
                <img src="${img}" class="img-thumbnail mt-1" style="max-width: 200px; max-height: 150px;">
            </div>`;
    } else if (previewDiv) {
        previewDiv.innerHTML = '';
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

export async function submitChronicleForm() {
    const id = document.getElementById('chronicle-id').value;
    const title = document.getElementById('chronicle-title').value.trim();
    const fileInput = document.getElementById('chronicle-file');
    const urlInput = document.getElementById('chronicle-url');
    const oldImg = document.getElementById('chronicle-old-img').value;

    if (!title) {
        alert("El título es obligatorio");
        return;
    }

    let finalImg = oldImg;
    
    // Prioridad: archivo subido > URL nueva > imagen antigua
    if (fileInput.files.length > 0) {
        try {
            finalImg = await convertToBase64(fileInput.files[0]);
        } catch (error) {
            console.error('Error al convertir imagen:', error);
            alert('Error al procesar la imagen. Intenta con otra.');
            return;
        }
    } else if (urlInput.value.trim()) {
        finalImg = urlInput.value.trim();
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/chronicles/${id}` : '/api/chronicles';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, cover_image: finalImg })
        });
        
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        // Cerrar modal
        const modalElement = document.getElementById('chronicle-modal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        // Recargar lista
        await loadSagasHome();
        
        // Feedback
        const action = id ? 'actualizada' : 'creada';
        console.log(`Crónica ${action} correctamente`);
        
    } catch (error) {
        console.error('Error al guardar crónica:', error);
        alert('Error al guardar la crónica. Intenta de nuevo.');
    }
}

export async function deleteChronicle(id) {
    if(!confirm("⚠️ ¿ADVERTENCIA: Esto borrará la crónica y TODA su historia escrita?")) return;
    
    try {
        const response = await fetch(`/api/chronicles/${id}`, { method: 'DELETE' });
        
        if (!response.ok) {
            throw new Error('Error al eliminar crónica');
        }
        
        await loadSagasHome();
        console.log('Crónica eliminada correctamente');
        
    } catch (error) {
        console.error('Error al eliminar crónica:', error);
        alert('Error al eliminar la crónica. Intenta de nuevo.');
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

export async function removeCharFromChronicle(charId) {
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