import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SwipeableSongRow: React.FC<Props> = ({
  children,
  onDelete,
  deleteLabel = 'Remove',
  disabled = false,
  className = '',
  style = {},
}) => {
  const [translateX, setTranslateX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isPastThreshold, setIsPastThreshold] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = -75; // Pixels needed to confirm delete

  // Clean up if unmounted while swiping
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isDeleting) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = touch.clientX;
    isDraggingRef.current = true;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || disabled || isDeleting) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Determine direction on initial movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        // If moving vertically more than horizontally, cancel swipe to let page scroll
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          isHorizontalSwipeRef.current = false;
          isDraggingRef.current = false;
          setIsSwiping(false);
          setTranslateX(0);
          return;
        } else {
          isHorizontalSwipeRef.current = true;
        }
      } else {
        return;
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    // Only allow swiping to the left (right to left swipe)
    if (deltaX <= 0) {
      // Add slight resistance after threshold
      const resistanceX = deltaX < SWIPE_THRESHOLD 
        ? SWIPE_THRESHOLD + (deltaX - SWIPE_THRESHOLD) * 0.4
        : deltaX;
      setTranslateX(resistanceX);
      setIsPastThreshold(deltaX <= SWIPE_THRESHOLD);
    } else {
      setTranslateX(0);
      setIsPastThreshold(false);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current || disabled || isDeleting) return;
    isDraggingRef.current = false;
    setIsSwiping(false);

    if (translateX <= SWIPE_THRESHOLD) {
      // Trigger delete animation
      setIsDeleting(true);
      setTranslateX(-400); // Slide completely out
      setTimeout(() => {
        onDelete();
      }, 240);
    } else {
      // Snap back
      setTranslateX(0);
      setIsPastThreshold(false);
    }
  };

  // Pointer / Mouse events for desktop swipe support
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || isDeleting) return;
    // Only primary button
    if (e.button !== 0) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = e.clientX;
    isDraggingRef.current = true;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || disabled || isDeleting) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          isHorizontalSwipeRef.current = false;
          isDraggingRef.current = false;
          setIsSwiping(false);
          setTranslateX(0);
          return;
        } else {
          isHorizontalSwipeRef.current = true;
          // Capture pointer for smooth desktop drag
          try {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            // Safe fallback
          }
        }
      } else {
        return;
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    if (deltaX <= 0) {
      const resistanceX = deltaX < SWIPE_THRESHOLD 
        ? SWIPE_THRESHOLD + (deltaX - SWIPE_THRESHOLD) * 0.4
        : deltaX;
      setTranslateX(resistanceX);
      setIsPastThreshold(deltaX <= SWIPE_THRESHOLD);
    } else {
      setTranslateX(0);
      setIsPastThreshold(false);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || disabled || isDeleting) return;
    isDraggingRef.current = false;
    setIsSwiping(false);
    try {
      if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback
    }

    if (translateX <= SWIPE_THRESHOLD) {
      setIsDeleting(true);
      setTranslateX(-400);
      setTimeout(() => {
        onDelete();
      }, 240);
    } else {
      setTranslateX(0);
      setIsPastThreshold(false);
    }
  };

  return (
    <div
      ref={rowRef}
      className={`swipeable-song-row-container ${className} ${isDeleting ? 'is-deleted' : ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        transition: isDeleting ? 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.24s ease, margin 0.24s ease' : undefined,
        ...style,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Background action revealed during swipe */}
      <div
        className={`swipe-action-background ${isPastThreshold ? 'past-threshold' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '24px',
          background: isPastThreshold
            ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.85) 60%, #dc2626 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.4) 60%, rgba(239, 68, 68, 0.75) 100%)',
          borderRadius: '10px',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.86rem',
          gap: '8px',
          zIndex: 1,
          opacity: translateX < 0 ? Math.min(1, Math.abs(translateX) / 45) : 0,
          transition: isSwiping ? 'none' : 'opacity 0.2s ease, background 0.2s ease',
        }}
      >
        <span style={{ transform: isPastThreshold ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.15s ease' }}>
          {deleteLabel}
        </span>
        <div
          style={{
            transform: isPastThreshold ? 'scale(1.25) rotate(-8deg)' : 'scale(1)',
            transition: 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={18} />
        </div>
      </div>

      {/* Foreground row item */}
      <div
        className="swipeable-song-row-content"
        style={{
          position: 'relative',
          zIndex: 2,
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};

