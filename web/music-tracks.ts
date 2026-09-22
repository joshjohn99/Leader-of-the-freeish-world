export interface MusicTrack { id: string; title: string; src: string }

// Add future files to public/audio, then add an entry here. Playlist order is
// the order used by Next; each selected track loops until explicitly changed.
export const musicTracks: readonly MusicTrack[] = [
  { id: 'presidential-march', title: 'Presidential March', src: '/audio/presidential-march.mp3' },
  { id: 'anthem-of-the-victor', title: 'Anthem of the Victor', src: '/audio/anthem-of-the-victor.mp3' },
  { id: 'banner-of-the-ancestors', title: 'Banner of the Ancestors', src: '/audio/banner-of-the-ancestors.mp3' },
];
