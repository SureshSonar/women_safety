// ============================================
// App.jsx - SafeHer Main Application
// Women Safety Quick Alert App
// ============================================

import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav/BottomNav';
import Toast from './components/Toast/Toast';
import Home from './pages/Home/Home';
import Contacts from './pages/Contacts/Contacts';
import Location from './pages/Location/Location';
import NearbyHelp from './pages/NearbyHelp/NearbyHelp';
import Settings from './pages/Settings/Settings';

export default function App() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
      </Routes>

      {/* Bottom Navigation */}
      <BottomNav />
    </BrowserRouter>
  );
}
