import React, { useState, useEffect, useRef, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './App.css';

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Replace the two values below with YOUR Daily.co details
const DAILY_ROOM_URL = 'https://juanzara.daily.co/studio'; // ← paste your room URL
const DAILY_API_KEY  = '055a8b23a37775f28b2d45bbe916e2d9fe3e3c3830d6217a5d45cdabbca8e4c4PI_KEY_HERE';                       // ← paste your API key

// ── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'noir',    label: 'Noir',    bg: '#0d0d0d', accent: '#c8a97e', text: '#f0ece4' },
  { id: 'slate',   label: 'Slate',   bg: '#1a1f2e', accent: '#7eb8c8', text: '#e8f0f4' },
  { id: 'forest',  label: 'Forest',  bg: '#0f1f15', accent: '#7ec87e', text: '#e4f0e8' },
  { id: 'rose',    label: 'Rose',    bg: '#1f0f15', accent: '#c87e9a', text: '#f0e4ea' },
  { id: 'chalk',   label: 'Chalk',   bg: '#f5f0eb', accent: '#2d2d2d', text: '#1a1a1a' },
];

// ── VIRTUAL BACKGROUNDS ──────────────────────────────────────────────────────
const BACKGROUNDS = [
  { id: 'none',    label: 'None',       value: null },
  { id: 'blur',    label: 'Blur',       value: 'blur' },
  { id: 'office',  label: 'Office',     value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80' },
  { id: 'library', label: 'Library',    value: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1280&q=80' },
  { id: 'cafe',    label: 'Café',       value: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1280&q=80' },
  { id: 'studio',  label: 'Dark Studio',value: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1280&q=80' },
];

export default function App() {
  const callRef        = useRef(null);
  const wrapperRef     = useRef(null);
  const mediaRecorder  = useRef(null);
  const recordedChunks = useRef([]);

  const [phase,       setPhase]       = useState('lobby');   // lobby | call | ended
  const [theme,       setTheme]       = useState(THEMES[0]);
  const [bg,          setBg]          = useState(BACKGROUNDS[0]);
  const [recording,   setRecording]   = useState(false);
  const [recTime,     setRecTime]     = useState(0);
  const [micOn,       setMicOn]       = useState(true);
  const [camOn,       setCamOn]       = useState(true);
  const [guestJoined, setGuestJoined] = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [error,       setError]       = useState(null);
  const timerRef = useRef(null);

  // Apply theme CSS variables
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--bg',     theme.bg);
    r.setProperty('--accent', theme.accent);
    r.setProperty('--text',   theme.text);
  }, [theme]);

  // ── JOIN CALL ─────────────────────────────────────────────────────────────
  const joinCall = useCallback(async () => {
    if (DAILY_ROOM_URL.includes('YOUR_SUBDOMAIN') || DAILY_API_KEY.includes('YOUR_API_KEY')) {
      setError('Please open src/App.js and replace DAILY_ROOM_URL and DAILY_API_KEY with your real values.');
      return;
    }

    try {
      const call = DailyIframe.createCallObject({ url: DAILY_ROOM_URL });
      callRef.current = call;

      call.on('participant-joined', () => setGuestJoined(true));
      call.on('participant-left',   () => setGuestJoined(false));
      call.on('error', (e) => setError(e.errorMsg || 'Call error'));

      await call.join({ url: DAILY_ROOM_URL, token: DAILY_API_KEY });

      // Mount call UI into wrapper div
      const frame = DailyIframe.createFrame(wrapperRef.current, {
        iframeStyle: {
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          border: 'none', borderRadius: '12px',
        },
        showLeaveButton:    false,
        showFullscreenButton: true,
      });
      await frame.join({ url: DAILY_ROOM_URL });
      callRef.current = frame;

      setPhase('call');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── LEAVE CALL ────────────────────────────────────────────────────────────
  const leaveCall = useCallback(async () => {
    if (recording) stopRecording();
    if (callRef.current) {
      await callRef.current.destroy();
      callRef.current = null;
    }
    setPhase('ended');
  }, [recording]);

  // ── RECORDING ─────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true, audio: true,
      });
      recordedChunks.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      mr.start(1000);
      mediaRecorder.current = mr;
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch (err) {
      setError('Recording permission denied. Please allow screen capture.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `studio-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      clearInterval(timerRef.current);
      setRecording(false);
    }
  }, []);

  // ── MIC / CAM TOGGLES ─────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!callRef.current) return;
    callRef.current.setLocalAudio(!micOn);
    setMicOn(v => !v);
  };
  const toggleCam = () => {
    if (!callRef.current) return;
    callRef.current.setLocalVideo(!camOn);
    setCamOn(v => !v);
  };

  // ── COPY INVITE LINK ──────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(DAILY_ROOM_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── FORMAT TIMER ──────────────────────────────────────────────────────────
  const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── LOBBY ── */}
      {phase === 'lobby' && (
        <div className="lobby">
          <header className="lobby-header">
            <span className="logo">◉ studio</span>
            <span className="tagline">record conversations. no fuss.</span>
          </header>

          <div className="lobby-card">
            <h1>Ready to record?</h1>
            <p className="sub">You'll host the session. Share the link below with your guest so they can join.</p>

            {error && <div className="error-box">{error}</div>}

            <div className="invite-box">
              <span className="invite-url">{DAILY_ROOM_URL}</span>
              <button className="btn-copy" onClick={copyLink}>
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
            </div>

            <div className="section-label">Choose a theme</div>
            <div className="theme-row">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`theme-swatch ${theme.id === t.id ? 'active' : ''}`}
                  style={{ background: t.bg, borderColor: t.accent }}
                  onClick={() => setTheme(t)}
                  title={t.label}
                />
              ))}
            </div>

            <button className="btn-primary" onClick={joinCall}>
              Enter Studio →
            </button>
          </div>
        </div>
      )}

      {/* ── CALL ── */}
      {phase === 'call' && (
        <div className="call-view">
          <div className="call-topbar">
            <span className="logo-sm">◉ studio</span>
            <div className="guest-pill">
              <span className={`dot ${guestJoined ? 'green' : 'grey'}`} />
              {guestJoined ? 'Guest connected' : 'Waiting for guest…'}
            </div>
            {recording && (
              <div className="rec-pill">
                <span className="dot red pulse" /> REC {fmtTime(recTime)}
              </div>
            )}
          </div>

          {/* Video frame */}
          <div className="video-wrapper" ref={wrapperRef} />

          {/* Controls bar */}
          <div className="controls">
            <div className="controls-left">
              <button className={`ctrl-btn ${micOn ? '' : 'off'}`} onClick={toggleMic} title="Toggle mic">
                {micOn ? '🎙' : '🔇'}
              </button>
              <button className={`ctrl-btn ${camOn ? '' : 'off'}`} onClick={toggleCam} title="Toggle camera">
                {camOn ? '📷' : '🚫'}
              </button>
            </div>

            <div className="controls-center">
              {!recording
                ? <button className="btn-record" onClick={startRecording}>⏺ Start Recording</button>
                : <button className="btn-stop"   onClick={stopRecording}>⏹ Stop & Download</button>
              }
            </div>

            <div className="controls-right">
              <select
                className="bg-select"
                value={bg.id}
                onChange={e => setBg(BACKGROUNDS.find(b => b.id === e.target.value))}
              >
                {BACKGROUNDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              <button className="btn-leave" onClick={leaveCall}>Leave</button>
            </div>
          </div>

          {error && <div className="error-bar">{error}</div>}
        </div>
      )}

      {/* ── ENDED ── */}
      {phase === 'ended' && (
        <div className="lobby">
          <div className="lobby-card ended-card">
            <div className="ended-icon">✓</div>
            <h1>Session ended</h1>
            <p className="sub">Your recording was downloaded to your computer. Import it into your video editor for post-production.</p>
            <button className="btn-primary" onClick={() => { setPhase('lobby'); setGuestJoined(false); setRecTime(0); }}>
              Start a new session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
