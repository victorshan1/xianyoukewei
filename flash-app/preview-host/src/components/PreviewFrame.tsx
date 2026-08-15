import type { RefObject } from 'react';

export type RuntimeStatus = '启动中' | '正在刷新' | '运行时已连接' | '运行时连接失败';

type PreviewFrameProps = {
  appUrl: string;
  iframeRef: RefObject<HTMLIFrameElement>;
  runtimeStatus: RuntimeStatus;
  onRefresh: () => void;
};

export function PreviewFrame({
  appUrl,
  iframeRef,
  runtimeStatus,
  onRefresh,
}: PreviewFrameProps) {
  return (
    <section className="preview-column" aria-label="应用预览">
      <header className="panel-header">
        <div>
          <p className="eyebrow">LOCAL APP-SHELL · V1</p>
          <h1>应用预览</h1>
        </div>
        <span className="status">
          <span className="status-dot" />
          <span id="runtime-status">{runtimeStatus}</span>
        </span>
      </header>
      <div className="iframe-shell">
        <div className="browser-bar">
          <input
            id="app-url"
            data-testid="app-preview-url"
            aria-label="应用预览地址"
            type="text"
            value={appUrl}
            readOnly
          />
          <button
            id="reload-preview"
            data-testid="reload-app-preview"
            type="button"
            aria-label="刷新应用预览"
            onClick={onRefresh}
          >
            刷新
          </button>
        </div>
        <iframe
          id="app-preview"
          data-testid="app-preview"
          ref={iframeRef}
          title="闪应用本地预览"
          src={appUrl}
          sandbox="allow-scripts allow-same-origin allow-orientation-lock"
          allow="camera; microphone; accelerometer; gyroscope; clipboard-read; clipboard-write"
        />
      </div>
    </section>
  );
}
