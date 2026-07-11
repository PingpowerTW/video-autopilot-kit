import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, ShieldAlert, Cpu, RefreshCw, FileText, CheckCircle, 
  AlertTriangle, Play, FileVideo, Download, Volume2, Settings, 
  MapPin, HelpCircle, Activity, Info
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

function App() {
  const [activeTab, setActiveTab] = useState('capcut');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  
  // B-roll Match settings
  const [allowReuse, setAllowReuse] = useState(true);
  const [minSegmentSec, setMinSegmentSec] = useState(5);
  const [lookAheadWindow, setLookAheadWindow] = useState(2);
  const [matchResult, setMatchResult] = useState(null);
  const [auditReport, setAuditReport] = useState(null);

  // Piper TTS settings
  const [ttsText, setTtsText] = useState('Hello! This is a test of the local Piper Text to Speech engine.');
  const [ttsVoice, setTtsVoice] = useState('en_US-lessac-medium');
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);

  // Remotion settings
  const [renderingDemo, setRenderingDemo] = useState(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState(null);

  // QA settings
  const [qaFile, setQaFile] = useState(null);
  const [qaVideoPath, setQaVideoPath] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaReport, setQaReport] = useState(null);
  const [contactSheetUrl, setContactSheetUrl] = useState(null);

  // Post-Process settings
  const [ppVideoPath, setPpVideoPath] = useState('');
  const [ppBgmPath, setPpBgmPath] = useState('');
  const [ppBgmVolume, setPpBgmVolume] = useState(0.25);
  const [ppOutroTitle, setPpOutroTitle] = useState('');
  const [ppOutroAddress, setPpOutroAddress] = useState('');
  const [ppOutroExtra, setPpOutroExtra] = useState('');
  const [ppLoading, setPpLoading] = useState(false);
  const [ppResult, setPpResult] = useState(null);

  useEffect(() => {
    checkConnection();
    loadProjects();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/capcut/projects`);
      if (res.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/capcut/projects`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (e) {
      console.error("載入專案失敗:", e);
    }
  };

  const showMessage = (msg, isError = false) => {
    setActionMessage({ text: msg, isError });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // 一鍵同步 CapCut 草稿
  const handleForceSync = async (projectName) => {
    setProjectLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/capcut/force-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: projectName })
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.message);
        loadProjects();
      } else {
        showMessage(data.error || '同步失敗', true);
      }
    } catch (e) {
      showMessage('同步請求出錯: ' + e.message, true);
    } finally {
      setProjectLoading(false);
    }
  };

  // 自動對位 B-roll
  const handleBrollMatch = async (projectName) => {
    setProjectLoading(true);
    setMatchResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/capcut/broll-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          allow_reuse: allowReuse,
          min_segment_sec: Number(minSegmentSec),
          look_ahead_window: Number(lookAheadWindow)
        })
      });
      const data = await res.json();
      if (data.success) {
        setMatchResult(data.assignments);
        showMessage(data.message);
        loadProjects();
      } else {
        showMessage(data.error || '匹配失敗', true);
      }
    } catch (e) {
      showMessage('對位請求出錯: ' + e.message, true);
    } finally {
      setProjectLoading(false);
    }
  };

  // 審計草稿
  const handleAudit = async (projectName) => {
    setProjectLoading(true);
    setAuditReport(null);
    try {
      const res = await fetch(`${API_BASE}/api/capcut/broll-audit?project_name=${projectName}`);
      const data = await res.json();
      if (data.success) {
        setAuditReport(data.report);
      } else {
        showMessage('審計失敗: ' + data.error, true);
      }
    } catch (e) {
      showMessage('審計出錯: ' + e.message, true);
    } finally {
      setProjectLoading(false);
    }
  };

  // 生成 Piper TTS 語音
  const handleGenerateTTS = async () => {
    setTtsLoading(true);
    setTtsAudioUrl(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate/piper-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          voice_model: ttsVoice
        })
      });
      const data = await res.json();
      if (data.success) {
        setTtsAudioUrl(`${API_BASE}${data.audio_url}`);
        showMessage('語音生成成功！');
      } else {
        showMessage('語音生成失敗: ' + data.error, true);
      }
    } catch (e) {
      showMessage('語音請求出錯: ' + e.message, true);
    } finally {
      setTtsLoading(false);
    }
  };

  // 渲染 Remotion 影片 Demo
  const handleRenderRemotion = async (demoName) => {
    setRenderingDemo(demoName);
    setRenderedVideoUrl(null);
    try {
      const formData = new FormData();
      formData.append('demo_name', demoName);
      const res = await fetch(`${API_BASE}/api/generate/render-demo`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setRenderedVideoUrl(`${API_BASE}${data.video_url}`);
        showMessage(`影片 ${demoName} 渲染完成！`);
      } else {
        showMessage('渲染失敗: ' + data.error, true);
      }
    } catch (e) {
      showMessage('渲染請求出錯: ' + e.message, true);
    } finally {
      setRenderingDemo(null);
    }
  };

  // 影片 QA 審計上傳
  const handleQaAnalyze = async (e) => {
    e.preventDefault();
    if (!qaFile) return;
    setQaLoading(true);
    setQaReport(null);
    setContactSheetUrl(null);
    
    try {
      const formData = new FormData();
      formData.append('video', qaFile);
      const res = await fetch(`${API_BASE}/api/qa/analyze`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setQaReport(data.report);
        setContactSheetUrl(`${API_BASE}${data.contact_sheet_url}`);
        showMessage('QA 審計完成！');
      } else {
        showMessage('QA 分析失敗: ' + data.error, true);
      }
    } catch (e) {
      showMessage('QA 請求出錯: ' + e.message, true);
    } finally {
      setQaLoading(false);
    }
  };

  // 後製處理一鍵打包
  const handlePostProcess = async (e) => {
    e.preventDefault();
    if (!ppVideoPath) {
      showMessage('請輸入影片路徑', true);
      return;
    }
    setPpLoading(true);
    setPpResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/post-process/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: ppVideoPath,
          bgm_path: ppBgmPath || null,
          bgm_volume: Number(ppBgmVolume),
          outro_title: ppOutroTitle || null,
          outro_address: ppOutroAddress || null,
          outro_extra: ppOutroExtra || null,
          trim_voice: true,
          tail_pad_sec: Number(ppBgmPath ? 5.0 : 0.0)
        })
      });
      const data = await res.json();
      if (data.success) {
        setPpResult(data);
        showMessage('後製打包完成！');
      } else {
        showMessage('後製處理失敗', true);
      }
    } catch (e) {
      showMessage('後製出錯: ' + e.message, true);
    } finally {
      setPpLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      {/* 頂部導航 */}
      <header className="glass-panel mx-6 mt-6 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Video Autopilot Workspace</h1>
            <p className="text-xs text-slate-400">CapCut & Remotion 智能影音工作台</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 text-xs">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>後端連線狀態:</span>
            {connectionStatus === 'connected' && <span className="text-emerald-400 flex items-center gap-1">● 已連線</span>}
            {connectionStatus === 'checking' && <span className="text-yellow-400 flex items-center gap-1">● 檢測中...</span>}
            {connectionStatus === 'disconnected' && <span className="text-red-400 flex items-center gap-1">● 未連線</span>}
          </div>
          <button onClick={loadProjects} className="p-2 rounded-lg hover:bg-white/5 transition border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 浮動訊息提示 */}
      {actionMessage && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg border shadow-xl flex items-center gap-2 z-50 animate-bounce ${
          actionMessage.isError ? 'bg-red-950/80 border-red-500 text-red-200' : 'bg-purple-950/80 border-purple-500 text-purple-200'
        }`}>
          {actionMessage.isError ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-purple-400" />}
          <span className="text-sm font-semibold">{actionMessage.text}</span>
        </div>
      )}

      {/* 主工作區 */}
      <main className="flex-1 mx-6 my-6 flex gap-6">
        {/* 左側邊欄選項 */}
        <aside className="w-64 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('capcut')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition w-full text-left ${
              activeTab === 'capcut' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>CapCut Studio</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('autogen')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition w-full text-left ${
              activeTab === 'autogen' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span>AI Auto-Gen (Remotion)</span>
          </button>

          <button 
            onClick={() => setActiveTab('qc')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition w-full text-left ${
              activeTab === 'qc' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Quality Control (QA)</span>
          </button>

          {/* Quick Guide card */}
          <div className="glass-panel p-5 mt-auto text-xs text-slate-400 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1">
              <Info className="w-4 h-4" />
              <span>快速使用指引</span>
            </div>
            <p>1. CapCut Studio：為本地剪映草稿同步及自動字幕對位。</p>
            <p>2. AI Auto-Gen：免金鑰本地 Piper 語音生成，React/Remotion 影片渲染。</p>
            <p>3. QA 審計：出貨前 FFmpeg 頻閃、死空檔檢測，一鍵生成接觸表大圖。</p>
          </div>
        </aside>

        {/* 右側內容區 */}
        <section className="flex-1 glass-panel p-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {/* TAB 1: CapCut Studio */}
          {activeTab === 'capcut' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold mb-1">CapCut Studio 專案同步與自動化</h2>
                <p className="text-sm text-slate-400">管理本地 CapCut 專案，確認 7-file 同步健康度，並使用字幕匹配演算法 (M75) 自動對位素材。</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 專案列表 */}
                <div className="lg:col-span-1 border-r border-white/5 pr-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-400">本地專案列表</span>
                    <button onClick={loadProjects} className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> 重新整理
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                    {projects.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        找不到 CapCut 專案，請檢查目錄設定。
                      </div>
                    ) : (
                      projects.map((proj) => (
                        <div 
                          key={proj.name}
                          onClick={() => {
                            setSelectedProject(proj);
                            setMatchResult(null);
                            setAuditReport(null);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                            selectedProject?.name === proj.name 
                              ? 'bg-purple-950/40 border-purple-500/50' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="font-semibold text-sm truncate">{proj.name}</div>
                          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                            <span>修改時間: {new Date(proj.last_modified * 1000).toLocaleDateString()}</span>
                            {proj.sync.all_synced ? (
                              <span className="text-emerald-400">● Synced</span>
                            ) : (
                              <span className="text-red-400">● Mismatched ({proj.sync.mismatched.length})</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 專案管理詳情 */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {selectedProject ? (
                    <>
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-bold text-lg">{selectedProject.name}</h3>
                          <p className="text-xs text-slate-400">草稿狀態：{selectedProject.sync.all_synced ? '健康 (7-file 已同步)' : '不同步 (CapCut 開啟可能會覆蓋您的修改)'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleForceSync(selectedProject.name)}
                            disabled={projectLoading}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> 一鍵同步 (M18)
                          </button>
                          <button 
                            onClick={() => handleAudit(selectedProject.name)}
                            disabled={projectLoading}
                            className="px-3 py-1.5 rounded-lg border border-purple-600 bg-purple-950/40 text-xs font-semibold hover:bg-purple-900 disabled:opacity-50"
                          >
                            審計草稿 (Audit)
                          </button>
                        </div>
                      </div>

                      {/* B-roll matching settings */}
                      <div className="glass-card flex flex-col gap-4">
                        <h4 className="font-semibold text-sm text-purple-400 flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4" /> B-roll 自動對齊設定 (M75 Auto-Sequencer)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-400">允許素材重複 (Allow Reuse)</label>
                            <select value={allowReuse.toString()} onChange={(e) => setAllowReuse(e.target.value === 'true')}>
                              <option value="true">啟用 (重複匹配)</option>
                              <option value="false">禁用 (每段僅限一次)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-400">最小片段限制 (秒)</label>
                            <input 
                              type="number" 
                              value={minSegmentSec} 
                              onChange={(e) => setMinSegmentSec(e.target.value)} 
                              min="1" max="15" 
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-400">Look-ahead 預判窗口 (Window)</label>
                            <input 
                              type="number" 
                              value={lookAheadWindow} 
                              onChange={(e) => setLookAheadWindow(e.target.value)} 
                              min="0" max="5" 
                            />
                          </div>
                        </div>

                        <button 
                          onClick={() => handleBrollMatch(selectedProject.name)}
                          disabled={projectLoading}
                          className="glow-btn text-sm py-2.5 mt-2 flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" /> 執行對齊並同步寫回草稿
                        </button>
                      </div>

                      {/* 審計報告區 */}
                      {auditReport && (
                        <div className="glass-card flex flex-col gap-3">
                          <h4 className="font-semibold text-sm text-yellow-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> 草稿 B-roll 匹配審計報告 (AP15)
                          </h4>
                          <div className="text-xs flex gap-6 text-slate-300">
                            <div>字幕總數: <span className="font-semibold">{auditReport.total_captions}</span></div>
                            <div>正常匹配: <span className="font-semibold text-emerald-400">{auditReport.matched_ok}</span></div>
                            <div>錯位警告: <span className="font-semibold text-red-400">{auditReport.mismatches.length}</span></div>
                          </div>

                          <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto mt-2">
                            {auditReport.mismatches.length === 0 ? (
                              <div className="text-emerald-400 text-xs py-4 text-center">✓ 恭喜，目前沒有任何字幕與 B-roll 匹配錯位問題！</div>
                            ) : (
                              auditReport.mismatches.map((m, idx) => (
                                <div key={idx} className="p-2.5 rounded bg-red-950/20 border border-red-500/20 text-xs flex flex-col gap-1">
                                  <div className="flex justify-between font-semibold">
                                    <span className="text-red-300">⚠️ Mismatch at {m.caption_start_sec.toFixed(2)}s</span>
                                    <span className="text-slate-400">差值: {m.score_diff.toFixed(2)}</span>
                                  </div>
                                  <p className="text-slate-200">" {m.caption_text} "</p>
                                  <div className="text-slate-400 mt-1">
                                    當前素材: <span className="text-red-400">{m.current_broll}</span> ➜ 建議更換為: <span className="text-emerald-400">{m.suggested_broll}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* 匹配時間軸可視化 */}
                      {matchResult && (
                        <div className="glass-card flex flex-col gap-3">
                          <h4 className="font-semibold text-sm text-purple-400">已生成的影片時間軸 (Timeline View)</h4>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="grid grid-cols-12 font-bold border-b border-white/5 pb-2 mb-2 text-slate-400">
                              <span className="col-span-2">時間區間</span>
                              <span className="col-span-6">B-roll 素材</span>
                              <span className="col-span-3">主題</span>
                              <span className="col-span-1 text-right">類型</span>
                            </div>
                            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
                              {matchResult.map((a, idx) => (
                                <div key={idx} className="grid grid-cols-12 py-2 border-b border-white/5 items-center">
                                  <span className="col-span-2 text-slate-300">{a.start_sec.toFixed(2)}s - {(a.start_sec + a.duration_sec).toFixed(2)}s</span>
                                  <span className="col-span-6 font-mono truncate pr-4">{a.broll_id}</span>
                                  <span className="col-span-3 text-slate-400 truncate">{a.topic_label || '內容匹配'}</span>
                                  <span className="col-span-1 text-right">{a.is_filler ? '💭 填充' : '🎯 主題'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-[400px] rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-slate-500 text-sm">
                      <HelpCircle className="w-12 h-12 mb-3 text-slate-600" />
                      <span>請先從左側選擇一個本地 CapCut 專案以開啟 Studio 工具</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Auto-Gen */}
          {activeTab === 'autogen' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold mb-1">AI Auto-Generator (Remotion 渲染)</h2>
                <p className="text-sm text-slate-400">完全自動化的影片生成與 React/Remotion 渲染。無需實體剪輯軟體即可一鍵出片。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 離線 Piper TTS */}
                <div className="glass-card flex flex-col gap-4">
                  <h3 className="font-bold text-base text-purple-400 flex items-center gap-2">
                    <Volume2 className="w-5 h-5" /> 離線語音配音 (Piper TTS)
                  </h3>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400">配音文字</label>
                    <textarea 
                      rows="4" 
                      value={ttsText} 
                      onChange={(e) => setTtsText(e.target.value)}
                      className="w-full text-sm"
                      placeholder="輸入您想要配音的旁白內容..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400">語音模型</label>
                    <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)} className="text-sm">
                      <option value="en_US-lessac-medium">en_US-lessac-medium (英文女聲)</option>
                      <option value="en_US-joe-medium">en_US-joe-medium (英文男聲)</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleGenerateTTS}
                    disabled={ttsLoading}
                    className="glow-btn text-sm py-2.5 flex items-center justify-center gap-2"
                  >
                    {ttsLoading ? '合成中...' : '生成語音旁白 (.wav)'}
                  </button>

                  {ttsAudioUrl && (
                    <div className="mt-2 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-2">
                      <span className="text-xs text-slate-400 font-semibold">生成音訊播放：</span>
                      <audio src={ttsAudioUrl} controls className="w-full h-8" />
                    </div>
                  )}
                </div>

                {/* Remotion 渲染器 */}
                <div className="glass-card flex flex-col gap-4">
                  <h3 className="font-bold text-base text-purple-400 flex items-center gap-2">
                    <FileVideo className="w-5 h-5" /> Remotion 影片渲染
                  </h3>
                  <p className="text-xs text-slate-400">透過 React 的 DOM 結構進行影片渲染，內建了多個開箱即用的高品質影片範本。</p>

                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-semibold text-slate-400">選擇示範模板渲染：</span>
                    
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'world-in-numbers', title: '世界數據庫 (World in Numbers)', desc: '帶有精美數據圖表與數字動態展示的範本' },
                        { id: 'code-to-screen', title: '開發者腳本 (Code to Screen)', desc: '適用於科技、代碼與工作流解說的黑金科技風格' },
                        { id: 'focusflow-pitch', title: '新創募資簡報 (Startup Pitch)', desc: '現代扁平化 UI 轉化為動態產品影片' }
                      ].map((item) => (
                        <div key={item.id} className="p-3 rounded-lg border border-white/5 bg-white/5 flex items-center justify-between hover:bg-white/10 transition">
                          <div>
                            <div className="text-sm font-semibold">{item.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                          </div>
                          <button 
                            onClick={() => handleRenderRemotion(item.id)}
                            disabled={renderingDemo !== null}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {renderingDemo === item.id ? '渲染中...' : '開始渲染'}
                          </button>
                        </div>
                      ))}
                    </div>

                    {renderedVideoUrl && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-3">
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> 渲染完成！可在下方直接播放：
                        </span>
                        <video src={renderedVideoUrl} controls className="w-full rounded-lg border border-slate-700" />
                        <a href={renderedVideoUrl} download className="flex items-center justify-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-semibold">
                          <Download className="w-4 h-4" /> 下載渲染影片
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Quality Control & Post-Process */}
          {activeTab === 'qc' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Quality Control (品質檢驗與後製)</h2>
                <p className="text-sm text-slate-400">執行影片機械式 QA（頻閃、死黑邊、死空檔），並可一鍵加載 BGM 音軌混合與 outro 字卡。</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 影片 QA */}
                <div className="glass-card flex flex-col gap-4">
                  <h3 className="font-bold text-base text-purple-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" /> 交付前品質審計
                  </h3>
                  
                  <form onSubmit={handleQaAnalyze} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400">選擇影片檔案 (.mp4)</label>
                      <input 
                        type="file" 
                        accept="video/mp4" 
                        onChange={(e) => setQaFile(e.target.files[0])}
                        className="text-sm cursor-pointer"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={qaLoading || !qaFile}
                      className="glow-btn text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {qaLoading ? '正在執行審計...' : '執行交付前 QA 審計'}
                    </button>
                  </form>

                  {/* QA Report Results */}
                  {qaReport && (
                    <div className="flex flex-col gap-3 mt-4 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/50 flex flex-col gap-2">
                        <span className="font-semibold text-slate-300 text-sm">審計報告資訊：</span>
                        <div>影片名稱: <span className="font-mono">{qaReport.video}</span></div>
                        <div>影片時長: <span className="font-semibold">{qaReport.duration} 秒</span></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                          <div className={`p-2.5 rounded border ${qaReport.flash_flag ? 'bg-red-950/20 border-red-500/30 text-red-200' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'}`}>
                            <div className="font-bold">M93 頻閃檢測</div>
                            <div className="mt-1">{qaReport.flash_flag ? '⚠️ 疑似頻閃' : '✓ 正常'}</div>
                          </div>
                          <div className={`p-2.5 rounded border ${qaReport.border_flag ? 'bg-red-950/20 border-red-500/30 text-red-200' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'}`}>
                            <div className="font-bold">M92 黑邊檢測</div>
                            <div className="mt-1">{qaReport.border_flag ? '⚠️ 四周黑邊' : '✓ 滿版正常'}</div>
                          </div>
                          {qaReport.deadair_flag !== undefined && (
                            <div className={`p-2.5 rounded border ${qaReport.deadair_flag ? 'bg-red-950/20 border-red-500/30 text-red-200' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'}`}>
                              <div className="font-bold">M95 句間空檔</div>
                              <div className="mt-1">{qaReport.deadair_flag ? '⚠️ 空檔過大' : '✓ 停頓自然'}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 接觸表展示 */}
                      {contactSheetUrl && (
                        <div className="flex flex-col gap-2 mt-2">
                          <span className="font-semibold text-slate-300">影片接觸表大圖 (Contact Sheet)：</span>
                          <div className="rounded-lg border border-slate-700 overflow-hidden">
                            <img src={contactSheetUrl} alt="Contact Sheet" className="w-full hover:scale-105 transition duration-300 cursor-zoom-in" />
                          </div>
                          <p className="text-slate-500 text-[10px]">人工檢查重點：Chrome隱私 (M91) / 圖片排版 (M92) / 真實瑕疵 (M94)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 後製處理打包 */}
                <div className="glass-card flex flex-col gap-4">
                  <h3 className="font-bold text-base text-purple-400 flex items-center gap-2">
                    <Settings className="w-5 h-5" /> 後製工作流打包 (Post-Process)
                  </h3>
                  
                  <form onSubmit={handlePostProcess} className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400">影片檔案路徑</label>
                      <input 
                        type="text" 
                        value={ppVideoPath} 
                        onChange={(e) => setPpVideoPath(e.target.value)}
                        placeholder="請輸入本地 MP4 檔案絕對路徑..." 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400">背景音樂 (BGM) 路徑 (可選)</label>
                      <input 
                        type="text" 
                        value={ppBgmPath} 
                        onChange={(e) => setPpBgmPath(e.target.value)}
                        placeholder="請輸入 BGM MP3/WAV 檔案路徑..." 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400">BGM 音量 (Volume)</label>
                      <input 
                        type="number" 
                        step="0.05" 
                        min="0" max="1"
                        value={ppBgmVolume} 
                        onChange={(e) => setPpBgmVolume(e.target.value)}
                      />
                    </div>

                    <div className="border-t border-white/5 my-2 pt-2 font-bold text-purple-400">結尾 Outro Card 設定 (M56)</div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400">店名/分店名稱</label>
                      <input 
                        type="text" 
                        value={ppOutroTitle} 
                        onChange={(e) => setPpOutroTitle(e.target.value)}
                        placeholder="例如：範例食堂 OO店" 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400">地址資訊</label>
                      <input 
                        type="text" 
                        value={ppOutroAddress} 
                        onChange={(e) => setPpOutroAddress(e.target.value)}
                        placeholder="例如：○○市○○路 123 號" 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400">額外聯絡/營業資訊</label>
                      <input 
                        type="text" 
                        value={ppOutroExtra} 
                        onChange={(e) => setPpOutroExtra(e.target.value)}
                        placeholder="例如：電話：02-XXXX-XXXX" 
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={ppLoading}
                      className="glow-btn text-sm py-2.5 mt-3 flex items-center justify-center gap-2"
                    >
                      {ppLoading ? '處理中...' : '一鍵執行後製打包'}
                    </button>
                  </form>

                  {ppResult && (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-2 mt-2 text-xs">
                      <span className="font-semibold text-slate-300">後製生成成功！</span>
                      <div className="truncate">輸出路徑: <span className="font-mono text-slate-400">{ppResult.output_path}</span></div>
                      
                      <video src={`${API_BASE}${ppResult.output_url}`} controls className="w-full mt-2 rounded-lg border border-slate-700" />
                      
                      {ppResult.trim_info && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          人聲結尾偵測：原長 {ppResult.trim_info.original_dur}s ➜ 裁剪為 {ppResult.trim_info.trimmed_to}s (共裁切 {ppResult.trim_info.trimmed_sec}s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
