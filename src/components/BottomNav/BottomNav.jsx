// ============================================
// Bottom Navigation Component
// ============================================

import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Users, MapPin, Clock, Settings } from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { path: '/', icon: Shield, label: 'SOS' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/location', icon: MapPin, label: 'Location' },
  { path: '/nearby', icon: Clock, label: 'Nearby' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav glass" id="main-navigation">
      {navItems.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={path}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            onClick={() => navigate(path)}
            id={`nav-${label.toLowerCase()}`}
            aria-label={label}
          >
            <div className="bottom-nav__icon-wrap">
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {isActive && <div className="bottom-nav__active-dot" />}
            </div>
            <span className="bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
