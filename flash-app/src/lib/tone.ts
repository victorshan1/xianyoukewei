import * as RawTone from 'tone';
import { getAudioRuntime, isMuted, notifyAudioPlay, onMuteChange } from './audioRuntime';

const runtime = getAudioRuntime();

const applyToneMute = (muted: boolean): void => {
  RawTone.getDestination().mute = muted;
};

runtime.subscribe((muted) => {
  applyToneMute(muted);
});

export * from 'tone';

export const Tone = RawTone;

export const start = async (): Promise<void> => {
  await RawTone.start();
  applyToneMute(runtime.getMuted());
  notifyAudioPlay();
};

export { isMuted, onMuteChange };
