/**
 * 设置页面逻辑
 * 功能：API Key配置、数据导入导出、数据清除
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.Settings = {
    init() {
      this.bindEvents();
      this.loadSettings();
    },

    bindEvents() {
      // 保存设置按钮
      const saveBtn = document.getElementById('save-settings-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveSettings());
      }

      // 测试连接按钮
      const testBtn = document.getElementById('test-connection-btn');
      if (testBtn) {
        testBtn.addEventListener('click', () => this.testConnection());
      }

      // 模型选择变化时显示/隐藏自定义输入框
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        modelSelect.addEventListener('change', () => this.toggleCustomModel());
      }

      // 导出数据按钮
      const exportBtn = document.getElementById('export-data-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportData());
      }

      // 导入数据按钮
      const importBtn = document.getElementById('import-data-btn');
      if (importBtn) {
        importBtn.addEventListener('click', () => this.importData());
      }

      // 清除数据按钮
      const clearBtn = document.getElementById('clear-data-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearData());
      }

      // ===== 云同步 =====
      // 登录 / 注册
      const loginBtn = document.getElementById('cloud-login-btn');
      if (loginBtn) loginBtn.addEventListener('click', () => this.cloudLogin());
      const registerBtn = document.getElementById('cloud-register-btn');
      if (registerBtn) registerBtn.addEventListener('click', () => this.cloudRegister());

      // 同步操作
      const pushBtn = document.getElementById('cloud-push-btn');
      if (pushBtn) pushBtn.addEventListener('click', () => this.cloudPush());
      const pullBtn = document.getElementById('cloud-pull-btn');
      if (pullBtn) pullBtn.addEventListener('click', () => this.cloudPull());
      const logoutBtn = document.getElementById('cloud-logout-btn');
      if (logoutBtn) logoutBtn.addEventListener('click', () => this.cloudLogout());

      // 忘记密码
      const forgotBtn = document.getElementById('cloud-forgot-btn');
      if (forgotBtn) forgotBtn.addEventListener('click', () => this.toggleForgotPanel());
      const fpSubmitBtn = document.getElementById('cloud-fp-submit-btn');
      if (fpSubmitBtn) fpSubmitBtn.addEventListener('click', () => this.cloudResetPassword());

      // 后端地址变化时保存
      const baseUrlInput = document.getElementById('cloud-base-url');
      if (baseUrlInput) {
        baseUrlInput.addEventListener('change', () => {
          if (App.Cloud) App.Cloud.setBaseUrl(baseUrlInput.value.trim());
        });
      }
    },

    /**
     * 切换自定义模型输入框的显示/隐藏
     */
    toggleCustomModel() {
      const modelSelect = document.getElementById('model-select');
      const customGroup = document.getElementById('custom-model-group');
      if (!modelSelect || !customGroup) return;

      if (modelSelect.value === 'custom') {
        customGroup.classList.remove('hidden');
      } else {
        customGroup.classList.add('hidden');
      }
    },

    loadSettings() {
      this.initCloudPanel();

      if (App.Storage && App.Storage.config) {
        const apiKey = App.Storage.config.getApiKey();
        const apiBaseUrl = App.Storage.config.getApiBaseUrl();
        const model = App.Storage.config.getModel();

        if (apiKey) {
          const apiKeyInput = document.getElementById('api-key');
          if (apiKeyInput) {
            apiKeyInput.value = apiKey;
          }
        }
        if (apiBaseUrl) {
          const baseUrlInput = document.getElementById('api-base-url');
          if (baseUrlInput) {
            baseUrlInput.value = apiBaseUrl;
          }
        }
        if (model) {
          const modelSelect = document.getElementById('model-select');
          if (modelSelect) {
            // 检查是否是预设模型
            const presetModels = ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-vl-max', 'qwen-vl-plus', 'deepseek-chat', 'deepseek-reasoner'];
            if (presetModels.includes(model)) {
              modelSelect.value = model;
            } else {
              // 自定义模型
              modelSelect.value = 'custom';
              const customInput = document.getElementById('custom-model');
              if (customInput) {
                customInput.value = model;
              }
            }
          }
        }
        // 初始化自定义模型输入框的显示状态
        this.toggleCustomModel();
      }
    },

    /**
     * 获取当前选择的模型名称
     */
    getModelName() {
      const modelSelect = document.getElementById('model-select');
      if (!modelSelect) return 'qwen-max';

      if (modelSelect.value === 'custom') {
        const customInput = document.getElementById('custom-model');
        return customInput ? customInput.value.trim() || 'qwen-max' : 'qwen-max';
      }
      return modelSelect.value;
    },

    async saveSettings() {
      const apiKeyInput = document.getElementById('api-key');
      const apiBaseUrlInput = document.getElementById('api-base-url');

      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      const apiBaseUrl = apiBaseUrlInput ? apiBaseUrlInput.value.trim() : '';
      const model = this.getModelName();

      if (!apiKey) {
        this.showToast('请输入 API Key', 'warning');
        return;
      }

      if (App.Storage && App.Storage.config) {
        App.Storage.config.setApiKey(apiKey);
        if (apiBaseUrl) {
          App.Storage.config.setApiBaseUrl(apiBaseUrl);
        }
        if (model) {
          App.Storage.config.setModel(model);
        }
        this.showToast('设置已保存', 'success');
      } else {
        localStorage.setItem('rural_ai_api_key', apiKey);
        localStorage.setItem('rural_ai_api_base_url', apiBaseUrl);
        localStorage.setItem('rural_ai_model', model);
        this.showToast('设置已保存', 'success');
      }
    },

    async testConnection() {
      const apiKeyInput = document.getElementById('api-key');
      const apiBaseUrlInput = document.getElementById('api-base-url');
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
      const apiBaseUrl = apiBaseUrlInput ? apiBaseUrlInput.value.trim() : '';
      const model = this.getModelName();

      if (!apiKey) {
        this.showToast('请先输入 API Key', 'warning');
        return;
      }

      const testBtn = document.getElementById('test-connection-btn');
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = '测试中...';
      }

      try {
        // 保存用户输入的配置
        if (App.Storage && App.Storage.config) {
          App.Storage.config.setApiKey(apiKey);
          if (apiBaseUrl) {
            App.Storage.config.setApiBaseUrl(apiBaseUrl);
          }
          App.Storage.config.setModel(model);
        }

        // 直接用 fetch 测试，避免依赖内部模块
        const baseUrl = apiBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: '你好' }],
            max_tokens: 20
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
          const msg = data.error?.message || `HTTP ${response.status}`;
          throw new Error(`连接失败：${msg}`);
        }

        if (!data.choices || !data.choices[0]) {
          throw new Error('API 返回格式异常，请检查 Base URL 和模型名称');
        }

        this.showToast(`连接成功！模型：${model}`, 'success');
      } catch (error) {
        console.error('测试连接失败:', error);
        let msg = error.message || '连接失败';
        if (error.name === 'AbortError') {
          msg = '请求超时（15秒），请检查 Base URL 是否正确';
        }
        this.showToast(msg, 'error');
      } finally {
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.textContent = '测试连接';
        }
      }
    },

    async exportData() {
      if (!App.Storage || !App.Storage.export) {
        this.showToast('导出功能不可用', 'error');
        return;
      }

      try {
        const data = await App.Storage.export.exportAll();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rural-ai-tutor-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('数据导出成功', 'success');
      } catch (error) {
        console.error('导出数据失败:', error);
        this.showToast('导出失败', 'error');
      }
    },

    async importData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          if (App.Storage && App.Storage.export) {
            await App.Storage.export.importAll(text);
            this.showToast('数据导入成功，页面将刷新', 'success');
            setTimeout(() => location.reload(), 1500);
          }
        } catch (error) {
          console.error('导入数据失败:', error);
          this.showToast('导入失败，请检查文件格式', 'error');
        }
      };
      input.click();
    },

    async clearData() {
      if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) {
        return;
      }

      if (!confirm('再次确认：这将删除所有学生数据、成绩记录、画像等，是否继续？')) {
        return;
      }

      try {
        if (App.Storage && App.Storage.db) {
          await App.Storage.db.clearAll();
        }
        localStorage.clear();
        this.showToast('数据已清除，页面将刷新', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (error) {
        console.error('清除数据失败:', error);
        this.showToast('清除失败', 'error');
      }
    },

    /**
     * 初始化云同步面板：填充后端地址、根据登录状态切换登录/用户面板
     */
    initCloudPanel() {
      if (!App.Cloud) return;

      const baseUrlInput = document.getElementById('cloud-base-url');
      if (baseUrlInput) baseUrlInput.value = App.Cloud.getBaseUrl();

      if (App.Cloud.isLoggedIn()) {
        this.showCloudUserPanel();
      } else {
        this.showCloudLoginPanel();
      }
    },

    /**
     * 显示已登录面板
     */
    showCloudUserPanel() {
      const loginPanel = document.getElementById('cloud-login-panel');
      const userPanel = document.getElementById('cloud-user-panel');
      if (loginPanel) loginPanel.classList.add('hidden');
      if (userPanel) userPanel.classList.remove('hidden');

      const user = App.Cloud.getCurrentUser();
      const nameEl = document.getElementById('cloud-user-name');
      const detailEl = document.getElementById('cloud-user-detail');
      const roleNames = { teacher: '教师', student: '学生', parent: '家长' };
      if (nameEl) nameEl.textContent = user ? (user.name || user.username) : '--';
      if (detailEl) {
        detailEl.textContent = user
          ? `账号：${user.username} · 身份：${roleNames[user.role] || user.role}`
          : '--';
      }
      const resultEl = document.getElementById('cloud-sync-result');
      if (resultEl) resultEl.textContent = '';

      // 渲染角色专属面板（班级邀请码 / 加入班级 / 绑定孩子）
      this.renderRolePanel();
    },

    /**
     * 显示未登录面板
     */
    showCloudLoginPanel() {
      const loginPanel = document.getElementById('cloud-login-panel');
      const userPanel = document.getElementById('cloud-user-panel');
      if (loginPanel) loginPanel.classList.remove('hidden');
      if (userPanel) userPanel.classList.add('hidden');
    },

    /**
     * 云同步按钮状态切换（禁用/恢复）
     */
    setCloudButtons(disabled, text) {
      ['cloud-push-btn', 'cloud-pull-btn', 'cloud-logout-btn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = disabled;
      });
    },

    /**
     * 登录
     */
    async cloudLogin() {
      if (!App.Cloud) {
        this.showToast('云同步模块未加载', 'error');
        return;
      }
      const username = document.getElementById('cloud-username').value.trim();
      const password = document.getElementById('cloud-password').value;
      if (!username || !password) {
        this.showToast('请输入用户名和密码', 'warning');
        return;
      }
      try {
        await App.Cloud.login(username, password);
        this.showToast('登录成功', 'success');
        this.showCloudUserPanel();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    /**
     * 注册
     */
    async cloudRegister() {
      if (!App.Cloud) {
        this.showToast('云同步模块未加载', 'error');
        return;
      }
      const username = document.getElementById('cloud-username').value.trim();
      const password = document.getElementById('cloud-password').value;
      const role = document.getElementById('cloud-role').value;
      const securityQuestion = document.getElementById('cloud-security-question').value;
      const securityAnswer = document.getElementById('cloud-security-answer').value.trim();
      if (!username || !password) {
        this.showToast('请输入用户名和密码', 'warning');
        return;
      }
      if (password.length < 6) {
        this.showToast('密码长度至少6位', 'warning');
        return;
      }
      if (securityQuestion && !securityAnswer) {
        this.showToast('请填写密保答案', 'warning');
        return;
      }
      try {
        await App.Cloud.register({ username, password, role, securityQuestion, securityAnswer });
        this.showToast('注册成功，已自动登录', 'success');
        this.showCloudUserPanel();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    /**
     * 上传本地数据到云端
     */
    async cloudPush() {
      if (!App.Sync) {
        this.showToast('同步模块未加载', 'error');
        return;
      }
      const resultEl = document.getElementById('cloud-sync-result');
      this.setCloudButtons(true);
      if (resultEl) resultEl.textContent = '正在上传...';

      try {
        const result = await App.Sync.pushAll();
        if (resultEl) {
          const detail = Object.keys(result.details).length
            ? '（' + Object.entries(result.details)
                .map(([k, v]) => {
                  if (v && typeof v === 'object') {
                    return `${k}: 新增${v.created || 0} 更新${v.updated || 0}`;
                  }
                  return `${k}: ${v}`;
                })
                .join('，') + '）'
            : '';
          resultEl.textContent = `上传完成：新增 ${result.created} 条，更新 ${result.updated} 条${detail}`;
        }
        this.showToast(`上传完成：新增 ${result.created} 条，更新 ${result.updated} 条`, 'success');
      } catch (e) {
        console.error('上传失败:', e);
        if (resultEl) resultEl.textContent = '上传失败：' + e.message;
        this.showToast('上传失败：' + e.message, 'error');
      } finally {
        this.setCloudButtons(false);
      }
    },

    /**
     * 从云端拉取数据到本地
     */
    async cloudPull() {
      if (!App.Sync) {
        this.showToast('同步模块未加载', 'error');
        return;
      }
      const resultEl = document.getElementById('cloud-sync-result');
      this.setCloudButtons(true);
      if (resultEl) resultEl.textContent = '正在从云端拉取...';

      try {
        const result = await App.Sync.pullAll();
        if (resultEl) {
          const detail = Object.keys(result.details).length
            ? '（' + Object.entries(result.details)
                .map(([k, v]) => `${k}: ${v}条`)
                .join('，') + '）'
            : '';
          resultEl.textContent = `拉取完成：共 ${result.total} 条${detail}，刷新页面后生效`;
        }
        this.showToast(`拉取完成，共 ${result.total} 条`, 'success');
      } catch (e) {
        console.error('拉取失败:', e);
        if (resultEl) resultEl.textContent = '拉取失败：' + e.message;
        this.showToast('拉取失败：' + e.message, 'error');
      } finally {
        this.setCloudButtons(false);
      }
    },

    /**
     * 退出登录
     */
    cloudLogout() {
      if (!App.Cloud) return;
      App.Cloud.logout();
      const panel = document.getElementById('cloud-role-panel');
      if (panel) panel.innerHTML = '';
      this.showToast('已退出登录', 'success');
      this.showCloudLoginPanel();
    },

    /**
     * HTML 转义
     */
    esc(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /**
     * 渲染角色专属面板：教师班级邀请码 / 学生加入班级 / 家长绑定孩子
     */
    async renderRolePanel() {
      const panel = document.getElementById('cloud-role-panel');
      if (!panel || !App.Cloud) return;
      const user = App.Cloud.getCurrentUser();
      if (!user) { panel.innerHTML = ''; return; }
      if (user.role === 'teacher') {
        await this.renderTeacherPanel(panel);
      } else if (user.role === 'student') {
        this.renderInvitePanel(panel, 'student');
      } else if (user.role === 'parent') {
        this.renderInvitePanel(panel, 'parent');
      }
    },

    /**
     * 教师面板：显示班级信息与邀请码
     */
    async renderTeacherPanel(panel) {
      panel.innerHTML = '<div style="font-size:13px;color:var(--text-tertiary);">正在加载班级信息...</div>';
      try {
        const res = await App.Cloud.myClass();
        const cls = res.data;
        if (!cls) {
          panel.innerHTML = '<div style="font-size:13px;color:var(--text-tertiary);"><i class="fas fa-info-circle"></i> 尚未创建班级，请先在班级管理中创建</div>';
          return;
        }
        panel.innerHTML = `
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">班级：<strong>${this.esc(cls.name)}</strong>${cls.grade ? '（' + this.esc(cls.grade) + '）' : ''}</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:20px;font-weight:700;letter-spacing:4px;color:var(--primary,#4A90D9);background:var(--surface-secondary,#f5f7fa);padding:8px 14px;border-radius:8px;">${this.esc(cls.invite_code || '--')}</div>
            <button class="btn btn-secondary" id="cloud-copy-invite-btn" style="font-size:13px;">复制邀请码</button>
            <button class="btn btn-secondary" id="cloud-reset-invite-btn" style="font-size:13px;">重置邀请码</button>
          </div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:6px;"><i class="fas fa-info-circle"></i> 学生/家长凭此邀请码加入班级</div>
        `;
        const copyBtn = document.getElementById('cloud-copy-invite-btn');
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyInviteCode(cls.invite_code));
        const resetBtn = document.getElementById('cloud-reset-invite-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetClassInvite());
      } catch (e) {
        panel.innerHTML = '<div style="font-size:13px;color:var(--danger,#F5222D);">' + this.esc(e.message) + '</div>';
      }
    },

    /**
     * 学生/家长面板：输入邀请码 → 查询班级 → 选择自己/孩子绑定
     */
    renderInvitePanel(panel, role) {
      const roleName = role === 'student' ? '加入班级' : '绑定孩子';
      const prompt = role === 'student'
        ? '输入教师分享的班级邀请码，加入班级并选择自己'
        : '输入教师分享的班级邀请码，选择要绑定的孩子';
      panel.innerHTML = `
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;"><strong>${roleName}</strong></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input type="text" class="form-input" id="cloud-invite-code" placeholder="请输入6位班级邀请码" style="max-width:180px;text-transform:uppercase;">
          <button class="btn btn-primary" id="cloud-invite-query-btn" style="font-size:13px;">查询</button>
        </div>
        <div style="font-size:12px;color:var(--text-tertiary);margin-top:6px;"><i class="fas fa-info-circle"></i> ${prompt}</div>
        <div id="cloud-invite-result" class="mt-md"></div>
      `;
      const queryBtn = document.getElementById('cloud-invite-query-btn');
      if (queryBtn) queryBtn.addEventListener('click', () => this.queryInvite(role));
    },

    /**
     * 查询邀请码对应的班级与可选学生列表
     */
    async queryInvite(role) {
      const codeInput = document.getElementById('cloud-invite-code');
      const resultEl = document.getElementById('cloud-invite-result');
      if (!codeInput || !resultEl || !App.Cloud) return;
      const code = codeInput.value.trim().toUpperCase();
      if (!code) { this.showToast('请输入邀请码', 'warning'); return; }
      resultEl.innerHTML = '正在查询...';
      try {
        const res = await App.Cloud.classInfo(code);
        const info = res.data;
        if (!info.students || info.students.length === 0) {
          resultEl.innerHTML = '<div style="font-size:13px;color:var(--text-tertiary);">该班级暂无学生，请联系教师添加</div>';
          return;
        }
        const list = info.students.map((s) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid var(--border-color,#eee);">
            <span>${this.esc(s.name)}${s.student_no ? '（' + this.esc(s.student_no) + '）' : ''}</span>
            <button class="btn btn-secondary" data-bind-id="${s.id}" data-bind-name="${this.esc(s.name)}" style="font-size:12px;">${role === 'student' ? '这是我' : '绑定'}</button>
          </div>
        `).join('');
        resultEl.innerHTML = `
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">班级：<strong>${this.esc(info.name)}</strong>，请选择：</div>
          ${list}
        `;
        resultEl.querySelectorAll('[data-bind-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            this.bindFromInvite(role, Number(btn.getAttribute('data-bind-id')), btn.getAttribute('data-bind-name'));
          });
        });
      } catch (e) {
        resultEl.innerHTML = '<div style="font-size:13px;color:var(--danger,#F5222D);">' + this.esc(e.message) + '</div>';
      }
    },

    /**
     * 从邀请码查询结果中绑定学生/孩子
     */
    async bindFromInvite(role, studentId, name) {
      if (!App.Cloud) return;
      try {
        if (role === 'student') {
          await App.Cloud.bindStudent(studentId);
          this.showToast('已绑定为：' + name, 'success');
        } else {
          await App.Cloud.bindChild(studentId);
          this.showToast('已绑定孩子：' + name, 'success');
        }
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    /**
     * 教师重置班级邀请码
     */
    async resetClassInvite() {
      if (!App.Cloud) return;
      try {
        await App.Cloud.resetClassInvite();
        this.showToast('邀请码已重置，旧邀请码失效', 'success');
        this.renderRolePanel();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    },

    /**
     * 复制邀请码到剪贴板
     */
    copyInviteCode(code) {
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => this.showToast('邀请码已复制', 'success'));
      } else {
        this.showToast('班级邀请码：' + code, 'info');
      }
    },

    /**
     * 切换忘记密码面板显示
     */
    toggleForgotPanel() {
      const panel = document.getElementById('cloud-forgot-panel');
      if (panel) panel.classList.toggle('hidden');
    },

    /**
     * 忘记密码：通过密保答案重置
     */
    async cloudResetPassword() {
      if (!App.Cloud) return;
      const username = document.getElementById('cloud-fp-username').value.trim();
      const securityAnswer = document.getElementById('cloud-fp-answer').value.trim();
      const newPassword = document.getElementById('cloud-fp-password').value;
      if (!username || !securityAnswer || !newPassword) {
        this.showToast('请填写完整信息', 'warning');
        return;
      }
      if (newPassword.length < 6) {
        this.showToast('新密码长度至少6位', 'warning');
        return;
      }
      try {
        await App.Cloud.resetPassword({ username, securityAnswer, newPassword });
        this.showToast('密码重置成功，请使用新密码登录', 'success');
        const panel = document.getElementById('cloud-forgot-panel');
        if (panel) panel.classList.add('hidden');
      } catch (e) {
        this.showToast(e.message, 'error');
      }
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
