// ============================================
// FakeCall Component
// Simulates an incoming phone call for safety
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, User, X } from 'lucide-react';
import './FakeCall.css';

const CALLER_PRESETS = [
  { name: 'Mom', relation: '❤️ Mom' },
  { name: 'Dad', relation: '💙 Dad' },
  { name: 'Sister', relation: '💜 Sister' },
  { name: 'Brother', relation: '💚 Brother' },
  { name: 'Best Friend', relation: '🧡 Best Friend' },
];

export default function FakeCall({ onClose }) {
  const [stage, setStage] = useState('setup'); // setup | ringing | connected | ended
  const [selectedCaller, setSelectedCaller] = useState(CALLER_PRESETS[0]);
  const [customName, setCustomName] = useState('');
  const [delay, setDelay] = useState(5);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  const ringRef = useRef(null);

  // Handle ringing timer
  useEffect(() => {
    if (stage === 'ringing') {
      // Play ringtone using Web Audio
      playRingtone();
    }
    return () => {
      if (ringRef.current) {
        ringRef.current.stop();
        ringRef.current = null;
      }
    };
  }, [stage]);

  // Call duration counter
  useEffect(() => {
    if (stage === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      gain.gain.value = 0.15;

      // Phone ring pattern
      const now = ctx.currentTime;
      for (let i = 0; i < 30; i++) {
        const t = now + i * 3;
        osc.frequency.setValueAtTime(440, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0, t + 0.4);
        osc.frequency.setValueAtTime(480, t + 0.5);
        gain.gain.setValueAtTime(0.15, t + 0.5);
        gain.gain.setValueAtTime(0, t + 0.9);
        gain.gain.setValueAtTime(0, t + 0.9);
      }

      osc.start(now);
      osc.stop(now + 90);

      ringRef.current = {
        stop: () => {
          try {
            osc.stop();
            ctx.close();
          } catch (e) { /* already stopped */ }
        }
      };
    } catch (e) {
      console.warn('Could not play ringtone:', e);
    }
  };

  const startFakeCall = () => {
    setTimeout(() => {
      setStage('ringing');
      // Also vibrate
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 300, 500, 300, 500, 300, 500]);
      }
    }, delay * 1000);
    setStage('waiting');
  };

  const answerCall = () => {
    if (ringRef.current) {
      ringRef.current.stop();
      ringRef.current = null;
    }
    setCallDuration(0);
    setStage('connected');
  };

  const endCall = () => {
    if (ringRef.current) {
      ringRef.current.stop();
      ringRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('ended');
    setTimeout(onClose, 500);
  };

  const callerName = customName || selectedCaller.name;

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Setup screen
  if (stage === 'setup') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content fakecall-setup" onClick={e => e.stopPropagation()}>
          <div className="fakecall-setup__header">
            <h2>📞 Fake Call</h2>
            <button className="fakecall-setup__close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="fakecall-setup__body">
            <p className="fakecall-setup__desc">
              Simulate an incoming call to help you leave an uncomfortable situation safely.
            </p>

            <div className="fakecall-setup__field">
              <label className="fakecall-setup__label">Select Caller</label>
              <div className="fakecall-setup__presets">
                {CALLER_PRESETS.map(caller => (
                  <button
                    key={caller.name}
                    className={`fakecall-setup__preset ${selectedCaller.name === caller.name ? 'fakecall-setup__preset--active' : ''}`}
                    onClick={() => { setSelectedCaller(caller); setCustomName(''); }}
                  >
                    {caller.relation}
                  </button>
                ))}
              </div>
            </div>

            <div className="fakecall-setup__field">
              <label className="fakecall-setup__label">Or Custom Name</label>
              <input
                type="text"
                className="fakecall-setup__input"
                placeholder="Enter custom caller name..."
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
            </div>

            <div className="fakecall-setup__field">
              <label className="fakecall-setup__label">
                Ring Delay: <strong>{delay}s</strong>
              </label>
              <input
                type="range"
                className="fakecall-setup__range"
                min="0"
                max="30"
                value={delay}
                onChange={e => setDelay(parseInt(e.target.value))}
              />
              <div className="fakecall-setup__range-labels">
                <span>Instant</span>
                <span>30 sec</span>
              </div>
            </div>
          </div>

          <div className="fakecall-setup__footer">
            <button className="fakecall-setup__start" onClick={startFakeCall}>
              <Phone size={18} />
              Start Fake Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  if (stage === 'waiting') {
    return (
      <div className="fakecall-screen fakecall-screen--waiting">
        <div className="fakecall-screen__waiting-content">
          <div className="fakecall-screen__waiting-icon">
            <Phone size={28} />
          </div>
          <h3>Call incoming in {delay}s...</h3>
          <p>You can close this and the call will still ring</p>
          <button className="fakecall-screen__cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Ringing / Connected / Ended screen
  return (
    <div className={`fakecall-screen fakecall-screen--${stage}`}>
      {/* Background gradient */}
      <div className="fakecall-screen__bg" />

      <div className="fakecall-screen__content">
        {/* Caller Info */}
        <div className="fakecall-screen__caller">
          <div className="fakecall-screen__avatar">
            <User size={40} />
          </div>
          <h2 className="fakecall-screen__name">{callerName}</h2>
          <p className="fakecall-screen__status">
            {stage === 'ringing' && 'Incoming Call...'}
            {stage === 'connected' && formatDuration(callDuration)}
            {stage === 'ended' && 'Call Ended'}
          </p>
        </div>

        {/* Call Actions */}
        <div className="fakecall-screen__actions">
          {stage === 'ringing' && (
            <>
              <button
                className="fakecall-screen__btn fakecall-screen__btn--decline"
                onClick={endCall}
              >
                <PhoneOff size={28} />
              </button>
              <button
                className="fakecall-screen__btn fakecall-screen__btn--answer"
                onClick={answerCall}
              >
                <Phone size={28} />
              </button>
            </>
          )}
          {stage === 'connected' && (
            <button
              className="fakecall-screen__btn fakecall-screen__btn--decline"
              onClick={endCall}
            >
              <PhoneOff size={28} />
            </button>
          )}
        </div>

        {stage === 'ringing' && (
          <div className="fakecall-screen__slide-hint">
            <span>Swipe or tap to answer</span>
          </div>
        )}
      </div>
    </div>
  );
}
