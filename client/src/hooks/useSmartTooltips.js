import { useEffect, useRef } from 'react';

export const useSmartTooltips = (contentDependency) => {
    const contentRef = useRef(null);

    useEffect(() => {
        if (!contentRef.current) return;

        // Buscamos los wrappers generados por el parser
        const triggers = contentRef.current.querySelectorAll('.vtm-tooltip-trigger');
        
        // Crear el "Portal" en el body si no existe
        let portal = document.getElementById('vtm-portal');
        if (!portal) {
            portal = document.createElement('div');
            portal.id = 'vtm-portal';
            document.body.appendChild(portal);
        }

        const cleanupFns = [];

        triggers.forEach(trigger => {
            const wrapper = trigger.closest('.vtm-tooltip-wrapper');
            if (!wrapper) return;

            // Buscamos el template oculto
            const template = wrapper.querySelector('template');
            if (!template) return;

            let activeNode = null;
            let leaveTimeout = null;

            const show = () => {
                clearTimeout(leaveTimeout);
                if (activeNode) return; // Ya está abierto

                // 1. Clonar contenido del template
                activeNode = document.createElement('div');
                activeNode.className = 'vtm-floating-tooltip'; // Clase definida en el CSS
                activeNode.innerHTML = template.innerHTML;
                
                // 2. Mover al Portal (BODY)
                portal.appendChild(activeNode);

                // 3. Posicionar
                updatePosition();

                // 4. Animar entrada
                requestAnimationFrame(() => activeNode.classList.add('visible'));

                // Eventos del tooltip flotante (para no cerrarse si mueves el mouse hacia él)
                activeNode.addEventListener('mouseenter', () => clearTimeout(leaveTimeout));
                activeNode.addEventListener('mouseleave', hide);
            };

            const updatePosition = () => {
                if (!activeNode) return;
                const rect = trigger.getBoundingClientRect();
                const tooltipRect = activeNode.getBoundingClientRect();
                const gap = 10;
                
                // Horizontal (Centrado)
                let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                if (left < 10) left = 10;
                if (left + tooltipRect.width > window.innerWidth - 10) left = window.innerWidth - tooltipRect.width - 10;

                // Vertical (Arriba por defecto)
                let top = rect.top - tooltipRect.height - gap;
                // Si no cabe arriba, poner abajo
                if (top < 10) top = rect.bottom + gap;

                activeNode.style.left = `${left}px`;
                activeNode.style.top = `${top}px`;
            };

            const hide = () => {
                leaveTimeout = setTimeout(() => {
                    if (activeNode) {
                        activeNode.classList.remove('visible');
                        setTimeout(() => {
                            if (activeNode && activeNode.parentNode) {
                                activeNode.parentNode.removeChild(activeNode);
                            }
                            activeNode = null;
                        }, 200);
                    }
                }, 200);
            };

            // Listeners
            trigger.addEventListener('mouseenter', show);
            trigger.addEventListener('mouseleave', hide);
            trigger.addEventListener('focus', show);
            trigger.addEventListener('blur', hide);

            // Actualizar posición al hacer scroll
            window.addEventListener('scroll', updatePosition, true);

            cleanupFns.push(() => {
                trigger.removeEventListener('mouseenter', show);
                trigger.removeEventListener('mouseleave', hide);
                trigger.removeEventListener('focus', show);
                trigger.removeEventListener('blur', hide);
                window.removeEventListener('scroll', updatePosition, true);
                if (activeNode && activeNode.parentNode) activeNode.parentNode.removeChild(activeNode);
            });
        });

        return () => cleanupFns.forEach(fn => fn());
    }, [contentDependency]);

    return { contentRef };
};