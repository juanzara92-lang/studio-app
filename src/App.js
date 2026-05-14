import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const DAILY_ROOM_URL = 'https://juanzara.daily.co/studio';

const THEMES = [
  { id: 'noir',   label: 'Noir',   bg: '#0d0d0d', accent: '#c8a97e', text: '#f0ece4' },
  { id: 'slate',  label: 'Slate',  bg: '#1a1f2e', accent: '#7eb8c8', text: '#e8f0f4' },
  { id: 'forest', label: 'Forest', bg: '#0f1f15', accent: '#7ec87e', text: '#e4f0e8' },
  { id: 'rose',   label: 'Rose',   bg: '#1f0f15', accent: '#c87e9a', text: '#f0e4ea' },
  { id: 'chalk',  label: 'Chalk',  bg: '#f5f0eb', accent: '#2d2d2d', text: '#1a1a1a' },
];

export default function App() {
  const mediaRecorder  = useRef(null);
  const recordedChunks = useRef([]);
  const timerRef       = useRef(null);

  const [phase,     setPhase]     = useState('lobby');
  const [theme,     setTheme]     = useState(THEMES[0]);
  const [recording, setRecording] = useState(false);
  const [recTime,   setRecTime]   = useState(0);
  const [copied,    setCopied]    = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--bg',     theme.bg);
    r.setProperty('--accent', theme.accent);
    r.setProperty('--text',   theme.text);
  }, [theme]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: true },
      });
      recordedChunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
      mr.start(1000);
      mediaRecorder.current = mr;
      setRecording(true);
      setRecTime(0);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
      stream.getVideoTracks()[0].onended = () => stopRecording();
    } catch (err) {
      setError('Screen recording permission denied. Please click Allow when prompted.');
    }
  }, []); // eslint-disable-line

  const stopRecording = useCallback(() => {
    if (!mediaRecorder.current) return;
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `studio-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(DAILY_ROOM_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="app">

      {phase === 'lobby' && (
        <div className="lobby">
          <header className="lobby-header">
            <span className="logo">◉ studio</span>
            <span className="tagline">record conversations. no fuss.</span>
          </header>
          <div className="lobby-card">
            <h1>Ready to record?</h1>
            <p className="sub">
              Share the link below with your guest — they just click it to join, no account needed.
            </p>
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
            <button className="btn-primary" onClick={() => { setError(null); setPhase('call'); }}>
              Enter Studio →
            </button>
          </div>
        </div>
      )}

      {phase === 'call' && (
        <div className="call-view">
          <div className="call-topbar">
            <span className="logo-sm">◉ studio</span>
            {recording && (
              <div className="rec-pill">
                <span className="dot red pulse" /> REC {fmtTime(recTime)}
              </div>
            )}
            <div className="topbar-right">
              <button className="btn-copy-sm" onClick={copyLink}>
                {copied ? '✓ Copied' : '⬡ Copy guest link'}
              </button>
            </div>
          </div>

          <div className="video-wrapper">
            <iframe
              title="studio-call"
              src={DAILY_ROOM_URL}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                border: 'none', borderRadius: '12px',
              }}
            />
          </div>

          <div className="controls">
            <div className="controls-left">
              <button className="btn-leave" onClick={() => { if (recording) stopRecording(); setPhase('ended'); }}>
                ← Leave
              </button>
            </div>
            <div className="controls-center">
              {!recording
                ? <button className="btn-record" onClick={startRecording}>⏺ Start Recording</button>
                : <button className="btn-stop"   onClick={stopRecording}>⏹ Stop & Download</button>
              }
            </div>
            <div className="controls-right">
              <span className="hint">When prompted, share this browser tab</span>
            </div>
          </div>

          {error && (
            <div className="error-bar">
              {error} <button onClick={() => setError(null)}>✕</button>
            </div>
          )}
        </div>
      )}

      {phase === 'ended' && (
        <div className="lobby">
          <div className="lobby-card ended-card">
            <div className="ended-icon">✓</div>
            <h1>Session ended</h1>
            <p className="sub">
              Your recording was saved as a <strong>.webm</strong> file.
              Import it into your video editor, then upload to YouTube.
            </p>
            <button className="btn-primary" onClick={() => { setPhase('lobby'); setRecTime(0); setError(null); }}>
              Start a new session
            </button>
          </div>
        </div>
      )}

    </div>
  );
}