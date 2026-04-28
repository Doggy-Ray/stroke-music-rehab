import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, Activity, FileText, Settings, HeartPulse, Brain, User, PlusCircle, Download, Clock, Music, LogIn, LogOut, ChevronRight, Wand2, ListMusic, Sparkles, Loader2, PlayCircle } from 'lucide-react';

export default function App() {
  // 这段逻辑我用来管理应用的顶层路由状态
  const [currentView, setCurrentView] = useState('login');
  const [therapistId, setTherapistId] = useState('');
  const [role, setRole] = useState('');
  
  // 这段逻辑我用来管理医生端的非线性多任务流
  const [doctorTab, setDoctorTab] = useState('therapy'); // 'therapy' | 'studio'

  // 这段逻辑我用来维护患者与处方状态
  const [patient, setPatient] = useState({ name: '', target: 'motor', type: 'cognitive' });
  const [sessionActive, setSessionActive] = useState(false);
  
  // 这段逻辑我用来控制核心治疗面板的音频状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [volume, setVolume] = useState(50);
  const [durationPreset, setDurationPreset] = useState(60);
  
  // 这段逻辑我用来支撑AI Studio音乐生成沙盒的状态
  const [studioTracks, setStudioTracks] = useState([
    { id: '1', title: '舒缓上肢抬举伴奏', style: 'Ambient, Pentatonic, 60BPM', duration: '1:00', createdAt: '10:00' },
    { id: '2', title: '注意力聚焦脉冲', style: 'Electronic, Minimal, 80BPM', duration: '2:00', createdAt: '11:30' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studioPrompt, setStudioPrompt] = useState('');
  const [studioStyle, setStudioStyle] = useState('ambient');
  const [previewTrack, setPreviewTrack] = useState(null);

  // 记录和报告状态
  const [logs, setLogs] = useState([]);
  const [report, setReport] = useState(null);
  
  // 视觉与倒计时
  const [activeBeat, setActiveBeat] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // 底层音频硬件引用
  const audioCtx = useRef(null);
  const timerId = useRef(null);
  const noteIndex = useRef(0);
  
  const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00];

  // 这里我封装了底层发声逻辑
  const playDing = useCallback(() => {
    if (!audioCtx.current) return;
    const context = audioCtx.current;
    const osc = context.createOscillator();
    const gainNode = context.createGain();
    
    const freq = pentatonicScale[noteIndex.current % pentatonicScale.length];
    noteIndex.current = (noteIndex.current + Math.floor(Math.random() * 2) + 1) % pentatonicScale.length;
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, context.currentTime);
    
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime((volume / 100) * 0.5, context.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(context.destination);
    
    osc.start(context.currentTime);
    osc.stop(context.currentTime + 0.5);

    setActiveBeat(true);
    setTimeout(() => setActiveBeat(false), 150);
  }, [volume]);

  // BPM时钟劫持
  useEffect(() => {
    if (isPlaying && doctorTab === 'therapy' && currentView === 'session') {
      if (timerId.current) clearInterval(timerId.current);
      const intervalMs = (60 / bpm) * 1000;
      timerId.current = setInterval(() => {
        playDing();
      }, intervalMs);
    } else {
      if (timerId.current) clearInterval(timerId.current);
    }
    return () => {
      if (timerId.current) clearInterval(timerId.current);
    };
  }, [isPlaying, bpm, playDing, doctorTab, currentView]);

  // 倒计时任务
  useEffect(() => {
    let countdownTimer;
    if (isPlaying && remainingTime > 0 && currentView === 'session') {
      countdownTimer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownTimer);
  }, [isPlaying, remainingTime, currentView]);

  const togglePlay = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
    if (!isPlaying && remainingTime === 0) {
      setRemainingTime(durationPreset);
    }
    setIsPlaying(!isPlaying);
    setSessionActive(true);
  };

  const addLog = (eventText, type = 'info') => {
    const newLog = { time: new Date().toLocaleTimeString(), event: eventText, type };
    setLogs(prev => [newLog, ...prev]);
  };

  const finishPatientSession = () => {
    setIsPlaying(false);
    setCurrentView('patient_done');
  };

  const generateReport = () => {
    setIsPlaying(false);
    const positiveLogs = logs.filter(l => l.type === 'positive').length;
    const negativeLogs = logs.filter(l => l.type === 'warning').length;
    const evaluation = positiveLogs > negativeLogs 
      ? '配合度良好，注意力维持稳定，建议保持当前难度。' 
      : '存在疲劳或注意力分散迹象，建议下次降低BPM或缩短单次训练时长。';
    const hwTemplate = patient.target === 'motor' 
      ? '1. 每日跟随60BPM节拍进行患侧上肢抬举10次。\n2. 播放舒缓音乐进行5分钟抓握放松。'
      : '1. 每日跟随80BPM节拍进行词汇跟读。\n2. 听30秒短句音乐，尝试复述节奏。';

    setReport({ info: patient, sessionData: { duration: durationPreset - remainingTime, startBpm: bpm }, logs, evaluation, hwTemplate });
    setCurrentView('report');
  };

  // 这段逻辑我用来模拟Suno风格的AI异步生成队列
  const handleGenerateMusic = () => {
    if (!studioPrompt) return;
    setIsGenerating(true);
    // 强制锁死2秒模拟计算耗时
    setTimeout(() => {
      const newTrack = {
        id: Date.now().toString(),
        title: `生成轨: ${studioPrompt.substring(0, 10)}...`,
        style: `${studioStyle.toUpperCase()}, ${Math.floor(Math.random() * 40 + 60)}BPM`,
        duration: '1:30',
        createdAt: new Date().toLocaleTimeString()
      };
      setStudioTracks(prev => [newTrack, ...prev]);
      setIsGenerating(false);
      setStudioPrompt('');
    }, 2000);
  };

  const QuickLogButton = ({ text, type, icon: Icon }) => (
    <button 
      onClick={() => addLog(text, type)}
      className={`flex items-center p-2 rounded text-sm font-medium border transition-colors ${
        type === 'positive' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 
        type === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 
        'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
      }`}
    >
      <Icon className="w-4 h-4 mr-1" />{text}
    </button>
  );

  const renderLogin = () => (
    <div className="flex items-center justify-center min-h-screen bg-neutral-100 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full"><Brain className="text-white w-8 h-8" /></div>
        </div>
        <h1 className="text-2xl font-bold text-center text-neutral-800 mb-6">脑卒中音乐康复系统</h1>
        
        <div className="space-y-6">
          <div className="border-b border-neutral-100 pb-6">
            <label className="block text-sm font-bold text-neutral-700 mb-2">我是医生 / 治疗师</label>
            <input 
              type="text" 
              className="w-full p-3 border border-neutral-200 rounded-lg bg-neutral-50 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={therapistId}
              onChange={e => setTherapistId(e.target.value)}
              placeholder="输入工号登入工作站"
            />
            <button 
              onClick={() => { if (therapistId) { setRole('doctor'); setDoctorTab('therapy'); setCurrentView('setup'); } }}
              className="w-full bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-5 h-5 mr-2" /> 登入控制台
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">我是康复患者</label>
            <button 
              onClick={() => { 
                setRole('patient'); 
                setPatient({ name: '测试患者', target: 'motor', type: 'cognitive' }); 
                setCurrentView('patient_home'); 
              }}
              className="w-full bg-green-600 text-white p-3 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors"
            >
              <User className="w-5 h-5 mr-2" /> 进入居家训练端
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 这段逻辑我用来处理“自动匹配音乐”的需求，通过监听 target 改变推荐处方参数
  const getRecommendation = () => {
    switch(patient.target) {
      case 'motor': return { bpm: 60, desc: '节律稳定，重音明显，适合肢体同步跟随。' };
      case 'cognitive': return { bpm: 80, desc: '旋律简单，音高变化少，避免认知过载。' };
      case 'speech': return { bpm: 90, desc: '自然语调 (叮叮当)，适合言语流利度诱导。' };
      default: return { bpm: 60, desc: '通用基础音效。' };
    }
  };

  const renderSetup = () => {
    const rec = getRecommendation();
    return (
      <div className="max-w-4xl mx-auto mt-6 flex gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm flex-1">
          <h2 className="text-lg font-bold text-neutral-800 mb-4 border-b pb-2">1. 输入来访者信息</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">患者姓名</label>
              <input 
                type="text" placeholder="必填" 
                className="w-full p-2 border border-neutral-200 rounded-md bg-neutral-50"
                value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">主要治疗目标</label>
              <select 
                className="w-full p-2 border border-neutral-200 rounded-md bg-neutral-50"
                value={patient.target} onChange={e => {
                  setPatient({...patient, target: e.target.value});
                  // 触发自动匹配策略
                  if (e.target.value === 'motor') setBpm(60);
                  if (e.target.value === 'cognitive') setBpm(80);
                  if (e.target.value === 'speech') setBpm(90);
                }}
              >
                <option value="motor">运动功能康复 (Motor)</option>
                <option value="cognitive">认知注意力 (Cognitive)</option>
                <option value="speech">言语流畅度 (Speech)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">预定训练时长</label>
              <div className="flex space-x-2">
                {[30, 60, 90, 120].map(time => (
                  <button
                    key={time} onClick={() => setDurationPreset(time)}
                    className={`flex-1 py-2 text-sm rounded ${durationPreset === time ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    {time} 秒
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 自动匹配音乐引擎面板 */}
        <div className="w-80 bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-blue-800 mb-4 flex items-center"><Sparkles className="w-4 h-4 mr-2" /> 系统自动匹配音乐特征</h2>
            <div className="bg-white p-4 rounded-lg shadow-inner mb-4">
              <div className="text-xs text-neutral-400 mb-1">推荐基准 BPM</div>
              <div className="text-3xl font-mono text-blue-600">{rec.bpm}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-inner text-sm text-neutral-600">
              {rec.desc}
            </div>
          </div>
          <button 
            onClick={() => { setLogs([]); setReport(null); setCurrentView('session'); }}
            disabled={!patient.name}
            className="w-full mt-6 bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            应用处方并开启干预 <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  const renderDoctorSession = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <div className="bg-white p-6 rounded-xl shadow-sm h-fit border border-blue-100">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-6 flex justify-between items-center border-b pb-3">
          <span className="flex items-center"><Settings className="w-4 h-4 mr-2" /> 实时下发控制台</span>
          <span className="text-blue-600 font-mono text-xs bg-blue-50 px-2 py-1 rounded">监控患者: {patient.name}</span>
        </h2>
        <div className="space-y-8">
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>干预节奏速 (BPM)</span>
              <span className="font-mono bg-neutral-100 px-2 rounded text-blue-700">{bpm}</span>
            </div>
            <input 
              type="range" min="40" max="120" value={bpm} 
              onChange={(e) => { setBpm(Number(e.target.value)); addLog(`调整BPM至 ${e.target.value}`); }}
              className="w-full accent-blue-600"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>刺激强度 (音量)</span>
              <span className="font-mono bg-neutral-100 px-2 rounded text-blue-700">{volume}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
          <div className="pt-6 border-t border-neutral-100 flex justify-center">
            <button 
              onClick={togglePlay}
              className={`flex items-center px-6 py-3 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95 ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isPlaying ? <><Pause className="w-5 h-5 mr-2" /> 中断治疗流</> : <><Play className="w-5 h-5 mr-2" /> 启动治疗流</>}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col h-[500px] border border-neutral-200">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center border-b pb-3">
          <Activity className="w-4 h-4 mr-2" /> 实时行为记录与特征提取
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <QuickLogButton text="情绪稳定" type="positive" icon={HeartPulse} />
          <QuickLogButton text="配合度高" type="positive" icon={User} />
          <QuickLogButton text="出现疲劳" type="warning" icon={Activity} />
          <QuickLogButton text="注意分散" type="warning" icon={Brain} />
        </div>
        <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg p-4 overflow-y-auto space-y-3">
          {logs.length === 0 ? <p className="text-xs text-neutral-400 text-center mt-20">点击上方标签记录...</p> : 
            logs.map((log, i) => (
              <div key={i} className="text-sm flex items-start border-b border-neutral-100 pb-2">
                <span className="text-neutral-400 font-mono w-20 flex-shrink-0">{log.time}</span>
                <span className={`flex-1 ${log.type === 'warning' ? 'text-orange-600 font-medium' : log.type === 'positive' ? 'text-green-600 font-medium' : 'text-neutral-600'}`}>{log.event}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );

  // 这段逻辑我用来渲染完全模仿主流AIGC界面的医生私有工具栏
  const renderDoctorStudio = () => (
    <div className="mt-4 flex flex-col h-[calc(100vh-160px)] bg-neutral-900 rounded-xl overflow-hidden shadow-2xl text-neutral-200 border border-neutral-800">
      
      {/* 顶部工具栏 */}
      <div className="h-14 bg-neutral-950 border-b border-neutral-800 flex items-center px-6 justify-between">
        <div className="flex items-center space-x-2">
          <Wand2 className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-white tracking-wide">AI 处方音乐生成器 (Studio Beta)</span>
        </div>
        <div className="text-xs text-neutral-500">剩余积分: 950 credits</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧 Prompt 侧边栏 */}
        <div className="w-80 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col overflow-y-auto">
          <label className="text-sm font-medium text-neutral-400 mb-2">定制提示词 (Prompt)</label>
          <textarea 
            className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none mb-4"
            placeholder="例如: 旋律简单，音高变化少，适合脑卒中患者进行运动跟随，含有微弱的钢琴叮咚声..."
            value={studioPrompt}
            onChange={(e) => setStudioPrompt(e.target.value)}
          />

          <label className="text-sm font-medium text-neutral-400 mb-2">基准流派 (Style of Music)</label>
          <select 
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 focus:outline-none mb-4"
            value={studioStyle}
            onChange={(e) => setStudioStyle(e.target.value)}
          >
            <option value="ambient">纯净环境音 (Ambient)</option>
            <option value="pentatonic">五声音阶 (Pentatonic)</option>
            <option value="rhythmic">强节奏节拍器 (Rhythmic)</option>
          </select>

          <label className="text-sm font-medium text-neutral-400 mb-2">目标生成时长</label>
          <div className="flex space-x-2 mb-8">
            <button className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded text-xs border border-neutral-700">30s</button>
            <button className="flex-1 bg-indigo-900/50 text-indigo-300 border border-indigo-500 py-2 rounded text-xs">1m</button>
            <button className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded text-xs border border-neutral-700">2m</button>
          </div>

          <button 
            onClick={handleGenerateMusic}
            disabled={!studioPrompt || isGenerating}
            className="mt-auto w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 生成演算中...</> : <><Sparkles className="w-5 h-5 mr-2" /> 生成音乐资产 (Create)</>}
          </button>
        </div>

        {/* 右侧 Feed 流区 */}
        <div className="flex-1 bg-neutral-950 p-6 overflow-y-auto">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center">
            <ListMusic className="w-5 h-5 mr-2 text-neutral-400" /> 我的音频资产库
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {isGenerating && (
              <div className="bg-neutral-900 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between opacity-70 animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-neutral-800 rounded-md flex items-center justify-center mr-4">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                  <div>
                    <div className="h-4 w-32 bg-neutral-800 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-neutral-800 rounded"></div>
                  </div>
                </div>
              </div>
            )}
            
            {studioTracks.map(track => (
              <div key={track.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3 flex items-center justify-between group transition-colors">
                <div className="flex items-center">
                  <div 
                    className="w-12 h-12 bg-gradient-to-br from-indigo-900 to-neutral-800 rounded-md flex items-center justify-center mr-4 cursor-pointer relative overflow-hidden"
                    onClick={() => setPreviewTrack(previewTrack === track.id ? null : track.id)}
                  >
                    <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${track.id}&backgroundColor=171717`} className="absolute inset-0 w-full h-full opacity-50" alt="cover"/>
                    <PlayCircle className={`w-6 h-6 text-white relative z-10 ${previewTrack === track.id ? 'text-indigo-400' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
                  </div>
                  <div>
                    <div className="font-medium text-neutral-200">{track.title}</div>
                    <div className="text-xs text-neutral-500 mt-1">{track.style} • {track.duration}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-neutral-600 font-mono">{track.createdAt}</span>
                  <button className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded text-neutral-300 transition-colors">添加到患者处方</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部悬浮播放条 */}
      {previewTrack && (
        <div className="h-16 bg-neutral-900 border-t border-neutral-800 flex items-center px-6 justify-between animate-in slide-in-from-bottom-5">
          <div className="flex items-center w-1/3">
             <div className="w-10 h-10 bg-indigo-900/50 rounded flex items-center justify-center mr-3">
               <Music className="w-5 h-5 text-indigo-400" />
             </div>
             <div className="truncate text-sm font-medium">正在试听: {studioTracks.find(t=>t.id === previewTrack)?.title}</div>
          </div>
          <div className="flex-1 flex justify-center items-center space-x-4">
             <button className="text-neutral-400 hover:text-white"><Pause className="w-6 h-6" fill="currentColor" /></button>
             <div className="w-64 h-1 bg-neutral-700 rounded-full"><div className="w-1/3 h-full bg-indigo-500 rounded-full"></div></div>
             <span className="text-xs text-neutral-500 font-mono">0:30 / 1:30</span>
          </div>
          <div className="w-1/3 flex justify-end">
             <button onClick={() => setPreviewTrack(null)} className="text-xs text-neutral-500 hover:text-white">关闭试听</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderPatientHome = () => (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-md text-center border-t-8 border-green-500">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <User className="text-green-600 w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-neutral-800 mb-2">您好，{patient.name}</h2>
      <p className="text-neutral-500 mb-8">您的治疗师已为您下发今日的康复处方</p>
      <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-xl mb-8 text-left relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
        <h3 className="font-bold text-neutral-800 mb-3 flex items-center"><Activity className="w-4 h-4 mr-2 text-green-600" /> 节律跟随基础训练</h3>
        <p className="text-sm text-neutral-600 mb-1">要求时长：<span className="font-mono text-neutral-800">{durationPreset} 秒</span></p>
      </div>
      <button 
        onClick={() => setCurrentView('patient_session')}
        className="w-full bg-green-600 text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center shadow-lg hover:bg-green-700 transition-transform active:scale-95"
      >
        <Play className="w-6 h-6 mr-2" /> 开始今日训练
      </button>
    </div>
  );

  const renderPatientSession = () => (
    <div className="max-w-3xl mx-auto mt-6 bg-white p-10 rounded-3xl shadow-sm flex flex-col items-center justify-center relative min-h-[600px] border border-neutral-100">
      <h2 className="text-xl font-bold text-neutral-800 mb-10 text-center tracking-widest">请注视光环并跟随节奏</h2>
      <div className="relative w-80 h-80 flex items-center justify-center my-8">
        <div className={`absolute inset-0 rounded-full transition-all duration-300 ease-out ${activeBeat ? 'scale-125 opacity-40 bg-green-400' : 'scale-100 opacity-10 bg-green-100'}`} />
        <div className={`absolute inset-8 rounded-full transition-all duration-150 ease-out ${activeBeat ? 'scale-110 opacity-70 bg-green-500' : 'scale-100 opacity-20 bg-green-200'}`} />
        <div className={`relative z-10 w-32 h-32 rounded-full shadow-inner flex items-center justify-center transition-all duration-100 ${activeBeat ? 'bg-green-600 scale-95' : 'bg-green-500 scale-100'}`}>
           <Music className={`text-white transition-opacity ${activeBeat ? 'opacity-100 w-12 h-12' : 'opacity-50 w-10 h-10'}`} />
        </div>
      </div>
      <div className="mt-12 w-full flex flex-col items-center space-y-8">
        <div className="flex items-center justify-center">
          <button 
            onClick={togglePlay}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isPlaying ? <Pause className="text-white w-12 h-12" /> : <Play className="text-white w-12 h-12 ml-2" />}
          </button>
        </div>
        {isPlaying && (
          <div className="w-full max-w-md bg-neutral-100 rounded-full h-4 overflow-hidden shadow-inner">
            <div className="bg-green-500 h-full transition-all duration-1000 ease-linear" style={{ width: `${((durationPreset - remainingTime) / durationPreset) * 100}%` }}/>
          </div>
        )}
        {!isPlaying && remainingTime < durationPreset && (
          <button onClick={finishPatientSession} className="text-neutral-500 font-medium hover:text-neutral-700">结束并上传数据</button>
        )}
      </div>
    </div>
  );

  const renderPatientDone = () => (
    <div className="max-w-md mx-auto mt-16 bg-white p-10 rounded-2xl shadow-md text-center">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <HeartPulse className="text-green-600 w-12 h-12" />
      </div>
      <h2 className="text-3xl font-bold text-neutral-800 mb-4">训练达标！</h2>
      <p className="text-neutral-600 mb-10 text-lg">您今天表现得非常出色，遥测数据已成功同步给治疗师。</p>
      <button 
        onClick={() => { setCurrentView('login'); setRole(''); }}
        className="w-full text-green-700 bg-green-50 border border-green-200 px-6 py-4 rounded-xl font-bold hover:bg-green-100 transition-colors"
      >
        安全退出系统
      </button>
    </div>
  );

  const renderReport = () => {
    if (!report) return null;
    return (
      <div className="max-w-3xl mx-auto mt-6 bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-blue-50">
          <h2 className="text-xl font-bold text-neutral-800 flex items-center">
            <FileText className="mr-2 text-blue-600" /> 康复训练评估报告
          </h2>
          <button onClick={() => setCurrentView('setup')} className="text-sm text-blue-600 hover:underline">← 返回新建</button>
        </div>
        <div className="p-6 space-y-6 text-sm">
          <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-lg">
            <div><span className="text-neutral-500">患者姓名:</span> <span className="font-medium">{report.info.name}</span></div>
            <div><span className="text-neutral-500">训练目标:</span> <span className="font-medium">{report.info.target}</span></div>
            <div><span className="text-neutral-500">本次时长:</span> <span className="font-medium">{report.sessionData.duration} 秒</span></div>
            <div><span className="text-neutral-500">最终BPM:</span> <span className="font-medium">{bpm}</span></div>
          </div>
          <div>
            <h3 className="font-bold text-neutral-800 mb-2 border-l-4 border-blue-600 pl-2">行为打点与系统评估</h3>
            <ul className="list-disc list-inside space-y-1 text-neutral-600 ml-2 mb-3">
              {report.logs.map((l, i) => (<li key={i}>[{l.time}] {l.event}</li>))}
            </ul>
            <p className="text-neutral-600 bg-blue-50 p-3 rounded">{report.evaluation}</p>
          </div>
          <div>
            <h3 className="font-bold text-neutral-800 mb-2 border-l-4 border-green-600 pl-2">家庭作业模板</h3>
            <div className="bg-green-50 p-4 rounded text-green-800 whitespace-pre-wrap font-mono text-xs">
              【康复家庭作业 - {report.info.name}】{'\n'}{report.hwTemplate}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (currentView === 'login') return renderLogin();

  return (
    <div className="min-h-screen bg-neutral-100 p-4 font-sans text-neutral-800">
      <header className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold flex items-center text-neutral-800">
          <Brain className={`mr-2 ${role === 'patient' ? 'text-green-600' : 'text-blue-600'}`} /> 
          脑卒中音乐康复系统 - {role === 'patient' ? '患者居家端' : '医生工作站'}
        </h1>
        <div className="flex items-center space-x-4">
          {role === 'doctor' && currentView === 'session' && doctorTab === 'therapy' && (
            <>
              <span className="text-sm font-mono bg-neutral-100 px-3 py-1 rounded-full flex items-center text-neutral-600">
                <Clock className="w-4 h-4 mr-1 text-neutral-400" /> 
                处方倒计时: {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </span>
              <button 
                onClick={generateReport}
                className="bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-neutral-700 transition-colors font-medium shadow"
              >
                结束干预并生成报告
              </button>
            </>
          )}
          <div className="flex items-center border-l pl-4 ml-2 border-neutral-200">
            <User className="w-4 h-4 text-neutral-400 mr-1" />
            <span className="text-sm font-medium text-neutral-600 mr-4">
              {role === 'patient' ? patient.name || '未名患者' : `Dr. ${therapistId}`}
            </span>
            <button 
              onClick={() => { setCurrentView('login'); setRole(''); setTherapistId(''); setIsPlaying(false); }}
              className="text-neutral-400 hover:text-red-500 transition-colors bg-neutral-50 p-2 rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 医生端专属顶层导航 */}
      {role === 'doctor' && currentView !== 'report' && (
        <div className="flex space-x-2 mb-4 bg-white p-2 rounded-lg shadow-sm w-max">
          <button 
            onClick={() => { setDoctorTab('therapy'); setCurrentView('setup'); setIsPlaying(false); }}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-colors ${doctorTab === 'therapy' ? 'bg-blue-100 text-blue-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Activity className="w-4 h-4 mr-2" /> 标准处方干预流
          </button>
          <button 
            onClick={() => { setDoctorTab('studio'); setIsPlaying(false); }}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-colors ${doctorTab === 'studio' ? 'bg-indigo-100 text-indigo-700' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Wand2 className="w-4 h-4 mr-2" /> 独立AI音乐生成台
          </button>
        </div>
      )}
      
      <main>
        {role === 'doctor' && doctorTab === 'therapy' && currentView === 'setup' && renderSetup()}
        {role === 'doctor' && doctorTab === 'therapy' && currentView === 'session' && renderDoctorSession()}
        {role === 'doctor' && doctorTab === 'studio' && renderDoctorStudio()}
        {role === 'doctor' && currentView === 'report' && renderReport()}
        
        {role === 'patient' && currentView === 'patient_home' && renderPatientHome()}
        {role === 'patient' && currentView === 'patient_session' && renderPatientSession()}
        {role === 'patient' && currentView === 'patient_done' && renderPatientDone()}
      </main>
    </div>
  );
}