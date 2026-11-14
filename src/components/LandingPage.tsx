import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onInstalled?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onInstalled }) => {
  const [activeOS, setActiveOS] = useState<'win' | 'mac'>('win');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Auto-detect Mac users and set tab
    try {
      const ua = navigator.userAgent || navigator.platform || '';
      const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isMac) {
        setActiveOS('mac');
      }
    } catch (_) {}

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      if (onInstalled) onInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  useEffect(() => {
    // Enable normal scrolling on body when on landing page
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.userSelect = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.body.style.userSelect = 'none';
    };
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult?.outcome === 'accepted') {
          if (onInstalled) onInstalled();
        }
        setDeferredPrompt(null);
      });
    } else {
      const isMac = /Macintosh|MacIntel/i.test(navigator.userAgent || '');
      if (isMac) {
        alert('On macOS:\n\n1. In Safari: Click "File" (or Share icon) → "Add to Dock".\n2. In Chrome/Brave: Click the "Install" icon in the address bar (top right)!\n\nSunoNa will be placed into your Applications & Dock with zero gatekeeper warnings.');
      } else {
        alert('To install SunoNa as a PWA on Windows:\n\nClick the "Install" icon in your browser address bar (top right beside the star icon)!');
      }
    }
  };

  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          min-height: 100vh;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #060608;
          color: #f4f4f7;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.5;
          user-select: auto;
          -webkit-overflow-scrolling: touch;
          background-image: 
            radial-gradient(120% 60% at 50% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 70%),
            linear-gradient(180deg, #060608 0%, #09090b 100%);
          background-attachment: fixed;
          padding-bottom: 80px;
        }

        .landing-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 28px;
        }

        .landing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .landing-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #f4f4f7;
        }

        .landing-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #181622;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .landing-title-brand {
          font-weight: 800;
          font-size: 1.15rem;
          letter-spacing: -0.03em;
        }

        .landing-telemetry {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #71717a;
        }

        .landing-telemetry-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .landing-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .landing-hero {
          padding: 80px 0 50px;
          text-align: center;
        }

        .landing-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: #a1a1aa;
          letter-spacing: 0.06em;
          margin-bottom: 28px;
        }

        .landing-headline {
          font-size: 3.4rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.08;
          max-width: 860px;
          margin: 0 auto 20px;
        }

        .landing-dimmed {
          color: #71717a;
          font-weight: 800;
        }

        .landing-abstract {
          max-width: 640px;
          margin: 0 auto 40px;
          font-size: 1.12rem;
          color: #a1a1aa;
          font-weight: 400;
          line-height: 1.6;
        }

        .landing-action-station {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 60px;
        }

        .landing-os-toggle {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          padding: 4px;
          margin-bottom: 20px;
          backdrop-filter: blur(16px);
        }

        .landing-os-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 24px;
          border-radius: 9999px;
          border: none;
          background: transparent;
          color: #a1a1aa;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .landing-os-btn.active {
          background: #ffffff;
          color: #000000;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        }

        .landing-btn-group {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-primary-download {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          color: #060608;
          padding: 16px 32px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1.05rem;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid #ffffff;
          cursor: pointer;
        }

        .btn-primary-download:hover {
          background: #f4f4f5;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(255, 255, 255, 0.25);
        }

        .btn-pwa-install {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          padding: 16px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1.02rem;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid rgba(16, 185, 129, 0.4);
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
          font-family: inherit;
        }

        .btn-pwa-install:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(16, 185, 129, 0.35);
        }

        .btn-secondary-action {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.04);
          color: #f4f4f7;
          padding: 16px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s ease;
          font-family: 'JetBrains Mono', monospace;
          cursor: pointer;
        }

        .btn-secondary-action:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .landing-subtext {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: #71717a;
          letter-spacing: 0.04em;
          margin-top: 10px;
        }

        .landing-mac-card {
          max-width: 640px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 14px;
          padding: 18px 22px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          text-align: left;
          font-size: 0.88rem;
          line-height: 1.6;
          color: #e4e4e7;
          margin-top: 14px;
        }

        .landing-blueprint {
          max-width: 1040px;
          margin: 0 auto;
          background: #0c0b10;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 100px -20px rgba(0, 0, 0, 0.8), 0 0 80px -20px rgba(139, 92, 246, 0.15);
        }

        .landing-blueprint-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #121118;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          color: #71717a;
        }

        .landing-blueprint-img {
          width: 100%;
          display: block;
          aspect-ratio: 16 / 9.6;
          object-fit: cover;
          background: #000;
        }

        .landing-meta-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .landing-meta-box {
          padding: 18px 24px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
        }

        .landing-meta-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: #71717a;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .landing-meta-value {
          font-weight: 700;
          font-size: 0.92rem;
          color: #f4f4f7;
        }

        .landing-steps-section {
          padding: 80px 0 40px;
          text-align: center;
        }

        .landing-steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 40px;
        }

        .landing-step-card {
          background: rgba(18, 17, 24, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 32px 28px;
          text-align: left;
        }

        .landing-step-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: #8b5cf6;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .landing-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 60px;
          padding: 32px 0;
          font-size: 0.85rem;
          color: #71717a;
        }
      `}</style>

      {/* Header */}
      <header className="landing-header landing-container">
        <a href="#" className="landing-brand">
          <div className="landing-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10 8 16 12 10 16 10 8" />
            </svg>
          </div>
          <span className="landing-title-brand">SunoNa</span>
        </a>

        <div className="landing-telemetry">
          <div className="landing-telemetry-item">
            <span className="landing-status-dot" />
            <span>Build v1.0.11</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero landing-container">
        <div className="landing-pill">
          <span>Windows Desktop (.exe) &amp; Web App (PWA)</span>
          <span>•</span>
          <span>Zero Gatekeeper Warnings</span>
        </div>

        <h1 className="landing-headline">
          The YouTube Music client<br />
          <span className="landing-dimmed">that runs like desktop Spotify.</span>
        </h1>

        <p className="landing-abstract">
          Frameless obsidian window. Full laptop keyboard media keys. Synchronized karaoke lyrics. Embedded streaming proxy for instant zero-buffering seek.
        </p>

        {/* OS Switcher & CTA */}
        <div className="landing-action-station">
          <div className="landing-os-toggle" role="tablist">
            <button 
              type="button" 
              className={`landing-os-btn ${activeOS === 'win' ? 'active' : ''}`}
              onClick={() => setActiveOS('win')}
            >
              <span>Windows (.exe / PWA)</span>
            </button>
            <button 
              type="button" 
              className={`landing-os-btn ${activeOS === 'mac' ? 'active' : ''}`}
              onClick={() => setActiveOS('mac')}
            >
              <span>macOS (Instant PWA)</span>
            </button>
          </div>

          {activeOS === 'win' ? (
            <div>
              <div className="landing-btn-group">
                <a 
                  href="https://github.com/notgarv01/Sunona/releases/download/v1.0.11/SunoNa-Setup-1.0.11.exe" 
                  className="btn-primary-download"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download SunoNa Setup (.exe)</span>
                </a>

                <button 
                  type="button"
                  className="btn-pwa-install"
                  onClick={handleInstallPWA}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 4 4 4-4" />
                    <path d="M12 8v8" />
                  </svg>
                  <span>Install Web App (PWA)</span>
                </button>
              </div>

              <div className="landing-subtext">
                Windows 10 / 11 64-bit • Frameless Spotify Header (.exe) • Or 1-Click Web App (PWA)
              </div>
            </div>
          ) : (
            <div>
              <div className="landing-btn-group">
                <button 
                  type="button"
                  className="btn-pwa-install"
                  onClick={handleInstallPWA}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Install SunoNa for Mac (PWA)</span>
                </button>
              </div>

              <div className="landing-subtext">
                Official macOS Web App • 1-Click Add to Dock • Zero Security Warnings • Apple Silicon &amp; Intel
              </div>

              <div className="landing-mac-card">
                <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🍎</span>
                <div>
                  <strong style={{ color: '#34d399' }}>100% Native Mac Experience — Zero DMG, Zero Gatekeeper Warnings:</strong>
                  <p style={{ marginTop: '4px', fontSize: '0.84rem', color: '#d4d4d8' }}>
                    On macOS, SunoNa installs directly into your Mac Applications &amp; Dock as a standalone native-grade app.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blueprint Canvas */}
        <div className="landing-blueprint">
          <div className="landing-blueprint-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
              <span>SUNONA_DESKTOP_FRAMELESS_WINDOW // ACTIVE_SESSION</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span>—</span>
              <span>□</span>
              <span>✕</span>
            </div>
          </div>

          <img 
            src="/app-preview.png" 
            alt="SunoNa Desktop UI Interface" 
            className="landing-blueprint-img"
          />

          <div className="landing-meta-row">
            <div className="landing-meta-box">
              <div className="landing-meta-label">Titlebar Style</div>
              <div className="landing-meta-value">Hidden / Overlay Caption</div>
            </div>
            <div className="landing-meta-box">
              <div className="landing-meta-label">Stream Latency</div>
              <div className="landing-meta-value">&lt; 120ms (HTTP Range)</div>
            </div>
            <div className="landing-meta-box">
              <div className="landing-meta-label">Audio Pipeline</div>
              <div className="landing-meta-value">Direct Range Stream (Node 22)</div>
            </div>
            <div className="landing-meta-box">
              <div className="landing-meta-label">Keybinding Bridge</div>
              <div className="landing-meta-value">Native Global MediaKeys</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps */}
      <section className="landing-steps-section landing-container">
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#8b5cf6', letterSpacing: '0.08em' }}>
          INSTALLATION &amp; SETUP
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px' }}>Single-click setup. No developer tools needed.</h2>

        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <div className="landing-step-num">STEP 01</div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Select Your Experience</h4>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
              <strong>Windows:</strong> Download Desktop App (.exe) or install instant PWA. <strong>Mac:</strong> Instant 1-click PWA install to Mac Dock.
            </p>
          </div>
          <div className="landing-step-card">
            <div className="landing-step-num">STEP 02</div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>1-Click Installation</h4>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
              <strong>Windows:</strong> Run setup installer (.exe). <strong>Mac:</strong> Click "Add to Dock" in Safari/Chrome.
            </p>
          </div>
          <div className="landing-step-card">
            <div className="landing-step-num">STEP 03</div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Instant High-Fi Audio</h4>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
              Launch SunoNa, search any track, like your favorites, and enjoy seamless playback with synchronized lyrics.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer landing-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>SunoNa // Modern YouTube Music Desktop &amp; Web Client</div>
          <div>Built by <a href="https://github.com/notgarv01" style={{ color: '#f4f4f7' }}>Garv</a> • Open Source • MIT License</div>
        </div>
      </footer>
    </div>
  );
};
