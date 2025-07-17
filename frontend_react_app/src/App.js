import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Tabata default values (seconds)
const DEFAULTS = {
  work: 20,
  rest: 10,
  rounds: 8,
};

const COLOR_PALETTE = {
  work: 'var(--primary-color, #2196F3)',
  rest: 'var(--secondary-color, #4CAF50)',
  neutral: 'var(--accent-color, #FF9800)',
};

const AUDIO_CONFIGS = {
  start: [
    // short beep for start of a round
    880, // Frequency in Hz
  ],
  end: [
    // 2 beeps for rest, 3 for finish
    660, 440, 660,
  ],
};

// PUBLIC_INTERFACE
function App() {
  // THEME
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Set CSS custom props for custom palette
    document.documentElement.style.setProperty('--primary-color', '#2196F3');
    document.documentElement.style.setProperty('--secondary-color', '#4CAF50');
    document.documentElement.style.setProperty('--accent-color', '#FF9800');
  }, [theme]);

  // STATE
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [work, setWork] = useState(DEFAULTS.work);
  const [rest, setRest] = useState(DEFAULTS.rest);
  const [rounds, setRounds] = useState(DEFAULTS.rounds);

  const [timerState, setTimerState] = useState('stopped'); // stopped | running | paused | finished
  const [currentInterval, setCurrentInterval] = useState('work'); // work | rest
  const [timeLeft, setTimeLeft] = useState(work);
  const [round, setRound] = useState(1);
  const intervalRef = useRef(null);
  const [sessionSummary, setSessionSummary] = useState(null);

  // Helper for formatting seconds to mm:ss
  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
      seconds % 60
    ).padStart(2, '0')}`;

  // ------ AUDIO CUES ------
  const playBeep = (tones, duration = 170) => {
    // Simple beep using Web Audio API
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    let time = ctx.currentTime;
    tones.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration / 1000);
      time += duration / 1000 + 0.04;
    });
    setTimeout(() => ctx.close(), duration * tones.length + 120);
  };

  // Handle timer running
  useEffect(() => {
    if (timerState !== 'running') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, [timerState, currentInterval]);

  // Timer tick side effects
  useEffect(() => {
    if (timerState !== 'running') return;
    if (timeLeft > 0) return;

    // Signal
    playBeep(AUDIO_CONFIGS.end);
    if (currentInterval === 'work') {
      if (rest > 0) {
        setCurrentInterval('rest');
        setTimeLeft(rest);
      } else {
        // skip rest if 0, go to next round or finish
        if (round < rounds) {
          setRound((r) => r + 1);
          setCurrentInterval('work');
          setTimeLeft(work);
        } else {
          onFinish();
        }
      }
    } else if (currentInterval === 'rest') {
      if (round < rounds) {
        setRound((r) => r + 1);
        setCurrentInterval('work');
        setTimeLeft(work);
      } else {
        onFinish();
      }
    }
    // eslint-disable-next-line
  }, [timeLeft, timerState, currentInterval, rounds, rest, work, round]);

  // On START - reset everything
  const handleStart = () => {
    setSessionSummary(null);
    setRound(1);
    setCurrentInterval('work');
    setTimeLeft(work);
    setTimerState('running');
    setSettingsOpen(false);
    playBeep(AUDIO_CONFIGS.start);
  };

  // Pause
  const handlePause = () => {
    setTimerState((s) => (s === 'running' ? 'paused' : 'running'));
    if (timerState === 'paused') playBeep([1200], 100);
  };

  // Reset/Stop
  const handleReset = () => {
    setTimerState('stopped');
    setRound(1);
    setCurrentInterval('work');
    setTimeLeft(work);
    setSessionSummary(null);
  };

  // On completion
  const onFinish = () => {
    setTimerState('finished');
    setSessionSummary({
      totalRounds: rounds,
      totalWork: work * rounds,
      totalRest: rest * (rounds - 1),
      totalTime: work * rounds + rest * (rounds - 1),
      completed: true,
    });
    playBeep([...AUDIO_CONFIGS.end, 1040, 800], 220);
  };

  // If settings are changed during stopped or finished, update display
  useEffect(() => {
    if (timerState === 'stopped' || timerState === 'finished') {
      setTimeLeft(work);
      setRound(1);
      setCurrentInterval('work');
    }
  }, [work, rest, rounds]);

  // Keyboard shortcuts: Space=start/pause, Esc=reset
  useEffect(() => {
    const listener = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (timerState === 'running' || timerState === 'paused') handlePause();
        else handleStart();
      }
      if (e.code === 'Escape') handleReset();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
    // eslint-disable-next-line
  }, [timerState, work, rest, rounds]);

  // -- UI COMPONENTS --
  return (
    <div className="App" style={{ minHeight: '100vh', transition: 'background 0.3s' }}>
      <header className="app-header-interval" style={{ padding: '34px 0 20px 0' }}>
        <div className="tabata-titlebar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 480, margin: '0 auto', width: '90%' }}>
          <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: 1.3, color: 'var(--primary-color)' }}>
            Tabata Timer
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="icon-btn" style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 20,
              cursor: 'pointer',
            }} onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Workout Settings">
              <span role="img" aria-label="settings">⚙️</span>
            </button>
            <button className="theme-toggle"
              onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{ fontSize: 18, padding: '6px 14px', borderRadius: 7, border: 'none' }}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      <main className="tabata-main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '70vh',
          justifyContent: 'flex-start',
        }}
      >
        <div className="timer-card"
          style={{
            marginTop: 10,
            background: theme === 'dark' ?
              'linear-gradient(160deg, var(--bg-secondary) 85%, var(--primary-color) 95%)'
              : 'linear-gradient(140deg, #f8fafc 85%, var(--primary-color) 85%)',
            borderRadius: 32,
            boxShadow: '0 6px 34px 0 rgba(0,0,0,0.13), 0 1.5px 4.2px 0 rgba(0,0,0,0.03)',
            padding: '34px 26px 26px 26px',
            minWidth: 290,
            width: '100%',
            maxWidth: 380,
            transition: 'background 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* ROUND LABEL */}
          <div
            style={{
              fontSize: 17,
              letterSpacing: 0.5,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              opacity: 0.93,
              marginBottom: 10,
              alignSelf: 'center'
            }}
          >
            {timerState === 'finished'
              ? 'Done!'
              : `Round ${round} of ${rounds}`}
          </div>

          {/* TIMER DISPLAY */}
          <div
            className="timer-display"
            style={{
              fontSize: 65,
              fontWeight: 700,
              letterSpacing: 2,
              color:
                timerState === 'finished'
                  ? COLOR_PALETTE.neutral
                  : currentInterval === 'work'
                    ? COLOR_PALETTE.work
                    : COLOR_PALETTE.rest,
              marginBottom: 8,
              textShadow: '0 2px 16px rgba(0,0,0,0.07)',
              minHeight: 70
            }}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Interval type label */}
          <div
            style={{
              fontSize: 17,
              color:
                currentInterval === 'work'
                  ? COLOR_PALETTE.work
                  : timerState === 'finished'
                    ? COLOR_PALETTE.neutral
                    : COLOR_PALETTE.rest,
              fontWeight: 600,
              marginBottom: 18,
              minHeight: 22,
              opacity: 0.82,
              letterSpacing: 1.1,
              textTransform: 'uppercase'
            }}
          >
            {timerState === 'finished'
              ? 'Workout Complete'
              : currentInterval === 'work'
                ? 'WORK'
                : 'REST'}
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 11,
            justifyContent: 'center',
            marginTop: 4,
            marginBottom: 3,
            flexWrap: 'wrap'
          }}>
            {(timerState === 'stopped' || timerState === 'finished') &&
              <button className="btn-main" onClick={handleStart}>
                <span role="img" aria-label="Start">▶️</span> Start
              </button>
            }
            {timerState === 'running' &&
              <button className="btn-main secondary" onClick={handlePause}>
                <span role="img" aria-label="Pause">⏸️</span> Pause
              </button>
            }
            {timerState === 'paused' &&
              <button className="btn-main" onClick={handlePause}>
                <span role="img" aria-label="Resume">▶️</span> Resume
              </button>
            }
            {(timerState === 'running' || timerState === 'paused') &&
              (<button className="btn-main accent" onClick={handleReset}>
                <span role="img" aria-label="Stop">⏹️</span> Reset
              </button>)
            }
          </div>
        </div>

        {/* Session summary */}
        {sessionSummary && (
          <div
            className="summary-card"
            style={{
              background: 'rgba(64,153,83,0.14)',
              marginTop: 26,
              borderRadius: 22,
              boxShadow: '0 2.5px 18px 0 rgba(0,0,0,0.09)',
              padding: "20px 28px 16px 28px",
              color: 'var(--text-primary)'
            }}
          >
            <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: 0.7, marginBottom: 5, color: 'var(--primary-color)' }}>
              Session Summary
            </div>
            <div style={{ fontSize: 15.6, marginBottom: 2, color: 'var(--text-secondary)' }}>
              Rounds: <b>{sessionSummary.totalRounds}</b>
            </div>
            <div style={{ fontSize: 15, opacity: 0.84 }}>
              Total Time: <b>{formatTime(sessionSummary.totalTime)}</b>
            </div>
            <div style={{ fontSize: 15, opacity: 0.78 }}>
              Total Work: <b>{formatTime(sessionSummary.totalWork)}</b> | Total Rest: <b>{formatTime(sessionSummary.totalRest)}</b>
            </div>
            <div style={{ fontSize: 13.4, opacity: 0.66, marginTop: 8 }}>
              Well done!
            </div>
          </div>
        )}
      </main>

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="modal-bg"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            zIndex: 999,
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="modal-panel"
            style={{
              background: 'var(--bg-primary)',
              padding: '30px 32px 22px 32px',
              borderRadius: 18,
              minWidth: 270,
              boxShadow: '0 8px 28px 0 rgba(0,0,0,0.15)',
              color: 'var(--text-primary)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSettingsOpen(false)}
              aria-label="Close"
              style={{
                position: 'absolute', top: 10, right: 13, background: 'none',
                border: 'none', fontSize: 22, color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >✖</button>
            <div style={{ fontWeight: 700, fontSize: 21, marginBottom: 18, color: 'var(--primary-color)' }}>
              Workout Settings
            </div>
            <SettingsForm
              work={work} rest={rest} rounds={rounds}
              setWork={setWork} setRest={setRest} setRounds={setRounds}
            />
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 19, textAlign: 'center' }}>
              Changes will apply on next Start.
            </div>
          </div>
        </div>
      )}

      <footer style={{
        textAlign: 'center', marginTop: 50, padding: 12, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: 0.1,
        opacity: 0.63, borderTop: '1.6px dashed var(--border-color)', maxWidth: 390, marginLeft: 'auto', marginRight: 'auto'
      }}>
        <span>Tabata Timer &copy; {new Date().getFullYear()}&nbsp;|&nbsp;Modern Minimal UI&nbsp;|&nbsp;Built with React</span>
      </footer>
    </div>
  );
}

// Settings form COMPONENT
function SettingsForm({ work, rest, rounds, setWork, setRest, setRounds }) {
  // Clamp values to reasonable ranges for inputs
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 220 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <label htmlFor="work" style={{ width: 90, fontWeight: 500 }}>Work (s):</label>
        <input type="number" id="work" min={5} max={360} step={1}
          value={work} onChange={e => setWork(clamp(Number(e.target.value), 5, 360))}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <label htmlFor="rest" style={{ width: 90, fontWeight: 500 }}>Rest (s):</label>
        <input type="number" id="rest" min={0} max={180} step={1}
          value={rest} onChange={e => setRest(clamp(Number(e.target.value), 0, 180))}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <label htmlFor="rounds" style={{ width: 90, fontWeight: 500 }}>Rounds:</label>
        <input type="number" id="rounds" min={1} max={40} step={1}
          value={rounds} onChange={e => setRounds(clamp(Number(e.target.value), 1, 40))}
          style={inputStyle}
        />
      </div>
    </form>
  );
}

// Inline input style for settings - matches modern minimalism
const inputStyle = {
  flex: 1,
  fontSize: 16,
  border: '1.5px solid var(--border-color)',
  borderRadius: 7,
  padding: '6px 9px',
  color: 'var(--text-primary)',
  background: 'var(--bg-secondary)',
  outline: 'none',
  fontWeight: 500,
  boxShadow: 'none',
  width: '70px',
  letterSpacing: 0.8,
  transition: 'border 0.2s'
};

export default App;
