import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewFrame, type RuntimeStatus } from './components/PreviewFrame';
import { createMockCandyJar } from './mocks/candyJarMock';
import { createPreviewBridge } from './runtime/previewBridge';

function getAppUrl(): string {
  const value = import.meta.env.VITE_LOCAL_APP_URL;
  if (value === undefined || value === '') {
    throw new Error('VITE_LOCAL_APP_URL is required');
  }
  return value;
}

const appUrl = getAppUrl();

function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>('启动中');
  const [candyJar] = useState(createMockCandyJar);

  const handleRuntimeConnected = useCallback(() => {
    setRuntimeStatus('运行时已连接');
  }, []);

  const handleRuntimeConnectionFailed = useCallback(() => {
    setRuntimeStatus('运行时连接失败');
  }, []);

  const handleRefresh = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe === null) return;
    setRuntimeStatus('正在刷新');
    iframe.src = appUrl;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe === null) {
      throw new Error('Preview iframe not found');
    }

    const previousCandyJar = window.CandyJar;
    window.CandyJar = candyJar;
    const cleanupBridge = createPreviewBridge({
      candyJar,
      iframe,
      onRuntimeConnected: handleRuntimeConnected,
      onRuntimeConnectionFailed: handleRuntimeConnectionFailed,
    });

    return () => {
      cleanupBridge();
      if (previousCandyJar === undefined) {
        delete window.CandyJar;
      } else {
        window.CandyJar = previousCandyJar;
      }
    };
  }, [candyJar, handleRuntimeConnected, handleRuntimeConnectionFailed]);

  return (
    <main className="preview-layout">
      <PreviewFrame
        appUrl={appUrl}
        iframeRef={iframeRef}
        runtimeStatus={runtimeStatus}
        onRefresh={handleRefresh}
      />
      <ControlPanel />
    </main>
  );
}

export default App;
