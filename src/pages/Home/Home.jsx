// ============================================
// Home Page - SOS Emergency Dashboard
// The central screen with the big SOS button
// Enhanced with women-safety focused elements
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldAlert, Phone, MessageCircle, Volume2,
  VolumeX, Zap, Wifi, WifiOff, MapPin, Clock,
  PhoneCall, Heart, AlertTriangle
} from 'lucide-react';
import { sendSOSAlert, playSiren, triggerVibration } from '../../services/alertService';
import { getCurrentPosition, getGoogleMapsLink } from '../../services/locationService';
import { createTrackingSession, startBroadcasting, stopBroadcasting, getTrackingLink } from '../../services/liveTrackingService';
import { getContacts, getSettings, getAlertHistory } from '../../utils/storage';
import { startShakeDetection, stopShakeDetection, isDeviceMotionSupported } from '../../services/shakeDetection';
import SafetyTips from '../../components/SafetyTips/SafetyTips';
import FakeCall from '../../components/FakeCall/FakeCall';
import './Home.css';

export default function Home({ showToast }) {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [location, setLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sirenActive, setSirenActive] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [alertResult, setAlertResult] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [trackingSessionId, setTrackingSessionId] = useState(null);
  const [trackingControl, setTrackingControl] = useState(null);

  const sirenRef = useRef(null);
  const countdownRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    setContacts(getContacts());
    setRecentAlerts(getAlertHistory().slice(0, 3));
    
    // Get current location
    getCurrentPosition()
      .then(setLocation)
      .catch(() => {});

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  // Hardware Button SOS Trigger (Volume rapid clicks from Capacitor Android shell)
  useEffect(() => {
    const handleHardwareSOS = () => {
      if (!isAlertActive) {
        showToast('⚙️ Hardware SOS Triggered!', 'warning');
        executeSOSAlert();
      }
    };
    
    window.addEventListener('hardware_sos_trigger', handleHardwareSOS);
    return () => window.removeEventListener('hardware_sos_trigger', handleHardwareSOS);
  }, [isAlertActive]); // Re-bind on alert state change to prevent double triggering

  // Shake detection
  const handleShakeTrigger = useCallback(() => {
    if (!isAlertActive && countdown === null) {
      triggerVibration();
      initiateSOSCountdown();
      showToast('🔔 Shake detected! SOS countdown started.', 'warning');
    }
  }, [isAlertActive, countdown]);

  useEffect(() => {
    const settings = getSettings();
    if (settings.shakeDetection && isDeviceMotionSupported()) {
      startShakeDetection(handleShakeTrigger);
      setShakeEnabled(true);
    }
    return () => stopShakeDetection();
  }, [handleShakeTrigger]);

  // SOS Countdown
  const initiateSOSCountdown = () => {
    const settings = getSettings();
    let count = settings.countdownSeconds || 3;
    setCountdown(count);

    countdownRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        executeSOSAlert();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
    showToast('SOS cancelled.', 'info');
  };

  // Execute the SOS alert
  const executeSOSAlert = async () => {
    setIsAlertActive(true);
    triggerVibration();

    // Start Live Tracking Session
    const sessionId = createTrackingSession();
    setTrackingSessionId(sessionId);
    const control = startBroadcasting(sessionId, { emergencyMode: true });
    setTrackingControl(control);

    try {
      const result = await sendSOSAlert('app', sessionId);
      setAlertResult(result);
      setLocation(result.location);
      showToast(`🚨 Emergency alert sent to ${result.contactsNotified} contacts!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      setIsAlertActive(false);
      stopBroadcasting(sessionId);
      setTrackingSessionId(null);
    }
  };

  // Cancel active alert
  const deactivateAlert = () => {
    setIsAlertActive(false);
    setAlertResult(null);
    if (trackingSessionId) {
      stopBroadcasting(trackingSessionId);
      setTrackingSessionId(null);
      setTrackingControl(null);
    }
    if (sirenRef.current) {
      sirenRef.current.stop();
      sirenRef.current = null;
      setSirenActive(false);
    }
    showToast('Alert deactivated.', 'info');
  };

  // Toggle siren
  const toggleSiren = () => {
    if (sirenActive) {
      sirenRef.current?.stop();
      sirenRef.current = null;
      setSirenActive(false);
    } else {
      sirenRef.current = playSiren(30000);
      setSirenActive(true);
      showToast('🔊 Siren activated!', 'warning');
    }
  };

  // Handle SOS button press
  const handleSOSPress = () => {
    if (countdown !== null) {
      cancelCountdown();
      return;
    }
    if (isAlertActive) {
      deactivateAlert();
      return;
    }
    if (contacts.length === 0) {
      showToast('Please add emergency contacts first!', 'error');
      return;
    }
    initiateSOSCountdown();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Stay Safe Tonight';
  };

  // Safety readiness score
  const getSafetyScore = () => {
    let score = 0;
    if (contacts.length >= 1) score += 30;
    if (contacts.length >= 3) score += 10;
    if (location) score += 25;
    if (isOnline) score += 15;
    if (shakeEnabled) score += 10;
    const settings = getSettings();
    if (settings.sirenEnabled) score += 10;
    return Math.min(score, 100);
  };

  const safetyScore = getSafetyScore();

  return (
    <div className={`home ${isAlertActive ? 'home--alert-active' : ''}`} id="home-page">
      {/* Fake Call Modal */}
      {showFakeCall && (
        <FakeCall onClose={() => setShowFakeCall(false)} />
      )}

      {/* Status Bar */}
      <div className="home__status-bar">
        <div className="home__status-left">
          <div className={`home__status-indicator ${isOnline ? 'home__status-indicator--online' : 'home__status-indicator--offline'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="home__status-center">
          <Shield size={16} className="home__logo-icon" />
          <span className="home__brand">SafeHer</span>
        </div>
        <div className="home__status-right">
          <span className="home__time">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Greeting & Safety Score */}
      <div className="home__greeting">
        <div className="home__greeting-text">
          <h2 className="home__greeting-title">{getGreeting()} 👋</h2>
          <p className="home__greeting-subtitle">Your safety is our priority</p>
        </div>
        <div className="home__safety-score" title="Safety readiness score">
          <svg className="home__score-ring" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="20" cy="20" r="16" fill="none"
              stroke={safetyScore >= 70 ? '#30d158' : safetyScore >= 40 ? '#ff9f0a' : '#ff453a'}
              strokeWidth="3"
              strokeDasharray={`${safetyScore} ${100 - safetyScore}`}
              strokeDashoffset="25"
              strokeLinecap="round"
              className="home__score-circle"
            />
          </svg>
          <span className="home__score-value">{safetyScore}</span>
        </div>
      </div>

      {/* Women Helpline Banner */}
      <div className="home__helpline-banner">
        <div className="home__helpline-icon">
          <Heart size={16} />
        </div>
        <div className="home__helpline-info">
          <span className="home__helpline-title">Women Helpline</span>
          <span className="home__helpline-desc">24/7 Free & Confidential Support</span>
        </div>
        <a href="tel:1091" className="home__helpline-call" id="women-helpline-btn">
          <Phone size={14} />
          <span>1091</span>
        </a>
      </div>

      {/* Hero Section */}
      <div className="home__hero">
        {/* Shake indicator */}
        {shakeEnabled && (
          <div className="home__shake-badge">
            <Zap size={12} />
            <span>Shake to SOS</span>
          </div>
        )}

        {/* Location badge */}
        {location && (
          <div className="home__location-badge">
            <MapPin size={12} />
            <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
          </div>
        )}

        {/* SOS Button */}
        <div className="home__sos-container">
          {/* Ripple rings */}
          {(isAlertActive || countdown !== null) && (
            <>
              <div className="home__sos-ring home__sos-ring--1" />
              <div className="home__sos-ring home__sos-ring--2" />
              <div className="home__sos-ring home__sos-ring--3" />
            </>
          )}

          <button
            className={`home__sos-btn ${isAlertActive ? 'home__sos-btn--active' : ''} ${countdown !== null ? 'home__sos-btn--countdown' : ''}`}
            onClick={handleSOSPress}
            id="sos-button"
            aria-label="Emergency SOS"
          >
            <div className="home__sos-inner">
              {countdown !== null ? (
                <div className="home__countdown">
                  <span className="home__countdown-number">{countdown}</span>
                  <span className="home__countdown-label">TAP TO CANCEL</span>
                </div>
              ) : isAlertActive ? (
                <div className="home__sos-active-content">
                  <ShieldAlert size={40} />
                  <span className="home__sos-active-text">ALERT ACTIVE</span>
                  <span className="home__sos-sub">Tap to deactivate</span>
                </div>
              ) : (
                <div className="home__sos-idle-content">
                  <span className="home__sos-text">SOS</span>
                  <span className="home__sos-sub">Hold for Emergency</span>
                </div>
              )}
            </div>
          </button>
        </div>

        <p className="home__instruction">
          {countdown !== null
            ? 'Sending alert in...'
            : isAlertActive
            ? 'Your emergency contacts have been notified'
            : contacts.length === 0
            ? 'Add emergency contacts to enable SOS'
            : 'Tap SOS button or shake phone for emergency'}
        </p>
      </div>

      {/* Alert Result */}
      {alertResult && (
        <div className="home__alert-result animate-slide-up">
          <div className="home__result-card glass">
            <div className="home__result-header">
              <ShieldAlert size={20} className="home__result-icon" />
              <span>Alert Sent Successfully</span>
            </div>
            <div className="home__result-details">
              <div className="home__result-item">
                <span className="home__result-label">Contacts Notified</span>
                <span className="home__result-value">{alertResult.contactsNotified}</span>
              </div>
              {alertResult.location && (
                <div className="home__result-item">
                  <span className="home__result-label">Location Shared</span>
                  <a
                    href={getGoogleMapsLink(alertResult.location.latitude, alertResult.location.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="home__result-link"
                  >
                    View on Map →
                  </a>
                </div>
              )}
              <div className="home__result-item">
                <span className="home__result-label">SMS</span>
                <span className="home__result-value">{alertResult.smsTriggered ? '✓ Triggered' : '○ Not available'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="home__actions">
        <button
          className="home__action-card glass home__action-card--fakecall"
          onClick={() => setShowFakeCall(true)}
          id="fake-call-btn"
        >
          <PhoneCall size={22} />
          <span>Fake Call</span>
        </button>

        <button
          className={`home__action-card glass ${sirenActive ? 'home__action-card--active' : ''}`}
          onClick={toggleSiren}
          id="siren-toggle"
        >
          {sirenActive ? <VolumeX size={22} /> : <Volume2 size={22} />}
          <span>{sirenActive ? 'Stop Siren' : 'Siren'}</span>
        </button>

        <button
          className="home__action-card glass"
          onClick={() => {
            if (contacts.length > 0) {
              const phone = contacts[0].phone;
              window.open(`tel:${phone}`);
            } else {
              window.open('tel:112');
            }
          }}
          id="quick-call"
        >
          <Phone size={22} />
          <span>Quick Call</span>
        </button>

        <button
          className="home__action-card glass"
          onClick={() => {
            if (!isOnline) {
              showToast('📵 Offline mode: Use SMS alert instead', 'warning');
            }
            if (contacts.length > 0 && location) {
              const msg = `🚨 EMERGENCY! I need help! My location: ${getGoogleMapsLink(location.latitude, location.longitude)}`;
              const phone = contacts[0].phone.replace(/\D/g, '');
              window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`);
            } else {
              showToast('Add contacts & enable location first', 'error');
            }
          }}
          id="sms-alert"
        >
          <MessageCircle size={22} />
          <span>{isOnline ? 'SMS Alert' : 'SMS (Offline)'}</span>
        </button>
      </div>

      {/* Safety Tips */}
      <SafetyTips />

      {/* Emergency Numbers Quick Access */}
      <div className="home__emergency-strip">
        <div className="home__emergency-title">
          <AlertTriangle size={14} />
          <span>Emergency Numbers</span>
        </div>
        <div className="home__emergency-numbers">
          <a href="tel:112" className="home__emergency-number">
            <span className="home__emergency-num">112</span>
            <span className="home__emergency-label">Emergency</span>
          </a>
          <a href="tel:100" className="home__emergency-number">
            <span className="home__emergency-num">100</span>
            <span className="home__emergency-label">Police</span>
          </a>
          <a href="tel:1091" className="home__emergency-number home__emergency-number--highlight">
            <span className="home__emergency-num">1091</span>
            <span className="home__emergency-label">Women</span>
          </a>
          <a href="tel:108" className="home__emergency-number">
            <span className="home__emergency-num">108</span>
            <span className="home__emergency-label">Ambulance</span>
          </a>
        </div>
      </div>

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <div className="home__recent animate-slide-up">
          <h3 className="home__section-title">
            <Clock size={16} />
            Recent Alerts
          </h3>
          {recentAlerts.map((alert) => (
            <div key={alert.id} className="home__recent-item glass">
              <div className="home__recent-dot" />
              <div className="home__recent-info">
                <span className="home__recent-method">{alert.method.toUpperCase()} Alert</span>
                <span className="home__recent-time">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              <span className="home__recent-status">{alert.contactsNotified} notified</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
