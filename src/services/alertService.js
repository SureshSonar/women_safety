// ============================================
// Alert Service
// Emergency alert dispatch, SMS, and notifications
// ============================================

import { getContacts, getUserProfile, addAlertRecord } from '../utils/storage';
import { getCurrentPosition, getGoogleMapsLink } from './locationService';

/**
 * Send emergency SOS alert to all contacts
 * This is the main alert dispatch function
 */
export async function sendSOSAlert(method = 'app', sessionId = null) {
  const contacts = getContacts();
  const profile = getUserProfile();

  if (contacts.length === 0) {
    throw new Error('No emergency contacts configured. Please add at least one contact.');
  }

  // Get current location
  let location = null;
  try {
    location = await getCurrentPosition();
  } catch (err) {
    console.warn('Could not get location:', err);
  }
  // Fix for Capacitor/localhost using a generic public domain placeholder
  let baseUrl = window.location.origin;
  if (baseUrl.includes('localhost') || baseUrl.includes('capacitor://') || baseUrl.startsWith('file://')) {
    baseUrl = 'https://women-safety-indol.vercel.app';
  }

  const mapLink = location ? getGoogleMapsLink(location.latitude, location.longitude) : '';
  const trackingLink = sessionId ? `${baseUrl}/track/${sessionId}` : '';

  const message = buildEmergencyMessage(profile, location, mapLink, trackingLink);

  // Attempt to send via multiple channels
  const results = {
    smsTriggered: false,
    notificationSent: false,
    location: location,
    contactsNotified: contacts.length,
    message: message,
  };

  // Try SMS via native protocol
  try {
    triggerSMSAlert(contacts, message);
    results.smsTriggered = true;
  } catch (err) {
    console.warn('SMS trigger failed:', err);
  }

  // Try Web Notification
  try {
    await sendBrowserNotification(profile.name, message);
    results.notificationSent = true;
  } catch (err) {
    console.warn('Browser notification failed:', err);
  }

  // Vibrate device
  triggerVibration();

  // Record the alert
  addAlertRecord({
    latitude: location?.latitude,
    longitude: location?.longitude,
    contactsNotified: contacts.length,
    method: method,
    status: 'sent',
  });

  return results;
}

/**
 * Build the emergency message text
 */
function buildEmergencyMessage(profile, location, mapLink, trackingLink) {
  let msg = `🚨 EMERGENCY SOS ALERT!\n`;
  msg += `${profile.name} needs help immediately!\n\n`;

  if (profile.emergencyMessage) {
    msg += `"${profile.emergencyMessage}"\n\n`;
  }

  if (mapLink) {
    msg += `📍 Location Link: ${mapLink}\n`;
  }

  if (trackingLink) {
    msg += `📲 Live Tracking: ${trackingLink}\n`;
  }

  if (!mapLink && !trackingLink) {
    msg += `⚠️ Location could not be determined.\n`;
  }

  return msg;
}

/**
 * Trigger SMS via native sms: protocol
 * Opens the default SMS app with pre-filled message
 */
export function triggerSMSAlert(contacts, message) {
  if (!contacts || contacts.length === 0) return;

  // Build phone numbers list  
  const phoneNumbers = contacts.map(c => c.phone).filter(Boolean).join(',');

  if (!phoneNumbers) return;

  // Create SMS link
  const encodedMsg = encodeURIComponent(message);
  const smsLink = `sms:${phoneNumbers}?body=${encodedMsg}`;

  // Open SMS app
  window.open(smsLink, '_self');
}

/**
 * Trigger WhatsApp message
 */
export function triggerWhatsAppAlert(phone, message) {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
}

/**
 * Send a browser push notification
 */
async function sendBrowserNotification(senderName, message) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    new Notification('🚨 SafeHer SOS Alert', {
      body: `Emergency alert sent for ${senderName}!`,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: 'sos-alert',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    });
  }
}

/**
 * Trigger device vibration pattern (SOS in Morse: ··· ─── ···)
 */
export function triggerVibration() {
  if ('vibrate' in navigator) {
    // SOS Morse code pattern
    navigator.vibrate([
      100, 50, 100, 50, 100, // S: ···
      200,                    // gap
      300, 50, 300, 50, 300,  // O: ───
      200,                    // gap
      100, 50, 100, 50, 100,  // S: ···
    ]);
  }
}

/**
 * Play an alarm/siren sound
 */
export function playSiren(duration = 5000) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Create oscillator for siren effect
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sawtooth';
    gainNode.gain.value = 0.3;

    // Siren frequency sweep
    const startTime = audioCtx.currentTime;
    const endTime = startTime + duration / 1000;

    for (let t = startTime; t < endTime; t += 1) {
      oscillator.frequency.setValueAtTime(800, t);
      oscillator.frequency.linearRampToValueAtTime(1200, t + 0.5);
      oscillator.frequency.linearRampToValueAtTime(800, t + 1);
    }

    oscillator.start(startTime);
    oscillator.stop(endTime);

    return {
      stop: () => {
        try {
          oscillator.stop();
          audioCtx.close();
        } catch (e) { /* already stopped */ }
      }
    };
  } catch (err) {
    console.warn('Could not play siren:', err);
    return { stop: () => { } };
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission || 'denied';
}
