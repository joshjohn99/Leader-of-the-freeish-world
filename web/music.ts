import { musicTracks } from './music-tracks.ts';
import { createMusicController } from './music-controller.ts';
import './music.css';

const preferenceKey = 'freedoma-music-v1';
const time = (value: number) => Number.isFinite(value) && value >= 0 ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';

export function mountMusicPlayer(host: HTMLElement) {
  let savedId: string | undefined;
  let volume = .35;
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? '{}');
    if (typeof saved?.trackId === 'string') savedId = saved.trackId;
    if (typeof saved?.volume === 'number' && Number.isFinite(saved.volume)) volume = Math.max(0, Math.min(1, saved.volume));
  } catch { /* Music works even when browser storage is unavailable. */ }
  host.innerHTML = `<details class="music-details"><summary aria-label="Music playlist and volume"><span aria-hidden="true">♫</span> Music <span class="music-indicator" aria-hidden="true"></span></summary>
    <section class="music-panel" aria-label="Music playlist"><div class="music-heading"><strong>Presidential soundtrack</strong><button type="button" data-music-close aria-label="Close music playlist">×</button></div>
    <label for="music-track">Current track</label><select id="music-track"></select>
    <div class="music-meta"><span data-music-position>0:00 / 0:00</span><span>↻ Repeat track · On</span></div>
    <label class="music-volume" for="music-volume">Volume <output id="music-volume-value"></output></label><input id="music-volume" type="range" min="0" max="100" step="1">
    <p class="music-help"></p><p class="music-status" role="status" aria-live="polite"></p></section></details>
    <button type="button" data-music-play aria-label="Play music">▶ <span>Play</span></button>
    <button type="button" data-music-stop aria-label="Stop music and return to the start">■ <span>Stop</span></button>
    <button type="button" data-music-next aria-label="Next music track">⏭ <span>Next</span></button>
    <span class="music-live-status" role="status" aria-live="polite"></span>`;
  const audio = document.createElement('audio');
  audio.id = 'game-music';
  audio.preload = 'metadata';
  audio.volume = volume;
  host.append(audio);
  const details = host.querySelector('details')!;
  const selector = host.querySelector<HTMLSelectElement>('#music-track')!;
  const slider = host.querySelector<HTMLInputElement>('#music-volume')!;
  const playButton = host.querySelector<HTMLButtonElement>('[data-music-play]')!;
  const stopButton = host.querySelector<HTMLButtonElement>('[data-music-stop]')!;
  const nextButton = host.querySelector<HTMLButtonElement>('[data-music-next]')!;
  musicTracks.forEach((track, index) => { const option = new Option(`${index + 1}. ${track.title}`, String(index)); selector.add(option); });
  host.querySelector('.music-help')!.textContent = musicTracks.length === 1
    ? 'One track loaded. Next restarts it. More tracks will appear here as they are added.'
    : 'Each track repeats until you stop or change it. Next wraps around to the first track.';
  function updateTime() { host.querySelector('[data-music-position]')!.textContent = `${time(audio.currentTime)} / ${time(audio.duration)}`; }
  function update() {
    const state = controller.snapshot();
    const active = state.status === 'playing' || state.status === 'loading';
    host.classList.toggle('music-active', active);
    playButton.disabled = active;
    stopButton.disabled = !active && audio.currentTime === 0 && state.status !== 'error';
    playButton.title = `Play ${state.track.title}`;
    nextButton.title = state.count === 1 ? 'Restart the current track' : 'Select the next track';
    selector.value = String(state.index);
    slider.value = String(Math.round(state.volume * 100));
    host.querySelector('output')!.textContent = `${slider.value}%`;
    const message = state.error || `${state.status === 'playing' ? 'Playing' : state.status === 'loading' ? 'Loading' : 'Stopped'} · ${state.track.title}`;
    host.querySelector('.music-status')!.textContent = message;
    host.querySelector('.music-live-status')!.textContent = message;
    if (state.status === 'error') details.open = true;
    try { localStorage.setItem(preferenceKey, JSON.stringify({ trackId: state.track.id, volume: state.volume })); } catch { /* Optional preferences only. */ }
    updateTime();
  }
  const controller = createMusicController(audio, musicTracks, update, savedId);
  playButton.onclick = () => { void controller.play(); };
  stopButton.onclick = () => controller.stop();
  nextButton.onclick = () => controller.next();
  selector.onchange = () => controller.select(Number(selector.value));
  slider.oninput = () => controller.setVolume(Number(slider.value) / 100);
  host.querySelector<HTMLButtonElement>('[data-music-close]')!.onclick = () => { details.open = false; host.querySelector('summary')!.focus(); };
  host.addEventListener('keydown', event => { if (event.key === 'Escape') { details.open = false; host.querySelector('summary')!.focus(); } });
  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied']) audio.addEventListener(event, updateTime);
  update();
}
