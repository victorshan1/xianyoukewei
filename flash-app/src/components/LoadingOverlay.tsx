interface LoadingOverlayProps {
  loading: boolean;
  message?: string;
}

export function LoadingOverlay({ loading, message = 'AI 思考中...' }: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div data-testid="loading-overlay" className="fixed inset-0 z-30 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}
