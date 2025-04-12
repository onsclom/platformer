import deathSound from "./sounds/death.wav";
import jumpSound from "./sounds/jump.wav";
import landSound from "./sounds/land.wav";
import shootSound from "./sounds/shoot.wav";
import cannonballExplosion from "./sounds/cannonball-explosion.wav";
import jumpToken from "./sounds/jump-token.wav";
import slideSound from "./sounds/wallslide.wav";

const audio = {
  death: { source: deathSound, volume: 1 },
  jump: { source: jumpSound, volume: 0.5 },
  land: { source: landSound, volume: 1 },
  shoot: { source: shootSound, volume: 0 },
  "cannonball-explosion": { source: cannonballExplosion, volume: 0.3 },
  "jump-token": { source: jumpToken, volume: 1 },
  slide: { source: slideSound, volume: 0.5, loop: true }, // Add the slide sound, loop: true
} as const;

const audioCtx = new AudioContext();

let audioBuffers = await Promise.all(
  Object.values(audio).map(async (sound) => {
    const response = await fetch(sound.source);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  }),
);

const soundToAudioBuffer = Object.fromEntries(
  Object.keys(audio).map((key, index) => [key, audioBuffers[index]]),
);

const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

const playingSounds: { [key: string]: AudioBufferSourceNode } = {};

export function playSound(sound: keyof typeof audio) {
  const buffer = soundToAudioBuffer[sound];
  const source = audioCtx.createBufferSource();
  source.buffer = buffer!;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = audio[sound].volume;
  source.connect(gainNode).connect(audioCtx.destination);

  if ("loop" in audio[sound] && audio[sound].loop) {
    source.loop = true;
  }

  if (source.loop) {
    if (playingSounds[sound]) {
      return; // If the sound is already playing, do not start it again
    }
    playingSounds[sound] = source; // Store the source node
  }

  source.start();

  // // Remove the sound from playingSounds when it ends (if looping)
  source.onended = () => {
    if (playingSounds[sound] === source) {
      delete playingSounds[sound];
    }
  };
}

export function stopSound(sound: keyof typeof audio) {
  if (playingSounds[sound]) {
    playingSounds[sound].stop();
    delete playingSounds[sound];
  }
}
