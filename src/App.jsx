import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Activity, FileText, Settings, HeartPulse, Brain, User, Clock, Music, LogIn, LogOut, ChevronRight, Wand as Wand2, ListMusic, Sparkles, Loader as Loader2, CirclePlay as PlayCircle, Volume2, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Shield, Stethoscope, MonitorSmartphone, Mic, Hand, Eye } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('login');
  const [therapistId, setTherapistId] = useState('');
  const [role, setRole] = useState('');
  const [doctorTab, setDoctorTab] = useState('therapy');

  const [patient, setPatient] = useState({ name: '', target: 'motor', type: 'cognitive' });
  const [sessionActive, setSessionActive] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [volume, setVolume] = useState(50);
  const [durationPreset, setDurationPreset] = useState(60);

  const [studioTracks, setStudioTracks] = useState([
    { id: '1', title: '舒缓上肢抬举伴奏', style: 'Ambient, Pentatonic, 60BPM', duration: '1:00', createdAt: '10:00' },
    { id: '2', title: '注意力聚焦脉冲', style: 'Electronic, Minimal, 80BPM', duration: '2:00', createdAt: '11:30' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studioPrompt, setStudioPrompt] = useState('');
  const [studioStyle, setStudioStyle] = useState('ambient');
  const [studioDuration, setStudioDuration] = useState('1m');
  const [previewTrack, setPreviewTrack] = useState(null);

  const [logs, setLogs] = useState([]);
  const [report, setReport] = useState(null);

  const [activeBeat, setActiveBeat] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const audioCtx = useRef(null);
  const timerId = useRef(null);
  const noteIndex = useRef(0);

  const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00];

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

  useEffect(() => {
    if (isPlaying && doctorTab === 'therapy' && currentView === 'session') {
      if (timerId.current) clearInterval(timerId.current);
      const intervalMs = (60 / bpm) * 1000;
      timerId.current = setInterval(() => { playDing(); }, intervalMs);
    } else {
      if (timerId.current) clearInterval(timerId.current);
    }
    return () => { if (timerId.current) clearInterval(timerId.current); };
  }, [isPlaying, bpm, playDing, doctorTab, currentView]);

  useEffect(() => {
    let countdownTimer;
    if (isPlaying && remainingTime > 0 && currentView === 'session') {
      countdownTimer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) { setIsPlaying(false); return 0; }
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
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    if (!isPlaying && remainingTime === 0) setRemainingTime(durationPreset);
    setIsPlaying(!isPlaying);
    setSessionActive(true);
  };

  const addLog = (eventText, type = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), event: eventText, type }, ...prev]);
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

  const handleGenerateMusic = () => {
    if (!studioPrompt) return;
    setIsGenerating(true);
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

  const targetIcons = {
    motor: Hand,
    cognitive: Eye,
    speech: Mic,
  };

  const targetLabels = {
    motor: '运动功能康复',
    cognitive: '认知注意力',
    speech: '言语流畅度',
  };

  const QuickLogButton = ({ text, type, icon: Icon }) => (
    <button
      onClick={() => addLog(text, type)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 active:scale-[0.97] ${
        type === 'positive'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
          : type === 'warning'
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />{text}
    </button>
  );

  // ─── LOGIN ───
  const renderLogin = () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="w-full max-w-md mx-4">
        <div className="card-elevated p-8 fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-teal-600/20">
              <Brain className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">脑卒中音乐康复系统</h1>
            <p className="text-sm text-slate-400 mt-1.5">Stroke Music Rehabilitation Platform</p>
          </div>

          <div className="space-y-5">
            <div className="card p-5 border-slate-200/60">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <label className="text-sm font-semibold text-slate-700">医生 / 治疗师登录</label>
              </div>
              <input
                type="text"
                className="input-field mb-3"
                value={therapistId}
                onChange={e => setTherapistId(e.target.value)}
                placeholder="请输入工号"
                onKeyDown={e => {
                  if (e.key === 'Enter' && therapistId) {
                    setRole('doctor'); setDoctorTab('therapy'); setCurrentView('setup');
                  }
                }}
              />
              <button
                onClick={() => { if (therapistId) { setRole('doctor'); setDoctorTab('therapy'); setCurrentView('setup'); } }}
                disabled={!therapistId}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> 登入工作站
              </button>
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-3 text-xs text-slate-400 font-medium">或</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <div className="card p-5 border-slate-200/60">
              <div className="flex items-center gap-2 mb-3">
                <MonitorSmartphone className="w-4 h-4 text-emerald-600" />
                <label className="text-sm font-semibold text-slate-700">患者居家训练</label>
              </div>
              <button
                onClick={() => {
                  setRole('patient');
                  setPatient({ name: '测试患者', target: 'motor', type: 'cognitive' });
                  setCurrentView('patient_home');
                }}
                className="btn-success w-full flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" /> 进入居家训练端
              </button>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3 h-3" />
            <span>数据加密传输 · 符合医疗信息安全规范</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── RECOMMENDATION ENGINE ───
  const getRecommendation = () => {
    switch (patient.target) {
      case 'motor': return { bpm: 60, desc: '节律稳定，重音明显，适合肢体同步跟随。', color: 'teal' };
      case 'cognitive': return { bpm: 80, desc: '旋律简单，音高变化少，避免认知过载。', color: 'sky' };
      case 'speech': return { bpm: 90, desc: '自然语调 (叮叮当)，适合言语流利度诱导。', color: 'cyan' };
      default: return { bpm: 60, desc: '通用基础音效。', color: 'teal' };
    }
  };

  // ─── SETUP ───
  const renderSetup = () => {
    const rec = getRecommendation();
    const TargetIcon = targetIcons[patient.target] || Hand;
    return (
      <div className="max-w-5xl mx-auto slide-up">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">患者信息录入</h2>
                <p className="text-xs text-slate-400">填写基础信息后系统将自动匹配干预参数</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">患者姓名 <span className="text-rose-400">*</span></label>
                <input
                  type="text" placeholder="请输入患者姓名"
                  className="input-field"
                  value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">主要治疗目标</label>
                <div className="grid grid-cols-3 gap-3">
                  {['motor', 'cognitive', 'speech'].map(t => {
                    const Icon = targetIcons[t];
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setPatient({...patient, target: t});
                          if (t === 'motor') setBpm(60);
                          if (t === 'cognitive') setBpm(80);
                          if (t === 'speech') setBpm(90);
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                          patient.target === t
                            ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${patient.target === t ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium ${patient.target === t ? 'text-teal-700' : 'text-slate-500'}`}>
                          {targetLabels[t]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">预定训练时长</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map(time => (
                    <button
                      key={time} onClick={() => setDurationPreset(time)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                        durationPreset === time
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {time} 秒
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card border-teal-200/60 bg-gradient-to-b from-teal-50/40 to-white flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-teal-800">智能处方匹配</h2>
              </div>

              <div className="bg-white rounded-xl p-5 mb-4 border border-teal-100/60 shadow-sm">
                <div className="text-xs text-slate-400 mb-1 font-medium">推荐基准 BPM</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-teal-700 font-mono tracking-tight">{rec.bpm}</span>
                  <span className="text-sm text-teal-500 font-medium">BPM</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-teal-100/60 text-sm text-slate-600 leading-relaxed">
                {rec.desc}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <div className={`status-dot ${patient.name ? 'status-dot-active' : 'status-dot-idle'}`}></div>
                <span>{patient.name ? '处方参数就绪' : '请先填写患者姓名'}</span>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={() => { setLogs([]); setReport(null); setCurrentView('session'); }}
                disabled={!patient.name}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                应用处方并开启干预 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── DOCTOR SESSION ───
  const renderDoctorSession = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 fade-in">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-teal-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">实时控制台</h2>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
            <div className={`status-dot ${isPlaying ? 'status-dot-active' : 'status-dot-idle'}`}></div>
            <span className="text-xs font-medium text-slate-500">{patient.name}</span>
          </div>
        </div>

        <div className="space-y-7">
          <div>
            <div className="flex justify-between text-sm mb-3">
              <span className="font-medium text-slate-600">干预节奏 (BPM)</span>
              <span className="font-mono text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md text-sm font-bold">{bpm}</span>
            </div>
            <input
              type="range" min="40" max="120" value={bpm}
              onChange={(e) => { setBpm(Number(e.target.value)); addLog(`调整BPM至 ${e.target.value}`); }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>40</span><span>80</span><span>120</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-3">
              <span className="font-medium text-slate-600">刺激强度 (音量)</span>
              <span className="font-mono text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md text-sm font-bold">{volume}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 flex justify-center">
            <button
              onClick={togglePlay}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold shadow-lg transition-all duration-200 active:scale-[0.97] ${
                isPlaying
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
              }`}
            >
              {isPlaying ? <><Pause className="w-5 h-5" /> 中断治疗流</> : <><Play className="w-5 h-5" /> 启动治疗流</>}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 flex flex-col h-[520px]">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">实时行为记录</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <QuickLogButton text="情绪稳定" type="positive" icon={HeartPulse} />
          <QuickLogButton text="配合度高" type="positive" icon={User} />
          <QuickLogButton text="出现疲劳" type="warning" icon={Activity} />
          <QuickLogButton text="注意分散" type="warning" icon={Brain} />
        </div>

        <div className="flex-1 bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">点击上方标签记录患者行为</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-slate-100/80 last:border-0">
                  <span className="text-slate-400 font-mono text-xs w-16 flex-shrink-0 pt-0.5">{log.time}</span>
                  <div className="flex items-center gap-1.5">
                    {log.type === 'positive' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    {log.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {log.type === 'info' && <Activity className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <span className={`${
                      log.type === 'warning' ? 'text-amber-700 font-medium' :
                      log.type === 'positive' ? 'text-emerald-700 font-medium' :
                      'text-slate-600'
                    }`}>{log.event}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── AI STUDIO ───
  const renderDoctorStudio = () => (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 fade-in">
      <div className="h-12 bg-slate-950 border-b border-slate-700/50 flex items-center px-5 justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-white text-sm tracking-wide">AI 处方音乐生成器</span>
          <span className="text-[10px] bg-teal-900/50 text-teal-400 px-1.5 py-0.5 rounded font-medium">BETA</span>
        </div>
        <div className="text-xs text-slate-500 font-mono">950 credits</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 bg-slate-900 border-r border-slate-700/50 p-5 flex flex-col overflow-y-auto">
          <label className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">定制提示词</label>
          <textarea
            className="w-full h-28 bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 resize-none mb-5 placeholder:text-slate-600"
            placeholder="例如: 旋律简单，音高变化少，适合脑卒中患者进行运动跟随..."
            value={studioPrompt}
            onChange={(e) => setStudioPrompt(e.target.value)}
          />

          <label className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">基准流派</label>
          <select
            className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 mb-5"
            value={studioStyle}
            onChange={(e) => setStudioStyle(e.target.value)}
          >
            <option value="ambient">纯净环境音 (Ambient)</option>
            <option value="pentatonic">五声音阶 (Pentatonic)</option>
            <option value="rhythmic">强节奏节拍器 (Rhythmic)</option>
          </select>

          <label className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">目标时长</label>
          <div className="flex gap-2 mb-8">
            {['30s', '1m', '2m'].map(d => (
              <button
                key={d}
                onClick={() => setStudioDuration(d)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  studioDuration === d
                    ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateMusic}
            disabled={!studioPrompt || isGenerating}
            className="mt-auto w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all duration-200 shadow-lg shadow-teal-600/20 active:scale-[0.98]"
          >
            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</> : <><Sparkles className="w-4 h-4" /> 生成音乐</>}
          </button>
        </div>

        <div className="flex-1 bg-slate-950 p-5 overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-slate-500" /> 音频资产库
          </h3>

          <div className="space-y-2.5">
            {isGenerating && (
              <div className="bg-slate-900 border border-teal-500/20 rounded-xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-11 h-11 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                </div>
                <div>
                  <div className="h-3.5 w-36 bg-slate-800 rounded mb-2"></div>
                  <div className="h-2.5 w-24 bg-slate-800 rounded"></div>
                </div>
              </div>
            )}

            {studioTracks.map(track => (
              <div key={track.id} className="bg-slate-900 border border-slate-700/40 hover:border-slate-600/60 rounded-xl p-3 flex items-center justify-between group transition-all duration-150">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 bg-gradient-to-br from-teal-900/60 to-slate-800 rounded-lg flex items-center justify-center cursor-pointer relative overflow-hidden flex-shrink-0"
                    onClick={() => setPreviewTrack(previewTrack === track.id ? null : track.id)}
                  >
                    <PlayCircle className={`w-5 h-5 text-white relative z-10 ${previewTrack === track.id ? 'text-teal-400' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150`} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-200 text-sm">{track.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{track.style} · {track.duration}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-600 font-mono">{track.createdAt}</span>
                  <button className="text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-slate-300 transition-colors font-medium">添加到处方</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {previewTrack && (
        <div className="h-14 bg-slate-900 border-t border-slate-700/50 flex items-center px-5 justify-between">
          <div className="flex items-center gap-3 w-1/3">
            <div className="w-9 h-9 bg-teal-900/40 rounded-lg flex items-center justify-center">
              <Music className="w-4 h-4 text-teal-400" />
            </div>
            <div className="truncate text-sm font-medium text-slate-200">
              {studioTracks.find(t => t.id === previewTrack)?.title}
            </div>
          </div>
          <div className="flex-1 flex justify-center items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors"><Pause className="w-5 h-5" fill="currentColor" /></button>
            <div className="w-56 h-1 bg-slate-700 rounded-full"><div className="w-1/3 h-full bg-teal-500 rounded-full"></div></div>
            <span className="text-[10px] text-slate-500 font-mono">0:30 / 1:30</span>
          </div>
          <div className="w-1/3 flex justify-end">
            <button onClick={() => setPreviewTrack(null)} className="text-xs text-slate-500 hover:text-white transition-colors">关闭</button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── PATIENT HOME ───
  const renderPatientHome = () => (
    <div className="max-w-md mx-auto mt-8 slide-up">
      <div className="card-elevated p-8 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <User className="text-emerald-600 w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">您好，{patient.name}</h2>
        <p className="text-sm text-slate-400 mb-8">您的治疗师已为您下发今日的康复处方</p>

        <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-xl mb-8 text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-r"></div>
          <div className="pl-3">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-emerald-600" /> 节律跟随基础训练
            </h3>
            <p className="text-sm text-slate-500">要求时长：<span className="font-mono text-slate-700 font-medium">{durationPreset} 秒</span></p>
          </div>
        </div>

        <button
          onClick={() => setCurrentView('patient_session')}
          className="btn-success w-full py-4 text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15"
        >
          <Play className="w-5 h-5" /> 开始今日训练
        </button>
      </div>
    </div>
  );

  // ─── PATIENT SESSION ───
  const renderPatientSession = () => (
    <div className="max-w-3xl mx-auto mt-4 fade-in">
      <div className="card-elevated p-10 flex flex-col items-center justify-center min-h-[600px] relative">
        <h2 className="text-lg font-bold text-slate-700 mb-8 text-center tracking-wide">请注视光环并跟随节奏</h2>

        <div className="relative w-72 h-72 flex items-center justify-center my-6">
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ease-out ${activeBeat ? 'scale-[1.2] opacity-30 bg-emerald-400' : 'scale-100 opacity-[0.07] bg-emerald-200'}`} />
          <div className={`absolute inset-8 rounded-full transition-all duration-300 ease-out ${activeBeat ? 'scale-[1.12] opacity-50 bg-emerald-500' : 'scale-100 opacity-[0.12] bg-emerald-300'}`} />
          <div className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 ${activeBeat ? 'bg-emerald-600 scale-[0.96] shadow-lg shadow-emerald-600/30' : 'bg-emerald-500 scale-100 shadow-md'}`}>
            <Music className={`text-white transition-all duration-200 ${activeBeat ? 'w-10 h-10 opacity-100' : 'w-8 h-8 opacity-60'}`} />
          </div>
        </div>

        <div className="mt-8 w-full flex flex-col items-center gap-6">
          <button
            onClick={togglePlay}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-[0.95] ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
            }`}
          >
            {isPlaying ? <Pause className="text-white w-10 h-10" /> : <Play className="text-white w-10 h-10 ml-1" />}
          </button>

          {isPlaying && (
            <div className="w-full max-w-sm">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
                <span>{Math.floor((durationPreset - remainingTime) / 60)}:{((durationPreset - remainingTime) % 60).toString().padStart(2, '0')}</span>
                <span>{Math.floor(durationPreset / 60)}:{(durationPreset % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full" style={{ width: `${((durationPreset - remainingTime) / durationPreset) * 100}%` }} />
              </div>
            </div>
          )}

          {!isPlaying && remainingTime < durationPreset && remainingTime > 0 && (
            <button onClick={finishPatientSession} className="text-sm text-slate-400 font-medium hover:text-slate-600 transition-colors">
              结束并上传数据
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─── PATIENT DONE ───
  const renderPatientDone = () => (
    <div className="max-w-md mx-auto mt-12 slide-up">
      <div className="card-elevated p-10 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <HeartPulse className="text-emerald-600 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">训练达标</h2>
        <p className="text-slate-400 mb-8">您今天表现得非常出色，遥测数据已成功同步给治疗师。</p>
        <button
          onClick={() => { setCurrentView('login'); setRole(''); }}
          className="w-full text-emerald-700 bg-emerald-50 border border-emerald-200 px-6 py-3.5 rounded-xl font-semibold hover:bg-emerald-100 transition-colors"
        >
          安全退出系统
        </button>
      </div>
    </div>
  );

  // ─── REPORT ───
  const renderReport = () => {
    if (!report) return null;
    return (
      <div className="max-w-3xl mx-auto fade-in">
        <div className="card-elevated overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" /> 康复训练评估报告
            </h2>
            <button onClick={() => setCurrentView('setup')} className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
              返回新建
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">患者姓名</span>
                <div className="font-semibold text-slate-800 mt-0.5">{report.info.name}</div>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">训练目标</span>
                <div className="font-semibold text-slate-800 mt-0.5">{targetLabels[report.info.target]}</div>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">本次时长</span>
                <div className="font-semibold text-slate-800 mt-0.5">{report.sessionData.duration} 秒</div>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">最终 BPM</span>
                <div className="font-semibold text-slate-800 mt-0.5">{bpm}</div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-teal-600 rounded-full"></div>
                行为记录与系统评估
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-600 mb-3 ml-2">
                {report.logs.map((l, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {l.type === 'positive' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />}
                    {l.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />}
                    {l.type === 'info' && <Activity className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />}
                    <span>[{l.time}] {l.event}</span>
                  </li>
                ))}
              </ul>
              <p className="text-slate-600 bg-teal-50 border border-teal-100 p-3.5 rounded-xl text-sm leading-relaxed">{report.evaluation}</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                家庭作业模板
              </h3>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                【康复家庭作业 - {report.info.name}】{'\n'}{report.hwTemplate}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER ───
  if (currentView === 'login') return renderLogin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 py-3 flex justify-between items-center">
          <h1 className="text-base font-bold flex items-center gap-2 text-slate-800">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role === 'patient' ? 'bg-emerald-50' : 'bg-teal-50'}`}>
              <Brain className={`w-4 h-4 ${role === 'patient' ? 'text-emerald-600' : 'text-teal-600'}`} />
            </div>
            <span className="hidden sm:inline">脑卒中音乐康复系统</span>
            <span className="text-xs font-medium text-slate-400 hidden md:inline">
              {role === 'patient' ? '· 患者居家端' : '· 医生工作站'}
            </span>
          </h1>

          <div className="flex items-center gap-3">
            {role === 'doctor' && currentView === 'session' && doctorTab === 'therapy' && (
              <>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm font-mono text-slate-600">
                    {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button onClick={generateReport} className="btn-secondary text-sm py-2">
                  结束干预并生成报告
                </button>
              </>
            )}

            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-200">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${role === 'patient' ? 'bg-emerald-50' : 'bg-teal-50'}`}>
                <User className={`w-3.5 h-3.5 ${role === 'patient' ? 'text-emerald-600' : 'text-teal-600'}`} />
              </div>
              <span className="text-sm font-medium text-slate-600">
                {role === 'patient' ? patient.name || '未名患者' : `Dr. ${therapistId}`}
              </span>
              <button
                onClick={() => { setCurrentView('login'); setRole(''); setTherapistId(''); setIsPlaying(false); }}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
                title="退出系统"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {role === 'doctor' && currentView !== 'report' && (
        <div className="max-w-7xl mx-auto px-5 pt-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => { setDoctorTab('therapy'); setCurrentView('setup'); setIsPlaying(false); }}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all duration-150 ${
                doctorTab === 'therapy'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 标准处方干预流
            </button>
            <button
              onClick={() => { setDoctorTab('studio'); setIsPlaying(false); }}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all duration-150 ${
                doctorTab === 'studio'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" /> AI音乐生成台
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-5 py-5">
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
