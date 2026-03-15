// ============================================
// Toast Notification Component
// ============================================

import { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const Icon = icons[type] || icons.info;

  return (
    <div className={`toast toast--${type}`} onClick={onClose} role="alert">
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
}
