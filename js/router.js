/**
 * 路由模块 - 简单的hash路由实现
 */
(function() {
  'use strict';

  // 路由配置
  const routes = {
    // 教师端
    '#/teacher/lesson-plan': {
      page: 'lesson-plan',
      port: 'teacher',
      title: '备课助手'
    },
    '#/teacher/student-profile': {
      page: 'student-profile',
      port: 'teacher',
      title: '学生画像'
    },
    '#/teacher/class-overview': {
      page: 'class-overview',
      port: 'teacher',
      title: '班级学情总览'
    },
    '#/teacher/messages': {
      page: 'messages',
      port: 'teacher',
      title: '家校沟通'
    },
    
    // 学生端
    '#/student/photo-qa': {
      page: 'photo-qa',
      port: 'student',
      title: '拍照答疑'
    },
    '#/student/practice': {
      page: 'practice',
      port: 'student',
      title: '针对性练习'
    },
    '#/student/wrong-book': {
      page: 'wrong-book',
      port: 'student',
      title: '错题本'
    },
    
    // 家长端
    '#/parent/report': {
      page: 'report',
      port: 'parent',
      title: '学情报告'
    },
    '#/parent/communication': {
      page: 'communication',
      port: 'parent',
      title: '家校沟通'
    },
    
    // 设置
    '#/settings': {
      page: 'settings',
      port: 'settings',
      title: '设置'
    }
  };

  // 默认路由
  const defaultRoute = '#/teacher/lesson-plan';

  /**
   * 初始化路由监听
   */
  function init() {
    // 监听hash变化
    window.addEventListener('hashchange', handleRouteChange);
    
    // 初始路由
    if (!window.location.hash) {
      window.location.hash = defaultRoute;
    } else {
      handleRouteChange();
    }
  }

  /**
   * 处理路由变化
   */
  function handleRouteChange() {
    const hash = window.location.hash || defaultRoute;
    const route = routes[hash];
    
    if (!route) {
      console.warn('路由未找到:', hash);
      window.location.hash = defaultRoute;
      return;
    }
    
    // 更新页面内容
    loadPage(route);
    
    // 更新导航高亮
    updateNavigation(hash, route.port);
    
    // 切换端口主题色
    switchPortTheme(route.port);
    
    // 更新页面标题
    document.title = route.title + ' - 乡村课堂AI助教';
  }

  /**
   * 切换端口主题色
   */
  function switchPortTheme(port) {
    const body = document.body;
    
    // 移除所有端口类
    body.classList.remove('port-teacher', 'port-student', 'port-parent', 'port-settings');
    
    // 添加当前端口类
    if (port === 'teacher' || port === 'student' || port === 'parent' || port === 'settings') {
      body.classList.add('port-' + port);
    }
    
    // 更新底部导航高亮
    updateBottomNav(port);
  }

  /**
   * 更新底部导航高亮
   */
  function updateBottomNav(port) {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
      if (item.dataset.port === port) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * 加载页面内容
   * 优先使用内嵌模板（支持file://协议），回退到fetch（HTTP服务器）
   */
  function loadPage(route) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // 显示加载状态
    mainContent.innerHTML = '<div class="loading-container"><div class="spinner"></div><div>加载中...</div></div>';
    
    // 优先从内嵌模板加载（支持file://直接打开）
    function renderTemplate(html) {
      mainContent.innerHTML = html;
      // 触发页面初始化事件
      const event = new CustomEvent('page-loaded', {
        detail: { route: route }
      });
      document.dispatchEvent(event);
    }
    
    // 尝试从内嵌模板获取
    if (window.PageTemplates && window.PageTemplates[route.page]) {
      // 使用setTimeout确保DOM更新（显示加载状态）
      setTimeout(function() {
        renderTemplate(window.PageTemplates[route.page]);
      }, 50);
      return;
    }
    
    // 回退：通过fetch加载（HTTP服务器环境）
    let pagePath;
    if (route.port === 'settings') {
      pagePath = `pages/${route.page}.html`;
    } else {
      pagePath = `pages/${route.port}/${route.page}.html`;
    }
    
    fetch(pagePath)
      .then(response => {
        if (!response.ok) {
          throw new Error('页面加载失败');
        }
        return response.text();
      })
      .then(html => {
        renderTemplate(html);
      })
      .catch(error => {
        console.error('加载页面失败:', error);
        mainContent.innerHTML = '<div class="card"><div class="card-body text-center">页面加载失败，请刷新重试</div></div>';
      });
  }

  /**
   * 更新导航高亮
   */
  function updateNavigation(hash, port) {
    // 更新端口Tab
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      if (tab.dataset.port === port) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // 更新侧边栏菜单链接高亮
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    
    // 显示/隐藏侧边栏菜单项（根据端口过滤）
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      if (port === 'settings') {
        item.classList.add('hidden');
      } else if (item.dataset.port === port) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
    
    // 显示/隐藏侧边栏
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      if (port === 'settings') {
        sidebar.style.display = 'none';
      } else {
        sidebar.style.display = 'block';
      }
    }
  }

  /**
   * 编程式导航
   */
  function navigate(path) {
    if (path && !path.startsWith('#')) {
      path = '#' + path;
    }
    window.location.hash = path;
  }

  /**
   * 获取当前路由
   */
  function getCurrentRoute() {
    const hash = window.location.hash || defaultRoute;
    return routes[hash] || routes[defaultRoute];
  }

  /**
   * 获取路由配置
   */
  function getRoutes() {
    return routes;
  }

  // 导出到全局
  window.AppRouter = {
    init: init,
    navigate: navigate,
    getCurrentRoute: getCurrentRoute,
    getRoutes: getRoutes
  };
})();
