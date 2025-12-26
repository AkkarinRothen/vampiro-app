// ==========================================
// ARCHIVO: public/js/lore.js
// ==========================================

import { state, setLoreData } from './state.js';
import { loadCharacters } from './characters.js';

/**
 * Muestra el formulario de lore (crear o editar)
 */
export function showLoreForm(editItem = null) { 
    const formCard = document.getElementById('lore-form-card');
    formCard.style.display = 'block';
    
    if (editItem) {
        // MODO EDICIÓN
        document.getElementById('lore-id').value = editItem.id;
        document.getElementById('lore-title').value = editItem.title;
        document.getElementById('lore-cat').value = editItem.category;
        document.getElementById('lore-content').value = editItem.content;
    } else {
        // MODO CREACIÓN
        document.getElementById('lore-id').value = '';
        document.getElementById('lore-title').value = '';
        document.getElementById('lore-cat').value = 'Sesión';
        document.getElementById('lore-content').value = '';
    }
}

/**
 * Oculta el formulario de lore
 */
export function hideLoreForm() { 
    document.getElementById('lore-form-card').style.display = 'none';
    
    // Limpiar formulario
    document.getElementById('lore-id').value = '';
    document.getElementById('lore-title').value = '';
    document.getElementById('lore-content').value = '';
}

/**
 * Carga y muestra la lista de archivos de lore
 */
export async function loadLore() {
    try {
        const res = await fetch('/api/lore');
        const list = await res.json();
        setLoreData(list);
        
        const container = document.getElementById('lore-list');
        if (!container) return;
        
        container.innerHTML = list.map(item => {
            // Icono según categoría
            const icon = item.category === 'Sesión' ? '📖' : 
                        item.category === 'Carta' ? '✉️' : '📜';
            
            return `
            <a href="#" 
               data-action="readLore" 
               data-params='[${item.id}]'
               class="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex justify-content-between align-items-center">
                <div>
                    <strong class="text-warning">${icon} ${item.title}</strong><br>
                    <small class="text-muted" style="font-size:0.7em">${item.category}</small>
                </div>
                <span class="text-blood">➤</span>
            </a>
        `}).join('');
        
    } catch (error) {
        console.error('Error al cargar lore:', error);
    }
}

/**
 * Muestra un archivo de lore específico en el lector
 */
export function readLore(id) {
    const item = state.loreData.find(i => i.id === id);
    if (!item) {
        console.error(`Lore con ID ${id} no encontrado`);
        return;
    }

    // Formatear saltos de línea
    const formattedContent = item.content.replace(/\n/g, '<br>');
    
    // Controles de admin
    let controls = '';
    if (state.role === 'admin') {
        controls = `
            <div class="mt-4 border-top border-secondary pt-3 text-end">
                <button data-action="prepareEditLore" 
                        data-params='[${item.id}]'
                        class="btn btn-sm btn-outline-info me-2"
                        title="Editar documento">
                    ✏️ Editar
                </button>
                <button data-action="deleteLore" 
                        data-params='[${item.id}]'
                        class="btn btn-sm btn-outline-danger"
                        title="Eliminar documento">
                    🔥 Quemar
                </button>
            </div>`;
    }

    const reader = document.getElementById('lore-reader');
    reader.innerHTML = `
        <h2 class="text-blood border-bottom border-secondary pb-2">
            ${item.title}
        </h2>
        <div class="mb-3 text-muted fst-italic small">
            Categoría: ${item.category}
        </div>
        <div class="mt-4" style="font-family: 'Playfair Display', serif; font-size: 1.1rem; line-height: 1.6;">
            ${formattedContent}
        </div>
        ${controls}
    `;
}

/**
 * Prepara el formulario para editar un lore existente
 */
export function prepareEditLore(id) {
    const item = state.loreData.find(i => i.id === id);
    if (!item) {
        console.error(`Lore con ID ${id} no encontrado`);
        return;
    }
    
    showLoreForm(item);
    
    // Scroll al formulario para mejor UX
    document.getElementById('lore-form-card').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
}

/**
 * Guarda un archivo de lore (crear o editar)
 */
export async function saveLore() {
    const id = document.getElementById('lore-id').value;
    const title = document.getElementById('lore-title').value;
    const cat = document.getElementById('lore-cat').value;
    const content = document.getElementById('lore-content').value;

    // Validación
    if (!title || !content) {
        alert("El archivo está vacío. Completa título y contenido.");
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/lore/${id}` : '/api/lore';

    try {
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category: cat, content })
        });

        // Cerrar formulario y recargar
        hideLoreForm();
        await loadLore();
        
        // Si estábamos editando, volver a mostrar el lector actualizado
        if (id) {
            readLore(parseInt(id));
        }
        
        // Feedback al usuario
        const action = id ? 'actualizado' : 'creado';
        console.log(`Documento ${action} correctamente`);
        
    } catch (error) {
        console.error('Error al guardar lore:', error);
        alert('Error al guardar el documento. Intenta de nuevo.');
    }
}

/**
 * Elimina un archivo de lore
 */
export async function deleteLore(id) {
    if (!confirm("¿Destruir este documento permanentemente?")) return;
    
    try {
        await fetch(`/api/lore/${id}`, { method: 'DELETE' });
        
        // Recargar lista
        await loadLore();
        
        // Mostrar mensaje en el lector
        const reader = document.getElementById('lore-reader');
        reader.innerHTML = `
            <div class="text-center text-muted mt-5">
                <h1 style="opacity: 0.2">🔥</h1>
                <p>Documento eliminado.</p>
            </div>`;
        
    } catch (error) {
        console.error('Error al eliminar lore:', error);
        alert('Error al eliminar el documento.');
    }
}

/**
 * Carga los personajes eliminados (solo admin)
 */
export async function loadGraveyard() {
    try {
        const res = await fetch('/api/graveyard');
        const list = await res.json();
        
        const section = document.getElementById('graveyard-section');
        if (section) {
            section.style.display = list.length ? 'block' : 'none';
        }
        
        const graveyardList = document.getElementById('graveyard-list');
        if (!graveyardList) return;
        
        graveyardList.innerHTML = list.map(c => `
            <div class="col-6 col-md-3">
                <div class="card bg-secondary text-white opacity-50 p-2 text-center">
                    <small class="mb-2" title="${c.name}">
                        ⚰️ ${c.name}
                    </small>
                    <small class="text-muted mb-2" style="font-size: 0.7rem">
                        ${c.clan}
                    </small>
                    <button data-action="restore" 
                            data-params='[${c.id}]'
                            class="btn btn-success btn-sm py-0 mt-1" 
                            style="font-size:0.7rem"
                            title="Revivir personaje">
                        🧛 Revivir
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error al cargar cementerio:', error);
    }
}

/**
 * Restaura un personaje del cementerio
 */
export async function restore(id) {
    if (!confirm("¿Resucitar este vástago?")) return;
    
    try {
        await fetch(`/api/restore/${id}`, { method: 'PUT' });
        
        // Recargar ambas listas
        loadCharacters();
        loadGraveyard();
        
        console.log('Personaje restaurado correctamente');
        
    } catch (error) {
        console.error('Error al restaurar personaje:', error);
        alert('Error al restaurar el personaje.');
    }
}