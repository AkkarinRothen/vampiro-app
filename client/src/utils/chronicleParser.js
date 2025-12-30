import DOMPurify from 'dompurify';

const PURIFY_CONFIG = {
    ALLOWED_TAGS: ['span', 'div', 'img', 'br', 'strong', 'em', 'p', 'ul', 'li', 'details', 'summary', 'mark', 'template'],
    ALLOWED_ATTR: ['class', 'src', 'alt', 'data-note-type', 'style'],
    KEEP_CONTENT: true,
};

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Usamos <template> para ocultar el contenido hasta que el JS lo necesite
const generateTooltipHTML = (triggerText, content, type = 'default') => {
    const safeContent = DOMPurify.sanitize(content, PURIFY_CONFIG);
    return `
        <span class="vtm-tooltip-wrapper relative inline-block" data-note-type="${type}">
            <span class="vtm-tooltip-trigger cursor-help border-b-2 border-dotted border-current hover:border-solid transition-colors font-medium text-purple-300">${triggerText}</span>
            <template>
                <div class="vtm-tooltip-inner">
                    ${safeContent}
                </div>
            </template>
        </span>
    `;
};

export const processChronicleContent = (text, glossary = []) => {
    if (!text) return { content: '', footnotes: [], readingTime: { words: 0, minutes: 0 } };
    let processed = text;

    // Resaltados
    processed = processed.replace(/==([^=]+)==/g, '<mark class="bg-yellow-600/30 text-yellow-100 px-1 rounded border border-yellow-600/40">$1</mark>');

    // Notas Rápidas
    processed = processed.replace(/\^\[([^\]]+)\]/g, (match, c) => generateTooltipHTML('?', c, 'manual'));

    // Glosario Automático
    if (Array.isArray(glossary)) {
        const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length);
        sorted.forEach(item => {
            if (!item.term?.trim()) return;
            const regex = new RegExp(`\\b(${escapeRegExp(item.term)})\\b`, 'gi');
            
            let content = item.definition;
            if (item.image) {
                const safeImg = DOMPurify.sanitize(item.image, {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
                content = `<img src="${safeImg}" class="w-full h-32 object-cover mb-2 rounded border border-neutral-700" loading="lazy" />${content}`;
            }
            processed = processed.replace(regex, (match) => generateTooltipHTML(match, content, 'glossary'));
        });
    }

    // Calcular lectura
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 250);

    return { content: processed, footnotes: [], readingTime: { words, minutes } };
};