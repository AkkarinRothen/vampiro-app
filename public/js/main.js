import { checkSession, handleAuth, toggleMode, logout } from './auth.js';
import { switchView } from './utils.js';
import { 
    initCharForm, onClanChange, saveCharacter, loadCharacters, deleteCharacter 
} from './characters.js';
import { 
    loadSagasHome, openChronicle, addStorySection, removeCharFromChronicle, 
    deleteStorySection, openEditStory, submitEditStory, openRosterModal, addToRoster 
} from './chronicles.js';
import { 
    loadLore, readLore, saveLore, deleteLore, loadGraveyard, restore, showLoreForm, hideLoreForm 
} from './lore.js';

// === HACER FUNCIONES GLOBALES PARA EL HTML (ONCLICK) ===
window.handleAuth = handleAuth;
window.toggleMode = toggleMode;
window.logout = logout;
window.switchView = switchView;
window.onClanChange = onClanChange;
window.saveCharacter = saveCharacter;
window.deleteCharacter = deleteCharacter;
window.openChronicle = openChronicle;
window.addStorySection = addStorySection;
window.removeCharFromChronicle = removeCharFromChronicle;
window.deleteStorySection = deleteStorySection;
window.openEditStory = openEditStory;
window.submitEditStory = submitEditStory;
window.openRosterModal = openRosterModal;
window.addToRoster = addToRoster;
window.readLore = readLore;
window.saveLore = saveLore;
window.deleteLore = deleteLore;
window.restore = restore;
window.showLoreForm = showLoreForm;
window.hideLoreForm = hideLoreForm;

// === INICIO DE LA APLICACIÓN ===
// Función principal para mostrar la app
export function showApp() {
    document.getElementById('login-screen').style.display = 'none'; 
    document.getElementById('app-screen').style.display = 'block';
    
    // Importamos dinámicamente el estado para leer el usuario
    import('./state.js').then(({ state }) => {
        const userDisplay = document.getElementById('user-display');
        if(userDisplay) userDisplay.innerText = `${state.username}`;
        
        // Cargar datos iniciales
        initCharForm(); 
        loadCharacters();
        loadSagasHome();
        loadLore();
        if (state.role === 'admin') loadGraveyard();
    });

    switchView('view-sagas');
}

// Cargar todo
export function loadAllData() {
    loadCharacters();
    loadSagasHome();
    loadLore();
}

// Iniciar chequeo de sesión
checkSession();