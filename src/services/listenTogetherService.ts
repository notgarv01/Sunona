import type { Song } from '../types';

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isHost?: boolean;
}

export interface SyncEvent {
  type: 'SYNC_PLAY' | 'SYNC_PAUSE' | 'SYNC_SEEK' | 'CHAT_MESSAGE' | 'HEARTBEAT' | 'HEARTBEAT_ACK';
  roomCode: string;
  senderId: string;
  senderName: string;
  role: 'host' | 'listener';
  payload?: any;
  timestamp: number;
}

class ListenTogetherService {
  private channel: BroadcastChannel | null = null;
  private peerId: string = 'peer_' + Math.random().toString(36).substring(2, 9);
  private roomCode: string = 'SUNONA-7824';
  private role: 'host' | 'listener' = 'host';
  private userName: string = 'Host';
  private activePeers: Map<string, { role: string; lastSeen: number }> = new Map();
  private subscribers: Set<() => void> = new Set();
  private messages: ChatMessage[] = [
    { id: '1', user: 'Alex', text: 'This synth drop is insane! 🔥', time: 'Just now' },
    { id: '2', user: 'Priya', text: 'Vibing from laptop, zero delay sync 🎧', time: '1m ago' },
  ];
  private heartbeatInterval: any = null;

  // Callbacks for App.tsx playback sync
  private onRemotePlayCallback?: (song: Song, currentTime: number) => void;
  private onRemotePauseCallback?: () => void;
  private onRemoteSeekCallback?: (time: number) => void;

  constructor() {
    this.initChannel();
    this.startHeartbeat();
  }

  private initChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('sunona_listen_together_v1');
        this.channel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available, using storage fallback', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'sunona_listen_together_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncoming(data);
          } catch {}
        }
      });
    }
  }

  private post(type: SyncEvent['type'], payload?: any) {
    const event: SyncEvent = {
      type,
      roomCode: this.roomCode,
      senderId: this.peerId,
      senderName: this.userName,
      role: this.role,
      payload,
      timestamp: Date.now(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {}
    }

    try {
      localStorage.setItem('sunona_listen_together_event', JSON.stringify(event));
    } catch {}
  }

  private handleIncoming(event: SyncEvent) {
    if (!event || event.senderId === this.peerId) return;
    if (event.roomCode !== this.roomCode) return;

    // Track active peers in this room
    this.activePeers.set(event.senderId, { role: event.role, lastSeen: Date.now() });

    switch (event.type) {
      case 'HEARTBEAT':
        this.post('HEARTBEAT_ACK');
        this.notify();
        break;

      case 'HEARTBEAT_ACK':
        this.notify();
        break;

      case 'CHAT_MESSAGE':
        if (event.payload) {
          this.messages = [...this.messages, event.payload];
          this.notify();
        }
        break;

      case 'SYNC_PLAY':
        // If this tab is a listener, sync playback with host
        if (this.role === 'listener' && event.role === 'host' && event.payload?.song) {
          const latencySec = (Date.now() - event.timestamp) / 1000;
          const adjustedTime = Math.max(0, (event.payload.currentTime || 0) + latencySec);
          this.onRemotePlayCallback?.(event.payload.song, adjustedTime);
        }
        break;

      case 'SYNC_PAUSE':
        if (this.role === 'listener' && event.role === 'host') {
          this.onRemotePauseCallback?.();
        }
        break;

      case 'SYNC_SEEK':
        if (this.role === 'listener' && event.role === 'host' && typeof event.payload?.time === 'number') {
          this.onRemoteSeekCallback?.(event.payload.time);
        }
        break;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      // Clean up dead peers older than 10 seconds
      const now = Date.now();
      for (const [id, peer] of this.activePeers.entries()) {
        if (now - peer.lastSeen > 10000) {
          this.activePeers.delete(id);
        }
      }
      this.post('HEARTBEAT');
    }, 4000);
  }

  public setCallbacks(callbacks: {
    onPlay: (song: Song, currentTime: number) => void;
    onPause: () => void;
    onSeek: (time: number) => void;
  }) {
    this.onRemotePlayCallback = callbacks.onPlay;
    this.onRemotePauseCallback = callbacks.onPause;
    this.onRemoteSeekCallback = callbacks.onSeek;
  }

  public getRoomCode() {
    return this.roomCode;
  }

  public setRoomCode(code: string) {
    this.roomCode = (code || '').replace(/[^A-Za-z0-9_-]/g, '').trim().toUpperCase().substring(0, 20);
    this.activePeers.clear();
    this.post('HEARTBEAT');
    this.notify();
  }

  public getRole() {
    return this.role;
  }

  public setRole(role: 'host' | 'listener') {
    this.role = role;
    this.userName = role === 'host' ? 'Host (You)' : 'Listener (You)';
    this.post('HEARTBEAT');
    this.notify();
  }

  public getConnectedCount() {
    // Current user + active peers
    return 1 + this.activePeers.size;
  }

  public getMessages() {
    return this.messages;
  }

  public sendChatMessage(text: string) {
    const cleanText = (text || '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .substring(0, 300);
    if (!cleanText) return;

    const msg: ChatMessage = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      user: this.role === 'host' ? 'You (Host)' : 'You (Listener)',
      text: cleanText,
      time: 'Just now',
      isHost: this.role === 'host',
    };
    // Keep max 50 recent messages to prevent memory bloat
    this.messages = [...this.messages.slice(-50), msg];
    this.post('CHAT_MESSAGE', {
      ...msg,
      user: this.role === 'host' ? 'Host' : 'Friend',
    });
    this.notify();
  }

  public broadcastHostPlay(song: Song, currentTime: number) {
    if (this.role !== 'host') return;
    this.post('SYNC_PLAY', { song, currentTime });
  }

  public broadcastHostPause() {
    if (this.role !== 'host') return;
    this.post('SYNC_PAUSE');
  }

  public broadcastHostSeek(time: number) {
    if (this.role !== 'host') return;
    this.post('SYNC_SEEK', { time });
  }

  public subscribe(cb: () => void) {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }
}

export const listenTogetherService = new ListenTogetherService();

