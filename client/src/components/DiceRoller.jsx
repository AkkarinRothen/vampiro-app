// DiceRoller.jsx
import { useState } from 'react';
import { FaDiceD20 } from 'react-icons/fa';
import toast from 'react-hot-toast';

function DiceRoller() {
  const [pool, setPool] = useState(5);
  const [hunger, setHunger] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState(null);

  const rollDice = () => {
    setRolling(true);
    
    // Simular tirada
    setTimeout(() => {
      const normalDice = Array(pool - hunger).fill(0)
        .map(() => Math.floor(Math.random() * 10) + 1);
      const hungerDice = Array(hunger).fill(0)
        .map(() => Math.floor(Math.random() * 10) + 1);
      
      const successes = [...normalDice, ...hungerDice]
        .filter(d => d >= 6).length;
      
      const criticals = Math.floor(
        [...normalDice, ...hungerDice].filter(d => d === 10).length / 2
      );
      
      const messyCritical = hungerDice.filter(d => d === 10).length >= 2;
      const bestialFailure = successes === 0 && 
        hungerDice.filter(d => d === 1).length > 0;
      
      setResults({ 
        normalDice, 
        hungerDice, 
        successes, 
        criticals,
        messyCritical,
        bestialFailure 
      });
      
      // Notificación temática
      if (bestialFailure) {
        toast.error('🐺 ¡Bestial Failure!', {
          style: { background: '#7f1d1d', color: '#fff' }
        });
      } else if (messyCritical) {
        toast('🩸 Messy Critical...', {
          style: { background: '#991b1b', color: '#fff' }
        });
      } else if (criticals > 0) {
        toast.success(`⚡ ${criticals} Critical${criticals > 1 ? 's' : ''}!`);
      }
      
      setRolling(false);
    }, 1000);
  };

  return (
    <div className="bg-neutral-900 p-6 rounded-lg border border-red-900">
      <h3 className="text-2xl font-serif text-red-600 mb-4">
        🎲 Dice Roller
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-neutral-400">Dice Pool</label>
          <input 
            type="number" 
            min="1" 
            max="20"
            value={pool}
            onChange={(e) => setPool(parseInt(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded"
          />
        </div>
        
        <div>
          <label className="text-sm text-neutral-400">Hunger Dice</label>
          <input 
            type="number" 
            min="0" 
            max="5"
            value={hunger}
            onChange={(e) => setHunger(parseInt(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 p-2 rounded"
          />
        </div>
        
        <button
          onClick={rollDice}
          disabled={rolling}
          className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded font-bold disabled:opacity-50"
        >
          {rolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
        </button>
        
        {results && (
          <div className="mt-4 p-4 bg-black/30 rounded">
            <div className="flex gap-2 mb-2">
              {results.normalDice.map((d, i) => (
                <div key={i} className={`w-10 h-10 bg-neutral-800 rounded flex items-center justify-center font-bold ${d >= 6 ? 'text-green-500' : 'text-neutral-500'}`}>
                  {d}
                </div>
              ))}
              {results.hungerDice.map((d, i) => (
                <div key={i} className={`w-10 h-10 bg-red-900 rounded flex items-center justify-center font-bold ${d >= 6 ? 'text-white' : 'text-red-300'}`}>
                  {d}
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {results.successes} Success{results.successes !== 1 ? 'es' : ''}
              </p>
              {results.criticals > 0 && (
                <p className="text-yellow-500">
                  +{results.criticals} Critical{results.criticals > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiceRoller;