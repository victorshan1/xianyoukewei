import { useState, useEffect } from 'react';
import { storageService } from '@/services/storage';
import { loadDemoData } from '@/services/demoData';
import { useToast } from './Toast';

interface WelcomeModalProps {
  onDemoLoaded: () => void;
}

export function WelcomeModal({ onDemoLoaded }: WelcomeModalProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    void storageService.isDemoLoaded().then(loaded => {
      if (!loaded) setShow(true);
    });
  }, []);

  const handleDemoLoad = async () => {
    setLoading(true);
    try {
      const result = await loadDemoData();
      showToast(`已加载 ${String(result.students)} 名学生和 ${String(result.lessons)} 份教案`, 'success');
      onDemoLoaded();
    } catch {
      showToast('加载演示数据失败', 'error');
    } finally {
      setLoading(false);
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div data-testid="welcome-modal" className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-[scaleIn_0.3s_ease-out]">
        <div className="bg-gradient-to-br from-orange-400 to-amber-500 px-6 py-8 text-center">
          <div className="text-5xl mb-3">🏫</div>
          <h2 className="text-xl font-bold text-white">乡村课堂AI助教</h2>
          <p className="text-orange-100 text-sm mt-1">让每一位乡村教师都有AI助手</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            欢迎使用乡村课堂AI助教！本应用为乡村教师、学生和家长提供智能化教学辅助。
            点击下方按钮加载演示数据，快速体验全部功能。
          </p>
          <div className="flex gap-3">
            <button
              data-testid="welcome-skip-btn"
              onClick={() => { setShow(false); }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              稍后再说
            </button>
            <button
              data-testid="welcome-demo-btn"
              onClick={() => { void handleDemoLoad(); }}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {loading ? '加载中...' : '✨ 一键体验'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
