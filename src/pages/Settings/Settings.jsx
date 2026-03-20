// ============================================
// Settings Page - Profile & App Configuration
// ============================================

import { useState, useEffect } from 'react';
import {
  User, Bell, Smartphone, Shield, ChevronRight,
  Save, Volume2, Vibrate, Clock, MessageSquare,
  Info, Heart, BatteryLow, EyeOff
} from 'lucide-react';
import { getUserProfile, saveUserProfile, getSettings, saveSettings } from '../../utils/storage';
import { requestNotificationPermission } from '../../services/alertService';
import './Settings.css';

export default function Settings({ showToast }) {
  const [profile, setProfile] = useState(getUserProfile());
  const [settings, setSettings] = useState(getSettings());
  const [isDirty, setIsDirty] = useState(false);

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveUserProfile(profile);
    saveSettings(settings);
    setIsDirty(false);
    showToast('Settings saved successfully!', 'success');
  };

  const handleNotificationPermission = async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      showToast('Notifications enabled!', 'success');
    } else {
      showToast('Notification permission denied', 'warning');
    }
  };

  return (
    <div className="settings" id="settings-page">
      {/* Header */}
      <div className="settings__header">
        <h1 className="settings__title">Settings</h1>
        {isDirty && (
          <button className="settings__save-btn" onClick={handleSave} id="save-settings">
            <Save size={16} />
            Save
          </button>
        )}
      </div>

      {/* Profile Section */}
      <div className="settings__section animate-slide-up">
        <h2 className="settings__section-title">
          <User size={16} />
          Your Profile
        </h2>

        <div className="settings__card glass">
          <div className="settings__field">
            <label className="settings__label">Your Name</label>
            <input
              type="text"
              className="settings__input"
              value={profile.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              placeholder="Enter your name"
              id="profile-name"
            />
          </div>

          <div className="settings__field">
            <label className="settings__label">Phone Number</label>
            <input
              type="tel"
              className="settings__input"
              value={profile.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              id="profile-phone"
            />
          </div>

          <div className="settings__field">
            <label className="settings__label">Emergency Message</label>
            <textarea
              className="settings__textarea"
              value={profile.emergencyMessage}
              onChange={(e) => handleProfileChange('emergencyMessage', e.target.value)}
              placeholder="Custom emergency message..."
              rows={3}
              id="emergency-message"
            />
            <span className="settings__hint">
              This message will be sent to your emergency contacts.
            </span>
          </div>
        </div>
      </div>

      {/* SOS Settings */}
      <div className="settings__section animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="settings__section-title">
          <Shield size={16} />
          SOS Settings
        </h2>

        <div className="settings__card glass">
          <div className="settings__toggle-item">
            <div className="settings__toggle-info">
              <Smartphone size={18} />
              <div>
                <span className="settings__toggle-label">Shake Detection</span>
                <span className="settings__toggle-desc">Shake phone to trigger SOS</span>
              </div>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                checked={settings.shakeDetection}
                onChange={(e) => handleSettingChange('shakeDetection', e.target.checked)}
              />
              <span className="settings__slider" />
            </label>
          </div>

          <div className="settings__toggle-item">
            <div className="settings__toggle-info">
              <Volume2 size={18} />
              <div>
                <span className="settings__toggle-label">Siren Sound</span>
                <span className="settings__toggle-desc">Play siren when SOS is triggered</span>
              </div>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                checked={settings.sirenEnabled}
                onChange={(e) => handleSettingChange('sirenEnabled', e.target.checked)}
              />
              <span className="settings__slider" />
            </label>
          </div>

          <div className="settings__toggle-item">
            <div className="settings__toggle-info">
              <Vibrate size={18} />
              <div>
                <span className="settings__toggle-label">Vibration</span>
                <span className="settings__toggle-desc">Vibrate phone on SOS alert</span>
              </div>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={(e) => handleSettingChange('vibrationEnabled', e.target.checked)}
              />
              <span className="settings__slider" />
            </label>
          </div>

          <div className="settings__range-item">
            <div className="settings__range-info">
              <Clock size={18} />
              <div>
                <span className="settings__toggle-label">Countdown Timer</span>
                <span className="settings__toggle-desc">{settings.countdownSeconds} seconds before sending alert</span>
              </div>
            </div>
            <input
              type="range"
              className="settings__range"
              min="1"
              max="10"
              value={settings.countdownSeconds}
              onChange={(e) => handleSettingChange('countdownSeconds', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Advanced Safety Features */}
      <div className="settings__section animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="settings__section-title">
          <EyeOff size={16} />
          Advanced Safety Features
        </h2>

        <div className="settings__card glass">
          <div className="settings__toggle-item">
            <div className="settings__toggle-info">
              <EyeOff size={18} />
              <div>
                <span className="settings__toggle-label">Camouflage Mode</span>
                <span className="settings__toggle-desc">Disguise app as a calculator</span>
              </div>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                checked={settings.camouflageMode}
                onChange={(e) => handleSettingChange('camouflageMode', e.target.checked)}
              />
              <span className="settings__slider" />
            </label>
          </div>

          {settings.camouflageMode && (
            <div className="settings__field animate-slide-down">
              <label className="settings__label">Secret PIN</label>
              <input
                type="text"
                className="settings__input"
                value={settings.camouflagePin || '1234'}
                onChange={(e) => handleSettingChange('camouflagePin', e.target.value)}
                placeholder="Enter 4-digit PIN"
                maxLength={8}
              />
              <span className="settings__hint">
                Enter this PIN in the calculator to unlock SafeHer.
              </span>
            </div>
          )}

          <div className="settings__toggle-item" style={{ marginTop: settings.camouflageMode ? '15px' : '0' }}>
            <div className="settings__toggle-info">
              <BatteryLow size={18} />
              <div>
                <span className="settings__toggle-label">Battery Death Alert</span>
                <span className="settings__toggle-desc">Auto-SOS when battery is critical (≤5%)</span>
              </div>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                checked={settings.batteryAlertEnabled}
                onChange={(e) => handleSettingChange('batteryAlertEnabled', e.target.checked)}
              />
              <span className="settings__slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings__section animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="settings__section-title">
          <Bell size={16} />
          Notifications
        </h2>

        <div className="settings__card glass">
          <button
            className="settings__action-item"
            onClick={handleNotificationPermission}
          >
            <div className="settings__action-info">
              <Bell size={18} />
              <div>
                <span className="settings__toggle-label">Enable Notifications</span>
                <span className="settings__toggle-desc">Allow push notifications for alerts</span>
              </div>
            </div>
            <ChevronRight size={16} className="settings__chevron" />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="settings__section animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h2 className="settings__section-title">
          <Info size={16} />
          About
        </h2>

        <div className="settings__card glass">
          <div className="settings__about">
            <div className="settings__about-logo">
              <Shield size={28} />
            </div>
            <h3>SafeHer</h3>
            <p>Women Safety Quick Alert App</p>
            <span className="settings__version">Version 1.0.0</span>
            <div className="settings__about-quote">
              "Every woman deserves to feel safe, heard, and empowered."
            </div>
            <div className="settings__about-footer">
              <Heart size={14} className="settings__heart" />
              <span>Built with care for women's safety</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
