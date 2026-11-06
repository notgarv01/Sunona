# Graph Report - src  (2026-11-06)

## Corpus Check
- 31 files · ~26,807 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: .css 2)

## Summary
- 176 nodes · 433 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App
- App.tsx
- ListenTogetherService
- Playlist
- Song
- AudioEngine
- Song
- IntroScreen.tsx
- Header.tsx

## God Nodes (most connected - your core abstractions)
1. `Song` - 47 edges
2. `App()` - 25 edges
3. `ListenTogetherService` - 22 edges
4. `AudioEngine` - 21 edges
5. `Playlist` - 19 edges
6. `PlaylistService` - 15 edges
7. `HistoryService` - 12 edges
8. `ThemePreset` - 8 edges
9. `Props` - 6 edges
10. `Album` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Props` --references--> `Song`  [EXTRACTED]
  metrolist-desktop/src/components/QueueDrawer.tsx → metrolist-desktop/src/types.ts
- `Props` --references--> `Song`  [EXTRACTED]
  metrolist-desktop/src/components/ListenTogetherModal.tsx → metrolist-desktop/src/types.ts
- `App()` --calls--> `Header()`  [EXTRACTED]
  metrolist-desktop/src/App.tsx → metrolist-desktop/src/components/Header.tsx
- `AudioEngine` --references--> `Song`  [EXTRACTED]
  metrolist-desktop/src/services/audioEngine.ts → metrolist-desktop/src/types.ts
- `ListenTogetherService` --references--> `Song`  [EXTRACTED]
  metrolist-desktop/src/services/listenTogetherService.ts → metrolist-desktop/src/types.ts

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "App"
Cohesion: 0.09
Nodes (21): App(), parseLrcLyrics(), AddToPlaylistModal(), Props, CreatePlaylistModal(), Props, HomeScreen(), LibraryScreen() (+13 more)

### Community 1 - "App.tsx"
Cohesion: 0.14
Nodes (16): CategoryItem, CURATED_GENRES, ExploreScreen(), Props, NowPlayingModal(), Props, Props, Sidebar() (+8 more)

### Community 2 - "ListenTogetherService"
Cohesion: 0.14
Nodes (6): ListenTogetherModal(), Props, ChatMessage, ListenTogetherService, listenTogetherService, SyncEvent

### Community 3 - "Playlist"
Cohesion: 0.17
Nodes (6): MyPlaylistsScreen(), Props, PlaylistScreen(), Props, PlaylistService, Playlist

### Community 5 - "AudioEngine"
Cohesion: 0.10
Nodes (6): AudioVisualizer(), Props, PlayerBar(), Props, AudioEngine, audioEngine

### Community 6 - "Song"
Cohesion: 0.16
Nodes (17): AlbumScreen(), Props, Props, Props, Props, Props, HistoryItem, historyService (+9 more)

### Community 7 - "IntroScreen.tsx"
Cohesion: 0.40
Nodes (4): getNextQuoteIdx(), IntroScreen(), Props, SAVAGE_QUOTES

### Community 8 - "Header.tsx"
Cohesion: 0.50
Nodes (4): getStoredSearchHistory(), Header(), Props, TRENDING_SUGGESTIONS

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Song` connect `Song` to `App`, `App.tsx`, `ListenTogetherService`, `Playlist`, `Song`, `AudioEngine`, `Header.tsx`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.09462365591397849 - nodes in this community are weakly interconnected._
- **Why does `ListenTogetherService` connect `ListenTogetherService` to `App.tsx`, `Song`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Why does `AudioEngine` connect `AudioEngine` to `App.tsx`, `Song`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Should `ListenTogetherService` be split into smaller, more focused modules?**
  _Cohesion score 0.13846153846153847 - nodes in this community are weakly interconnected._
- **Should `AudioEngine` be split into smaller, more focused modules?**
  _Cohesion score 0.09846153846153846 - nodes in this community are weakly interconnected._