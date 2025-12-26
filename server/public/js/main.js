// ==========================================
// ARCHIVO: public/js/main.js
// ==========================================

import { checkSession, handleAuth, toggleMode, logout } from './auth.js';
import { switchView } from './utils.js';
import { state } from './state.js';
import { 
    initCharForm, 
    onClanChange, 
    saveCharacter, 
    loadCharacters, 
    deleteCharacter 
} from './characters.js';
import { 
    loadSagasHome, 
    openChronicle, 
    addStorySection, 
    removeCharFromChronicle, 
    deleteStorySection, 
    openEditStory, 
    submitEditStory, 
    openRosterModal, 
    addToRoster,
    openChronicleModal, 
    submitChronicleForm, 
    deleteChronicle 
} from './chronicles.js';
import { 
    loadLore, 
    readLore, 
    saveLore, 
    deleteLore, 
    loadGraveyard, 
    restore, 
    showLoreForm, 
    hideLoreForm, 
    prepareEditLore 
} from './lore.js';

// ==========================================
// SISTEMA DE EVENT DELEGATION
// ==========================================

/**
 * Sistema de event delegation para evitar contaminar window
 * Permite usar data-action="functionName" en lugar de onclick
 */
function setupEventDelegation() {
    // Mapa de acciones disponibles
    const actions = {
        // Auth
        handleAuth,
        toggleMode,
        logout,
        
        // Navigation
        switchView,
        
        // Characters
        initCharForm,
        onClanChange,
        saveCharacter,
        deleteCharacter,
        loadCharacters,
        
        // Chronicles
        loadSagasHome,
        openChronicle,
        addStorySection,
        removeCharFromChronicle,
        deleteStorySection,
        openEditStory,
        submitEditStory,
        openRosterModal,
        addToRoster,
        openChronicleModal,
        submitChronicleForm,
        deleteChronicle,
       
        
        // Lore
        readLore,
        saveLore,
        deleteLore,
        restore,
        showLoreForm,
        hideLoreForm,
        prepareEditLore,
        loadGraveyard,
    };

    // Listener global con delegation
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const actionName = target.dataset.action;
        const actionFn = actions[actionName];

        if (actionFn) {
            // Pasar parámetros desde data attributes
            const params = target.dataset.params 
                ? JSON.parse(target.dataset.params) 
                : [];
            
            actionFn(...params);
        } else {
            console.warn(`Action "${actionName}" not found`);
        }
    });

    // Para formularios con data-submit
    document.addEventListener('submit', (e) => {
        const form = e.target.closest('[data-submit]');
        if (!form) return;

        e.preventDefault();
        const actionName = form.dataset.submit;
        const actionFn = actions[actionName];

        if (actionFn) {
            actionFn(e);
        }
    });
}

// ==========================================
// INICIALIZACIÓN DE LA APP
// ==========================================

/**
 * Muestra la interfaz principal de la aplicación
 */
export function showApp() {
    try {
        // Ocultar login, mostrar app
        document.getElementById('login-screen').style.display = 'none'; 
        document.getElementById('app-screen').style.display = 'block';
        
        // Mostrar usuario actual
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.innerText = state.username;
        }
        
        // Cargar datos iniciales
        initCharForm(); 
        loadCharacters();
        loadSagasHome();
        loadLore();
        
        // Cargar datos de admin si corresponde
        if (state.role === 'admin') {
            loadGraveyard();
        }
        
        // Vista inicial
        switchView('view-sagas');
        
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        alert('Error al cargar la aplicación. Por favor, recarga la página.');
    }
}

/**
 * Inicialización principal
 */
async function init() {
    try {
        // Configurar sistema de eventos PRIMERO
        setupEventDelegation();
        
        // Verificar sesión
        const isLoggedIn = await checkSession();
        
        if (isLoggedIn) {
            // Usuario autenticado: mostrar app
            showApp();
        } else {
            // No autenticado: mostrar login
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-screen').style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error fatal durante la inicialización:', error);
        
        // Mostrar error al usuario
        document.body.innerHTML = `
            <div style="
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                font-family: sans-serif;
                background: #1a1a1a;
                color: #fff;
            ">
                <div style="text-align: center;">
                    <h1>⚠️ Error de Inicialización</h1>
                    <p>No se pudo cargar la aplicación.</p>
                    <button onclick="location.reload()" style="
                        margin-top: 20px;
                        padding: 10px 20px;
                        font-size: 16px;
                        cursor: pointer;
                    ">
                        Recargar página
                    </button>
                </div>
            </div>
        `;
    }
}

// ==========================================
// PUNTO DE ENTRADA
// ==========================================

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exportar para testing o uso externo
export { init };