import React from 'react';
import {
  Play,
  Pause,
  Clock,
  Shuffle,
  PlusCircle,
  ArrowDownCircle,
  MoreHorizontal,
  List,
  Check
} from 'lucide-react';
import type { Song } from '../types';

interface Props {
  song: Song;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onTogglePlay: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

interface MoreAlbumItem {
  id: string;
  title: string;
  year: number;
  coverUrl: string;
  badge?: string;
}

export const SpotifySongView: React.FC<Props> = ({
  song,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onToggleLike,
  onAddToPlaylist,
}) => {
  // Extract or fallback metadata matching Screenshot 445 / 447
  const isPyaarTune = song.title.toLowerCase().includes('pyaar tune') || song.title.toLowerCase().includes('dooriyan');
  const displayTitle = isPyaarTune ? 'Pyaar Tune Kya Kiya' : song.title;
  const primaryArtist = isPyaarTune ? 'Amjad Nadeem' : song.artist.split(',')[0].trim();
  const trackArtist = isPyaarTune ? 'Jubin Nautiyal' : song.artist;
  const displayYear = 2015;
  const playCount = '21,131,293';
  const displayDuration = '3:35';
  const releaseDate = 'April 13, 2015';
  const copyright = '© 2016 Zee Music Company';
  const phonogram = '℗ 2016 Zee Music Company';

  // More by Artist Albums (Screenshot 445 & 447)
  const moreByArtist: MoreAlbumItem[] = [
    {
      id: 'sonali-cable',
      title: 'Sonali Cable (Original Motion Picture...',
      year: 2018,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'barkhaa',
      title: 'Barkhaa (Original Motion Picture...',
      year: 2018,
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'welcome-2-karachi',
      title: 'Welcome 2 Karachi',
      year: 2015,
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'jazbaa',
      title: 'Jazbaa',
      year: 2018,
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="spotify-song-viewport">
      {/* ══════════════════════════════════════════════════════
          HERO HEADER (Red Gradient Banner - Screenshot 445)
          ══════════════════════════════════════════════════════ */}
      <div className="sp-song-hero">
        <div className="sp-song-hero-cover-wrap">
          <img
            src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80'}
            alt={displayTitle}
            className="sp-song-hero-cover"
          />
        </div>
        <div className="sp-song-hero-meta">
          <span className="sp-song-tag">Single</span>
          <h1 className="sp-song-hero-title">{displayTitle}</h1>
          <div className="sp-song-artist-row">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
              alt={primaryArtist}
              className="sp-song-artist-avatar"
            />
            <span className="sp-song-artist-name">{primaryArtist}</span>
            <span className="sp-song-bullet">•</span>
            <span>{displayYear}</span>
            <span className="sp-song-bullet">•</span>
            <span className="sp-song-meta-dim">1 song, 3 min 35 sec</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ACTION TRANSPORT BAR (Play, Shuffle, +, Download, ...)
          ══════════════════════════════════════════════════════ */}
      <div className="sp-song-action-bar">
        <div className="sp-song-actions-left">
          <button
            className="sp-song-big-play-btn"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={26} fill="#000000" color="#000000" />
            ) : (
              <Play size={26} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
            )}
          </button>

          {/* Small thumbnail badge (Screenshot 445) */}
          <div className="sp-song-thumb-badge" onClick={onTogglePlay} title="Play preview">
            <img src={song.coverUrl} alt="preview" />
          </div>

          <button className="sp-song-icon-action" title="Shuffle">
            <Shuffle size={22} />
          </button>

          <button
            className={`sp-song-icon-action ${song.isLiked ? 'liked' : ''}`}
            onClick={() => {
              onToggleLike(song.id);
              if (onAddToPlaylist) onAddToPlaylist(song);
            }}
            title={song.isLiked ? 'Remove from Your Library' : 'Add to Your Library'}
          >
            {song.isLiked ? (
              <Check size={24} color="#1ed760" strokeWidth={2.5} />
            ) : (
              <PlusCircle size={24} />
            )}
          </button>

          <button className="sp-song-icon-action" title="Download">
            <ArrowDownCircle size={22} />
          </button>

          <button className="sp-song-icon-action" title="More options">
            <MoreHorizontal size={22} />
          </button>
        </div>

        <div className="sp-song-actions-right">
          <button className="sp-song-list-toggle" title="List View">
            <span>List</span>
            <List size={18} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TRACKLIST TABLE (# | Title | Plays | Clock)
          ══════════════════════════════════════════════════════ */}
      <div className="sp-song-track-table">
        <div className="sp-song-table-header">
          <div className="sp-col-num">#</div>
          <div className="sp-col-title">Title</div>
          <div className="sp-col-plays">Plays</div>
          <div className="sp-col-time">
            <Clock size={16} />
          </div>
        </div>

        <div
          className="sp-song-table-row active"
          onClick={() => onPlaySong(song)}
        >
          <div className="sp-col-num">
            {isPlaying ? (
              <div className="spotify-equalizer-bars">
                <span className="eq-bar bar-1" />
                <span className="eq-bar bar-2" />
                <span className="eq-bar bar-3" />
              </div>
            ) : (
              <span className="sp-track-idx-green">1</span>
            )}
          </div>
          <div className="sp-col-title">
            <div className="sp-track-title-green">{displayTitle}</div>
            <div className="sp-track-artist-sub">{trackArtist}</div>
          </div>
          <div className="sp-col-plays">{playCount}</div>
          <div className="sp-col-time">{displayDuration}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          COPYRIGHT & METADATA
          ══════════════════════════════════════════════════════ */}
      <div className="sp-song-copyright-section">
        <div className="sp-song-release-date">{releaseDate}</div>
        <div className="sp-song-legal">{copyright}</div>
        <div className="sp-song-legal">{phonogram}</div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MORE BY ARTIST SHELF (Screenshot 445 & 447)
          ══════════════════════════════════════════════════════ */}
      <div className="sp-song-more-section">
        <div className="sp-song-more-header">
          <h2 className="sp-song-more-title">More by {primaryArtist}</h2>
          <button className="sp-song-see-all">See discography</button>
        </div>

        <div className="sp-song-more-grid">
          {moreByArtist.map((alb) => (
            <div key={alb.id} className="sp-song-album-card" onClick={() => onPlaySong(song)}>
              <div className="sp-song-album-cover-wrap">
                <img src={alb.coverUrl} alt={alb.title} className="sp-song-album-cover" />
                <button className="spotify-floating-play-btn" title={`Play ${alb.title}`}>
                  <Play size={20} fill="#000000" color="#000000" />
                </button>
              </div>
              <div className="sp-song-album-meta">
                <div className="sp-song-album-title" title={alb.title}>
                  {alb.title}
                </div>
                <div className="sp-song-album-year">{alb.year}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

