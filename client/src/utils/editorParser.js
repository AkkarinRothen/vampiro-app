import DOMPurify from 'dompurify';

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PURIFY_CONFIG = {
    ALLOWED_TAGS: ['span', 'mark', 'sup', 'sub', 'strong', 'em', 'br', 'details', 'summary', 'img', 'div', 'p', 'ul', 'ol', 'li', 'b', 'i', 'u'],
    ALLOWED_ATTR: ['class', 'id', 'title', 'alt', 'src', 'data-tooltip-id', 'data-note-type', 'style', 'loading'],
    ALLOW_DATA_ATTR: true,
    KEEP_CONTENT: true,
};

const generateTooltipHTML = (triggerText, content, styleClasses) => {
    const safeContent = DOMPurify.sanitize(content, PURIFY_CONFIG);
    // Usamos una estructura simplificada para la vista previa
    return `
        <span class="tooltip-wrapper relative group inline-block ${styleClasses} cursor-help mx-1">
            <span class="tooltip-trigger border-b-2 border-current border-dotted hover:border-solid">${triggerText}</span>
            <span class="tooltip-content absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 border border-neutral-700 rounded shadow-2xl text-neutral-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                ${safeContent}
            </span>
        </span>
    `;
};

export const processEditorPreview = (text, glossary = []) => {
    if (!text) return '';
    let processed = text;

    // 1. Resaltados
    processed = processed.replace(
        /==([^=]+)==/g,
        '<mark class="bg-yellow-600/30 text-yellow-100 px-1 rounded shadow-sm border border-yellow-600/40">$1</mark>'
    );

    // 2. Notas Manuales (Simplificado para preview)
    processed = processed.replace(
        /\^\[([^\]]+)\]/g,
        (match, content) => generateTooltipHTML('?', content, 'text-red-400')
    );

    // 3. Glosario Automático
    if (Array.isArray(glossary) && glossary.length > 0) {
        const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length);
        sortedTerms.forEach(item => {
            if (!item.term.trim()) return;
            const regex = new RegExp(`\\b(${escapeRegExp(item.term)})\\b`, 'gi');
            processed = processed.replace(regex, (match) => 
                generateTooltipHTML(match, item.definition, 'text-purple-400 font-semibold')
            );
        });
    }

    return processed;
};