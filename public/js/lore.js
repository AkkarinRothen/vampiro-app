import { state, setLoreData } from './state.js';
import { loadCharacters } from './characters.js';

export function showLoreForm() { document.getElementById('lore-form-card').style.display = 'block'; }
export function hideLoreForm() { document.getElementById('lore-form-card').style.display = 'none'; }

export async function loadLore() {
    try {
        const res = await fetch('/api/lore');
        const list = await res.json();
        setLoreData(list);
        
        const container = document.getElementById('lore-list');
        if(!container) return;
        
        container.innerHTML = list.map(item => `
            <a href="#" onclick="window.readLore(${item.id})" class="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex justify-content-between align-items-center">
                <div>
                    <strong class="text-warning">${item.title}</strong><br>
                    <small class="text-muted" style="font-size:0.7em">${item.category}</small>
                </div>
                <span class="text-blood">➤</span>
            </a>
        `).join('');
    } catch (e) { console.error(e); }
}

export function readLore(id) {
    const item = state.loreData.find(i => i.id === id);
    if (!item) return;

    const formattedContent = item.content.replace(/\n/g, '<br>');
    let deleteBtn = '';
    if (state.role === 'admin') {
        deleteBtn = `<button onclick="window.deleteLore(${item.id})" class="btn btn-sm btn-outline-danger mt-4">Quemar Archivo</button>`;
    }

    const reader = document.getElementById('lore-reader');
    reader.innerHTML = `
        <h2 class="text-blood border-bottom border-secondary pb-2">${item.title}</h2>
        <div class="mb-3 text-muted fst-italic small">Categoría: ${item.category}</div>
        <div class="mt-4" style="font-family: 'Playfair Display', serif; font-size: 1.1rem; line-height: 1.6;">
            ${formattedContent}
        </div>
        ${deleteBtn}
    `;
}

export async function saveLore() {
    const title = document.getElementById('lore-title').value;
    const cat = document.getElementById('lore-cat').value;
    const content = document.getElementById('lore-content').value;

    if (!title || !content) return alert("El archivo está vacío.");

    await fetch('/api/lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category: cat, content })
    });

    document.getElementById('lore-title').value = '';
    document.getElementById('lore-content').value = '';
    hideLoreForm();
    loadLore();
}

export async function deleteLore(id) {
    if(!confirm("¿Destruir este documento permanentemente?")) return;
    await fetch(`/api/lore/${id}`, { method: 'DELETE' });
    loadLore();
    document.getElementById('lore-reader').innerHTML = '<p class="text-muted text-center mt-5">Documento eliminado.</p>';
}

export async function loadGraveyard() {
    const res = await fetch('/api/graveyard');
    const list = await res.json();
    const section = document.getElementById('graveyard-section');
    if(section) section.style.display = list.length ? 'block' : 'none';
    
    document.getElementById('graveyard-list').innerHTML = list.map(c => `
        <div class="col-6 col-md-3">
            <div class="card bg-secondary text-white opacity-50 p-2 text-center">
                <small>${c.name}</small>
                <button onclick="window.restore(${c.id})" class="btn btn-success btn-sm py-0 mt-1" style="font-size:0.7rem">Revivir</button>
            </div>
        </div>
    `).join('');
}

export async function restore(id) {
    await fetch(`/api/restore/${id}`, { method: 'PUT' });
    loadCharacters();
    loadGraveyard();
}