/**
 * 家校沟通页面逻辑（家长端）
 * 功能：场景选择、AI话术生成、复制功能、沟通技巧提示
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  // 转义 HTML，防止 XSS
  function escapeHtml(text) {
    if (typeof text !== 'string') return String(text || '');
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  App.Pages.Communication = {
    // 当前生成的话术内容
    currentScript: '',
    // 当前绑定的孩子信息
    boundChild: null,

    async init() {
      // 加载绑定的孩子信息
      await this.loadBoundChild();
      this.bindEvents();
      this.loadMessages();
    },

    /**
     * 加载绑定的孩子信息
     */
    async loadBoundChild() {
      try {
        if (App.Storage && App.Storage.db) {
          const boundId = App.Storage.config.getCurrentStudentId();
          if (boundId) {
            this.boundChild = await App.Storage.db.get('students', boundId);
          }
        }
      } catch (e) {
        console.error('加载孩子信息失败:', e);
      }
    },

    bindEvents() {
      // 生成话术按钮
      const generateBtn = document.getElementById('generate-script-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateScript());
      }

      // 复制话术按钮
      const copyBtn = document.getElementById('copy-script-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyScript());
      }

      // 场景选择变化时更新提示
      const scenarioSelect = document.getElementById('communication-scenario');
      if (scenarioSelect) {
        scenarioSelect.addEventListener('change', () => this.updateScenarioHint());
      }

      // 在线留言
      const sendBtn = document.getElementById('msg-send-btn');
      if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
      const refreshBtn = document.getElementById('msg-refresh-btn');
      if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshMessages());
      const msgInput = document.getElementById('msg-input');
      if (msgInput) {
        msgInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.sendMessage();
        });
      }
    },

    /**
     * 更新场景提示
     */
    updateScenarioHint() {
      const scenario = document.getElementById('communication-scenario').value;
      const contentTextarea = document.getElementById('communication-content');
      
      const hints = {
        'homework': '例如：想了解孩子最近作业完成的质量如何',
        'performance': '例如：想了解孩子最近在课堂上的表现和参与度',
        'behavior': '例如：孩子最近在家做作业比较拖拉，想和老師商量解决办法',
        'attendance': '例如：下周三需要带孩子看病，想请假一天',
        'activity': '例如：想了解学校运动会的安排和需要准备什么',
        'feedback': '例如：对学校的课后服务有一些建议想反馈',
        'other': '请描述您的具体需求'
      };

      if (contentTextarea && hints[scenario]) {
        contentTextarea.placeholder = hints[scenario];
      }
    },

    /**
     * 生成沟通话术
     */
    async generateScript() {
      const scenario = document.getElementById('communication-scenario').value;
      const target = document.getElementById('communication-target').value;
      const content = document.getElementById('communication-content').value.trim();

      // 验证
      if (!scenario) {
        this.showToast('请选择沟通场景', 'warning');
        return;
      }

      // 检查API Key
      const apiKey = (App.Storage && App.Storage.config) ? App.Storage.config.getApiKey() : null;
      if (!apiKey) {
        this.showToast('请先在设置页面配置 API Key', 'warning');
        return;
      }

      // 场景映射
      const scenarioMap = {
        'homework': '询问孩子作业完成情况',
        'performance': '了解孩子学习表现',
        'behavior': '沟通孩子行为问题',
        'attendance': '请假或考勤相关',
        'activity': '学校活动咨询',
        'feedback': '向学校反馈意见',
        'other': content || '其他事项'
      };

      const targetMap = {
        'teacher': '班主任',
        'subject-teacher': '科任老师',
        'principal': '校领导'
      };

      const scenarioText = scenarioMap[scenario] || scenario;
      const targetText = targetMap[target] || '老师';

      // 显示加载状态
      const generateBtn = document.getElementById('generate-script-btn');
      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></div> 生成中...';
      }

      try {
        const childName = this.boundChild ? this.boundChild.name : '我的孩子';
        const script = await App.API.text.generateCommunicationScript(
          `作为家长，我想${scenarioText}，沟通对象是${targetText}${content ? '，具体情况：' + content : ''}`,
          {
            name: childName,
            recentPerformance: '近期表现正常',
            issue: scenarioText,
            familyBackground: '普通家庭'
          }
        );

        this.currentScript = script;
        this.renderScript(script, scenarioText);

        // 显示结果区域
        const resultDiv = document.getElementById('communication-script');
        if (resultDiv) {
          resultDiv.classList.remove('hidden');
          resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        this.showToast('话术生成成功', 'success');
      } catch (error) {
        console.error('生成话术失败:', error);
        this.showToast(error.message || '生成失败，请重试', 'error');
      } finally {
        if (generateBtn) {
          generateBtn.disabled = false;
          generateBtn.innerHTML = '生成沟通话术';
        }
      }
    },

    /**
     * 渲染话术结果
     */
    renderScript(script, scenario) {
      const contentDiv = document.getElementById('script-content');
      if (!contentDiv) return;

      // 简单Markdown渲染
      let html = this.renderMarkdown(script);

      contentDiv.innerHTML = html;
    },

    /**
     * 复制话术
     */
    async copyScript() {
      if (!this.currentScript) return;

      try {
        await navigator.clipboard.writeText(this.currentScript);
        this.showToast('已复制到剪贴板', 'success');
      } catch (e) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = this.currentScript;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast('已复制到剪贴板', 'success');
      }
    },

    /**
     * 简单Markdown渲染
     */
    renderMarkdown(text) {
      if (!text) return '';
      return text
        .replace(/^### (.+)$/gm, '<h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 8px;">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="font-size: 15px; font-weight: 600; margin: 16px 0 8px;">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 style="font-size: 16px; font-weight: 600; margin: 16px 0 8px;">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.8;">')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p style="margin: 0; line-height: 1.8;">')
        .replace(/$/, '</p>');
    },

    /**
     * 加载当前孩子的留言记录（本地 + 云端拉取）
     */
    async loadMessages() {
      const listEl = document.getElementById('msg-list');
      const childInfoEl = document.getElementById('msg-child-info');
      if (!listEl) return;

      // 显示孩子信息
      if (childInfoEl && this.boundChild) {
        childInfoEl.classList.remove('hidden');
        childInfoEl.textContent = '沟通对象：' + this.boundChild.name + '（' + (this.boundChild.className || '未分班') + '）';
      } else if (childInfoEl) {
        childInfoEl.classList.add('hidden');
      }

      // 尝试从云端拉取最新消息（若已登录）
      let messages = [];
      try {
        if (App.Cloud && App.Cloud.isLoggedIn() && App.Sync) {
          await App.Sync.pullStore('messages');
        }
      } catch (e) {
        console.warn('云端拉取留言失败:', e.message);
      }

      // 读取本地消息
      try {
        if (App.Storage && App.Storage.db) {
          messages = await App.Storage.db.getAll('messages');
          const boundId = App.Storage.config.getCurrentStudentId();
          if (boundId) {
            messages = messages.filter((m) => String(m.studentId) === String(boundId));
          }
          messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        }
      } catch (e) {
        console.error('读取留言失败:', e);
      }

      this.renderMessages(messages);
    },

    /**
     * 渲染消息列表
     */
    renderMessages(messages) {
      const listEl = document.getElementById('msg-list');
      if (!listEl) return;

      if (!messages || messages.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 24px 0;">暂无消息，给老师留个言吧</div>';
        return;
      }

      const currentUser = App.Cloud ? App.Cloud.getCurrentUser() : null;
      const myId = currentUser ? currentUser.id : null;

      listEl.innerHTML = messages.map((m) => {
        const isMine = myId !== null && m.senderId === myId;
        const senderName = m.senderRole === 'teacher' ? '老师' : '我';
        const align = isMine ? 'flex-end' : 'flex-start';
        const bg = isMine ? 'var(--parent-color, #F5A623)' : 'var(--surface-secondary, #f0f2f5)';
        const color = isMine ? '#fff' : 'var(--text-primary)';
        const time = (m.createdAt || '').replace('T', ' ').slice(5, 16) || '';
        return `
          <div style="display:flex; justify-content:${align};">
            <div style="max-width:78%; background:${bg}; color:${color}; border-radius:12px; padding:10px 14px; font-size:14px; line-height:1.6; word-break:break-word;">
              <div style="font-size:11px; opacity:0.75; margin-bottom:4px;">${senderName} · ${time}</div>
              ${escapeHtml(m.content)}
            </div>
          </div>`;
      }).join('');
    },

    /**
     * 发送留言（教师可收到）
     */
    async sendMessage() {
      const inputEl = document.getElementById('msg-input');
      const statusEl = document.getElementById('msg-status');
      const content = inputEl ? inputEl.value.trim() : '';
      if (!content) {
        this.showToast('请输入留言内容', 'warning');
        return;
      }

      const boundId = App.Storage.config.getCurrentStudentId();
      if (!boundId) {
        this.showToast('未绑定孩子，请先在家长端首页选择孩子', 'warning');
        return;
      }

      if (statusEl) statusEl.textContent = '正在发送...';

      try {
        const msg = {
          studentId: Number(boundId),
          senderRole: 'parent',
          content
        };

        // 若已登录，直接同步到云端；否则先存本地，待登录后上传
        if (App.Cloud && App.Cloud.isLoggedIn()) {
          await App.Cloud.create('messages', msg);
        }

        // 写入本地
        await App.Storage.db.add('messages', Object.assign({ createdAt: new Date().toISOString() }, msg));
        if (inputEl) inputEl.value = '';
        if (statusEl) statusEl.textContent = '';
        this.showToast('留言已发送，老师登录后即可查看', 'success');
        this.loadMessages();
      } catch (e) {
        console.error('发送留言失败:', e);
        if (statusEl) statusEl.textContent = '';
        this.showToast('发送失败：' + e.message, 'error');
      }
    },

    /**
     * 手动刷新消息
     */
    async refreshMessages() {
      const statusEl = document.getElementById('msg-status');
      if (statusEl) statusEl.textContent = '正在刷新...';
      await this.loadMessages();
      if (statusEl) statusEl.textContent = '';
      this.showToast('留言已刷新', 'success');
    },

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
      const existing = document.querySelector('.toast-message');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'toast-message';
      
      const colors = {
        success: '#52C41A',
        warning: '#FA8C16',
        error: '#F5222D',
        info: '#4A90D9'
      };

      toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        font-size: 14px;
        animation: toastIn 0.3s ease;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  };
})();
