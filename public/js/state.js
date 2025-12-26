export const state = {
    username: null,
    role: null,
    currentChronicleId: null,
    loreData: [] // Cache para el lore
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