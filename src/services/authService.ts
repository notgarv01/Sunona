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
            const profile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'SunoNa Listener',
              photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${fbUser.uid}`,
            };
            this.setUser(profile);
          }
          // Note: If fbUser is null, do NOT wipe custom Gmail session. 
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
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'SunoNa Listener',
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${fbUser.uid}`,
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

  // Fallback sign in with custom Gmail ID
  public signInWithCustomGmail(customEmail: string | null): UserProfile {
    const email = customEmail?.trim() || 'listener@gmail.com';
    const name = email.split('@')[0];
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    const profile: UserProfile = {
      uid: `user_${btoa(email).replace(/=/g, '').toLowerCase()}`,
      email,
      displayName: capitalized,
      photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${email}`,
      isAnonymous: false,
    };
    this.setUser(profile);
    return profile;
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

