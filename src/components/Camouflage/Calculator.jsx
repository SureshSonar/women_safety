// ============================================
// Discreet / Camouflage Mode
// A realistic calculator that unlocks the app when PIN is entered
// Looks and works exactly like a real phone calculator
// ============================================

import { useState, useEffect, useRef } from 'react';
import './Calculator.css';

export default function Calculator({ pin, onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [pinBuffer, setPinBuffer] = useState('');
  const [lastResult, setLastResult] = useState(false);

  // Update time for fake status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const checkPin = (value) => {
    // Check if the typed sequence matches the PIN
    const newBuffer = pinBuffer + value;
    setPinBuffer(newBuffer);

    if (newBuffer === pin) {
      // Vibrate on unlock
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      setTimeout(() => onUnlock(), 150);
      return true;
    }

    // If buffer is longer than pin or doesn't match prefix, reset tracking
    if (newBuffer.length >= pin.length || !pin.startsWith(newBuffer)) {
      setPinBuffer(value);
      // Check if just this digit starts the pin
      if (pin.startsWith(value)) {
        setPinBuffer(value);
      } else {
        setPinBuffer('');
      }
    }
    return false;
  };

  const handlePress = (val) => {
    // ── Clear ──
    if (val === 'C') {
      setDisplay('0');
      setEquation('');
      setPinBuffer('');
      setLastResult(false);
      return;
    }

    // ── Backspace (⌫) ──
    if (val === '⌫') {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay('0');
      }
      return;
    }

    // ── Plus/Minus ──
    if (val === '+/-') {
      if (display !== '0' && display !== 'Error') {
        setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
      }
      return;
    }

    // ── Percentage ──
    if (val === '%') {
      if (display !== '0' && display !== 'Error') {
        const num = parseFloat(display);
        if (!isNaN(num)) {
          setDisplay(String(num / 100));
        }
      }
      return;
    }

    // ── Equals ──
    if (val === '=') {
      try {
        // Also check direct PIN match on equals
        const fullExpr = equation + display;
        if (display === pin || fullExpr === pin) {
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          setTimeout(() => onUnlock(), 150);
          return;
        }

        // Safe math evaluation (no eval)
        const result = safeMathEval(equation + display);
        if (result !== null) {
          setDisplay(String(result));
        } else {
          setDisplay('Error');
        }
        setEquation('');
        setLastResult(true);
      } catch {
        setDisplay('Error');
        setEquation('');
      }
      return;
    }

    // ── Operators ──
    if (['+', '-', '×', '÷'].includes(val)) {
      const opMap = { '×': '*', '÷': '/' };
      const op = opMap[val] || val;
      setEquation(equation + display + op);
      setDisplay('0');
      setLastResult(false);
      return;
    }

    // ── Decimal ──
    if (val === '.') {
      if (!display.includes('.')) {
        setDisplay(display + '.');
      }
      return;
    }

    // ── Number input ──
    // If we just got a result, start fresh
    if (lastResult) {
      setDisplay(val);
      setEquation('');
      setLastResult(false);
    } else if (display === '0' || display === 'Error') {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }

    // Track digits for PIN detection
    checkPin(val);
  };

  // Safe math evaluation without eval
  function safeMathEval(expression) {
    try {
      // Only allow numbers, operators, decimals, and parentheses
      const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
      if (!sanitized) return null;
      // Use Function constructor (safer than eval, same sandbox)
      const fn = new Function('return ' + sanitized);
      const result = fn();
      if (typeof result === 'number' && isFinite(result)) {
        // Round to avoid floating point issues
        return Math.round(result * 1e10) / 1e10;
      }
      return null;
    } catch {
      return null;
    }
  }

  const buttons = [
    { label: 'C',   type: 'top' },
    { label: '+/-', type: 'top' },
    { label: '%',   type: 'top' },
    { label: '÷',   type: 'op' },
    { label: '7',   type: 'num' },
    { label: '8',   type: 'num' },
    { label: '9',   type: 'num' },
    { label: '×',   type: 'op' },
    { label: '4',   type: 'num' },
    { label: '5',   type: 'num' },
    { label: '6',   type: 'num' },
    { label: '-',   type: 'op' },
    { label: '1',   type: 'num' },
    { label: '2',   type: 'num' },
    { label: '3',   type: 'num' },
    { label: '+',   type: 'op' },
    { label: '0',   type: 'num', wide: true },
    { label: '.',   type: 'num' },
    { label: '=',   type: 'op' },
  ];

  // Format display number with commas
  const formatDisplay = (val) => {
    if (val === 'Error' || val === '0') return val;
    const parts = val.split('.');
    // Only format the integer part
    if (parts[0].length > 3) {
      const negative = parts[0].startsWith('-');
      let num = negative ? parts[0].slice(1) : parts[0];
      num = num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      parts[0] = negative ? '-' + num : num;
    }
    return parts.join('.');
  };

  // Dynamic font size based on display length
  const getDisplaySize = () => {
    const len = display.replace(/[^0-9.]/g, '').length;
    if (len > 12) return '2rem';
    if (len > 9) return '2.8rem';
    if (len > 7) return '3.5rem';
    return '4.2rem';
  };

  return (
    <div className="camouflage-screen" id="camouflage-screen">
      {/* Fake Status Bar */}
      <div className="calc-status-bar">
        <span className="calc-status-time">{currentTime}</span>
        <div className="calc-status-icons">
          <div className="calc-signal">
            <span></span><span></span><span></span><span></span>
          </div>
          <svg className="calc-wifi" viewBox="0 0 24 24" width="16" height="16" fill="white">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
          <div className="calc-battery">
            <div className="calc-battery-fill"></div>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="calc-container">
        <div className="calc-display-area">
          <div className="calc-equation">{equation.replace(/\*/g, '×').replace(/\//g, '÷')}</div>
          <div className="calc-display" style={{ fontSize: getDisplaySize() }}>
            {formatDisplay(display)}
          </div>
        </div>
        <div className="calc-keypad">
          {buttons.map((btn, i) => (
            <button
              key={i}
              className={`calc-btn calc-btn--${btn.type} ${btn.wide ? 'calc-btn--zero' : ''}`}
              onClick={() => handlePress(btn.label)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (btn.label === 'C') handlePress('⌫');
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="calc-home-indicator"></div>
      </div>
    </div>
  );
}
