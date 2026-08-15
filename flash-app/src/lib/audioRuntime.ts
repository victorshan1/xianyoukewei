const FLASH_APP_AUDIO_EVENT = 'FLASH_APP_AUDIO_EVENT';

export type AudioStateListener = (muted: boolean) => void;

export type FlashAppAudioRuntime = {
  getMuted: () => boolean;
  setMuted: (muted: boolean) => void;
  subscribe: (listener: AudioStateListener) => () => void;
};

declare global {
  interface Window {
    __FLASH_APP_AUDIO__?: FlashAppAudioRuntime;
  }
}

class FlashAppAudioRuntimeImpl implements FlashAppAudioRuntime {
  private muted = false;

  private listeners = new Set<AudioStateListener>();

  public getMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    if (this.muted === muted) {
      return;
    }

    this.muted = muted;
    this.listeners.forEach((listener) => {
      listener(muted);
    });
  }

  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    listener(this.muted);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const getAudioRuntime = (): FlashAppAudioRuntime => {
  window.__FLASH_APP_AUDIO__ ??= new FlashAppAudioRuntimeImpl();
  return window.__FLASH_APP_AUDIO__;
};

export const notifyAudioPlay = (): void => {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: FLASH_APP_AUDIO_EVENT,
        event: 'audio-play',
      },
      '*',
    );
  }
};

export const isMuted = (): boolean => {
  return getAudioRuntime().getMuted();
};

export const onMuteChange = (listener: AudioStateListener): (() => void) => {
  return getAudioRuntime().subscribe(listener);
};
