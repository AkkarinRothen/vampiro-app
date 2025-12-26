// ==========================================
// ARCHIVO: public/js/characters.js
// ==========================================

import { state } from './state.js';
import { convertToBase64 } from './utils.js';

// Datos estáticos de V5
const VTM_DATA = {
    clans: {
        "Banu Haqim": ["Celeridad", "Hechicería de Sangre", "Ofuscación"],
        "Brujah": ["Celeridad", "Potencia", "Presencia"],
        "Gangrel": ["Animalismo", "Fortaleza", "Protean"],
        "Hecata": ["Auspex", "Fortaleza", "Olvido"],
        "Lasombra": ["Dominación", "Olvido", "Potencia"],
        "Malkavian": ["Auspex", "Dominación", "Ofuscación"],
        "Ministerio": ["Ofuscación", "Presencia", "Protean"],
        "Nosferatu": ["Animalismo", "Ofuscación", "Potencia"],
        "Ravnos": ["Animalismo", "Ofuscación", "Presencia"],
        "Salubri": ["Auspex", "Dominación", "Fortaleza"],
        "Toreador": ["Auspex", "Celeridad", "Presencia"],
        "Tremere": ["Auspex", "Dominación", "Hechicería de Sangre"],
        "Tzimisce": ["Animalismo", "Dominación", "Protean"],
        "Ventrue": ["Dominación", "Fortaleza", "Presencia"],
        "Caitiff": [], 
        "Sangre Débil": ["Alquimia de Sangre Débil"]
    },
    all_disciplines: [
        "Animalismo", "Auspex", "Celeridad", "Dominación", "Fortaleza", "Ofuscación", 
        "Potencia", "Presencia", "Protean", "Hechicería de Sangre", "Olvido", "Alquimia de Sangre Débil"
    ],
    predator_types: [
        "Callejero", "Consensualista", "Granjero", "Osiris", "Sandman", 
        "Sirena", "Escena", "Sanguijuela", "Bolsa de Sangre"
    ]
};

/**
 * Inicializa el formulario de creación de personajes
 */
export function initCharForm() {
    const clanSelect = document.getElementById('clan');
    const predSelect = document.getElementById('predator_type');
    const discContainer = document.getElementById('disciplines-container');
    
    if (!clanSelect) return;

    // Popular select de clanes
    clanSelect.innerHTML = '<option value="">Selecciona Clan...</option>';
    Object.keys(VTM_DATA.clans).forEach(c => {
        clanSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Popular select de tipos de depredador
    predSelect.innerHTML = '<option value="">Tipo de Depredador...</option>';
    VTM_DATA.predator_types.forEach(p => {
        predSelect.innerHTML += `<option value="${p}">${p}</option>`;
    });

    // Popular checkboxes de disciplinas
    discContainer.innerHTML = VTM_DATA.all_disciplines.map(d => `
        <div class="form-check form-check-inline">
            <input class="form-check-input disc-check" type="checkbox" value="${d}" id="disc-${d}">
            <label class="form-check-label small text-muted" for="disc-${d}" id="label-${d}">${d}</label>
        </div>
    `).join('');
}

/**
 * Resalta las disciplinas del clan seleccionado
 */
export function onClanChange() {
    const clan = document.getElementById('clan').value;
    const clanDiscs = VTM_DATA.clans[clan] || [];

    VTM_DATA.all_disciplines.forEach(d => {
        const label = document.getElementById(`label-${d}`);
        if (!label) return;
        
        if (clanDiscs.includes(d)) {
            label.classList.add('text-warning', 'fw-bold');
            label.classList.remove('text-muted');
        } else {
            label.classList.remove('text-warning', 'fw-bold');
            label.classList.add('text-muted');
        }
    });
}

/**
 * Guarda un nuevo personaje o actualiza uno existente
 */
export async function saveCharacter() {
    const fileInput = document.getElementById('image_file');
    const urlInput = document.getElementById('image_url');
    
    // Gestión de imagen
    let finalImage = urlInput.value;
    if (fileInput.files.length > 0) {
        finalImage = await convertToBase64(fileInput.files[0]);
    }

    // Recoger disciplinas seleccionadas
    const selectedDiscs = [];
    document.querySelectorAll('.disc-check:checked').forEach(c => {
        selectedDiscs.push(c.value);
    });

    // Construir objeto del personaje
    const char = {
        name: document.getElementById('name').value,
        clan: document.getElementById('clan').value,
        generation: document.getElementById('gen').value,
        type: document.getElementById('type').value,
        predator_type: document.getElementById('predator_type').value,
        disciplines: selectedDiscs,
        image_url: finalImage
    };

    // Validación básica
    if (!char.name) {
        alert("Falta nombre del vástago");
        return;
    }

    try {
        await fetch('/api/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(char)
        });
        
        // Limpiar formulario
        document.getElementById('name').value = '';
        document.getElementById('gen').value = '';
        document.getElementById('clan').value = '';
        document.getElementById('predator_type').value = '';
        document.getElementById('image_url').value = '';
        document.getElementById('image_file').value = '';
        document.querySelectorAll('.disc-check').forEach(cb => cb.checked = false);
        
        // Recargar lista
        loadCharacters();
        alert("Vástago abrazado correctamente.");
        
    } catch (error) {
        console.error('Error al guardar personaje:', error);
        alert('Error al crear el personaje. Intenta de nuevo.');
    }
}

/**
 * Carga y muestra todos los personajes
 */
export async function loadCharacters() {
    try {
        const res = await fetch('/api/characters');
        const data = await res.json();
        
        renderList('pc-list', data.pcs, 'text-blood');
        renderList('npc-list', data.npcs, 'text-warning');
        
    } catch (error) {
        console.error('Error al cargar personajes:', error);
    }
}

/**
 * Renderiza una lista de personajes en un contenedor específico
 */
function renderList(elementId, list, colorClass) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = list.map(char => {
        const image = char.image_url || 'https://via.placeholder.com/150';
        
        // Parsear disciplinas (viene como JSON string)
        let discs = [];
        try {
            discs = JSON.parse(char.disciplines);
        } catch (e) {
            console.warn(`Error parseando disciplinas para ${char.name}:`, e);
        }
        
        // Badges de disciplinas (solo 3 primeras letras)
        const discBadges = discs.map(d => `
            <span class="badge bg-dark border border-secondary text-secondary me-1" 
                  style="font-size:0.6rem"
                  title="${d}">
                ${d.substring(0, 3)}
            </span>
        `).join('');

        // Botón de eliminar (solo para admin o creador)
        let deleteBtn = '';
        if (state.role === 'admin' || char.created_by === state.username) {
            deleteBtn = `
                <button data-action="deleteCharacter" 
                        data-params='[${char.id}]'
                        class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 shadow" 
                        style="z-index: 10;"
                        title="Enviar al cementerio">
                    ✕
                </button>`;
        }

        return `
        <div class="col-md-6 col-lg-4">
            <div class="card bg-dark border border-secondary h-100 position-relative overflow-hidden">
                ${deleteBtn}
                <div class="row g-0 h-100">
                    <div class="col-5">
                        <img src="${image}" 
                             class="img-fluid w-100 h-100" 
                             style="object-fit: cover;"
                             alt="${char.name}">
                    </div>
                    <div class="col-7">
                        <div class="card-body py-2 px-3">
                            <h5 class="card-title ${colorClass} text-truncate mb-1" 
                                title="${char.name}">
                                ${char.name}
                            </h5>
                            <h6 class="card-subtitle text-muted mb-1 small">
                                ${char.clan}
                            </h6>
                            <div class="mb-2">${discBadges}</div>
                            <p class="card-text small mb-0 text-muted">
                                Gen: ${char.generation} | ${char.predator_type || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

/**
 * Elimina un personaje (lo envía al cementerio)
 */
export async function deleteCharacter(id) {
    if (!confirm("¿Enviar este vástago al cementerio?")) return;
    
    try {
        await fetch(`/api/characters/${id}`, { method: 'DELETE' });
        
        // Recargar lista de personajes
        loadCharacters();
        
        // Recargar cementerio si es admin (importación dinámica para evitar ciclos)
        if (state.role === 'admin') {
            import('./lore.js').then(module => {
                module.loadGraveyard();
            });
        }
        
    } catch (error) {
        console.error('Error al eliminar personaje:', error);
        alert('Error al eliminar el personaje. Intenta de nuevo.');
    }
}