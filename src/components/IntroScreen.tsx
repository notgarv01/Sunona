import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Flame,
  RotateCcw
} from 'lucide-react';
import garvStudio from '../assets/garv_studio.png';

interface Props {
  onEnter: () => void;
}

// Exactly the 15 quotes from inro.txt
const SAVAGE_QUOTES = [
  'Papa kehte hain naam kamao, maine socha pehle app bana leta hu.',
  'App banane wala single hai, par playlist committed hai.',
  'Mujhe attention nahi chahiye, bas app ko 5 star de dena.',
  'Code mera hai, gaane tumhare hain, vibe sabki hai.',
  'Aap gaane suno, bugs ki tension Garv lega. Shayad.',
  'Life mein sab kuch temporary hai, bas pending bugs permanent hain.',
  'Ye app banane ke baad bhi main berozgaar hoon. Anyway, enjoy the music.',
  'Agar gaana pasand aa gaya toh taste achha hai. Credit mujhe dena.',
  'Dil se banaya hai, dimaag laga ke bhi banaya hai. Kabhi kabhi.',
  'Garv naam hai, ghamand nahi. Bas thoda confidence extra hai.',
  'Yahan gaane repeat ho sakte hain, meri mehnat nahi.',
  'Spotify nahi hoon bhai, par intentions achhe hain.',
  'Is app ke peeche ek developer hai aur uske peeche 47 open tabs.',
  'Aapka mood kharab hai? Ek gaana lagao. Mera mood kharab hai? Ek bug fix karo.',
  'Aaj gaane suno, kal Garv ka startup use karna. Future planning hai.',
];

// Pick ONE different line per app open
const getNextQuoteIdx = (currentIdx?: number): number => {
  try {
    const lastIdxStr = localStorage.getItem('sunona_last_quote_idx');
    const lastIdx =
      currentIdx !== undefined
        ? currentIdx
        : lastIdxStr !== null
        ? parseInt(lastIdxStr, 10)
        : -1;
    let newIdx = Math.floor(Math.random() * SAVAGE_QUOTES.length);
    if (newIdx === lastIdx) {
      newIdx = (newIdx + 1) % SAVAGE_QUOTES.length;
    }
    localStorage.setItem('sunona_last_quote_idx', newIdx.toString());
    return newIdx;
  } catch {
    return Math.floor(Math.random() * SAVAGE_QUOTES.length);
  }
};

export const IntroScreen: React.FC<Props> = ({ onEnter }) => {
  const [activeQuoteIdx, setActiveQuoteIdx] = useState<number>(() => getNextQuoteIdx());
  const [isAnimating, setIsAnimating] = useState(false);

  // Pure Slider State: 'sliding' -> 'revealed'
  const [introStage, setIntroStage] = useState<'sliding' | 'revealed'>('sliding');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const handleSkipAnimation = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIntroStage('revealed');
      setIsTransitioning(false);
    }, 150);
  }, []);

  const handleReplayIntro = useCallback(() => {
    setIsTransitioning(false);
    setIntroStage('sliding');
  }, []);

  // Slider timing: slides across from Right to Left, then reveals intro page ONCE
  useEffect(() => {
    if (introStage !== 'sliding') return;

    const exitTimer = setTimeout(() => {
      setIsTransitioning(true);
    }, 2500);

    const revealTimer = setTimeout(() => {
      setIntroStage('revealed');
      setIsTransitioning(false);
    }, 2800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(revealTimer);
    };
  }, [introStage]);

  const handleShuffleQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveQuoteIdx((prev) => getNextQuoteIdx(prev));
      setIsAnimating(false);
    }, 150);
  };

  // Keyboard Enter listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (introStage === 'sliding') {
          handleSkipAnimation();
        } else {
          onEnter();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [introStage, handleSkipAnimation, onEnter]);

  // STAGE 1: ONLY THE PURE SLIDER (Intro page is completely NOT in DOM yet)
  if (introStage === 'sliding') {
    return (
      <div className={`sunona-slider-viewport ${isTransitioning ? 'slider-viewport-exit' : ''}`}>
        <div className="sunona-slider-track">
          {/* The Text SUNONA!! */}
          <h1 className="sunona-marquee-text">SUNONA!!</h1>

          {/* The Animated Person on the right waving Hello */}
          <div className="sunona-slider-character">
            {/* Speech Bubble: "Hello! 👋" */}
            <div className="slider-speech-bubble">
              <span className="speech-label">Hello!</span>
              <span className="speech-wave-emoji">👋</span>
              <div className="speech-arrow-down" />
            </div>

            {/* Vector Animated Character */}
            <svg className="slider-character-svg" viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Hoodie */}
              <path d="M42 128 C42 104, 118 104, 118 128 L128 180 L32 180 Z" fill="url(#sliderHoodieGrad)" />
              <path d="M68 122 L80 142 L92 122 Z" fill="#18181b" />
              <path d="M75 136 L75 168" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
              <path d="M85 136 L85 168" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />

              {/* Left Arm */}
              <path d="M42 128 C30 144, 28 165, 32 178" stroke="#ff2442" strokeWidth="15" strokeLinecap="round" />

              {/* Right Arm: ANIMATED WAVING HAND */}
              <g className="slider-waving-arm">
                <path d="M116 126 C130 114, 140 88, 137 68" stroke="#ff2442" strokeWidth="15" strokeLinecap="round" />
                <circle cx="137" cy="58" r="11" fill="#fbcfe8" />
                <path d="M131 50 L131 38" stroke="#fbcfe8" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M136 48 L138 35" stroke="#fbcfe8" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M141 49 L145 38" stroke="#fbcfe8" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M146 54 L152 46" stroke="#fbcfe8" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M128 62 L121 57" stroke="#fbcfe8" strokeWidth="3.5" strokeLinecap="round" />
              </g>

              {/* Neck */}
              <rect x="71" y="96" width="18" height="20" rx="8" fill="#fbcfe8" />

              {/* Head */}
              <circle cx="80" cy="74" r="32" fill="#fbcfe8" />

              {/* Hair */}
              <path d="M48 70 C48 44, 62 34, 80 34 C98 34, 112 44, 112 70 C106 58, 96 50, 80 50 C64 50, 54 58, 48 70 Z" fill="#09090b" />
              <path d="M56 46 C66 38, 86 38, 98 46" stroke="#27272a" strokeWidth="4" strokeLinecap="round" />

              {/* Blinking Eyes */}
              <g className="slider-blinking-eyes">
                <circle cx="70" cy="72" r="3.8" fill="#09090b" />
                <circle cx="90" cy="72" r="3.8" fill="#09090b" />
                <circle cx="71.5" cy="70" r="1.3" fill="#ffffff" />
                <circle cx="91.5" cy="70" r="1.3" fill="#ffffff" />
              </g>

              {/* Cheeks */}
              <circle cx="62" cy="79" r="4.5" fill="#f43f5e" opacity="0.4" />
              <circle cx="98" cy="79" r="4.5" fill="#f43f5e" opacity="0.4" />

              {/* Smile */}
              <path d="M72 82 Q80 90 88 82" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" fill="none" />

              {/* Headphones */}
              <path d="M44 72 C44 32, 116 32, 116 72" stroke="url(#sliderHeadphoneGrad)" strokeWidth="9" strokeLinecap="round" fill="none" />
              <rect x="40" y="60" width="15" height="28" rx="7.5" fill="#09090b" stroke="#ff334b" strokeWidth="2.5" />
              <rect x="105" y="60" width="15" height="28" rx="7.5" fill="#09090b" stroke="#ff334b" strokeWidth="2.5" />
              <circle cx="47.5" cy="74" r="4" fill="#38bdf8" />
              <circle cx="112.5" cy="74" r="4" fill="#38bdf8" />

              <defs>
                <linearGradient id="sliderHoodieGrad" x1="42" y1="104" x2="118" y2="180" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff2442" />
                  <stop offset="100%" stopColor="#7a091d" />
                </linearGradient>
                <linearGradient id="sliderHeadphoneGrad" x1="44" y1="32" x2="116" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff334b" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#ff334b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Minimal Skip Pill */}
        <button className="slider-skip-pill" onClick={handleSkipAnimation}>
          Skip ↵
        </button>
      </div>
    );
  }

  // STAGE 2: INTRO PAGE APPEARS EXACTLY ONCE (With Entrance Animation)
  return (
    <div className="kryntix-intro-viewport intro-page-reveal-anim">
      {/* Top Edge Red Flare */}
      <div className="top-cinematic-flare" />

      {/* Top Bar */}
      <header className="kryntix-navbar">
        <div className="kryntix-brand-logo">
          <div className="kryntix-g-logo">
            <span>G</span>
          </div>
          <div className="kryntix-brand-text">
            <span className="brand-name">SunoNa!!</span>
          </div>
        </div>

        <div className="kryntix-nav-right">
          {/* Replay Intro Slider button */}
          <button
            className="replay-intro-pill-btn"
            onClick={handleReplayIntro}
            title="Watch SUNONA!! slider again"
          >
            <RotateCcw size={12} color="#38bdf8" />
            <span>Replay Intro</span>
          </button>

          <div className="garv-certified-pill">
            <ShieldCheck size={14} color="#ff334b" />
            <span>Garv Certified</span>
          </div>
        </div>
      </header>

      {/* 2-Column Hero Section */}
      <main className="portfolio-hero-section">
        {/* Left Column: Only inro.txt content */}
        <div className="hero-left-column">
          <div className="hero-headline-wrap">
            <h1 className="hero-headline-primary">
              Welcome to my little world.
            </h1>
            <h2 className="hero-headline-accent">
              Haan bhai, Garv ne banaya hai. :)
            </h2>
          </div>

          <div className="hero-care-note">
            <p className="care-lead">Ek chhoti si baat...</p>
            <p className="care-body">
              Garv apni care karta hai. ❤️
              <br />
              Isliye tumhari bhi thodi karne ki koshish kar raha hai.
            </p>
          </div>

          {/* Random Funny Line (1 per app open) */}
          <div className="garv-session-quote-container">
            <div className="quote-header-strip">
              <div className="quote-tag">
                <Sparkles size={13} color="#ff2442" />
                <span>Garv kehta hai:</span>
              </div>
              <button
                className="quote-reroll-btn"
                onClick={handleShuffleQuote}
                title="Dusri line suno"
              >
                <Flame size={12} color="#38bdf8" />
                <span>Dusri line 🎲</span>
              </button>
            </div>
            <div className={`quote-speech-bubble ${isAnimating ? 'pulse-anim' : ''}`}>
              <span className="quote-mark open">“</span>
              <p className="quote-punchline">{SAVAGE_QUOTES[activeQuoteIdx]}</p>
              <span className="quote-mark close">”</span>
            </div>
          </div>
        </div>

        {/* Right Column: Garv's Photo (Vansh Kumawat Studio Treatment) */}
        <div className="hero-right-column">
          <div className="garv-studio-media">
            <img
              src={garvStudio}
              alt="Garv"
              className="garv-studio-img"
            />
          </div>
        </div>
      </main>

      {/* Funny Lines Cards from inro.txt (Styled as punchline thought bubbles, not info) */}
      <section className="funny-thoughts-section">
        <div className="funny-thoughts-grid">
          {/* Card 1: Before you enter... */}
          <div className="funny-thought-card">
            <div className="funny-thought-header">
              <span className="funny-thought-icon">💀</span>
              <h3 className="funny-thought-title">Before you enter...</h3>
            </div>
            <div className="funny-bubbles-col">
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Mummy kehti hain kuch productive kar, toh ye bana diya.</p>
              </div>
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Is app ko banane mein time laga hai, please 2 minute se pehle judge mat karna.</p>
              </div>
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Garv ne banaya hai, toh thoda personal toh hoga hi.</p>
              </div>
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Pasand aaye toh Garv ko yaad kar lena. Nahi aaye toh internet ko blame kar dena.</p>
              </div>
            </div>
          </div>

          {/* Card 2: A little about this app... */}
          <div className="funny-thought-card">
            <div className="funny-thought-header">
              <span className="funny-thought-icon">🔥</span>
              <h3 className="funny-thought-title">A little about this app...</h3>
            </div>
            <div className="funny-bubbles-col">
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Ye app kisi bade CEO ne nahi banaya. Iske peeche ek banda hai jise naye experiments karna pasand hai.</p>
              </div>
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Bugs mile toh feature samajh lena. (Mazak kar raha hu... mostly.)</p>
              </div>
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>App free hai, tareef optional nahi hai.</p>
              </div>
              <div className="funny-line-bubble">
                <span className="funny-quote-symbol">“</span>
                <p>Powered by music, code and questionable decisions. Made with curiosity.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Action placed after both boxes */}
      <div className="intro-bottom-cta-wrap">
        <button className="glow-pill-btn-red" onClick={onEnter}>
          <span>Chalo, andar aao! →</span>
          <span className="keycap-label">Enter ↵</span>
        </button>
        <p className="enter-sub-hint">Garv has been waiting. (Not really.)</p>
      </div>

      {/* Footer from inro.txt */}
      <footer className="kryntix-footer">
        <div className="footer-left">
          <span className="footer-copyright">
            © Garv · Built with unnecessary amounts of effort.
          </span>
        </div>
      </footer>
    </div>
  );
};
