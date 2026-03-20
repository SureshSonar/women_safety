// ============================================
// Discreet / Camouflage Mode
// A functional calculator that unlocks the app when PIN is entered
// ============================================

import { useState } from 'react';
import './Calculator.css';

export default function Calculator({ pin, onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handlePress = (val) => {
    if (val === 'C') {
      setDisplay('0');
      setEquation('');
      return;
    }

    if (val === '=') {
      try {
        // Checking for the secret PIN
        if (display === pin || equation + display === pin) {
          onUnlock();
          return;
        }

        // Basic eval for actual calculator functionality
        // eslint-disable-next-line
        const result = eval(equation + display);
        setDisplay(String(result));
        setEquation('');
      } catch (err) {
        setDisplay('Error');
        setEquation('');
      }
      return;
    }

    if (['+', '-', '*', '/'].includes(val)) {
      setEquation(equation + display + val);
      setDisplay('0');
      return;
    }

    if (display === '0' || display === 'Error') {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }

    // Auto-unlock if they simply type the pin directly
    if (display + val === pin) {
      onUnlock();
    }
  };

  const buttons = [
    'C', '+/-', '%', '/',
    '7', '8', '9', '*',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '='
  ];

  return (
    <div className="camouflage-screen" id="camouflage-screen">
      <div className="calc-container">
        <div className="calc-display-area">
          <div className="calc-equation">{equation}</div>
          <div className="calc-display">{display}</div>
        </div>
        <div className="calc-keypad">
          {buttons.map((btn, i) => (
            <button
              key={i}
              className={`calc-btn ${['/', '*', '-', '+', '='].includes(btn) ? 'calc-btn-op' : ''} ${btn === '0' ? 'calc-btn-zero' : ''} ${['C', '+/-', '%'].includes(btn) ? 'calc-btn-top' : ''}`}
              onClick={() => handlePress(btn)}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
