import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaSave, FaEyeSlash, FaEye, FaArrowLeft, FaBook, FaHeart, FaBrain, FaStar, FaDice } from 'react-icons/fa';

function CharacterDetail({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [char, setChar] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Estructuras de datos V5
    const attributeCategories = {
        fisicos: ['fuerza', 'destreza', 'resistencia'],
        sociales: ['carisma', 'manipulacion', 'compostura'],
        mentales: ['inteligencia', 'astucia', 'resolucion']
    };

    const skillCategories = {
        fisicas: ['armas_fuego', 'artesania', 'atletismo', 'conducir', 'latrocinio', 'pelea', 'pelea_armas', 'sigilo', 'supervivencia'],
        sociales: ['callejeo', 'etiqueta', 'interpretacion', 'intimidacion', 'liderazgo', 'perspicacia', 'persuasion', 'subterfugio', 'trato_animales'],
        mentales: ['academicismo', 'consciencia', 'ciencias', 'finanzas', 'investigacion', 'medicina', 'ocultismo', 'politica', 'tecnologia']
    };

    const disciplinesList = [
        'Animalismo', 'Auspex', 'Celeridad', 'Dominación', 'Fortaleza', 'Ofuscación',
        'Potencia', 'Presencia', 'Protean', 'Hechicería de Sangre', 'Taumaturgia', 'Nigromancia'
    ];

    const safeJSONParse = (value, fallback = {}) => {
        if (!value) return fallback;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return fallback;
            }
        }
        return value;
    };

    const [formData, setFormData] = useState({
        name: '', clan: '', generation: '', type: '', 
        image_url: '', predator_type: '',
        is_hidden: false, creature_type: 'vampire',
        player_name: '',
        sire: '', age: '', apparent_age: '', date_of_birth: '', date_of_embrace: '',
        ambition: '', desire: '', chronicle_tenets: '', touchstone: '',
        convictions: [],
        humanity: 7, health: 0, willpower: 0, blood_potency: 0, hunger: 1, resonance: '',
        attributes: {},
        skills: {},
        disciplines: [],
        advantages: [],
        appearance: '', personality: '', background: '', notes: '',
        ban_attributes: '',
        total_experience: 0,
        spent_experience: 0
    });

    useEffect(() => {
        fetchChar();
    }, [id]);

    const fetchChar = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/characters/${id}`, { credentials: 'include' }); 
            
            if (res.ok) {
                const data = await res.json();
                setupChar(data);
            } else {
                navigate('/characters');
            }
        } catch (err) { 
            console.error(err); 
        } finally {
            setIsLoading(false);
        }
    };

    const setupChar = (data) => {
        setChar(data);
        setFormData({
            name: data.name || '',
            clan: data.clan || '',
            generation: data.generation || '',
            type: data.type || 'NPC',
            image_url: data.image_url || '',
            predator_type: data.predator_type || '',
            is_hidden: data.is_hidden || false,
            creature_type: data.creature_type || 'vampire',
            player_name: data.player_name || '',
            sire: data.sire || '',
            age: data.age || '',
            apparent_age: data.apparent_age || '',
            date_of_birth: data.date_of_birth || '',
            date_of_embrace: data.date_of_embrace || '',
            ambition: data.ambition || '',
            desire: data.desire || '',
            chronicle_tenets: data.chronicle_tenets || '',
            touchstone: data.touchstone || '',
            convictions: safeJSONParse(data.convictions, []),
            humanity: data.humanity || 7,
            health: data.health || 0,
            willpower: data.willpower || 0,
            blood_potency: data.blood_potency || 0,
            hunger: data.hunger || 1,
            resonance: data.resonance || '',
            attributes: safeJSONParse(data.attributes, {}),
            skills: safeJSONParse(data.skills, {}),
            disciplines: safeJSONParse(data.disciplines, []),
            advantages: safeJSONParse(data.advantages, []),
            appearance: data.appearance || '',
            personality: data.personality || '',
            background: data.background || '',
            notes: data.notes || '',
            ban_attributes: data.ban_attributes || '',
            total_experience: data.total_experience || 0,
            spent_experience: data.spent_experience || 0
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            // Sanitizar datos numéricos antes de enviar
            const sanitizedData = {
                ...formData,
                // Campos numéricos
                generation: formData.generation === '' ? null : parseInt(formData.generation) || null,
                age: formData.age === '' ? null : parseInt(formData.age) || null,
                apparent_age: formData.apparent_age === '' ? null : parseInt(formData.apparent_age) || null,
                humanity: parseInt(formData.humanity) || 7,
                health: parseInt(formData.health) || 0,
                willpower: parseInt(formData.willpower) || 0,
                blood_potency: parseInt(formData.blood_potency) || 0,
                hunger: parseInt(formData.hunger) || 1,
                total_experience: parseInt(formData.total_experience) || 0,
                spent_experience: parseInt(formData.spent_experience) || 0,
                // Campos de texto - convertir vacíos a null
                name: formData.name || null,
                clan: formData.clan || null,
                player_name: formData.player_name || null,
                sire: formData.sire || null,
                predator_type: formData.predator_type || null,
                ambition: formData.ambition || null,
                desire: formData.desire || null,
                chronicle_tenets: formData.chronicle_tenets || null,
                touchstone: formData.touchstone || null,
                resonance: formData.resonance || null,
                appearance: formData.appearance || null,
                personality: formData.personality || null,
                background: formData.background || null,
                notes: formData.notes || null,
                ban_attributes: formData.ban_attributes || null,
                date_of_birth: formData.date_of_birth || null,
                date_of_embrace: formData.date_of_embrace || null
            };
            
            console.log('Enviando datos:', sanitizedData); // Debug
            
            const res = await fetch(`/api/characters/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(sanitizedData)
            });
            
            const responseData = await res.json();
            console.log('Respuesta:', responseData); // Debug
            
            if (res.ok) {
                setupChar(responseData);
                setIsEditing(false);
                alert('✅ Personaje actualizado correctamente');
            } else {
                console.error('Error del servidor:', responseData);
                alert('❌ Error al actualizar: ' + (responseData.error || 'Error desconocido'));
            }
        } catch (err) {
            console.error('Error de red:', err);
            alert('❌ Error de conexión: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Eliminar este personaje permanentemente?")) return;
        try {
            await fetch(`/api/characters/${id}`, { method: 'DELETE', credentials: 'include' });
            navigate('/characters');
        } catch (err) {
            console.error(err);
        }
    };

    const updateAttribute = (attr, value) => {
        setFormData({
            ...formData,
            attributes: { ...formData.attributes, [attr]: parseInt(value) || 0 }
        });
    };

    const updateSkill = (skill, value) => {
        setFormData({
            ...formData,
            skills: { ...formData.skills, [skill]: parseInt(value) || 0 }
        });
    };

    const addDiscipline = (disc) => {
        if (!formData.disciplines.find(d => d.name === disc)) {
            setFormData({
                ...formData,
                disciplines: [...formData.disciplines, { name: disc, level: 1 }]
            });
        }
    };

    const updateDisciplineLevel = (index, level) => {
        const updated = [...formData.disciplines];
        updated[index].level = parseInt(level) || 0;
        setFormData({ ...formData, disciplines: updated });
    };

    const removeDiscipline = (index) => {
        setFormData({
            ...formData,
            disciplines: formData.disciplines.filter((_, i) => i !== index)
        });
    };

    const addAdvantage = () => {
        setFormData({
            ...formData,
            advantages: [...formData.advantages, { name: '', description: '' }]
        });
    };

    const updateAdvantage = (index, field, value) => {
        const updated = [...formData.advantages];
        updated[index][field] = value;
        setFormData({ ...formData, advantages: updated });
    };

    const removeAdvantage = (index) => {
        setFormData({
            ...formData,
            advantages: formData.advantages.filter((_, i) => i !== index)
        });
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-red-800 font-serif animate-pulse">Invocando presencia...</div>;
    if (!char) return null;

    const tabs = [
        { id: 'overview', label: 'Resumen', icon: FaBook },
        { id: 'sheet', label: 'Ficha', icon: FaDice },
        { id: 'story', label: 'Historia', icon: FaHeart },
        { id: 'notes', label: 'Notas', icon: FaBrain }
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-10 pb-20">
            
            <button onClick={() => navigate('/characters')} className="mb-4 flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors">
                <FaArrowLeft /> Volver
            </button>

            <div className="max-w-7xl mx-auto bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden">
                
                {/* HEADER */}
                <div className="relative h-80 bg-black">
                    <img 
                        src={formData.image_url || 'https://via.placeholder.com/1200x400?text=Sin+Imagen'} 
                        alt={char.name}
                        className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
                    
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {char.is_hidden && (
                            <div className="bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded backdrop-blur shadow-lg flex items-center gap-2">
                                <FaEyeSlash /> EN BÓVEDA
                            </div>
                        )}
                        {char.creature_type === 'human' && (
                            <div className="bg-blue-900/90 text-blue-100 text-xs font-bold px-3 py-1.5 rounded backdrop-blur shadow-lg">
                                MORTAL
                            </div>
                        )}
                    </div>

                    {user?.role === 'admin' && !isEditing && (
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => setIsEditing(true)} className="p-3 bg-neutral-900/90 text-yellow-500 hover:bg-yellow-600 hover:text-white rounded-full shadow-lg transition-all">
                                <FaEdit />
                            </button>
                            <button onClick={handleDelete} className="p-3 bg-neutral-900/90 text-red-600 hover:bg-red-700 hover:text-white rounded-full shadow-lg transition-all">
                                <FaTrash />
                            </button>
                        </div>
                    )}

                    <div className="absolute bottom-6 left-6">
                        <h1 className="text-6xl font-serif text-red-600 drop-shadow-2xl">{char.name}</h1>
                        <p className="text-2xl text-neutral-300 mt-2">{char.clan}</p>
                    </div>
                </div>

                {isEditing ? (
                    /* MODO EDICIÓN */
                    <form onSubmit={handleUpdate} className="p-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                            <h2 className="text-2xl font-serif text-red-500">Editando Ficha Completa</h2>
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setupChar(char); // Restaurar datos originales
                                    }} 
                                    className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700"
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="animate-spin">⏳</span> Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave /> Guardar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* INFORMACIÓN BÁSICA */}
                        <div className="space-y-4">
                            <h3 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2">Información Básica</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField label="Nombre del Personaje" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                <InputField label="Jugador" value={formData.player_name} onChange={e => setFormData({...formData, player_name: e.target.value})} placeholder="Nombre del jugador" />
                                <InputField label="Concepto/Clan" value={formData.clan} onChange={e => setFormData({...formData, clan: e.target.value})} />
                                <InputField label="Depredador" value={formData.predator_type} onChange={e => setFormData({...formData, predator_type: e.target.value})} />
                                <InputField label="Sire" value={formData.sire} onChange={e => setFormData({...formData, sire: e.target.value})} />
                                <InputField label="Generación" type="number" value={formData.generation} onChange={e => setFormData({...formData, generation: e.target.value})} />
                                <InputField label="Ambición" value={formData.ambition} onChange={e => setFormData({...formData, ambition: e.target.value})} />
                                <InputField label="Deseo" value={formData.desire} onChange={e => setFormData({...formData, desire: e.target.value})} />
                                <div>
                                    <label className="block text-xs text-neutral-500 font-bold uppercase mb-2">Tipo</label>
                                    <select 
                                        value={formData.type} 
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded"
                                    >
                                        <option value="PC">Jugador (PC)</option>
                                        <option value="NPC">NPC</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ATRIBUTOS */}
                        <div className="space-y-4">
                            <h3 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2">Atributos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(attributeCategories).map(([category, attrs]) => (
                                    <div key={category} className="space-y-3">
                                        <h4 className="text-sm font-bold text-neutral-400 uppercase">{category}</h4>
                                        {attrs.map(attr => (
                                            <DotInput 
                                                key={attr}
                                                label={attr.charAt(0).toUpperCase() + attr.slice(1).replace('_', ' ')}
                                                value={formData.attributes[attr] || 0}
                                                onChange={(v) => updateAttribute(attr, v)}
                                                max={5}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* HABILIDADES */}
                        <div className="space-y-4">
                            <h3 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2">Habilidades</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(skillCategories).map(([category, skills]) => (
                                    <div key={category} className="space-y-2">
                                        <h4 className="text-sm font-bold text-neutral-400 uppercase">{category}</h4>
                                        {skills.map(skill => (
                                            <DotInput 
                                                key={skill}
                                                label={skill.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                value={formData.skills[skill] || 0}
                                                onChange={(v) => updateSkill(skill, v)}
                                                max={5}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DISCIPLINAS */}
                        <div className="space-y-4">
                            <h3 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2">Disciplinas</h3>
                            <div className="space-y-3">
                                {formData.disciplines.map((disc, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-neutral-950/50 p-3 rounded">
                                        <span className="flex-1 text-neutral-300">{disc.name}</span>
                                        <DotInput 
                                            label=""
                                            value={disc.level}
                                            onChange={(v) => updateDisciplineLevel(idx, v)}
                                            max={5}
                                        />
                                        <button type="button" onClick={() => removeDiscipline(idx)} className="text-red-500 hover:text-red-400">
                                            <FaTrash />
                                        </button>
                                    </div>
                                ))}
                                <select 
                                    onChange={(e) => { if(e.target.value) { addDiscipline(e.target.value); e.target.value = ''; }}}
                                    className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded"
                                >
                                    <option value="">+ Agregar Disciplina</option>
                                    {disciplinesList.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* VENTAJAS Y DEFECTOS */}
                        <div className="space-y-4">
                            <h3 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2">Ventajas y Defectos</h3>
                            {formData.advantages.map((adv, idx) => (
                                <div key={idx} className="flex gap-3 bg-neutral-950/50 p-3 rounded">
                                    <input 
                                        placeholder="Nombre"
                                        value={adv.name}
                                        onChange={e => updateAdvantage(idx, 'name', e.target.value)}
                                        className="w-1/3 bg-neutral-900 border border-neutral-700 p-2 rounded"
                                    />
                                    <input 
                                        placeholder="Descripción"
                                        value={adv.description}
                                        onChange={e => updateAdvantage(idx, 'description', e.target.value)}
                                        className="flex-1 bg-neutral-900 border border-neutral-700 p-2 rounded"
                                    />
                                    <button type="button" onClick={() => removeAdvantage(idx)} className="text-red-500 hover:text-red-400 px-3">
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addAdvantage} className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700">
                                + Agregar
                            </button>
                        </div>

                        {/* STATS */}
                        <div className="space-y-4">
                            <h3 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2">Stats</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InputField label="Humanidad" type="number" min="0" max="10" value={formData.humanity} onChange={e => setFormData({...formData, humanity: e.target.value})} />
                                <InputField label="Salud" type="number" value={formData.health} onChange={e => setFormData({...formData, health: e.target.value})} />
                                <InputField label="Fuerza de Voluntad" type="number" value={formData.willpower} onChange={e => setFormData({...formData, willpower: e.target.value})} />
                                <InputField label="Potencia de Sangre" type="number" min="0" max="10" value={formData.blood_potency} onChange={e => setFormData({...formData, blood_potency: e.target.value})} />
                                <InputField label="Hambre" type="number" min="0" max="5" value={formData.hunger} onChange={e => setFormData({...formData, hunger: e.target.value})} />
                                <InputField label="Resonancia" value={formData.resonance} onChange={e => setFormData({...formData, resonance: e.target.value})} />
                            </div>
                        </div>

                        {/* TEXTOS LARGOS */}
                        <div className="space-y-4">
                            <TextAreaField label="Apariencia" value={formData.appearance} onChange={e => setFormData({...formData, appearance: e.target.value})} />
                            <TextAreaField label="Personalidad" value={formData.personality} onChange={e => setFormData({...formData, personality: e.target.value})} />
                            <TextAreaField label="Historia" value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} />
                            <TextAreaField label="Notas" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                        </div>
                    </form>
                ) : (
                    /* MODO LECTURA */
                    <div className="p-8">
                        <div className="flex gap-2 border-b border-neutral-800 mb-6">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-3 flex items-center gap-2 transition-all border-b-2 ${
                                        activeTab === tab.id 
                                            ? 'border-red-600 text-red-500' 
                                            : 'border-transparent text-neutral-500 hover:text-neutral-300'
                                    }`}
                                >
                                    <tab.icon /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoCard title="Información Básica">
                                    {char.player_name && <InfoRow label="Jugador" value={char.player_name} />}
                                    <InfoRow label="Sire" value={char.sire || 'Desconocido'} />
                                    <InfoRow label="Generación" value={char.generation ? `${char.generation}ª` : 'N/A'} />
                                    <InfoRow label="Depredador" value={char.predator_type || 'N/A'} />
                                    <InfoRow label="Tipo" value={char.type === 'PC' ? 'Jugador' : 'NPC'} />
                                </InfoCard>

                                <InfoCard title="Crónica">
                                    <InfoRow label="Ambición" value={char.ambition || 'N/A'} />
                                    <InfoRow label="Deseo" value={char.desire || 'N/A'} />
                                    {char.touchstone && <InfoRow label="Piedra de Toque" value={char.touchstone} />}
                                </InfoCard>

                                <InfoCard title="Stats de Juego">
                                    <InfoRow label="Humanidad" value={`${char.humanity || 7} / 10`} />
                                    <InfoRow label="Potencia de Sangre" value={char.blood_potency || 0} />
                                    <InfoRow label="Hambre" value={`${char.hunger || 1} / 5`} />
                                    <InfoRow label="Resonancia" value={char.resonance || 'Ninguna'} />
                                </InfoCard>

                                {formData.disciplines.length > 0 && (
                                    <InfoCard title="Disciplinas">
                                        <div className="flex flex-wrap gap-3">
                                            {formData.disciplines.map((d, i) => (
                                                <div key={i} className="bg-red-950/30 text-red-400 px-4 py-2 rounded border border-red-900/20">
                                                    <span className="font-bold">{d.name}</span>
                                                    <span className="ml-2 text-red-300">{'●'.repeat(d.level)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </InfoCard>
                                )}
                            </div>
                        )}

                        {activeTab === 'sheet' && (
                            <div className="space-y-8">
                                {/* Atributos */}
                                <div>
                                    <h3 className="text-xl text-red-400 font-serif mb-4">Atributos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {Object.entries(attributeCategories).map(([category, attrs]) => (
                                            <div key={category} className="bg-neutral-950/50 p-4 rounded border border-neutral-800">
                                                <h4 className="text-sm font-bold text-neutral-400 uppercase mb-3">{category}</h4>
                                                {attrs.map(attr => (
                                                    <div key={attr} className="flex justify-between items-center py-2 border-b border-neutral-900 last:border-0">
                                                        <span className="text-neutral-300 capitalize">{attr.replace('_', ' ')}</span>
                                                        <span className="text-red-400">{renderDots(formData.attributes[attr] || 0, 5)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Habilidades */}
                                <div>
                                    <h3 className="text-xl text-red-400 font-serif mb-4">Habilidades</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {Object.entries(skillCategories).map(([category, skills]) => (
                                            <div key={category} className="bg-neutral-950/50 p-4 rounded border border-neutral-800">
                                                <h4 className="text-sm font-bold text-neutral-400 uppercase mb-3">{category}</h4>
                                                {skills.map(skill => {
                                                    const value = formData.skills[skill] || 0;
                                                    if (value === 0) return null;
                                                    return (
                                                        <div key={skill} className="flex justify-between items-center py-2 border-b border-neutral-900 last:border-0">
                                                            <span className="text-neutral-300 capitalize text-sm">{skill.split('_').join(' ')}</span>
                                                            <span className="text-red-400">{renderDots(value, 5)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Ventajas */}
                                {formData.advantages.length > 0 && (
                                    <InfoCard title="Ventajas y Defectos">
                                        <div className="space-y-3">
                                            {formData.advantages.map((adv, i) => (
                                                <div key={i} className="border-b border-neutral-900 pb-2 last:border-0">
                                                    <div className="font-bold text-red-400">{adv.name}</div>
                                                    <div className="text-sm text-neutral-400">{adv.description}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </InfoCard>
                                )}
                            </div>
                        )}

                        {activeTab === 'story' && (
                            <div className="space-y-6">
                                {char.appearance && (
                                    <InfoCard title="Apariencia">
                                        <p className="text-neutral-300 whitespace-pre-wrap">{char.appearance}</p>
                                    </InfoCard>
                                )}
                                {char.personality && (
                                    <InfoCard title="Personalidad">
                                        <p className="text-neutral-300 whitespace-pre-wrap">{char.personality}</p>
                                    </InfoCard>
                                )}
                                {char.background && (
                                    <InfoCard title="Historia">
                                        <p className="text-neutral-300 whitespace-pre-wrap">{char.background}</p>
                                    </InfoCard>
                                )}
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <InfoCard title="Notas del Narrador">
                                <p className="text-neutral-300 whitespace-pre-wrap">{char.notes || 'Sin notas aún.'}</p>
                            </InfoCard>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Componentes auxiliares
const InfoCard = ({ title, children }) => (
    <div className="bg-neutral-950/50 p-6 rounded-lg border border-neutral-800">
        <h3 className="text-red-500 font-serif text-lg mb-4 border-b border-neutral-800 pb-2">{title}</h3>
        {children}
    </div>
);

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-neutral-900 last:border-0">
        <span className="text-neutral-500 text-sm">{label}</span>
        <span className="text-neutral-300 font-medium">{value}</span>
    </div>
);

const InputField = ({ label, type = "text", ...props }) => (
    <div>
        <label className="block text-xs text-neutral-500 font-bold uppercase mb-2">{label}</label>
        <input type={type} className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded" {...props} />
    </div>
);

const TextAreaField = ({ label, ...props }) => (
    <div>
        <label className="block text-xs text-neutral-500 font-bold uppercase mb-2">{label}</label>
        <textarea className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded h-32" {...props} />
    </div>
);

const DotInput = ({ label, value, onChange, max = 5 }) => (
    <div className="flex items-center justify-between gap-3">
        {label && <span className="text-sm text-neutral-400 min-w-[120px]">{label}</span>}
        <div className="flex gap-1">
            {[...Array(max)].map((_, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                        i < value 
                            ? 'bg-red-600 border-red-600' 
                            : 'bg-transparent border-neutral-700 hover:border-red-800'
                    }`}
                >
                    {i < value && <span className="text-white text-xs">●</span>}
                </button>
            ))}
        </div>
    </div>
);

const renderDots = (value, max) => {
    return (
        <span className="flex gap-1">
            {[...Array(max)].map((_, i) => (
                <span key={i} className={i < value ? 'text-red-600' : 'text-neutral-700'}>●</span>
            ))}
        </span>
    );
};

export default CharacterDetail;