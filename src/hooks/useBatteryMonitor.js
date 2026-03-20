// ============================================
// Battery Monitor Hook
// Monitors battery state and triggers SOS at critical levels
// ============================================

import { useEffect, useRef } from 'react';
import { getSettings, getContacts } from '../utils/storage';
import { sendSOSAlert } from '../services/alertService';

export function useBatteryMonitor(showToast) {
  const alertedForCriticalBattery = useRef(false);

  useEffect(() => {
    let batteryManager = null;

    const performCheck = (battery) => {
      const settings = getSettings();
      // If disabled or if we already alerted this session, skip
      if (!settings.batteryAlertEnabled || alertedForCriticalBattery.current) {
        return;
      }
      
      const isCritical = battery.level <= 0.05 && !battery.charging;

      if (isCritical) {
        alertedForCriticalBattery.current = true;
        const contacts = getContacts();
        
        if (contacts.length > 0) {
          if (showToast) showToast('🔋 Critical Battery! Sending SOS before shutdown...', 'warning');
          
          // Modify user profile message temporarily for battery death context
          const originalMsg = localStorage.getItem('safeher_user_profile');
          let profile = originalMsg ? JSON.parse(originalMsg) : {};
          const oldMessage = profile.emergencyMessage;
          
          profile.emergencyMessage = '🔋 BATTERY CRITICAL (<5%). My phone is about to die! This is an automatic final location ping.';
          localStorage.setItem('safeher_user_profile', JSON.stringify(profile));

          sendSOSAlert('battery')
            .catch(err => console.warn('Battery SOS failed:', err))
            .finally(() => {
              // Restore message after sending
              if (oldMessage) {
                profile.emergencyMessage = oldMessage;
                localStorage.setItem('safeher_user_profile', JSON.stringify(profile));
              }
            });
        }
      } else if (battery.level > 0.10 || battery.charging) {
        // Reset the alert lock if charging or battery goes up
        alertedForCriticalBattery.current = false;
      }
    };

    const handleBatteryChange = () => {
      if (batteryManager) {
        performCheck(batteryManager);
      }
    };

    if ('getBattery' in navigator) {
      navigator.getBattery()
        .then(battery => {
          batteryManager = battery;
          performCheck(battery);
          
          batteryManager.addEventListener('levelchange', handleBatteryChange);
          batteryManager.addEventListener('chargingchange', handleBatteryChange);
        })
        .catch(err => {
          console.warn('Battery API not available or blocked:', err);
        });
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', handleBatteryChange);
        batteryManager.removeEventListener('chargingchange', handleBatteryChange);
      }
    };
  }, [showToast]);
}
