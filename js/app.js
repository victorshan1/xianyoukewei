/**
 * 主应用入口文件
 */
(function() {
  'use strict';

  // 全局命名空间
  window.App = window.App || {};

  /**
   * 注册 Service Worker（离线支持）
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker 注册成功:', registration.scope);

          // 监听更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateNotification();
              }
            });
          });
        })
        .catch((error) => {
          console.warn('[App] Service Worker 注册失败:', error);
        });

      // 监听离线/在线事件
      window.addEventListener('online', () => showNetworkStatus(true));
      window.addEventListener('offline', () => showNetworkStatus(false));
    }
  }

  /**
   * 显示网络状态提示
   */
  function showNetworkStatus(online) {
    const existing = document.querySelector('.network-status-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'network-status-toast';
    toast.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      animation: toastIn 0.3s ease;
      ${online
        ? 'background: #22C55E; color: white;'
        : 'background: #F59E0B; color: white;'
      }
    `;
    toast.textContent = online ? '网络已恢复' : '当前处于离线模式，部分功能不可用';
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 显示更新提示
   */
  function showUpdateNotification() {
    const existing = document.querySelector('.update-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'update-notification';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: #3B82F6;
      color: white;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      cursor: pointer;
      animation: toastIn 0.3s ease;
    `;
    toast.textContent = '有新版本可用，点击刷新';
    toast.addEventListener('click', () => {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
      }
      window.location.reload();
    });
    document.body.appendChild(toast);
  }

  /**
   * 初始化应用
   */
  function initApp() {
    // 注册 Service Worker
    registerServiceWorker();

    // 初始化存储
    if (window.App && window.App.Storage && window.App.Storage.db) {
      window.App.Storage.db.init().then(() => {
        console.log('[App] 数据库初始化完成');

        // 优先使用演示数据模块
        if (window.App.DemoData && window.App.DemoData.needsLoad()) {
          showWelcomeModal();
        } else if (window.App.Storage.seed) {
          // 回退到旧的seed机制
          window.App.Storage.seed.needsSeed().then(needs => {
            if (needs) {
              window.App.Storage.seed.seed().then(() => {
                console.log('[App] 示例数据填充完成');
              });
            }
          });
        }
      });
    }

    // 初始化路由
    if (window.AppRouter) {
      window.AppRouter.init();
    }

    // 绑定导航事件
    bindNavigationEvents();

    // 绑定端口切换事件
    bindPortSwitchEvents();

    // 绑定设置按钮事件
    bindSettingsButton();

    // 监听页面加载事件，初始化对应页面模块
    document.addEventListener('page-loaded', function(e) {
      const route = e.detail.route;
      if (route && route.page) {
        const pageMap = {
          'settings': 'Settings',
          'lesson-plan': 'LessonPlan',
          'student-profile': 'StudentProfile',
          'class-overview': 'ClassOverview',
          'photo-qa': 'PhotoQA',
          'practice': 'Practice',
          'wrong-book': 'WrongBook',
          'report': 'Report',
          'communication': 'Communication'
        };
        const pageName = pageMap[route.page];
        if (pageName && window.App.Pages[pageName] && window.App.Pages[pageName].init) {
          window.App.Pages[pageName].init();
        }
      }
    });

    console.log('乡村课堂AI助教平台已初始化');
  }

  /**
   * 显示欢迎弹窗（首次访问时）
   */
  function showWelcomeModal() {
    const modal = document.createElement('div');
    modal.className = 'demo-welcome-overlay';
    modal.innerHTML = `
      <div class="demo-welcome-modal">
        <div class="demo-welcome-header">
          <div class="demo-welcome-icon">
            <i class="fas fa-sun"></i>
          </div>
          <h2>欢迎使用乡村课堂AI助教</h2>
          <p class="demo-welcome-subtitle">让每一堂乡村课都精彩</p>
        </div>
        <div class="demo-welcome-body">
          <div class="demo-welcome-info">
            <div class="demo-info-row">
              <i class="fas fa-school" style="color: var(--teacher-color);"></i>
              <span>云南省昭通市XX县XX镇中心小学</span>
            </div>
            <div class="demo-info-row">
              <i class="fas fa-chalkboard-teacher" style="color: var(--teacher-color);"></i>
              <span>李老师 · 四年级1班 · 45名学生</span>
            </div>
            <div class="demo-info-row">
              <i class="fas fa-calendar-alt" style="color: var(--student-color);"></i>
              <span>2025年春季学期</span>
            </div>
          </div>
          <p class="demo-welcome-desc">
            我们为您准备了一套完整的演示数据，包含 <strong>5名学生</strong> 的画像、成绩、练习记录，
            以及 <strong>3份教案</strong> 和 <strong>学情报告</strong>。
            点击"一键体验"即可立即查看完整效果。
          </p>
        </div>
        <div class="demo-welcome-actions">
          <button class="demo-btn-primary" id="demo-load-btn">
            <i class="fas fa-magic"></i> 一键体验
          </button>
          <button class="demo-btn-secondary" id="demo-skip-btn">
            稍后再说
          </button>
        </div>
        <div class="demo-welcome-footer">
          <i class="fas fa-shield-alt"></i> 所有数据仅存储在您的浏览器本地
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 动画入场
    requestAnimationFrame(() => {
      modal.classList.add('demo-welcome-show');
    });

    // 绑定事件
    document.getElementById('demo-load-btn').addEventListener('click', async function() {
      const btn = this;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在加载演示数据...';

      try {
        const result = await window.App.DemoData.load();
        console.log('[App] 演示数据加载完成', result);

        // 关闭弹窗
        modal.classList.remove('demo-welcome-show');
        setTimeout(() => modal.remove(), 300);

        // 显示成功提示
        showSuccessToast('演示数据加载成功！包含 ' + result.students + ' 名学生、' + result.lessons + ' 份教案');

        // 刷新当前页面
        const hash = window.location.hash || '#/teacher/lesson-plan';
        window.AppRouter.navigate(hash);
      } catch (err) {
        console.error('[App] 演示数据加载失败', err);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> 一键体验';
        alert('加载失败：' + err.message);
      }
    });

    document.getElementById('demo-skip-btn').addEventListener('click', function() {
      modal.classList.remove('demo-welcome-show');
      setTimeout(() => modal.remove(), 300);
    });
  }

  /**
   * 显示成功提示 Toast
   */
  function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'demo-toast demo-toast-success';
    toast.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('demo-toast-show'));

    setTimeout(() => {
      toast.classList.remove('demo-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 绑定导航点击事件
   */
  function bindNavigationEvents() {
    // 侧边栏菜单点击
    document.addEventListener('click', function(e) {
      const link = e.target.closest('.sidebar-link');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          window.AppRouter.navigate(href);
        }
      }
      
      // 底部导航点击
      const bottomNavItem = e.target.closest('.bottom-nav-item');
      if (bottomNavItem) {
        e.preventDefault();
        const page = bottomNavItem.dataset.page;
        const port = bottomNavItem.dataset.port;
        if (page && port) {
          window.AppRouter.navigate('#/' + port + '/' + page);
        }
      }
    });
  }

  /**
   * 绑定端口切换事件
   */
  function bindPortSwitchEvents() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const port = this.dataset.port;
        if (!port) return;

        // 根据端口跳转到默认页面
        const defaultPaths = {
          'teacher': '#/teacher/lesson-plan',
          'student': '#/student/photo-qa',
          'parent': '#/parent/report'
        };

        if (defaultPaths[port]) {
          window.AppRouter.navigate(defaultPaths[port]);
        }
      });
    });
  }

  /**
   * 绑定设置按钮事件
   */
  function bindSettingsButton() {
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        window.AppRouter.navigate('#/settings');
      });
    }
  }

  // DOMContentLoaded 时初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
