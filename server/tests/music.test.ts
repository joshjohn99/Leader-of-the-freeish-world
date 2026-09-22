import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicController } from '../../web/music-controller.ts';

class TestAudio extends EventTarget {
  src = ''; loop = false; volume = .35; currentTime = 0; paused = true;
  plays = 0; loads = 0; nextPlay: Promise<void> | undefined;
  play() { this.plays++; this.paused = false; return this.nextPlay ?? Promise.resolve(); }
  pause() { this.paused = true; }
  load() { this.loads++; this.currentTime = 0; }
}
const tracks = [
  { id:'one', title:'First track', src:'/audio/one.mp3' },
  { id:'two', title:'Second track', src:'/audio/two.mp3' },
  { id:'three', title:'Third track', src:'/audio/three.mp3' },
];
const flush = () => new Promise<void>(resolve => queueMicrotask(resolve));

test('music starts silent, loops the selected track, and stops at the beginning for replay', async () => {
  const audio = new TestAudio();
  const music = createMusicController(audio, tracks, () => {});
  assert.equal(audio.plays, 0);
  assert.equal(audio.loop, true);
  await music.play();
  audio.currentTime = 20;
  await music.play();
  assert.equal(audio.plays, 1);
  music.stop();
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  assert.equal(music.snapshot().status, 'stopped');
  await music.play();
  assert.equal(music.snapshot().status, 'playing');
});
test('Next cycles multiple tracks, preserves active playback, and never starts music while stopped', async () => {
  const audio = new TestAudio();
  const music = createMusicController(audio, tracks, () => {}, 'two');
  music.next();
  assert.equal(audio.src, tracks[2].src);
  assert.equal(audio.plays, 0);
  await music.play();
  music.next(); await flush();
  assert.equal(audio.src, tracks[0].src);
  assert.equal(music.snapshot().status, 'playing');
  assert.equal(audio.loop, true);
  music.select(2); await flush();
  assert.equal(audio.src, tracks[2].src);
  music.stop(); music.select(1);
  assert.equal(music.snapshot().status, 'stopped');
  const selected = music.snapshot().track.id;
  music.select(99);
  assert.equal(music.snapshot().track.id, selected);
});
test('Next with one track restarts the track without duplicating the player', async () => {
  const audio = new TestAudio();
  const music = createMusicController(audio, tracks.slice(0,1), () => {});
  await music.play(); audio.currentTime = 37;
  music.next(); await flush();
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.src, tracks[0].src);
  assert.equal(music.snapshot().status, 'playing');
});
test('Stop wins over an unfinished play request and stale failures cannot stop a newer track', async () => {
  const audio = new TestAudio();
  let resolveOld!: () => void;
  audio.nextPlay = new Promise<void>(resolve => { resolveOld = resolve; });
  const music = createMusicController(audio, tracks, () => {});
  const pending = music.play(); music.stop(); resolveOld(); await pending;
  assert.equal(music.snapshot().status, 'stopped');
  assert.equal(audio.paused, true);
  let rejectOld!: (error: Error) => void;
  audio.nextPlay = new Promise<void>((_, reject) => { rejectOld = reject; });
  const earlier = music.play();
  audio.nextPlay = undefined;
  music.next(); await flush();
  rejectOld(new Error('aborted')); await earlier;
  assert.equal(music.snapshot().status, 'playing');
  assert.equal(music.snapshot().track.id, 'two');
});
test('playback failures can retry and volume is clamped without losing the selected track', async () => {
  const audio = new TestAudio();
  const music = createMusicController(audio, tracks, () => {}, 'unknown');
  audio.nextPlay = Promise.reject(new Error('blocked'));
  await music.play();
  assert.equal(music.snapshot().status, 'error');
  assert.match(music.snapshot().error, /retry/);
  audio.nextPlay = undefined;
  await music.play();
  assert.equal(audio.loads, 1);
  assert.equal(music.snapshot().status, 'playing');
  music.setVolume(2); assert.equal(audio.volume, 1);
  music.setVolume(-1); assert.equal(audio.volume, 0);
  music.setVolume(NaN); assert.equal(audio.volume, 0);
  assert.equal(music.snapshot().track.id, 'one');
});
