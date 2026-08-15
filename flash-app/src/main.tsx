// 拦截 console.error 和 console.warn，用 console.log 替代
(function () {
  console.error = function (...args: unknown[]) {
    console.log('[console.error]', ...args);
  };

  console.warn = function (...args: unknown[]) {
    console.log('[console.warn]', ...args);
  };
})();

import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

type FlashAppErrorPayload = {
  type?: string;
  message?: string;
  stack?: string;
  componentStack?: string;
  errorType?: string;
  artifactId?: string;
  artifactVersion?: string;
  traceId?: string;
  sessionId?: string;
  timestamp?: number;
  [key: string]: unknown;
};

const getNonEmptyValue = (value: string | undefined, fallback: string): string => {
  return value !== undefined && value !== '' ? value : fallback;
};

const reportFlashAppError = (payload: FlashAppErrorPayload): void => {
  const reportPayload: FlashAppErrorPayload = {
    type: 'flash-app-error',
    ...payload,
    message: getNonEmptyValue(payload.message, 'Unknown react error'),
    artifactId: getNonEmptyValue(payload.artifactId, window.lingguang?._getArtifactId() ?? 'standalone'),
    artifactVersion: getNonEmptyValue(payload.artifactVersion, window.lingguang?._getArtifactVersion() ?? '1.0.0'),
    traceId: getNonEmptyValue(payload.traceId, window.trace_id ?? ''),
    sessionId: getNonEmptyValue(payload.sessionId, window._flashAppSessionId ?? ''),
    timestamp: payload.timestamp ?? Date.now(),
  };

  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'flash-app-error',
        payload: reportPayload,
      },
      '*',
    );
  }
};

type FlashAppErrorBoundaryProps = {
  children: ReactNode;
};

type FlashAppErrorBoundaryState = {
  hasError: boolean;
};

class FlashAppErrorBoundary extends Component<FlashAppErrorBoundaryProps, FlashAppErrorBoundaryState> {
  override state: FlashAppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): FlashAppErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const componentStack = info.componentStack ?? '';

    reportFlashAppError({
      message: getNonEmptyValue(error.message, 'Unknown react error'),
      ...(error.stack !== undefined ? { stack: error.stack } : {}),
      ...(componentStack !== '' ? { componentStack } : {}),
      errorType: 'react-error-boundary',
    });
  }

  override render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    {import.meta.env.PROD ? (
      <FlashAppErrorBoundary>
        <App />
      </FlashAppErrorBoundary>
    ) : (
      <App />
    )}
  </StrictMode>,
);
