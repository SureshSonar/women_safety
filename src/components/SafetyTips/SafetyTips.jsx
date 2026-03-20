// ============================================
// SafetyTips Component
// Rotating safety tips carousel for women
// ============================================

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Eye, MapPin, Phone, Users,
  AlertTriangle, Lock, Smartphone, Moon, HeartHandshake
} from 'lucide-react';
import './SafetyTips.css';

const SAFETY_TIPS = [
  {
    icon: ShieldCheck,
    title: 'Trust Your Instincts',
    description: 'If something feels wrong, leave immediately. Your gut feeling is your strongest safety tool.',
    color: '#e040fb',
  },
  {
    icon: Eye,
    title: 'Stay Aware',
    description: 'Keep your head up, earphones out, and stay alert to your surroundings, especially at night.',
    color: '#ff6090',
  },
  {
    icon: MapPin,
    title: 'Share Your Location',
    description: 'Always share your live location with a trusted friend or family member when traveling alone.',
    color: '#64d2ff',
  },
  {
    icon: Phone,
    title: 'Emergency Numbers',
    description: 'Keep 112 (Emergency), 1091 (Women Helpline), and local police on speed dial.',
    color: '#30d158',
  },
  {
    icon: Users,
    title: 'Stay in Groups',
    description: 'Whenever possible, travel in groups, especially during late hours or in unfamiliar areas.',
    color: '#ff9f0a',
  },
  {
    icon: AlertTriangle,
    title: 'Avoid Isolated Areas',
    description: 'Stick to well-lit, populated streets. Avoid shortcuts through empty lanes or parks at night.',
    color: '#ff453a',
  },
  {
    icon: Lock,
    title: 'Secure Your Ride',
    description: 'Always verify cab driver details, share ride info with family, and note the license plate.',
    color: '#bf5af2',
  },
  {
    icon: Smartphone,
    title: 'Keep Phone Charged',
    description: 'Always carry a charged phone. Consider carrying a portable charger for emergencies.',
    color: '#5ac8fa',
  },
  {
    icon: Moon,
    title: 'Night Safety',
    description: 'Book verified cabs, inform someone about your route, and avoid engaging with strangers.',
    color: '#ffd60a',
  },
  {
    icon: HeartHandshake,
    title: 'Self-Defense Basics',
    description: 'Learn basic self-defense moves. Target vulnerable spots: eyes, nose, throat, and groin.',
    color: '#ff375f',
  },
];

export default function SafetyTips() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SAFETY_TIPS.length);
        setIsAnimating(false);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const tip = SAFETY_TIPS[currentIndex];
  const TipIcon = tip.icon;

  return (
    <div className="safety-tips" id="safety-tips">
      <div className="safety-tips__header">
        <ShieldCheck size={14} />
        <span>Safety Tip</span>
        <div className="safety-tips__dots">
          {SAFETY_TIPS.map((_, i) => (
            <button
              key={i}
              className={`safety-tips__dot ${i === currentIndex ? 'safety-tips__dot--active' : ''}`}
              onClick={() => setCurrentIndex(i)}
              style={{ '--dot-color': SAFETY_TIPS[i].color }}
              aria-label={`Tip ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className={`safety-tips__card ${isAnimating ? 'safety-tips__card--exit' : 'safety-tips__card--enter'}`}>
        <div
          className="safety-tips__icon"
          style={{ background: `${tip.color}18`, color: tip.color }}
        >
          <TipIcon size={22} />
        </div>
        <div className="safety-tips__content">
          <h4 className="safety-tips__title" style={{ color: tip.color }}>
            {tip.title}
          </h4>
          <p className="safety-tips__desc">{tip.description}</p>
        </div>
      </div>
    </div>
  );
}
