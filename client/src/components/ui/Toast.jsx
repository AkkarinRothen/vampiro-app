// ============================================
// Toast.jsx - Sistema de Notificaciones
// Reemplaza los alert() feos con notificaciones elegantes
// ============================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaSkull } from 'react-icons/fa';

// Contexto para usar el toast en cualquier parte
const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe usarse dentro de ToastProvider');
    }
    return context;
};

// Componente Toast individual
const Toast = ({ id, type, message, onClose }) => {
    const icons = {
        success: <FaCheckCircle className="w-5 h-5" />,
        error: <FaSkull className="w-5 h-5" />,
        warning: <FaExclamationTriangle className="w-5 h-5" />,
        info: <FaInfoCircle className="w-5 h-5" />
    };

    const styles = {
        success: 'bg-green-900/90 border-green-700 text-green-100',
        error: 'bg-red-900/90 border-red-700 text-red-100',
        warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100',
        info: 'bg-blue-900/90 border-blue-700 text-blue-100'
    };

    return (
        <div 
            className={`
                ${styles[type]} 
                border-2 rounded-lg p-4 shadow-2xl backdrop-blur-md
                flex items-start gap-3 min-w-[300px] max-w-[400px]
                animate-slide-in-right
            `}
        >
            <div className="flex-shrink-0 mt-0.5">
                {icons[type]}
            </div>
            <p className="flex-1 text-sm font-serif leading-relaxed">
                {message}
            </p>
            <button 
                onClick={() => onClose(id)}
                className="flex-shrink-0 text-neutral-400 hover:text-white transition-colors"
            >
                <FaTimes className="w-4 h-4" />
            </button>
        </div>
    );
};

// Provider del sistema de toast
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type, message, duration = 4000) => {
        const id = Date.now() + Math.random();
        
        setToasts(prev => [...prev, { id, type, message }]);

        // Auto-cerrar después de la duración
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Métodos de conveniencia
    const toast = {
        success: (message, duration) => addToast('success', message, duration),
        error: (message, duration) => addToast('error', message, duration),
        warning: (message, duration) => addToast('warning', message, duration),
        info: (message, duration) => addToast('info', message, duration)
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            
            {/* Container de toasts */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast 
                            {...toast} 
                            onClose={removeToast}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};



export default ToastProvider;