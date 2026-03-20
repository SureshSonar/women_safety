// ============================================
// App.jsx - SafeHer Main Application
// Women Safety Quick Alert App
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav/BottomNav';
import Toast from './components/Toast/Toast';
import Home from './pages/Home/Home';
import Contacts from './pages/Contacts/Contacts';
import Location from './pages/Location/Location';
import NearbyHelp from './pages/NearbyHelp/NearbyHelp';
import Settings from './pages/Settings/Settings';
import LiveTracking from './pages/LiveTracking/LiveTracking';
import Calculator from './components/Camouflage/Calculator';
import { useBatteryMonitor } from './hooks/useBatteryMonitor';
import { getSettings } from './utils/storage';

export default function App() {
  const [toasts, setToasts] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(true);

  // Initialize camouflage mode
  useEffect(() => {
    const settings = getSettings();
    if (settings.camouflageMode) {
      setIsUnlocked(false);
    }
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Use the battery monitor hook
  useBatteryMonitor(showToast);

  if (!isUnlocked) {
    return <Calculator pin={getSettings().camouflagePin || '1234'} onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Page Routes */}
      <Routes>
        <Route path="/" element={<Home showToast={showToast} />} />
        <Route path="/contacts" element={<Contacts showToast={showToast} />} />
        <Route path="/location" element={<Location showToast={showToast} />} />
        <Route path="/nearby" element={<NearbyHelp showToast={showToast} />} />
        <Route path="/settings" element={<Settings showToast={showToast} />} />
        <Route path="/track/:sessionId" element={<LiveTracking />} />
      </Routes>

      {/* Bottom Navigation */}
      <BottomNav />
    </BrowserRouter>
  );
}
