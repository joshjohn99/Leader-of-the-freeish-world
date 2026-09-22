import type { MusicTrack } from './music-tracks.ts';

type MusicAudio = Pick<HTMLAudioElement, 'src' | 'loop' | 'volume' | 'currentTime' | 'paused' | 'play' | 'pause' | 'load' | 'addEventListener'>;
type PlaybackStatus = 'stopped' | 'loading' | 'playing' | 'error';

/** Owns one audio element independently of game renders or simulation state. */
export function createMusicController(audio: MusicAudio, tracks: readonly MusicTrack[], changed: () => void, initialId?: string) {
  if (!tracks.length) throw Error('The music playlist needs at least one track.');
  let index = Math.max(0, tracks.findIndex(track => track.id === initialId));
  let status: PlaybackStatus = 'stopped';
  let error = '';
  let generation = 0;
  let wantsPlayback = false;
  audio.loop = true;
  audio.src = tracks[index].src;

  function snapshot() { return { track: tracks[index], index, count: tracks.length, status, error, volume: audio.volume }; }
  function rewind() { try { audio.currentTime = 0; } catch { /* Metadata may not be available yet. */ } }
  async function play() {
    if (wantsPlayback) return;
    const retry = status === 'error';
    const request = ++generation;
    wantsPlayback = true;
    status = 'loading';
    error = '';
    changed();
    try {
      if (retry) audio.load();
      await audio.play();
      if (request !== generation) return;
      status = 'playing';
      changed();
    } catch {
      if (request !== generation) return;
      wantsPlayback = false;
      status = 'error';
      error = 'Could not play this track. Press Play to retry, or choose another track.';
      changed();
    }
  }
  function stop() {
    ++generation;
    wantsPlayback = false;
    audio.pause();
    rewind();
    status = 'stopped';
    error = '';
    changed();
  }
  function select(nextIndex: number) {
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= tracks.length) return;
    const resume = wantsPlayback;
    stop();
    index = nextIndex;
    audio.src = tracks[index].src;
    audio.loop = true;
    audio.load();
    rewind();
    changed();
    if (resume) void play();
  }
  audio.addEventListener('waiting', () => { if (wantsPlayback) { status = 'loading'; changed(); } });
  audio.addEventListener('playing', () => { if (wantsPlayback && !audio.paused) { status = 'playing'; changed(); } });
  audio.addEventListener('error', () => {
    ++generation;
    wantsPlayback = false;
    status = 'error';
    error = 'This track could not be loaded. Press Play to retry, or choose another track.';
    changed();
  });
  return { snapshot, play, stop, select, next: () => select((index + 1) % tracks.length),
    setVolume(value: number) { if (!Number.isFinite(value)) return; audio.volume = Math.max(0, Math.min(1, value)); changed(); },
  };
}
