import React, { useState } from 'react';
import { Sliders, X, Volume2, HardDrive, Sparkles, Smile } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenIntro?: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onOpenIntro }) => {
  const [quality, setQuality] = useState<string>(
    () => localStorage.getItem('sunona_streaming_quality') || 'high'
  );
  const [skipSilence, setSkipSilence] = useState(true);
  const [normalizeAudio, setNormalizeAudio] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-logo-icon" style={{ width: '32px', height: '32px' }}>
              <Sliders size={16} />
            </div>
            <div>
              <div className="modal-title" style={{ fontSize: '1.2rem' }}>SunoNa!! Settings</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Audio playback and offline cache preferences
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto' }}>
          {/* YouTube API Configuration */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-active)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>YouTube Search & Music Engine</span>
              </div>
              <span className="brand-platform-tag">INNERTUBE ACTIVE</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              SunoNa!! uses free YouTube InnerTube scraping out-of-the-box. Optionally paste your custom Google YouTube Data API v3 key below:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="AIzaSy... (Optional YouTube API v3 Key)"
                defaultValue={localStorage.getItem('yt_api_key') || ''}
                id="yt-api-key-input"
                className="search-input"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-glass)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                }}
              />
              <button
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                onClick={() => {
                  const input = document.getElementById('yt-api-key-input') as HTMLInputElement;
                  if (input) {
                    localStorage.setItem('yt_api_key', input.value.trim());
                    alert('YouTube API Key saved successfully!');
                  }
                }}
              >
                Save Key
              </button>
            </div>
          </div>

          {/* Streaming Audio Quality */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Volume2 size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Streaming Audio Quality</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'low', label: 'Low', desc: 'Data Saver' },
                { id: 'medium', label: 'Medium', desc: 'Standard' },
                { id: 'high', label: 'High', desc: 'HQ Audio' },
              ].map((q) => (
                <button
                  key={q.id}
                  className={`btn-secondary ${quality === q.id ? 'btn-primary' : ''}`}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setQuality(q.id);
                    localStorage.setItem('sunona_streaming_quality', q.id);
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Engine Toggles */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <Volume2 size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Playback Enhancements</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Normalize Audio Volume (ReplayGain)</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Prevents sudden loud changes between YouTube songs</div>
              </div>
              <input
                type="checkbox"
                checked={normalizeAudio}
                onChange={(e) => setNormalizeAudio(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Skip Silence Between Tracks</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Seamless transition by trimming start/end dead air</div>
              </div>
              <input
                type="checkbox"
                checked={skipSilence}
                onChange={(e) => setSkipSilence(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </div>
          </div>

          {/* Cache Management */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HardDrive size={16} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Local Offline Cache Storage</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Occupying 48.2 MB of 2.0 GB allocated on disk</div>
              </div>
            </div>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
              Clear Cache
            </button>
          </div>

          {/* Garv's Intro Screen Shortcut */}
          {onOpenIntro && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(168, 85, 247, 0.08))',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smile size={16} style={{ color: '#38bdf8' }} />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
                    Garv's Intro Screen ("SunoNa!!")
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Revisit funny confessions, rules & personality notes
                  </div>
                </div>
              </div>
              <button
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.76rem' }}
                onClick={onOpenIntro}
              >
                Open Intro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
