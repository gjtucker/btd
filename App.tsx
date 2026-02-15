import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './services/GameEngine';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DIFFICULTY_PRESETS, TOWERS } from './constants';
import { BloonColor, GameDifficulty, TowerConfig, Upgrade } from './types';
import { Play, RotateCcw, DollarSign, Heart, Trophy, Info, Zap, TrendingUp } from 'lucide-react';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.Medium);
  const [money, setMoney] = useState(DIFFICULTY_PRESETS[GameDifficulty.Medium].startingMoney);
  const [lives, setLives] = useState(DIFFICULTY_PRESETS[GameDifficulty.Medium].startingLives);
  const [round, setRound] = useState(1);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerConfig | null>(null);
  const [activeTowerStats, setActiveTowerStats] = useState<{id: number, damage: number, strategy: string, upgrades: Upgrade[], currentIdx: number, isFarm: boolean} | null>(null);
  const [roundPreview, setRoundPreview] = useState<string[]>([]);

  const updateStats = useCallback(() => {
    if (engineRef.current) {
      setMoney(engineRef.current.money);
      setLives(engineRef.current.lives);
      setRound(engineRef.current.round);
      setIsRoundActive(engineRef.current.isRoundActive);
      setIsGameOver(engineRef.current.isGameOver);
      setRoundPreview(
        engineRef.current.getRoundPreview().map(group => `${group.count}x ${group.type}`)
      );
      
      if (selectedTowerId !== null) {
          const t = engineRef.current.towers.find(tower => tower.id === selectedTowerId);
          if (t) {
              setActiveTowerStats({
                  id: t.id,
                  damage: t.totalDamageDealt,
                  strategy: t.strategy,
                  upgrades: t.config.upgrades,
                  currentIdx: t.currentUpgrades,
                  isFarm: t.config.id === 'FARM'
              });
          } else {
              setSelectedTowerId(null);
              setActiveTowerStats(null);
          }
      }
    }
  }, [selectedTowerId]);

  const updateStatsRef = useRef(updateStats);
  useEffect(() => {
    updateStatsRef.current = updateStats;
  }, [updateStats]);

  useEffect(() => {
    const engine = new GameEngine(() => updateStatsRef.current(), difficulty);
    engineRef.current = engine;
    updateStatsRef.current();

    const animate = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      const safeDt = Math.min(dt, 0.1); 
      if (engineRef.current) {
        engineRef.current.update(safeDt);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) engineRef.current.draw(ctx);
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [difficulty]);

  const syncSelectedTowerStats = useCallback((towerId: number | null) => {
    if (!engineRef.current || towerId === null) {
      setActiveTowerStats(null);
      return;
    }

    const tower = engineRef.current.towers.find((existingTower) => existingTower.id === towerId);
    if (!tower) {
      setSelectedTowerId(null);
      setActiveTowerStats(null);
      engineRef.current.selectedTowerId = null;
      return;
    }

    setActiveTowerStats({
      id: tower.id,
      damage: tower.totalDamageDealt,
      strategy: tower.strategy,
      upgrades: tower.config.upgrades,
      currentIdx: tower.currentUpgrades,
      isFarm: tower.config.id === 'FARM',
    });
  }, []);

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: (clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    if (selectedTowerType) {
      const success = engineRef.current.placeTower(coords.x, coords.y, selectedTowerType);
      if (success) {
        setSelectedTowerType(null);
        engineRef.current.selectedTowerPlacement = null;
      }
    } else {
      const clickedTower = engineRef.current.towers.find(t => Math.sqrt((t.x - coords.x)**2 + (t.y - coords.y)**2) < 25);
      if (clickedTower) {
        setSelectedTowerId(clickedTower.id);
        engineRef.current.selectedTowerId = clickedTower.id;
        syncSelectedTowerStats(clickedTower.id);
      } else {
        setSelectedTowerId(null);
        engineRef.current.selectedTowerId = null;
        syncSelectedTowerStats(null);
      }
    }
  }, [getCanvasCoordinates, selectedTowerType, syncSelectedTowerStats]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    engineRef.current.hoverPos = coords;
  }, [getCanvasCoordinates]);

  const startRound = useCallback(() => engineRef.current?.startRound(), []);
  const sellSelectedTower = useCallback(() => { if (selectedTowerId !== null) { engineRef.current?.sellTower(selectedTowerId); setSelectedTowerId(null); syncSelectedTowerStats(null); } }, [selectedTowerId, syncSelectedTowerStats]);
  const changeStrategy = useCallback(() => { if (selectedTowerId !== null) { engineRef.current?.changeStrategy(selectedTowerId); updateStats(); } }, [selectedTowerId, updateStats]);
  const buyUpgrade = useCallback(() => { if (selectedTowerId !== null) { engineRef.current?.upgradeTower(selectedTowerId); updateStats(); } }, [selectedTowerId, updateStats]);

  const bloonBadgeColor: Record<BloonColor, string> = {
    [BloonColor.Red]: 'bg-red-500',
    [BloonColor.Blue]: 'bg-blue-500',
    [BloonColor.Green]: 'bg-green-500',
    [BloonColor.Yellow]: 'bg-yellow-400 text-black',
    [BloonColor.Pink]: 'bg-pink-500',
    [BloonColor.Black]: 'bg-slate-900',
    [BloonColor.White]: 'bg-slate-200 text-black',
    [BloonColor.Lead]: 'bg-slate-500',
    [BloonColor.Zebra]: 'bg-gradient-to-r from-slate-900 to-slate-100 text-black',
    [BloonColor.Rainbow]: 'bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 text-black',
    [BloonColor.Ceramic]: 'bg-orange-200 text-orange-900',
    [BloonColor.MOAB]: 'bg-blue-600 text-white',
  };

  const selectDifficulty = useCallback((nextDifficulty: GameDifficulty) => {
    if (nextDifficulty === difficulty) {
      return;
    }

    const confirmed = window.confirm('Changing difficulty will reset your current game. Continue?');
    if (!confirmed) {
      return;
    }

    setDifficulty(nextDifficulty);
    setSelectedTowerId(null);
    setSelectedTowerType(null);
    setActiveTowerStats(null);
  }, [difficulty]);

  return (
    <div className="flex h-screen w-screen flex-col-reverse lg:flex-row bg-slate-900 text-white overflow-hidden font-sans">
      <div className="w-full lg:w-80 bg-slate-800 flex flex-col border-t lg:border-t-0 lg:border-r border-slate-700 shadow-xl z-10 max-h-[45vh] lg:max-h-none overflow-y-auto">
        <div className="p-4 lg:p-6 bg-slate-900 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-yellow-400 tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6" /> BTD Clone Pro
          </h1>
          <p className="text-slate-400 text-xs mt-1">Advanced Defense Systems</p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 lg:gap-4 lg:p-4 border-b border-slate-700 bg-slate-800/50">
           <div className="flex items-center gap-2 text-green-400 font-mono text-lg font-bold">
              <DollarSign className="w-5 h-5" /> {Math.floor(money)}
           </div>
           <div className="flex items-center gap-2 text-red-400 font-mono text-lg font-bold">
              <Heart className="w-5 h-5" /> {lives}
           </div>
           <div className="col-span-2 flex items-center justify-between text-blue-300 font-mono text-sm bg-slate-900 p-2 rounded">
              <span>Round {round}</span>
              {isRoundActive ? <span className="text-yellow-400 animate-pulse text-xs uppercase font-bold">Active</span> : <span className="text-slate-500 text-xs uppercase font-bold">Ready</span>}
           </div>
        </div>


        <div className="px-3 lg:px-4 pb-3 lg:pb-4 border-b border-slate-700 space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(GameDifficulty).map((mode) => (
                <button
                  key={mode}
                  onClick={() => selectDifficulty(mode)}
                  disabled={isRoundActive}
                  className={`text-[10px] py-2 rounded border transition-colors font-bold uppercase ${
                    difficulty === mode
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  } ${isRoundActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {DIFFICULTY_PRESETS[mode].label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Next Round Intel</p>
            {roundPreview.length > 0 ? (
              <div className="space-y-1">
                {roundPreview.map((entry) => {
                  const [countPart, typePart] = entry.split('x ');
                  const bloonType = typePart as BloonColor;
                  return (
                    <div key={entry} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">{countPart.trim()} bloons</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${bloonBadgeColor[bloonType]}`}>{bloonType}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No more scripted rounds.</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2 lg:space-y-3 scrollbar-hide">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Monkey Academy</h2>
          {Object.values(TOWERS).map((tower) => (
            <button
              key={tower.id}
              onClick={() => { setSelectedTowerType(tower); if(engineRef.current) engineRef.current.selectedTowerPlacement = tower; }}
              disabled={money < tower.cost}
              className={`w-full flex items-center p-3 rounded-lg border transition-all duration-200 group ${
                selectedTowerType?.id === tower.id ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500 shadow-blue-900/40 shadow-inner' : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500'
              } ${money < tower.cost ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800" style={{ backgroundColor: tower.color }}>
                 <span className="text-xs font-bold text-white drop-shadow-md">{tower.id[0]}</span>
              </div>
              <div className="ml-3 text-left flex-1">
                <div className="font-bold text-sm text-slate-100">{tower.name}</div>
                <div className="text-xs text-yellow-400 font-mono">${tower.cost}</div>
              </div>
            </button>
          ))}
        </div>
        
        {selectedTowerId !== null && activeTowerStats && (
            <div className="p-4 bg-slate-700 border-t border-slate-600 shadow-2xl animate-in slide-in-from-bottom">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-black text-white uppercase italic">Active Intel</h3>
                    <div className="px-2 py-0.5 bg-slate-800 text-blue-400 text-[10px] rounded font-bold uppercase">{activeTowerStats.isFarm ? 'Support' : activeTowerStats.strategy}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-800 p-2 rounded border border-slate-600">
                        <div className="text-[10px] text-slate-400 uppercase">{activeTowerStats.isFarm ? 'Cash Generated' : 'Confirmed Pops'}</div>
                        <div className="text-lg font-mono text-white leading-none">{activeTowerStats.damage}</div>
                    </div>
                    {activeTowerStats.isFarm ? (
                    <div className="bg-slate-800 p-2 rounded border border-slate-600 text-[10px] text-green-300 flex flex-col items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3" /> Passive Income
                    </div>
                    ) : (
                    <button onClick={changeStrategy} className="bg-slate-800 hover:bg-slate-900 p-2 rounded border border-slate-600 text-[10px] text-blue-300 flex flex-col items-center justify-center gap-1 transition-colors">
                        <TrendingUp className="w-3 h-3" /> Change Focus
                    </button>
                    )}
                </div>

                <div className="space-y-2">
                    {activeTowerStats.currentIdx < activeTowerStats.upgrades.length ? (
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-yellow-500/30">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Zap className="w-3 h-3"/> {activeTowerStats.upgrades[activeTowerStats.currentIdx].name}</span>
                                <span className="text-xs font-mono text-green-400">${activeTowerStats.upgrades[activeTowerStats.currentIdx].cost}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mb-2 leading-tight">{activeTowerStats.upgrades[activeTowerStats.currentIdx].description}</p>
                            <button 
                                onClick={buyUpgrade}
                                disabled={money < activeTowerStats.upgrades[activeTowerStats.currentIdx].cost}
                                className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-600 disabled:opacity-50 text-white text-[10px] font-bold py-1.5 rounded uppercase shadow-lg shadow-yellow-900/20 transition-all"
                            >
                                Upgrade Now
                            </button>
                        </div>
                    ) : (
                        <div className="bg-green-900/20 border border-green-500/30 p-2 rounded text-center">
                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Maxed Out</span>
                        </div>
                    )}
                </div>

                <button onClick={sellSelectedTower} className="mt-3 w-full bg-red-900/30 hover:bg-red-900/50 text-red-300 text-[10px] font-bold py-1 rounded border border-red-800/50 transition-colors uppercase">
                    Liquidate Assets
                </button>
            </div>
        )}

        <div className="p-3 lg:p-4 border-t border-slate-700 bg-slate-900">
          {!isGameOver ? (
            <button
              onClick={startRound}
              disabled={isRoundActive}
              className={`w-full py-4 rounded-xl font-black text-lg shadow-2xl flex items-center justify-center gap-2 transition-all transform active:scale-95 uppercase tracking-wider ${
                isRoundActive ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-green-900/40 ring-2 ring-green-400/20'
              }`}
            >
              {isRoundActive ? "Hostiles Inbound..." : <><Play className="w-5 h-5 fill-current" /> Deploy Round {round}</>}
            </button>
          ) : (
              <button onClick={() => window.location.reload()} className="w-full py-4 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-500 text-white shadow-lg flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5" /> Try Again</button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950 flex items-center justify-center relative overflow-hidden p-2 lg:p-6">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border-2 lg:border-4 border-slate-800 bg-slate-900 w-full max-w-[800px]">
            {isGameOver && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                    <h2 className="text-8xl font-black text-red-600 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] mb-4 animate-pulse uppercase italic">Defeat</h2>
                    <p className="text-2xl text-slate-300 tracking-widest font-mono">You survived until Round {round}</p>
                    <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-red-600 text-white font-black rounded uppercase hover:bg-red-500 transition-colors">Return to Base</button>
                </div>
            )}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              className="cursor-crosshair block w-full h-auto touch-none"
            />
            {round === 1 && !isRoundActive && !selectedTowerType && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-xs font-bold backdrop-blur-lg pointer-events-none flex items-center gap-3 border border-slate-700 shadow-2xl animate-bounce">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                    SELECT A MONKEY TO BEGIN DEFENSES
                </div>
            )}
             {selectedTowerType && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600/90 text-white px-8 py-4 rounded-full text-sm font-black shadow-[0_0_30px_rgba(37,99,235,0.5)] animate-in fade-in zoom-in pointer-events-none uppercase tracking-tighter">
                    Deploying {selectedTowerType.name}
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default App;
