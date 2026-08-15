/**
 * 家校沟通页面逻辑（教师端）
 * 功能：查看家长留言、回复留言
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  function escapeHtml(text) {
    if (typeof text !== 'string') return String(text || '');
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  App.Pages.Messages = {
    // 当前待回复的学生
    replyTarget: null,

    async init() {
      this.bindEvents();
      this.loadMessages();
    },

    bindEvents() {
      const refreshBtn = document.getElementById('tmsg-refresh-btn');
      if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshMessages());

      const sendBtn = document.getElementById('tmsg-reply-send-btn');
      if (sendBtn) sendBtn.addEventListener('click', () => this.sendReply());

      const cancelBtn = document.getElementById('tmsg-reply-cancel-btn');
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideReply());

      const input = document.getElementById('tmsg-reply-input');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.sendReply();
        });
      }
    },

    /**
     * 加载家长留言（本地 + 云端拉取）
     */
    async loadMessages() {
      const listEl = document.getElementById('tmsg-list');
      if (!listEl) return;

      // 从云端拉取最新消息（若已登录）
      try {
        if (App.Cloud && App.Cloud.isLoggedIn() && App.Sync) {
          await App.Sync.pullStore('messages');
        }
      } catch (e) {
        console.warn('云端拉取留言失败:', e.message);
      }

      // 读取本地消息
      let messages = [];
      try {
        if (App.Storage && App.Storage.db) {
          messages = await App.Storage.db.getAll('messages');
          messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        }
      } catch (e) {
        console.error('读取留言失败:', e);
      }

      this.renderMessages(messages);
    },

    /**
     * 渲染留言列表（按学生分组）
     */
    async renderMessages(messages) {
      const listEl = document.getElementById('tmsg-list');
      if (!listEl) return;

      if (!messages || messages.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 32px 0;">暂无家长留言</div>';
        return;
      }

      // 读取学生信息映射
      let studentMap = {};
      try {
        if (App.Storage && App.Storage.db) {
          const students = await App.Storage.db.getAll('students');
          students.forEach((s) => { studentMap[String(s.id)] = s.name; });
        }
      } catch (e) { /* ignore */ }

      // 按学生分组，每组内按时间正序
      const groups = {};
      messages.forEach((m) => {
        const key = String(m.studentId);
        if (!groups[key]) groups[key] = [];
        groups[key].push(m);
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
        const lastA = groups[a][groups[a].length - 1].createdAt || '';
        const lastB = groups[b][groups[b].length - 1].createdAt || '';
        return lastB.localeCompare(lastA);
      });

      listEl.innerHTML = sortedKeys.map((key) => {
        const msgs = groups[key];
        const studentName = studentMap[key] || ('学生 #' + key);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((m) => m.senderRole === 'parent').length;

        const preview = escapeHtml(last.content.length > 60 ? last.content.slice(0, 60) + '…' : last.content);
        const time = (last.createdAt || '').replace('T', ' ').slice(5, 16) || '';

        // 最近一条消息气泡
        const lastIsTeacher = last.senderRole === 'teacher';
        const lastBubble = lastIsTeacher
          ? '<div style="font-size:12px; color:var(--teacher-color); margin-bottom:6px;"><i class="fas fa-check-circle"></i> 已回复</div>'
          : '<div style="font-size:12px; color:#E5533C; margin-bottom:6px;"><i class="fas fa-envelope"></i> 待回复</div>';

        return `
          <div class="card" style="margin:0;">
            <div class="card-body">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                <div style="font-weight:600; font-size:15px;"><i class="fas fa-user-graduate" style="color:var(--teacher-color); margin-right:6px;"></i>${escapeHtml(studentName)}</div>
                <div style="font-size:12px; color:var(--text-tertiary);">${unread} 条家长留言 · ${time}</div>
              </div>
              ${lastBubble}
              <div style="font-size:14px; color:var(--text-secondary); margin-bottom:10px;">${preview}</div>
              <button class="btn btn-primary btn-small" data-student-id="${key}" data-student-name="${escapeHtml(studentName)}">
                <i class="fas fa-reply"></i> 查看并回复
              </button>
            </div>
          </div>`;
      }).join('');

      // 绑定回复按钮
      listEl.querySelectorAll('button[data-student-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.showReply(Number(btn.dataset.studentId), btn.dataset.studentName);
        });
      });
    },

    /**
     * 显示回复面板
     */
    showReply(studentId, studentName) {
      this.replyTarget = { studentId, studentName };
      const card = document.getElementById('tmsg-reply-card');
      const target = document.getElementById('tmsg-reply-target');
      const input = document.getElementById('tmsg-reply-input');
      if (card) card.classList.remove('hidden');
      if (target) target.textContent = '回复 ' + studentName + ' 的家长';
      if (input) {
        input.value = '';
        input.focus();
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * 隐藏回复面板
     */
    hideReply() {
      this.replyTarget = null;
      const card = document.getElementById('tmsg-reply-card');
      if (card) card.classList.add('hidden');
    },

    /**
     * 发送回复
     */
    async sendReply() {
      if (!this.replyTarget) {
        this.showToast('请先选择要回复的家长留言', 'warning');
        return;
      }

      const input = document.getElementById('tmsg-reply-input');
      const content = input ? input.value.trim() : '';
      if (!content) {
        this.showToast('请输入回复内容', 'warning');
        return;
      }

      const statusEl = document.getElementById('tmsg-status');
      if (statusEl) statusEl.textContent = '正在发送...';

      try {
        const msg = {
          studentId: this.replyTarget.studentId,
          senderRole: 'teacher',
          content
        };

        // 若已登录，同步到云端；否则存本地
        if (App.Cloud && App.Cloud.isLoggedIn()) {
          await App.Cloud.create('messages', msg);
        }
        await App.Storage.db.add('messages', Object.assign({ createdAt: new Date().toISOString() }, msg));

        if (input) input.value = '';
        if (statusEl) statusEl.textContent = '';
        this.showToast('回复已发送，家长登录后即可查看', 'success');
        this.hideReply();
        this.loadMessages();
      } catch (e) {
        console.error('回复失败:', e);
        if (statusEl) statusEl.textContent = '';
        this.showToast('回复失败：' + e.message, 'error');
      }
    },

    /**
     * 手动刷新
     */
    async refreshMessages() {
      const statusEl = document.getElementById('tmsg-status');
      if (statusEl) statusEl.textContent = '正在刷新...';
      await this.loadMessages();
      if (statusEl) statusEl.textContent = '';
      this.showToast('留言已刷新', 'success');
    },

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
