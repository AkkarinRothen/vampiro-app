// Cambiar entre pestañas
export function switchView(viewId, navElement) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const view = document.getElementById(viewId);
    if(view) view.style.display = 'block';

    if (navElement) {
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        navElement.classList.add('active');
    }
}

// Convertir imagen a Base64
export const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};