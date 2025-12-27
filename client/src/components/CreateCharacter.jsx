import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSave, FaTimes, FaTrash } from 'react-icons/fa';

function CreateCharacter() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const disciplinesList = [
        'Animalismo', 'Auspex', 'Celeridad', 'Dominación', 'Fortaleza', 'Ofuscación',
        'Potencia', 'Presencia', 'Protean', 'Hechicería de Sangre', 'Taumaturgia', 'Nigromancia'
    ];

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

    const [formData, setFormData] = useState({
        name: '',
        clan: '',
        generation: '',
        type: 'NPC',
        image_url: '',
        predator_type: '',
        is_hidden: false,
        creature_type: 'vampire',
        player_name: '',
        sire: '',
        ambition: '',
        desire: '',
        chronicle_tenets: '',
        touchstone: '',
        humanity: 7,
        health: 10,
        willpower: 5,
        blood_potency: 0,
        hunger: 1,
        resonance: '',
        attributes: {},
        skills: {},
        disciplines: [],
        advantages: [],
        appearance: '',
        personality: '',
        background: '',
        notes: ''
    });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image_url: reader.result });
            };
            reader.readAsDataURL(file);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                alert('✅ Personaje creado exitosamente');
                navigate(`/characters/${data.id}`);
            } else {
                const error = await res.json();
                alert('❌ Error: ' + (error.error || 'No se pudo crear el personaje'));
            }
        } catch (err) {
            console.error(err);
            alert('❌ Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl p-8">
                    <div className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-4">
                        <h1 className="text-3xl font-serif text-red-500">Crear Nuevo Personaje</h1>
                        <button 
                            onClick={() => navigate('/characters')} 
                            className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700 flex items-center gap-2"
                        >
                            <FaTimes /> Cancelar
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* INFORMACIÓN BÁSICA */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Información Básica</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField 
                                    label="Nombre del Personaje *" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                                <InputField 
                                    label="Jugador" 
                                    value={formData.player_name} 
                                    onChange={e => setFormData({...formData, player_name: e.target.value})}
                                    placeholder="Nombre del jugador"
                                />
                                <InputField 
                                    label="Clan" 
                                    value={formData.clan} 
                                    onChange={e => setFormData({...formData, clan: e.target.value})}
                                />
                                <InputField 
                                    label="Depredador" 
                                    value={formData.predator_type} 
                                    onChange={e => setFormData({...formData, predator_type: e.target.value})}
                                />
                                <InputField 
                                    label="Sire" 
                                    value={formData.sire} 
                                    onChange={e => setFormData({...formData, sire: e.target.value})}
                                />
                                <InputField 
                                    label="Generación" 
                                    type="number" 
                                    value={formData.generation} 
                                    onChange={e => setFormData({...formData, generation: e.target.value})}
                                />
                                <InputField 
                                    label="Ambición" 
                                    value={formData.ambition} 
                                    onChange={e => setFormData({...formData, ambition: e.target.value})}
                                />
                                <InputField 
                                    label="Deseo" 
                                    value={formData.desire} 
                                    onChange={e => setFormData({...formData, desire: e.target.value})}
                                />
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

                            <div className="mt-4">
                                <label className="block text-xs text-neutral-500 font-bold uppercase mb-2">Imagen</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="w-full bg-neutral-950 border border-neutral-700 p-3 rounded"
                                />
                                {formData.image_url && (
                                    <img src={formData.image_url} alt="Preview" className="mt-4 w-full h-48 object-cover rounded" />
                                )}
                            </div>
                        </section>

                        {/* ATRIBUTOS */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Atributos</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(attributeCategories).map(([category, attrs]) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">{category}</h3>
                                        <div className="space-y-3">
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
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* HABILIDADES */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Habilidades</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Object.entries(skillCategories).map(([category, skills]) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">{category}</h3>
                                        <div className="space-y-2">
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
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* DISCIPLINAS */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Disciplinas</h2>
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
                        </section>

                        {/* VENTAJAS */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Ventajas y Defectos</h2>
                            <div className="space-y-3">
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
                        </section>

                        {/* STATS */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Stats de Juego</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <InputField label="Humanidad" type="number" min="0" max="10" value={formData.humanity} onChange={e => setFormData({...formData, humanity: e.target.value})} />
                                <InputField label="Salud" type="number" value={formData.health} onChange={e => setFormData({...formData, health: e.target.value})} />
                                <InputField label="Fuerza de Voluntad" type="number" value={formData.willpower} onChange={e => setFormData({...formData, willpower: e.target.value})} />
                                <InputField label="Potencia de Sangre" type="number" min="0" max="10" value={formData.blood_potency} onChange={e => setFormData({...formData, blood_potency: e.target.value})} />
                                <InputField label="Hambre" type="number" min="0" max="5" value={formData.hunger} onChange={e => setFormData({...formData, hunger: e.target.value})} />
                                <InputField label="Resonancia" value={formData.resonance} onChange={e => setFormData({...formData, resonance: e.target.value})} />
                            </div>
                        </section>

                        {/* DESCRIPCIÓN */}
                        <section>
                            <h2 className="text-xl text-red-400 font-serif border-b border-neutral-800 pb-2 mb-4">Descripción</h2>
                            <div className="space-y-4">
                                <TextAreaField label="Apariencia" value={formData.appearance} onChange={e => setFormData({...formData, appearance: e.target.value})} />
                                <TextAreaField label="Personalidad" value={formData.personality} onChange={e => setFormData({...formData, personality: e.target.value})} />
                                <TextAreaField label="Historia" value={formData.background} onChange={e => setFormData({...formData, background: e.target.value})} />
                                <TextAreaField label="Notas del Narrador" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                            </div>
                        </section>

                        {/* BOTÓN DE ENVÍO */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-neutral-800">
                            <button 
                                type="button"
                                onClick={() => navigate('/characters')}
                                className="px-6 py-3 bg-neutral-800 rounded hover:bg-neutral-700"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-3 bg-red-900 text-white rounded hover:bg-red-800 flex items-center gap-2 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="animate-spin">⏳</span> Creando...
                                    </>
                                ) : (
                                    <>
                                        <FaSave /> Crear Personaje
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Componentes auxiliares
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

export default CreateCharacter;