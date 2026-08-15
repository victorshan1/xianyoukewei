/**
 * 错题本页面逻辑
 * 功能：错题列表、筛选、手动添加、标记掌握、删除
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.WrongBook = {
    // 当前筛选状态
    filterSubject: '',
    filterStatus: '',
    // 全部错题数据
    allWrongAnswers: [],

    /**
     * 初始化页面
     */
    init() {
      this.bindEvents();
      this.loadData();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
      // 学科筛选
      const subjectFilter = document.getElementById('wrong-subject-filter');
      if (subjectFilter) {
        subjectFilter.addEventListener('change', (e) => {
          this.filterSubject = e.target.value;
          this.renderList();
        });
      }

      // 状态筛选按钮
      document.querySelectorAll('.wrong-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.wrong-filter-btn').forEach(b => {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-secondary');
          });
          e.target.classList.add('active', 'btn-primary');
          e.target.classList.remove('btn-secondary');
          this.filterStatus = e.target.dataset.status;
          this.renderList();
        });
      });

      // 手动添加错题
      const addBtn = document.getElementById('add-wrong-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.showAddModal());
      }
    },

    /**
     * 加载数据
     */
    async loadData() {
      const Storage = window.App.Storage;
      if (!Storage || !Storage.db) return;

      try {
        await Storage.db.init();
        // 学生端：只加载当前学生的错题
        const studentId = Storage.config.getCurrentStudentId();
        if (studentId) {
          this.allWrongAnswers = await Storage.db.getByIndex('wrong_answers', 'by_student', studentId);
        } else {
          this.allWrongAnswers = await Storage.db.getAll('wrong_answers');
        }
        this.updateStats();
        this.renderList();
      } catch (err) {
        console.error('[WrongBook] 加载数据失败', err);
      }
    },

    /**
     * 更新统计数据
     */
    updateStats() {
      const wrong = this.allWrongAnswers.filter(w => w.status === 'wrong').length;
      const mastered = this.allWrongAnswers.filter(w => w.status === 'mastered').length;
      const total = this.allWrongAnswers.length;
      const rate = total > 0 ? Math.round((mastered / total) * 100) : 0;

      const wrongEl = document.getElementById('stat-wrong-count');
      const masteredEl = document.getElementById('stat-mastered-count');
      const rateEl = document.getElementById('stat-mastery-rate');

      if (wrongEl) wrongEl.textContent = wrong;
      if (masteredEl) masteredEl.textContent = mastered;
      if (rateEl) rateEl.textContent = rate + '%';
    },

    /**
     * 渲染错题列表
     */
    renderList() {
      const container = document.getElementById('wrong-list-container');
      if (!container) return;

      // 筛选
      let filtered = this.allWrongAnswers;
      if (this.filterSubject) {
        filtered = filtered.filter(w => w.subject === this.filterSubject);
      }
      if (this.filterStatus) {
        filtered = filtered.filter(w => w.status === this.filterStatus);
      }

      // 按日期倒序
      filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="wrong-empty">
            <i class="fas fa-book-open"></i>
            <p>暂无错题记录</p>
            <p style="font-size: 13px; margin-top: 8px;">点击"手动添加"或完成练习后自动收录</p>
          </div>
        `;
        return;
      }

      let html = '';
      filtered.forEach(w => {
        const isMastered = w.status === 'mastered';
        html += `
          <div class="wrong-item ${isMastered ? 'mastered' : ''}" data-id="${w.id}">
            <div class="wrong-item-header">
              <span class="wrong-item-subject">${w.subject || '未分类'}</span>
              <span class="wrong-item-date">${w.date || w.createdAt?.substring(0, 10) || ''}</span>
            </div>
            <div class="wrong-item-question">${this.escapeHtml(w.question || '')}</div>
            ${w.myAnswer ? `
              <div class="wrong-item-answer">
                <span class="wrong-answer-wrong"><i class="fas fa-times"></i> 我的答案：${this.escapeHtml(w.myAnswer)}</span>
                ${w.correctAnswer ? `<span class="wrong-answer-correct"><i class="fas fa-check"></i> 正确答案：${this.escapeHtml(w.correctAnswer)}</span>` : ''}
              </div>
            ` : ''}
            ${w.explanation ? `
              <div class="wrong-item-explanation">
                <i class="fas fa-lightbulb" style="color: var(--primary); margin-right: 4px;"></i>
                ${this.escapeHtml(w.explanation)}
              </div>
            ` : ''}
            ${w.knowledgePoints && w.knowledgePoints.length > 0 ? `
              <div style="margin-bottom: var(--spacing-sm);">
                ${w.knowledgePoints.map(k => `<span class="wrong-item-knowledge">${this.escapeHtml(k)}</span>`).join('')}
              </div>
            ` : ''}
            ${w.knowledgePoint ? `
              <div style="margin-bottom: var(--spacing-sm);">
                <span class="wrong-item-knowledge">${this.escapeHtml(w.knowledgePoint)}</span>
              </div>
            ` : ''}
            <div class="wrong-item-actions">
              ${isMastered
                ? `<button class="btn btn-secondary btn-small" onclick="App.Pages.WrongBook.markWrong(${w.id})"><i class="fas fa-redo"></i> 重新练习</button>`
                : `<button class="btn btn-primary btn-small" onclick="App.Pages.WrongBook.markMastered(${w.id})"><i class="fas fa-check"></i> 已掌握</button>`
              }
              <button class="btn btn-secondary btn-small" onclick="App.Pages.WrongBook.deleteWrong(${w.id})"><i class="fas fa-trash-alt"></i> 删除</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    /**
     * 显示添加错题弹窗
     */
    showAddModal() {
      const template = document.getElementById('add-wrong-modal-template');
      if (!template) return;

      const clone = template.content.cloneNode(true);
      document.body.appendChild(clone);

      const saveBtn = document.getElementById('save-wrong-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveWrong());
      }
    },

    /**
     * 保存手动添加的错题
     */
    async saveWrong() {
      const subject = document.getElementById('add-wrong-subject').value;
      const question = document.getElementById('add-wrong-question').value.trim();
      const myAnswer = document.getElementById('add-wrong-answer').value.trim();
      const correctAnswer = document.getElementById('add-wrong-correct').value.trim();
      const explanation = document.getElementById('add-wrong-explanation').value.trim();
      const knowledge = document.getElementById('add-wrong-knowledge').value.trim();

      if (!subject || !question) {
        this.showToast('请填写学科和题目', 'warning');
        return;
      }

      const Storage = window.App.Storage;
      const data = {
        studentId: Storage.config.getCurrentStudentId(),
        subject,
        question,
        myAnswer,
        correctAnswer,
        explanation,
        knowledgePoints: knowledge ? [knowledge] : [],
        knowledgePoint: knowledge || '',
        status: 'wrong',
        source: 'manual',
        date: new Date().toISOString().substring(0, 10),
        createdAt: new Date().toISOString()
      };

      try {
        await Storage.db.add('wrong_answers', data);
        this.allWrongAnswers.push(data);
        this.updateStats();
        this.renderList();

        // 关闭弹窗
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.remove();

        this.showToast('错题已添加', 'success');
      } catch (err) {
        console.error('[WrongBook] 保存失败', err);
        this.showToast('保存失败', 'error');
      }
    },

    /**
     * 标记为已掌握
     */
    async markMastered(id) {
      const Storage = window.App.Storage;
      try {
        const item = this.allWrongAnswers.find(w => w.id === id);
        if (item) {
          item.status = 'mastered';
          await Storage.db.update('wrong_answers', id, item);
          this.updateStats();
          this.renderList();
          this.showToast('太棒了！已标记为掌握', 'success');
        }
      } catch (err) {
        console.error('[WrongBook] 更新失败', err);
      }
    },

    /**
     * 标记为待攻克（重新练习）
     */
    async markWrong(id) {
      const Storage = window.App.Storage;
      try {
        const item = this.allWrongAnswers.find(w => w.id === id);
        if (item) {
          item.status = 'wrong';
          await Storage.db.update('wrong_answers', id, item);
          this.updateStats();
          this.renderList();
        }
      } catch (err) {
        console.error('[WrongBook] 更新失败', err);
      }
    },

    /**
     * 删除错题
     */
    async deleteWrong(id) {
      if (!confirm('确定要删除这道错题吗？')) return;

      const Storage = window.App.Storage;
      try {
        const record = this.allWrongAnswers.find(w => w.id === id);
        // 若同步层可用，记录删除标记供云端反向删除
        if (App.Sync && App.Sync.removeLocal && record) {
          await App.Sync.removeLocal('wrong_answers', record);
        } else {
          await Storage.db.delete('wrong_answers', id);
        }
        this.allWrongAnswers = this.allWrongAnswers.filter(w => w.id !== id);
        this.updateStats();
        this.renderList();
        this.showToast('已删除', 'success');
      } catch (err) {
        console.error('[WrongBook] 删除失败', err);
      }
    },

    /**
     * 添加错题（供练习页面调用）
     */
    async addWrongAnswer(data) {
      const Storage = window.App.Storage;
      try {
        await Storage.db.add('wrong_answers', {
          ...data,
          studentId: Storage.config.getCurrentStudentId(),
          status: 'wrong',
          source: 'practice',
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('[WrongBook] 添加错题失败', err);
      }
    },

    /**
     * HTML 转义
     */
    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /**
     * 显示提示
     */
    showToast(message, type) {
      const toast = document.createElement('div');
      toast.className = `demo-toast demo-toast-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'error'}`;
      if (type === 'warning') {
        toast.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
      } else if (type === 'error') {
        toast.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
      }
      toast.style.color = 'white';
      toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'times-circle'}"></i> ${message}`;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('demo-toast-show'));
      setTimeout(() => {
        toast.classList.remove('demo-toast-show');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  };

})();
