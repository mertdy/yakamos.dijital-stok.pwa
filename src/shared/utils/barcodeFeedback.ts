let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  audioContext ??= new AudioContext();
  return audioContext;
};

/** Initializes the short local confirmation tone before the first scan. */
export const preloadBarcodeFeedback = () => {
  getAudioContext();
};

export const playBarcodeFeedback = () => {
  const context = getAudioContext();
  if (!context) return;

  const play = () => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    // A brief square-wave pulse resembles the piezo buzzer used by retail
    // barcode readers much more closely than a soft notification chime.
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(2000, context.currentTime);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.075);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
  };

  if (context.state === 'suspended') {
    void context
      .resume()
      .then(play)
      .catch(() => undefined);
  } else {
    play();
  }
};
