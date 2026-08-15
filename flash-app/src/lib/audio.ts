import { Howl as RawHowl, Howler } from 'howler';
import { resolveFormat } from './audio-format';
import { getAudioRuntime, isMuted, notifyAudioPlay, onMuteChange } from './audioRuntime';

type HowlOptions = ConstructorParameters<typeof RawHowl>[0];

class Howl extends RawHowl {
  constructor(options: HowlOptions) {
    super({
      ...options,
      html5: true,
      format: resolveFormat(options),
    });

    super.on('play', notifyAudioPlay);
  }
}

const runtime = getAudioRuntime();

runtime.subscribe((muted) => {
  Howler.mute(muted);
});

export { Howl, Howler };

export { isMuted, onMuteChange };
