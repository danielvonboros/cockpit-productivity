/**
 * Sound and system notifications for the end of a pomodoro phase.
 * Browsers only allow audio after a user gesture, so the play button calls
 * `unlockAudio()` first.
 */
let audio: AudioContext | undefined;

export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    // No Web Audio: stay silent
  }
}

/** Soft three-note chime, no audio file needed */
export function chime() {
  unlockAudio();
  if (!audio) return;
  const start = audio.currentTime;
  [659.25, 880, 1318.5].forEach((frequency, index) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    const at = start + index * 0.16;
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
    osc.connect(gain).connect(audio!.destination);
    osc.start(at);
    osc.stop(at + 1.2);
  });
}

export function notificationsSupported() {
  return typeof Notification !== 'undefined';
}

export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: './favicon.svg', tag: 'cockpit-pomodoro' });
  } catch {
    // Some contexts (e.g. file://) refuse notifications
  }
}

export function audioReady() {
  return audio?.state === 'running';
}
