import React, { useState } from 'react';
import { X, Headphones, Loader2, Lock, Mail, User, Camera } from 'lucide-react';
import { authService, type UserProfile } from '../services/authService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  isMandatoryGate?: boolean;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  isMandatoryGate = false,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [authMode, setAuthMode] = useState<'google_first' | 'email_form'>('google_first');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Image size too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await authService.signInWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setErrorMsg('Could not launch Google popup. You can sign in using your Email directly below.');
      setAuthMode('email_form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = authService.signInWithCustomGmail(email, customName.trim(), avatarPreview || null);
      onSuccess(user);
      onClose();
    } catch (err) {
      setErrorMsg('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        padding: '20px',
      }}
      onClick={isMandatoryGate ? undefined : onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, #181818 0%, #121212 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '32px 28px',
          position: 'relative',
          boxShadow: '0 28px 70px rgba(0, 0, 0, 0.9)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (Hidden if Mandatory Gate) */}
        {!isMandatoryGate && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a1a1aa',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        )}

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.25), rgba(59, 130, 246, 0.25))',
              border: '1px solid rgba(30, 215, 96, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1ed760',
              marginBottom: '14px',
              boxShadow: '0 8px 24px rgba(30, 215, 96, 0.2)',
            }}
          >
            <Headphones size={28} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {isMandatoryGate ? 'Welcome to SunoNa & Spotify' : 'Account & Cloud Backup'}
          </h2>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>
            {isMandatoryGate
              ? 'Sign in to access your private library, liked songs, and personalized music stream.'
              : 'Sign in to sync your liked songs and playlists privately across all your devices.'}
          </p>
        </div>

        {/* Strict Privacy Guarantee Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
            <Lock size={14} />
            <span>100% Isolated Data Privacy</span>
          </div>
          <div style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.45 }}>
            Your liked songs, playlists, and listening history remain strictly bound to your account and will never leak into other users' accounts.
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              marginBottom: '16px',
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Primary 1-Click Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            height: '46px',
            borderRadius: '24px',
            background: '#ffffff',
            color: '#121212',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          }}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {/* Google Official G Logo */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        {/* Email & Name Sign In Form */}
        {authMode === 'email_form' ? (
          <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#71717a' }} />
              <input
                type="text"
                placeholder="Your Name (e.g. Alex Sharma)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '10px',
                  padding: '10px 14px 10px 36px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#71717a' }} />
              <input
                type="email"
                placeholder="Email Address (e.g. name@gmail.com)"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '10px',
                  padding: '10px 14px 10px 36px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#d4d4d8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {avatarPreview ? (
                  <>
                    <img
                      src={avatarPreview}
                      alt="avatar preview"
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ color: '#1ed760', fontWeight: 600 }}>Photo Selected (Click to change)</span>
                  </>
                ) : (
                  <>
                    <Camera size={14} color="#a1a1aa" />
                    <span>Upload Profile Picture (Optional)</span>
                  </>
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '24px',
                background: '#1ed760',
                color: '#000000',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In / Sign Up'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setAuthMode('google_first')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Back to Google sign in
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setAuthMode('email_form')}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Mail size={16} />
              <span>Continue with Email & Name</span>
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>
            Once signed in, your session stays active automatically. You won't be asked to log in again.
          </span>
        </div>
      </div>
    </div>
  );
};
