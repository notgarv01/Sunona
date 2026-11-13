import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

const STORAGE_KEY = 'sunona_user_session_v1';

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Array<(user: UserProfile | null) => void> = [];

  constructor() {
    // Restore cached session immediately for instant render
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch {}

    // Listen to Firebase auth changes if available
    if (auth) {
      try {
        onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
          if (fbUser) {
            const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Listener';
            const email = fbUser.email || '';
            const fallbackAvatar = `https://unavatar.io/${encodeURIComponent(email)}?fallback=${encodeURIComponent(`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1ed760&color=000&bold=true`)}`;
            const profile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName,
              photoURL: fbUser.photoURL || fallbackAvatar,
            };
            this.setUser(profile);
          }
          // Note: If fbUser is null, do NOT wipe custom session.
          // Session is only wiped when user explicitly clicks "Sign Out".
        });
      } catch (err) {
        console.warn('[AuthService] Firebase listener warning:', err);
      }
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public subscribe(listener: (user: UserProfile | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }

  private setUser(user: UserProfile | null) {
    this.currentUser = user;
    if (user) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch {}
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    this.notify();
  }

  // 1-Click Google / Gmail Sign In
  public async signInWithGoogle(): Promise<UserProfile> {
    if (auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Listener';
        const email = fbUser.email || '';
        const fallbackAvatar = `https://unavatar.io/${encodeURIComponent(email)}?fallback=${encodeURIComponent(`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1ed760&color=000&bold=true`)}`;
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName,
          photoURL: fbUser.photoURL || fallbackAvatar,
        };
        this.setUser(profile);
        return profile;
      } catch (err: any) {
        console.warn('[AuthService] Google Popup Error, using direct Gmail fallback:', err);
        // If popup was blocked or API key is demo, let user proceed smoothly
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/invalid-api-key' || err.code === 'auth/configuration-not-found') {
          return this.signInWithCustomGmail(null);
        }
        throw err;
      }
    }
    return this.signInWithCustomGmail(null);
  }

  // Fallback sign in with custom Gmail / Email ID & Name
  public signInWithCustomGmail(
    customEmail: string | null,
    customDisplayName?: string | null,
    customPhotoURL?: string | null
  ): UserProfile {
    const email = customEmail?.trim() || 'listener@gmail.com';
    const rawName = customDisplayName?.trim() || email.split('@')[0];
    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    
    // Compute clean email avatar: custom photo if provided, else unavatar with clean 2-letter initials fallback
    const initials = displayName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
    const photoURL =
      customPhotoURL?.trim() ||
      `https://unavatar.io/${encodeURIComponent(email)}?fallback=${encodeURIComponent(
        `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&length=2&background=1ed760&color=000&bold=true&size=128`
      )}`;
    
    // Normalize safe user ID from email
    const safeUid = `usr_${encodeURIComponent(email.toLowerCase().replace(/[^a-z0-9]/g, '_'))}`;

    const profile: UserProfile = {
      uid: safeUid,
      email,
      displayName,
      photoURL,
      isAnonymous: false,
    };
    this.setUser(profile);
    return profile;
  }

  // Update active profile photo or display name
  public updateUserProfile(partial: Partial<UserProfile>): UserProfile | null {
    if (!this.currentUser) return null;
    const updated: UserProfile = { ...this.currentUser, ...partial };
    this.setUser(updated);
    return updated;
  }

  public async signOut(): Promise<void> {
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch {}
    }
    this.setUser(null);
  }
}

export const authService = new AuthService();

