export const state = {
    username: null,
    role: null,
    currentChronicleId: null,
    loreData: [],
    sagas: [] // <--- NUEVO: Almacén de crónicas
};

export function setUser(username, role) {
    state.username = username;
    state.role = role;
}

export function setChronicleId(id) {
    state.currentChronicleId = id;
}

export function setLoreData(data) {
    state.loreData = data;
}

export function setSagas(list) {
    state.sagas = list;
}
