import { useState } from 'react';
import type { Port } from '@/types';
import { ToastProvider } from '@/components/Toast';
import { WelcomeModal } from '@/components/WelcomeModal';
import { LessonPlan } from '@/pages/LessonPlan';
import { StudentProfile } from '@/pages/StudentProfile';
import { ClassOverview } from '@/pages/ClassOverview';
import { PhotoQA } from '@/pages/PhotoQA';
import { Practice } from '@/pages/Practice';
import { WrongBook } from '@/pages/WrongBook';
import { Report } from '@/pages/Report';
import { Settings } from '@/pages/Settings';

type TabKey = 'lesson' | 'profile' | 'class' | 'qa' | 'practice' | 'wrong' | 'report' | 'settings';

const PORT_COLORS: Record<Port, 'orange' | 'green' | 'purple'> = {
  teacher: 'orange',
  student: 'green',
  parent: 'purple',
};

const TABS_BY_PORT: Record<Port, { key: TabKey; label: string; icon: string }[]> = {
  teacher: [
    { key: 'lesson', label: '备课', icon: 'menu_book' },
    { key: 'profile', label: '画像', icon: 'person' },
    { key: 'class', label: '班级', icon: 'groups' },
    { key: 'settings', label: '设置', icon: 'settings' },
  ],
  student: [
    { key: 'qa', label: '答疑', icon: 'quiz' },
    { key: 'practice', label: '练习', icon: 'edit_note' },
    { key: 'wrong', label: '错题', icon: 'library_books' },
  ],
  parent: [
    { key: 'report', label: '报告', icon: 'analytics' },
    { key: 'profile', label: '画像', icon: 'person' },
  ],
};

const PORT_LABELS: Record<Port, string> = {
  teacher: '教师',
  student: '学生',
  parent: '家长',
};

function AppContent() {
  const [port, setPort] = useState<Port>('teacher');
  const [tab, setTab] = useState<TabKey>('lesson');
  const [welcomeKey, setWelcomeKey] = useState(0);

  const tabs = TABS_BY_PORT[port];

  // Ensure current tab is valid for the port
  const currentTab = tabs.find(t => t.key === tab) ? tab : tabs[0]?.key ?? 'lesson';

  const color = PORT_COLORS[port];

  const colorMap = {
    orange: {
      bg: 'bg-orange-500',
      text: 'text-orange-500',
      active: 'bg-orange-500 text-white',
      gradient: 'from-orange-400 to-amber-500',
    },
    green: {
      bg: 'bg-green-500',
      text: 'text-green-500',
      active: 'bg-green-500 text-white',
      gradient: 'from-green-400 to-emerald-500',
    },
    purple: {
      bg: 'bg-purple-500',
      text: 'text-purple-500',
      active: 'bg-purple-500 text-white',
      gradient: 'from-purple-400 to-violet-500',
    },
  } as const;

  const colors = colorMap[color];

  const renderPage = () => {
    switch (currentTab) {
      case 'lesson': return <LessonPlan />;
      case 'profile': return <StudentProfile />;
      case 'class': return <ClassOverview />;
      case 'qa': return <PhotoQA />;
      case 'practice': return <Practice />;
      case 'wrong': return <WrongBook />;
      case 'report': return <Report />;
      case 'settings': return <Settings />;
      default: return <LessonPlan />;
    }
  };

  return (
    <div id="container" className="min-h-screen bg-gray-50">
      <WelcomeModal key={welcomeKey} onDemoLoaded={() => { setWelcomeKey(k => k + 1); }} />

      {/* Header */}
      <header className={`bg-gradient-to-r ${colors.gradient} text-white px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">乡村课堂AI助教</h1>
            <p className="text-xs opacity-80 mt-0.5">让每一位乡村教师都有AI助手</p>
          </div>
        </div>

        {/* Port Switcher */}
        <div className="flex gap-2 mt-3">
          {(['teacher', 'student', 'parent'] as Port[]).map(p => (
            <button
              key={p}
              data-testid={`port-${p}`}
              onClick={() => {
                setPort(p);
                const portTabs = TABS_BY_PORT[p];
                setTab(portTabs[0]?.key ?? 'lesson');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                port === p
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              {PORT_LABELS[p]}
            </button>
          ))}
        </div>
      </header>

      {/* Page Content */}
      <main>
        {renderPage()}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-area-bottom">
        {tabs.map(t => {
          const isActive = currentTab === t.key;
          return (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              onClick={() => { setTab(t.key); }}
              className={`flex-1 flex flex-col items-center py-2 transition-colors ${
                isActive ? colors.text : 'text-gray-400'
              }`}
            >
              <span className="material-icons text-xl">{t.icon}</span>
              <span className="text-xs mt-0.5">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
