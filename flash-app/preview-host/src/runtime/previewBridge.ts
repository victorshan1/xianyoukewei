import {
  parseAppMessage,
  type ApiRequestMessage,
  type CandyJarCallMessage,
} from './protocol';
import type { CandyJar } from './types';

type PreviewBridgeOptions = {
  candyJar: CandyJar;
  iframe: HTMLIFrameElement;
  onRuntimeConnected: () => void;
  onRuntimeConnectionFailed: () => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createPreviewBridge({
  candyJar,
  iframe,
  onRuntimeConnected,
  onRuntimeConnectionFailed,
}: PreviewBridgeOptions): () => void {
  const postToApp = (message: unknown): void => {
    iframe.contentWindow?.postMessage(message, '*');
  };

  const handleApiMessage = (message: ApiRequestMessage): void => {
    candyJar.call(
      'FlashApp',
      'remoteSkill',
      {
        action: message.action,
        payload: message.payload,
      },
      (payload) => {
        postToApp({
          type: 'API_CALLBACK',
          id: message.id,
          success: true,
          message: null,
          payload,
        });
      },
      (error) => {
        postToApp({
          type: 'API_CALLBACK',
          id: message.id,
          success: false,
          message: getErrorMessage(error),
          payload: null,
        });
      },
    );
  };

  const handleCandyJarMessage = (message: CandyJarCallMessage): void => {
    candyJar.call(
      message.method,
      message.action,
      message.params,
      (result) => {
        postToApp({
          type: 'CANDYJAR_CALLBACK',
          callId: message.callId,
          success: true,
          result,
        });
      },
      (error) => {
        postToApp({
          type: 'CANDYJAR_CALLBACK',
          callId: message.callId,
          success: false,
          error: getErrorMessage(error),
        });
      },
    );
  };

  const handleRuntimeReady = (): void => {
    candyJar.call(
      'FlashApp',
      'onload',
      { success: true },
      onRuntimeConnected,
      onRuntimeConnectionFailed,
    );
  };

  const handleMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== iframe.contentWindow) return;
    const message = parseAppMessage(event.data);
    if (message === null) return;

    switch (message.type) {
      case 'API':
        handleApiMessage(message);
        break;
      case 'CANDYJAR_CALL':
        handleCandyJarMessage(message);
        break;
      case 'FLASH_APP_DOM_CONTENT_LOADED':
        handleRuntimeReady();
        break;
    }
  };

  window.addEventListener('message', handleMessage);
  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
