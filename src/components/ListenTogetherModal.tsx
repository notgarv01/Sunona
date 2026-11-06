import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  X,
  Copy,
  Check,
  Radio,
  Disc,
  Send,
  Headphones,
  Info,
} from 'lucide-react';
import type { Song } from '../types';
import { listenTogetherService, type ChatMessage } from '../services/listenTogetherService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  isPlaying?: boolean;
}

export const ListenTogetherModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSong,
}) => {
  const [copied, setCopied] = useState(false);
  const [roomCode, setRoomCode] = useState(listenTogetherService.getRoomCode());
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [tempCode, setTempCode] = useState('');
  const [role, setRole] = useState<'host' | 'listener'>(listenTogetherService.getRole());
  const [messages, setMessages] = useState<ChatMessage[]>(listenTogetherService.getMessages());
  const [connectedCount, setConnectedCount] = useState(listenTogetherService.getConnectedCount());
  const [inputText, setInputText] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return listenTogetherService.subscribe(() => {
      setMessages([...listenTogetherService.getMessages()]);
      setConnectedCount(listenTogetherService.getConnectedCount());
      setRoomCode(listenTogetherService.getRoomCode());
      setRole(listenTogetherService.getRole());
    });
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    listenTogetherService.sendChatMessage(inputText.trim());
    setInputText('');
  };

  const handleRoleChange = (newRole: 'host' | 'listener') => {
    setRole(newRole);
    listenTogetherService.setRole(newRole);
  };

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempCode.trim()) {
      listenTogetherService.setRoomCode(tempCode.trim());
      setRoomCode(listenTogetherService.getRoomCode());
      setIsEditingCode(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', borderRadius: '24px' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="brand-logo-icon"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary), var(--accent, #38bdf8))',
                color: '#0b0914',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={19} color="#0b0914" />
            </div>
            <div>
              <div
                className="modal-title"
                style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Listen Together (SunoNa!! Sync)
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent, #38bdf8)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700,
                  }}
                >
                  LIVE SYNC
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Real-time audio synchronization & live reactions with friends
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Role Switcher (Host vs Join) */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '16px',
            border: '1px solid var(--border-glass)',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              background: role === 'host' ? 'var(--primary)' : 'transparent',
              color: role === 'host' ? '#0b0914' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => handleRoleChange('host')}
          >
            <Radio size={15} />
            <span>Host Session (You DJ)</span>
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              background: role === 'listener' ? 'var(--primary)' : 'transparent',
              color: role === 'listener' ? '#0b0914' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => handleRoleChange('listener')}
          >
            <Headphones size={15} />
            <span>Join Session (Listen Along)</span>
          </button>
        </div>

        {/* Room Info Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                Room Invitation Code
              </div>

              {isEditingCode ? (
                <form
                  onSubmit={handleApplyCode}
                  style={{ display: 'flex', gap: '6px', marginTop: '6px' }}
                >
                  <input
                    type="text"
                    value={tempCode}
                    onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                    placeholder="E.g. SUNONA-9999"
                    style={{
                      padding: '4px 10px',
                      background: '#14161f',
                      border: '1px solid var(--border-active)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      width: '160px',
                      textTransform: 'uppercase',
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setIsEditingCode(false)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div
                    className="room-code-badge"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Radio size={16} style={{ display: 'inline', marginRight: '6px' }} />
                    #{roomCode}
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setTempCode(roomCode);
                      setIsEditingCode(true);
                    }}
                    title="Change / Enter different room code"
                    style={{ fontSize: '0.72rem', padding: '2px 8px', width: 'auto', height: '24px' }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <button
              className="btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '20px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check size={14} color="#22c55e" />
                  <span style={{ color: '#22c55e' }}>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: '10px',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              Connected Listeners: <strong style={{ color: '#fff' }}>{connectedCount} active</strong>
            </span>
            <span
              className="brand-platform-tag"
              style={{
                color: '#22c55e',
                borderColor: 'rgba(34, 197, 94, 0.4)',
                background: 'rgba(34, 197, 94, 0.1)',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              SYNC LATENCY: 12ms
            </span>
          </div>
        </div>

        {/* Now Streaming in Room Card */}
        {currentSong ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(56, 189, 248, 0.07)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              padding: '10px 14px',
              borderRadius: '14px',
              marginBottom: '14px',
            }}
          >
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: '#fff',
                }}
              >
                {currentSong.title}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {role === 'host' ? 'You are broadcasting' : 'Host synchronized stream'} • {currentSong.artist}
              </div>
            </div>
            <Disc size={18} className="spinning-disc-icon" style={{ color: 'var(--primary)' }} />
          </div>
        ) : (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              marginBottom: '14px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            Play any song from Home or Search to stream it live to this room.
          </div>
        )}

        {/* Room Reactions & Live Chat */}
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                fontSize: '0.74rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Room Reactions & Chat
            </div>
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent, #38bdf8)',
                fontSize: '0.74rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <Info size={13} />
              <span>{showHowItWorks ? 'Hide Guide' : 'Yeh Kaise Kaam Karta Hai?'}</span>
            </button>
          </div>

          {/* Collapsible Explainer Guide */}
          {showHowItWorks && (
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '10px',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                color: '#e2e8f0',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--accent, #38bdf8)' }}>
                🎧 SunoNa!! Listen Together Kaise Kaam Karta Hai:
              </div>
              <ul style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>
                  <strong>1. Host & Share:</strong> Aap "Host Session" par rahenge toh aap DJ banenge. <strong>Copy Invite Link</strong> karke apne dost ko bhein ya kisi aur tab/laptop me open karein.
                </li>
                <li>
                  <strong>2. Live Audio Sync:</strong> Host jo bhi gaana chalayega, pause karega ya seek karega, wo connected sabhi listeners ke pass **real-time** me bina delay ke play hoga!
                </li>
                <li>
                  <strong>3. Live Chat:</strong> Gaana sunte hue aapas me live chat ya reactions bhej sakte hain jo instantly sabhi listeners ko dikhte hain.
                </li>
              </ul>
            </div>
          )}

          {/* Messages scroll box */}
          <div
            ref={chatScrollRef}
            style={{
              maxHeight: '130px',
              minHeight: '80px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {messages.map((m) => (
              <div key={m.id} style={{ fontSize: '0.82rem', display: 'flex', gap: '6px' }}>
                <span
                  style={{
                    color: m.isHost ? 'var(--accent, #38bdf8)' : 'var(--primary)',
                    fontWeight: 700,
                  }}
                >
                  {m.user}:
                </span>
                <span style={{ color: '#f1f5f9' }}>{m.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Send message form */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="search-input"
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '24px',
              padding: '10px 16px',
              border: '1px solid var(--border-glass)',
              color: '#fff',
              fontSize: '0.86rem',
              outline: 'none',
            }}
            placeholder="Send reaction or message to room..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            type="submit"
            style={{
              background: 'var(--primary)',
              color: '#0b0914',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '24px',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px var(--primary-glow)',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={14} color="#0b0914" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
