import coinSound from "./sounds/coin.wav";
import deathSound from "./sounds/death.wav";
import jumpSound from "./sounds/jump.wav";
import landSound from "./sounds/land.wav";
import levelLoadSound from "./sounds/level-load.wav";
import shootSound from "./sounds/shoot.wav";

const audio = {
  coin: {
    source: coinSound,
    volume: 1,
  },
  death: {
    source: deathSound,
    volume: 1,
  },
  jump: {
    source: jumpSound,
    volume: 0.5,
  },
  land: {
    source: landSound,
    volume: 1,
  },
  levelLoad: {
    source: levelLoadSound,
    volume: 0.5,
  },
  shoot: {
    source: shootSound,
    volume: 1,
  },
};

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

export function playSound(sound: keyof typeof audio) {
  const buffer = soundToAudioBuffer[sound];
  const source = audioCtx.createBufferSource();
  source.buffer = buffer!;

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = audio[sound].volume;
  source.connect(gainNode).connect(audioCtx.destination);

  source.start();
}
