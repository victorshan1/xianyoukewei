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
        console.error('导出数据失败:', er                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         