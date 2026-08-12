/**
 * 备课助手页面逻辑
 * 功能：模板选择、教案生成、在线编辑、分层作业
 */
(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.LessonPlan = {
    // 当前生成的教案内容
    currentPlan: '',
    // 当前生成的分层作业
    currentHomework: null,
    // 编辑前的备份
    planBackup: '',
    homeworkBackup: '',
    // 当前选中的模板
    selectedTemplate: 'new-lesson',

    /**
     * 初始化页面
     */
    init() {
      this.bindEvents();
      this.loadHistory();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
      // 表单提交 - 生成教案
      const form = document.getElementById('lesson-plan-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleGenerate();
        });
      }

      // 模板选择
      document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          card.querySelector('input[type="radio"]').checked = true;
          this.selectedTemplate = card.dataset.template;
        });
      });

      // 复制教案按钮
      const copyBtn = document.getElementById('copy-plan-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.handleCopy());
      }

      // 复制作业按钮
      const copyHwBtn = document.getElementById('copy-homework-btn');
      if (copyHwBtn) {
        copyHwBtn.addEventListener('click', () => this.handleCopyHomework());
      }

      // 编辑教案按钮
      const editBtn = document.getElementById('edit-toggle-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => this.toggleEdit('plan'));
      }

      // 编辑作业按钮
      const editHwBtn = document.getElementById('edit-homework-btn');
      if (editHwBtn) {
        editHwBtn.addEventListener('click', () => this.toggleEdit('homework'));
      }

      // 保存编辑
      const saveBtn = document.getElementById('save-edit-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveEdit('plan'));
      }

      // 取消编辑
      const cancelBtn = document.getElementById('cancel-edit-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.cancelEdit('plan'));
      }

      // 保存作业编辑
      const saveHwBtn = document.getElementById('save-homework-edit-btn');
      if (saveHwBtn) {
        saveHwBtn.addEventListener('click', () => this.saveEdit('homework'));
      }

      // 取消作业编辑
      const cancelHwBtn = document.getElementById('cancel-homework-edit-btn');
      if (cancelHwBtn) {
        cancelHwBtn.addEventListener('click', () => this.cancelEdit('homework'));
      }

      // 编辑器工具栏按钮
      this.bindToolbar('editor-toolbar');
      this.bindToolbar('homework-toolbar');
    },

    /**
     * 绑定编辑器工具栏
     */
    bindToolbar(toolbarId) {
      const toolbar = document.getElementById(toolbarId);
      if (!toolbar) return;

      toolbar.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // 防止失去焦点
        btn.addEventListener('click', () => {
          const cmd = btn.dataset.cmd;
          const value = btn.dataset.value || null;
          if (cmd) {
            document.execCommand(cmd, false, value);
          }
        });
      });
    },

    /**
     * 处理生成教案
     */
    async handleGenerate() {
      // 获取表单数据
      const subject = document.getElementById('subject').value;
      const grade = document.getElementById('grade').value;
      const topic = document.getElementById('topic').value;
      const duration = document.getElementById('duration').value;
      const objectives = document.getElementById('objectives').value;
      const requirements = document.getElementById('requirements').value;

      if (!subject || !grade || !topic) {
        this.showToast('请填写学科、年级和课题名称', 'warning');
        return;
      }

      // 检查API Key
      const apiKey = (App.Storage && App.Storage.config) ? App.Storage.config.getApiKey() : null;
      if (!apiKey) {
        this.showToast('请先在设置页面配置 API Key', 'warning');
        return;
      }

      // 显示加载状态
      this.showLoading(true);

      try {
        // 获取选中的模板
        const templateRadio = document.querySelector('input[name="lesson-template"]:checked');
        const templateType = templateRadio ? templateRadio.value : 'new-lesson';

        // 调用API生成教案（带模板类型）
        const plan = await App.API.text.generateLessonPlan(subject, grade, topic, templateType);
        this.currentPlan = plan;

        // 调用API生成分层作业
        const homework = await App.API.text.generateHomework(subject, grade, topic);
        this.currentHomework = homework;

        // 渲染结果
        this.renderResult(plan, homework);

        // 保存到IndexedDB
        await this.saveToDB(subject, grade, topic, duration, plan, homework, templateType);

        this.showToast('教案生成成功！', 'success');
      } catch (error) {
        console.error('生成教案失败:', error);
        this.showToast(error.message || '生成失败，请重试', 'error');
      } finally {
        this.showLoading(false);
      }
    },

    /**
     * 渲染生成结果
     */
    renderResult(plan, homework) {
      const resultDiv = document.getElementById('lesson-plan-result');
      const planContent = document.getElementById('plan-content');
      const homeworkContent = document.getElementById('homework-content');

      if (!resultDiv || !planContent) return;

      // 渲染教案（Markdown转HTML）
      planContent.innerHTML = this.renderMarkdown(plan);

      // 渲染分层作业
      if (homeworkContent) {
        homeworkContent.innerHTML = this.renderHomework(homework);
      }

      // 确保预览模式显示
      document.getElementById('plan-preview').classList.remove('hidden');
      document.getElementById('plan-editor').classList.add('hidden');
      document.getElementById('homework-preview').classList.remove('hidden');
      document.getElementById('homework-editor').classList.add('hidden');

      resultDiv.classList.remove('hidden');

      // 滚动到结果
      setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },

    /**
     * 渲染分层作业
     */
    renderHomework(homework) {
      if (!homework) return '';

      let html = '';

      if (homework.basic) {
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="font-size: 15px; font-weight: 700; color: #22C55E; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">';
        html += '<i class="fas fa-book-open" style="font-size: 14px;"></i> 基础题';
        html += '</h3>';
        html += '<div style="padding: 16px; background: linear-gradient(135deg, #F0FDF4, #DCFCE7); border-radius: 12px; border-left: 3px solid #22C55E;">';
        html += this.renderMarkdown(homework.basic);
        html += '</div></div>';
      }

      if (homework.advanced) {
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="font-size: 15px; font-weight: 700; color: #F59E0B; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">';
        html += '<i class="fas fa-book" style="font-size: 14px;"></i> 提高题';
        html += '</h3>';
        html += '<div style="padding: 16px; background: linear-gradient(135deg, #FFFBEB, #FEF3C7); border-radius: 12px; border-left: 3px solid #F59E0B;">';
        html += this.renderMarkdown(homework.advanced);
        html += '</div></div>';
      }

      if (homework.extended) {
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="font-size: 15px; font-weight: 700; color: #3B82F6; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">';
        html += '<i class="fas fa-book-reader" style="font-size: 14px;"></i> 拓展题';
        html += '</h3>';
        html += '<div style="padding: 16px; background: linear-gradient(135deg, #EFF6FF, #DBEAFE); border-radius: 12px; border-left: 3px solid #3B82F6;">';
        html += this.renderMarkdown(homework.extended);
        html += '</div></div>';
      }

      return html;
    },

    /**
     * 简单的Markdown渲染
     */
    renderMarkdown(text) {
      if (!text) return '';
      return text
        .replace(/^### (.+)$/gm, '<h3 style="font-size: 15px; font-weight: 700; margin: 14px 0 8px;">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 style="font-size: 17px; font-weight: 700; margin: 18px 0 10px;">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 style="font-size: 20px; font-weight: 700; margin: 20px 0 10px;">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^\- (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.8;">$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li style="margin: 4px 0; line-height: 1.8;">$1</li>')
        .replace(/\n\n/g, '</p><p style="margin: 10px 0; line-height: 2;">')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p style="margin: 0; line-height: 2;">')
        .replace(/$/, '</p>');
    },

    /**
     * 切换编辑模式
     */
    toggleEdit(type) {
      if (type === 'plan') {
        const preview = document.getElementById('plan-preview');
        const editor = document.getElementById('plan-editor');
        const editable = document.getElementById('plan-editable');
        const toggleBtn = document.getElementById('edit-toggle-btn');

        if (editor.classList.contains('hidden')) {
          // 切换到编辑模式
          this.planBackup = document.getElementById('plan-content').innerHTML;
          editable.innerHTML = this.planBackup;
          preview.classList.add('hidden');
          editor.classList.remove('hidden');
          toggleBtn.innerHTML = '<i class="fas fa-eye"></i> 预览';
          editable.focus();
        } else {
          // 切换到预览模式
          preview.classList.remove('hidden');
          editor.classList.add('hidden');
          toggleBtn.innerHTML = '<i class="fas fa-edit"></i> 编辑';
        }
      } else if (type === 'homework') {
        const preview = document.getElementById('homework-preview');
        const editor = document.getElementById('homework-editor');
        const editable = document.getElementById('homework-editable');
        const toggleBtn = document.getElementById('edit-homework-btn');

        if (editor.classList.contains('hidden')) {
          this.homeworkBackup = document.getElementById('homework-content').innerHTML;
          editable.innerHTML = this.homeworkBackup;
          preview.classList.add('hidden');
          editor.classList.remove('hidden');
          toggleBtn.innerHTML = '<i class="fas fa-eye"></i> 预览';
          editable.focus();
        } else {
          preview.classList.remove('hidden');
          editor.classList.add('hidden');
          toggleBtn.innerHTML = '<i class="fas fa-edit"></i> 编辑';
        }
      }
    },

    /**
     * 保存编辑
     */
    saveEdit(type) {
      if (type === 'plan') {
        const editable = document.getElementById('plan-editable');
        const content = document.getElementById('plan-content');
        content.innerHTML = editable.innerHTML;

        // 更新内存中的数据
        this.currentPlan = editable.innerText;

        this.toggleEdit('plan');
        this.showToast('教案已保存', 'success');
      } else if (type === 'homework') {
        const editable = document.getElementById('homework-editable');
        const content = document.getElementById('homework-content');
        content.innerHTML = editable.innerHTML;

        this.toggleEdit('homework');
        this.showToast('作业已保存', 'success');
      }
    },

    /**
     * 取消编辑
     */
    cancelEdit(type) {
      if (type === 'plan') {
        this.toggleEdit('plan');
      } else if (type === 'homework') {
        this.toggleEdit('homework');
      }
    },

    /**
     * 保存到IndexedDB
     */
    async saveToDB(subject, grade, topic, duration, plan, homework, templateType) {
      try {
        if (App.Storage && App.Storage.db) {
          await App.Storage.db.add('lessons', {
            subject: subject,
            grade: grade,
            topic: topic,
            duration: duration,
            content: plan,
            homeworkLevels: homework,
            templateType: templateType || 'new-lesson',
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('保存教案到数据库失败:', e);
      }
    },

    /**
     * 处理复制教案
     */
    async handleCopy() {
      if (!this.currentPlan) return;

      try {
        const text = this.currentPlan;
        await navigator.clipboard.writeText(text);
        this.showToast('教案已复制到剪贴板', 'success');
      } catch (e) {
        const textarea = document.createElement('textarea');
        textarea.value = this.currentPlan;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast('教案已复制到剪贴板', 'success');
      }
    },

    /**
     * 处理复制作业
     */
    async handleCopyHomework() {
      if (!this.currentHomework) return;

      try {
        let text = '分层作业\n\n';
        if (this.currentHomework.basic) text += '【基础题】\n' + this.currentHomework.basic + '\n\n';
        if (this.currentHomework.advanced) text += '【提高题】\n' + this.currentHomework.advanced + '\n\n';
        if (this.currentHomework.extended) text += '【拓展题】\n' + this.currentHomework.extended + '\n\n';

        await navigator.clipboard.writeText(text);
        this.showToast('作业已复制到剪贴板', 'success');
      } catch (e) {
        this.showToast('复制失败', 'error');
      }
    },

    /**
     * 加载历史记录
     */
    async loadHistory() {
      try {
        if (!App.Storage || !App.Storage.db) return;

        const lessons = await App.Storage.db.getAll('lessons');

        if (!lessons || lessons.length === 0) {
          return;
        }

        // 按创建时间倒序排列，取最近5条
        const recentLessons = lessons
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        // 在页面上显示历史记录提示
        const historyDiv = document.createElement('div');
        historyDiv.className = 'card';
        historyDiv.style.marginTop = '20px';

        let historyHtml = '<div class="card-header"><h2 class="card-title"><i class="fas fa-history"></i> 最近生成的教案</h2></div>';
        historyHtml += '<div class="card-body">';
        historyHtml += '<ul style="list-style: none; padding: 0;">';

        recentLessons.forEach(lesson => {
          const date = new Date(lesson.createdAt).toLocaleDateString('zh-CN');
          const templateNames = {
            'new-lesson': '新授课',
            'review': '复习课',
            'experiment': '实验课',
            'commentary': '讲评课'
          };
          const templateName = templateNames[lesson.templateType] || '新授课';

          historyHtml += `<li style="padding: 12px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;"
            onclick="App.Pages.LessonPlan.loadLessonDetail(${lesson.id})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${this.escapeHtml(lesson.topic)}</strong>
                <span style="margin-left: 10px; color: var(--text-secondary); font-size: 14px;">
                  ${lesson.subject} · ${lesson.grade}
                </span>
                <span style="margin-left: 8px; padding: 2px 8px; background: var(--teacher-bg, #FFF5F0); color: var(--primary); border-radius: 12px; font-size: 12px;">
                  ${templateName}
                </span>
              </div>
              <span style="color: var(--text-tertiary); font-size: 13px;">${date}</span>
            </div>
          </li>`;
        });

        historyHtml += '</ul>';
        historyHtml += `<p style="margin-top: 12px; color: var(--text-tertiary); font-size: 13px;">
          共 ${lessons.length} 条历史记录
        </p>`;
        historyHtml += '</div>';

        historyDiv.innerHTML = historyHtml;

        // 插入到结果区域之后
        const resultDiv = document.getElementById('lesson-plan-result');
        if (resultDiv && resultDiv.parentNode) {
          resultDiv.parentNode.insertBefore(historyDiv, resultDiv.nextSibling);
        }

      } catch (error) {
        console.warn('加载历史记录失败:', error);
      }
    },

    /**
     * 加载教案详情
     */
    async loadLessonDetail(lessonId) {
      try {
        if (!App.Storage || !App.Storage.db) return;

        const lesson = await App.Storage.db.get('lessons', lessonId);
        if (!lesson) {
          this.showToast('教案不存在', 'error');
          return;
        }

        // 更新当前教案数据
        this.currentPlan = lesson.content;
        this.currentHomework = lesson.homeworkLevels;

        // 渲染结果
        this.renderResult(lesson.content, lesson.homeworkLevels);

        this.showToast('已加载教案详情', 'success');

      } catch (error) {
        console.error('加载教案详情失败:', error);
        this.showToast('加载失败', 'error');
      }
    },

    /**
     * HTML转义
     */
    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * 显示/隐藏加载状态
     */
    showLoading(show) {
      const form = document.getElementById('lesson-plan-form');
      const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

      if (submitBtn) {
        if (show) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div><span>AI正在生成中...</span>';
        } else {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-magic"></i> 生成教学方案';
        }
      }
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
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
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

      if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
          @keyframes toastIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  };
})();
