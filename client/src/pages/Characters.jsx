import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEyeSlash, FaSkull, FaUserTie, FaGamepad, FaMask, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';


// ============================================
// VARIANTES DE ANIMACIÓN
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 50,
    scale: 0.9
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.3 }
  }
};

const modalBackdrop = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const modalContent = {
  hidden: { 
    scale: 0.8, 
    opacity: 0, 
    y: 50,
    rotateX: -15
  },
  visible: { 
    scale: 1, 
    opacity: 1, 
    y: 0,
    rotateX: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    y: 50,
    transition: { duration: 0.2 }
  }
};

// Constantes
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const INITIAL_FORM_STATE = {
    name: '',
    clan: '',
    generation: 13,
    type: 'NPC',
    image_url: '',
    disciplines: [],
    predator_type: '',
    is_hidden: false,
    creature_type: 'vampire'
};

const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            reject(new Error('Tipo de archivo no soportado'));
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error('El archivo es muy grande. Máximo 5MB'));
            return;
        }
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = (error) => reject(error);
    });
};

function Characters({ user }) {
    const [pcs, setPcs] = useState([]);
    const [npcs, setNpcs] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [imageError, setImageError] = useState(null);

    const fetchCharacters = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/characters');
            if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
            const data = await res.json();
            setPcs(data.pcs || []);
            setNpcs(data.npcs || []);
        } catch (err) {
            console.error("Error cargando personajes:", err);
            setError(err.message || "Error al cargar personajes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCharacters();
    }, [fetchCharacters]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setImageError(null);
            const base64 = await convertToBase64(file);
            setFormData(prev => ({ ...prev, image_url: base64 }));
        } catch (err) {
            setImageError(err.message);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.clan.trim()) {
            setError('El nombre y clan son requeridos');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Error al crear personaje');
            setShowModal(false);
            await fetchCharacters();
            setFormData(INITIAL_FORM_STATE);
            setImageError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setFormData(INITIAL_FORM_STATE);
        setImageError(null);
        setError(null);
    }, []);

    const publicNpcs = useMemo(() => npcs.filter(n => !n.is_hidden), [npcs]);
    const vaultNpcs = useMemo(() => npcs.filter(n => n.is_hidden), [npcs]);

    if (loading) {
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen bg-neutral-950 flex items-center justify-center"
            >
                <div className="text-center">
                    <motion.div 
                        className="text-red-800 font-serif text-2xl mb-4"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        Rastreando sangre...
                    </motion.div>
                    <motion.div
                        className="w-16 h-16 border-4 border-red-900 border-t-transparent rounded-full mx-auto"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 pb-20"
        >
            {/* ENCABEZADO */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-7xl mx-auto mb-8"
            >
                <div className="flex flex-col md:flex-row justify-between items-end mb-6 border-b border-red-900/30 pb-6 gap-4">
                    <div>
                        <motion.h1 
                            className="text-4xl md:text-5xl font-serif text-red-600 mb-2"
                            animate={{ 
                                textShadow: [
                                    '0 0 10px rgba(220, 38, 38, 0.3)',
                                    '0 0 20px rgba(220, 38, 38, 0.5)',
                                    '0 0 10px rgba(220, 38, 38, 0.3)'
                                ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            Dramatis Personae
                        </motion.h1>
                        <p className="text-neutral-500 font-serif italic">
                            Registro de Vástagos y ganado de la ciudad.
                        </p>
                    </div>
                    {user?.role === 'admin' && (
                        <motion.button 
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-red-900 text-white rounded font-serif flex items-center gap-2 shadow-lg relative overflow-hidden"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-red-800 to-red-600"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: 0 }}
                                transition={{ duration: 0.3 }}
                            />
                            <span className="relative z-10 flex items-center gap-2">
                                <FaPlus /> Nuevo Registro
                            </span>
                        </motion.button>
                    )}
                </div>

                {/* BÚSQUEDA Y FILTROS */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col md:flex-row gap-4 mb-8"
                >
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o clan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 p-3 pl-10 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors"
                        />
                        <FaMask className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                    </div>
                    
                    <div className="flex gap-2">
                        {['all', 'vampire', 'human'].map((type) => (
                            <motion.button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded transition-colors ${
                                    filterType === type 
                                        ? 'bg-red-900 text-white' 
                                        : 'bg-neutral-900 text-neutral-400'
                                }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {type === 'all' ? 'Todos' : type === 'vampire' ? 'Vástagos' : 'Mortales'}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* ERROR */}
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-900/20 border border-red-900 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3"
                        >
                            <FaExclamationTriangle className="mt-1 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-bold">Error</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <div className="max-w-7xl mx-auto space-y-16">
                
                {/* COTERIE (PCs) */}
                <section>
                    <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-serif text-red-500 mb-6 flex items-center gap-2 border-l-4 border-red-600 pl-3"
                    >
                        <FaGamepad /> Coterie & Protagonistas
                        <span className="text-sm text-neutral-600 ml-2">({pcs.length})</span>
                    </motion.h2>
                    
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {pcs.map(char => (
                                <motion.div
                                    key={char.id}
                                    variants={cardVariants}
                                    layout
                                >
                                    <CharacterCard char={char} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </section>

                {/* BÓVEDA DEL NARRADOR */}
                {user?.role === 'admin' && vaultNpcs.length > 0 && (
                    <motion.section 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-neutral-900/40 p-6 rounded-xl border-2 border-dashed border-red-900/40 relative overflow-hidden"
                    >
                        <motion.div 
                            className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none"
                            animate={{ 
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.05, 1]
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <FaEyeSlash size={100} />
                        </motion.div>
                        <h2 className="text-2xl font-serif text-neutral-300 mb-2 flex items-center gap-2">
                            <FaEyeSlash className="text-red-500" /> Bóveda del Narrador
                            <span className="text-sm text-neutral-600 ml-2">({vaultNpcs.length})</span>
                        </h2>
                        <p className="text-sm text-neutral-500 mb-6 italic">
                            Personajes ocultos. Invisibles para los jugadores.
                        </p>
                        <motion.div 
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {vaultNpcs.map(char => (
                                <motion.div key={char.id} variants={cardVariants}>
                                    <CharacterCard char={char} isVault={true} />
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.section>
                )}

                {/* NPCS PÚBLICOS */}
                <section>
                    <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-serif text-yellow-600 mb-6 flex items-center gap-2 border-l-4 border-yellow-600 pl-3"
                    >
                        <FaMask /> Aliados & Conocidos
                        <span className="text-sm text-neutral-600 ml-2">({publicNpcs.length})</span>
                    </motion.h2>
                    
                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {publicNpcs.map(char => (
                                <motion.div
                                    key={char.id}
                                    variants={cardVariants}
                                    layout
                                >
                                    <CharacterCard char={char} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                </section>
            </div>

            {/* MODAL CON FRAMER MOTION */}
            <AnimatePresence>
                {showModal && (
                    <>
                        <motion.div
                            variants={modalBackdrop}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={handleCloseModal}
                        >
                            <motion.div
                                variants={modalContent}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="bg-neutral-900 w-full max-w-2xl rounded-xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="bg-black/50 p-6 border-b border-neutral-800 flex justify-between items-center shrink-0">
                                    <h3 className="text-xl font-serif text-red-500">Nuevo Registro</h3>
                                    <motion.button 
                                        onClick={handleCloseModal}
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="text-neutral-500 hover:text-white transition-colors p-2"
                                    >
                                        <FaTimes size={20} />
                                    </motion.button>
                                </div>
                                
                                <form onSubmit={handleCreate} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                    
                                    {/* TIPO DE CRIATURA (INTERRUPTORES) */}
                                    <div className="grid grid-cols-2 gap-4 bg-black/30 p-1 rounded-lg">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, creature_type: 'vampire'})}
                                            className={`py-2 rounded transition-colors flex items-center justify-center gap-2 ${formData.creature_type === 'vampire' ? 'bg-red-900 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <FaSkull /> Vástago
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, creature_type: 'human'})}
                                            className={`py-2 rounded transition-colors flex items-center justify-center gap-2 ${formData.creature_type === 'human' ? 'bg-blue-900 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <FaUserTie /> Mortal / Ghoul
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* COLUMNA IZQUIERDA */}
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-500 uppercase font-bold">
                                                    Nombre <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors"
                                                    value={formData.name} 
                                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                                    required 
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-500 uppercase font-bold">
                                                    {formData.creature_type === 'vampire' ? "Clan" : "Concepto"} <span className="text-red-500">*</span>
                                                </label>
                                                <input 
                                                    placeholder={formData.creature_type === 'vampire' ? "Ej. Ventrue" : "Ej. Detective"}
                                                    className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-red-900 outline-none transition-colors"
                                                    value={formData.clan} 
                                                    onChange={e => setFormData({...formData, clan: e.target.value})} 
                                                    required 
                                                />
                                            </div>
                                            
                                            {formData.creature_type === 'vampire' && (
                                                <div className="flex items-center gap-3 bg-neutral-950 p-3 rounded border border-neutral-800">
                                                    <label className="text-xs text-neutral-500 uppercase font-bold whitespace-nowrap">Generación:</label>
                                                    <input 
                                                        type="number" min="4" max="16"
                                                        className="w-full bg-transparent border-b border-neutral-700 text-center focus:border-red-500 outline-none text-red-400 font-bold"
                                                        value={formData.generation} 
                                                        onChange={e => setFormData({...formData, generation: e.target.value})} 
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* COLUMNA DERECHA */}
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs text-neutral-500 uppercase font-bold">Imagen (URL o Archivo)</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="https://..."
                                                        className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-neutral-200 focus:border-red-900 outline-none text-xs"
                                                        value={formData.image_url.startsWith('data:') ? '(Imagen subida)' : formData.image_url} 
                                                        onChange={e => setFormData({...formData, image_url: e.target.value})} 
                                                    />
                                                    <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded border border-neutral-700 transition-colors">
                                                        <FaPlus />
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                    </label>
                                                </div>
                                            </div>
                                            
                                            {/* PREVISUALIZACIÓN */}
                                            <div className="h-32 bg-black/40 rounded flex items-center justify-center border border-neutral-800 overflow-hidden relative group">
                                                {formData.image_url ? (
                                                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                ) : <span className="text-xs text-neutral-600">Sin imagen</span>}
                                            </div>

                                            {/* TOGGLE: BÓVEDA / PÚBLICO */}
                                            <div 
                                                className={`cursor-pointer p-3 rounded border flex items-center justify-between transition-colors select-none ${formData.is_hidden ? 'bg-red-900/20 border-red-900' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}
                                                onClick={() => setFormData({...formData, is_hidden: !formData.is_hidden})}
                                            >
                                                <div className="text-sm">
                                                    <p className={formData.is_hidden ? "text-red-400 font-bold" : "text-neutral-400"}>
                                                        {formData.is_hidden ? "🔒 Oculto en Bóveda" : "👁️ Visible para todos"}
                                                    </p>
                                                </div>
                                                {formData.is_hidden ? <FaEyeSlash className="text-red-500" /> : <FaUserTie className="text-neutral-600" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* BOTONES DE ACCIÓN */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                                        <motion.button 
                                            type="button" 
                                            onClick={handleCloseModal}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="px-4 py-2 text-neutral-500 hover:text-white transition-colors"
                                        >
                                            Cancelar
                                        </motion.button>
                                        <motion.button 
                                            type="submit"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="px-8 py-2 bg-red-900 hover:bg-red-800 text-white rounded font-serif shadow-lg disabled:opacity-50"
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Creando...' : 'Crear Registro'}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Card con animaciones
function CharacterCard({ char, isVault }) {
    const [imageError, setImageError] = useState(false);

    return (
        <Link to={`/character/${char.id}`} className="block group relative h-full">
            <motion.div
                className={`h-full bg-neutral-900 rounded-lg overflow-hidden border flex flex-col ${
                    isVault ? 'border-red-900/40' : 'border-neutral-800'
                }`}
                whileHover={{ 
                    y: -8,
                    boxShadow: '0 20px 40px rgba(220, 38, 38, 0.3)',
                    borderColor: 'rgba(220, 38, 38, 0.8)'
                }}
                transition={{ duration: 0.3 }}
            >
                <div className="h-64 overflow-hidden relative">
                    <motion.img 
                        src={imageError ? 'https://via.placeholder.com/400x600' : (char.image_url || 'https://via.placeholder.com/400x600')}
                        alt={char.name} 
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-90"></div>
                    
                    <div className="absolute bottom-4 left-4 right-4">
                        <motion.h3 
                            className="text-2xl font-serif text-white group-hover:text-red-500 transition-colors drop-shadow-md truncate"
                            whileHover={{ scale: 1.05 }}
                        >
                            {char.name}
                        </motion.h3>
                        <p className="text-xs text-red-500 tracking-[0.2em] uppercase font-bold truncate">
                            {char.clan || 'Desconocido'}
                        </p>
                    </div>
                </div>
                
                <div className="p-3 bg-neutral-950/50 mt-auto border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-500">
                    <span>Gen: {char.generation || '?'}</span>
                    {char.type === 'PC' && (
                        <span className="text-yellow-600 font-bold flex items-center gap-1">
                            <FaGamepad size={10}/> PJ
                        </span>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}

export default Characters;