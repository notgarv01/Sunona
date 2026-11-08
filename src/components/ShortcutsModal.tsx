import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause current track' },
    { key: 'Right Arrow', desc: 'Next track' },
    { key: 'Left Arrow', desc: 'Previous track' },
    { key: 'Up Arrow', desc: 'Increase volume (+5%)' },
    { key: 'Down Arrow', desc: 'Decrease volume (-5%)' },
    { key: 'M', desc: 'Toggle mute' },
    { key: 'L', desc: 'Toggle live synced lyrics' },
    { key: 'Q', desc: 'Toggle play queue drawer' },
    { key: 'Ctrl + K', desc: 'Focus search bar' },
    { key: 'Esc', desc: 'Close open dialogs & overlays' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-logo-icon" style={{ width: '32px', height: '32px' }}>
              <Keyboard size={16} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: '1.2rem' }}>Laptop Keyboard Shortcuts</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Hardware & keyboard controls for rapid playback navigation
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{s.desc}</span>
              <kbd
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--border-active)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
