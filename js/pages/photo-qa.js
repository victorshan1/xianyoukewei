/**
 * 拍照答疑页面逻辑
 * 功能：图片上传、语音输入、AI解析、分步展示、知识点卡片
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.PhotoQA = {
    // 当前上传的图片
    currentImage: null,
    // 当前图片的base64
    currentImageBase64: null,
    // 压缩后的图片base64（低体积，用于提交与存储）
    compressedImageBase64: null,
    // 语音识别相关
    recognition: null,
    isRecording: false,
    // 当前解析结果
    currentResult: null,

    /**
     * 初始化页面
     */
    init() {
      this.bindEvents();
      this.initSpeechRecognition();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
      // 图片上传区域点击
      const uploadArea = document.getElementById('image-upload-area');
      const imageInput = document.getElementById('image-input');
      
      if (uploadArea && imageInput) {
        uploadArea.addEventListener('click', () => imageInput.click());
        
        imageInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.handleImageUpload(e.target.files[0]);
          }
        });
      }

      // 拍照按钮（移动端）
      const cameraBtn = document.getElementById('camera-btn');
      const cameraInput = document.getElementById('camera-input');
      if (cameraBtn && cameraInput) {
        cameraBtn.addEventListener('click', () => cameraInput.click());
        cameraInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.handleImageUpload(e.target.files[0]);
          }
        });
      }

      // 移除图片按钮
      const removeBtn = document.getElementById('remove-image-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.removeImage());
      }

      // 语音输入按钮
      const voiceBtn = document.getElementById('voice-input-btn');
      if (voiceBtn) {
        voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
      }

      // 提交问题按钮
      const submitBtn = document.getElementById('submit-question-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => this.submitQuestion());
      }

      // 继续提问按钮
      const newBtn = document.getElementById('new-question-btn');
      if (newBtn) {
        newBtn.addEventListener('click', () => this.resetForm());
      }
    },

    /**
     * 初始化语音识别
     */
    initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        const voiceBtn = document.getElementById('voice-input-btn');
        if (voiceBtn) {
          voiceBtn.disabled = true;
          voiceBtn.textContent = '🎤 语音输入（浏览器不支持）';
        }
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      let finalTranscript = '';

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // 更新文本框
        const questionText = document.getElementById('question-text');
        if (questionText) {
          questionText.value = finalTranscript + interimTranscript;
        }
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.updateVoiceUI();
      };

      this.recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        this.isRecording = false;
        this.updateVoiceUI();
        this.showToast('语音识别失败，请重试', 'error');
      };
    },

    /**
     * 处理图片上传
     */
    async handleImageUpload(file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        this.showToast('请选择图片文件', 'warning');
        return;
      }

      // 验证文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('图片大小不能超过5MB', 'warning');
        return;
      }

      this.currentImage = file;

      // 读取文件 → 压缩 → 显示预览并保存 base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target.result;
        try {
          // 前端压缩，降低上传体积与 token 消耗，节省费用
          const compressedDataUrl = await this.compressImage(originalDataUrl);
          this.currentImageBase64 = compressedDataUrl.split(',')[1]; // 去掉data:image/xxx;base64,前缀
          if (!this.currentImageBase64) this.currentImageBase64 = originalDataUrl.split(',')[1];
          this.compressedImageBase64 = compressedDataUrl;
        } catch (err) {
          // 压缩失败时回退到原图
          console.warn('图片压缩失败，使用原图:', err);
          this.currentImageBase64 = originalDataUrl.split(',')[1];
        }

        // 显示预览（用压缩后的图，加载更快）
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-image');
        const uploadArea = document.getElementById('image-upload-area');
        
        if (preview && previewImg && uploadArea) {
          previewImg.src = this.compressedImageBase64 || originalDataUrl;
          preview.classList.remove('hidden');
          uploadArea.classList.add('hidden');
        }
      };
      reader.readAsDataURL(file);
    },

    /**
     * 压缩图片：等比缩放到最长边不超过 MAX_EDGE，以 JPEG 输出，降低体积
     * @param {string} dataUrl - 原图 data URL
     * @returns {Promise<string>} 压缩后的 data URL
     */
    compressImage(dataUrl, maxEdge = 1568, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            // 等比缩放，长边不超过 maxEdge
            if (Math.max(width, height) > maxEdge) {
              const ratio = maxEdge / Math.max(width, height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG 输出，白底填充（透明 PNG 转 JPEG 时避免黑底）
            const out = canvas.toDataURL('image/jpeg', quality);
            resolve(out);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = dataUrl;
      });
    },

    /**
     * 移除图片
     */
    removeImage() {
      this.currentImage = null;
      this.currentImageBase64 = null;
      this.compressedImageBase64 = null;

      const preview = document.getElementById('image-preview');
      const uploadArea = document.getElementById('image-upload-area');
      const imageInput = document.getElementById('image-input');

      if (preview) preview.classList.add('hidden');
      if (uploadArea) uploadArea.classList.remove('hidden');
      if (imageInput) imageInput.value = '';
    },

    /**
     * 切换语音输入
     */
    toggleVoiceInput() {
      if (!this.recognition) {
        this.showToast('浏览器不支持语音识别', 'warning');
        return;
      }

      if (this.isRecording) {
        this.recognition.stop();
        this.isRecording = false;
      } else {
        this.recognition.start();
        this.isRecording = true;
      }

      this.updateVoiceUI();
    },

    /**
     * 更新语音UI
     */
    updateVoiceUI() {
      const voiceBtn = document.getElementById('voice-input-btn');
      const voiceStatus = document.getElementById('voice-status');

      if (voiceBtn) {
        voiceBtn.textContent = this.isRecording ? '⏹ 停止录音' : '🎤 语音输入问题';
      }

      if (voiceStatus) {
        if (this.isRecording) {
          voiceStatus.classList.remove('hidden');
        } else {
          voiceStatus.classList.add('hidden');
        }
      }
    },

    /**
     * 提交问题
     */
    async submitQuestion() {
      // 验证输入
      if (!this.currentImageBase64) {
        this.showToast('请先上传题目图片', 'warning');
        return;
      }

      // 检查API Key
      const apiKey = (App.Storage && App.Storage.config) ? App.Storage.config.getApiKey() : null;
      if (!apiKey) {
        this.showToast('请先在设置页面配置 API Key', 'warning');
        return;
      }

      const submitBtn = document.getElementById('submit-question-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></div> AI解析中...';
      }

      try {
        // 调用API解析题目
        const result = await App.API.vision.analyzeQuestion(this.currentImageBase64);
        this.currentResult = result;
        
        // 渲染结果
        this.renderResult(result);
        
        // 保存到IndexedDB
        await this.saveToDB(result);
        
        this.showToast('解析完成', 'success');
      } catch (error) {
        console.error('解析失败:', error);
        this.showToast(error.message || '解析失败，请重试', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交问题';
        }
      }
    },

    /**
     * 渲染结果 - 分步展示
     */
    renderResult(result) {
      const resultDiv = document.getElementById('qa-result');
      const answerContent = document.getElementById('answer-content');
      const knowledgeSection = document.getElementById('knowledge-section');
      
      if (!resultDiv || !answerContent) return;

      let html = '';

      // 题目内容
      if (result.question) {
        html += `
          <div class="qa-section qa-question">
            <div class="qa-section-header">
              <span class="qa-section-icon"></span>
              <span class="qa-section-title">题目</span>
            </div>
            <div class="qa-section-content">${this.escapeHtml(result.question)}</div>
          </div>
        `;
      }

      // 答案
      if (result.answer) {
        html += `
          <div class="qa-section qa-answer">
            <div class="qa-section-header">
              <span class="qa-section-icon">✅</span>
              <span class="qa-section-title">答案</span>
            </div>
            <div class="qa-section-content answer-highlight">${this.escapeHtml(result.answer)}</div>
          </div>
        `;
      }

      // 解题步骤 - 分步展示
      if (result.steps) {
        const steps = this.parseSteps(result.steps);
        html += `
          <div class="qa-section qa-steps">
            <div class="qa-section-header">
              <span class="qa-section-icon"></span>
              <span class="qa-section-title">解题步骤</span>
            </div>
            <div class="steps-timeline">
              ${steps.map((step, index) => `
                <div class="step-item" data-step="${index + 1}">
                  <div class="step-number">${index + 1}</div>
                  <div class="step-content">
                    <div class="step-title">步骤 ${index + 1}</div>
                    <div class="step-text">${this.renderMarkdown(step)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      answerContent.innerHTML = html;
      resultDiv.classList.remove('hidden');

      // 渲染知识点卡片
      if (result.knowledgePoints && result.knowledgePoints.length > 0) {
        this.renderKnowledgeCards(result.knowledgePoints);
        knowledgeSection.style.display = 'block';
      } else {
        knowledgeSection.style.display = 'none';
      }
      
      // 滚动到结果
      setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },

    /**
     * 解析解题步骤
     */
    parseSteps(stepsText) {
      if (!stepsText) return [];
      
      // 尝试按数字序号分割（1. 2. 3. 或 步骤1 步骤2）
      const stepPatterns = [
        /(?:步骤\s*\d+|第\s*\d+\s*步)[：:]\s*/gi,
        /^\d+[\.、]\s*/gm
      ];
      
      let steps = [];
      
      // 尝试按"步骤X："分割
      if (/步骤\s*\d+/i.test(stepsText)) {
        steps = stepsText.split(/步骤\s*\d+[：:]\s*/i).filter(s => s.trim());
      }
      // 尝试按数字序号分割
      else if (/^\d+[\.、]/m.test(stepsText)) {
        steps = stepsText.split(/^\d+[\.、]\s*/gm).filter(s => s.trim());
      }
      // 按段落分割
      else {
        steps = stepsText.split(/\n\n+/).filter(s => s.trim());
      }
      
      return steps.length > 0 ? steps : [stepsText];
    },

    /**
     * 渲染知识点卡片
     */
    renderKnowledgeCards(knowledgePoints) {
      const container = document.getElementById('knowledge-cards');
      if (!container) return;

      // 知识点详细说明（根据常见知识点预定义）
      const knowledgeDetails = {
        '分数加减法': '分数加减法需要先通分，找到最小公倍数作为公分母，然后将分子相加减，最后约分。例如：1/2 + 1/3 = 3/6 + 2/6 = 5/6',
        '乘除法': '乘法是加法的简便运算，除法是乘法的逆运算。乘法口诀表是基础，除法可以用乘法口诀来验证。例如：25×4=100，100÷4=25',
        '几何图形': '常见几何图形包括三角形、四边形、圆形等。三角形内角和为180°，四边形内角和为360°。长方形周长=(长+宽)×2，面积=长×宽',
        '古诗背诵': '古诗是中国传统文化的瑰宝，背诵古诗有助于提高文学素养。学习古诗要理解诗意、体会情感、掌握写作手法',
        '组词': '组词是将单个汉字组合成词语的练习。要注意词语的搭配和语境，同一个字可以组成不同的词语，表达不同的意思',
        '写作': '写作是语文学习的重要组成部分。好的作文要有明确的主题、清晰的条理、生动的语言。平时要多读多写多积累'
      };

      let html = '<div class="knowledge-grid">';
      
      knowledgePoints.forEach((kp, index) => {
        const detail = knowledgeDetails[kp] || `${kp}是本题涉及的重要知识点，掌握这个知识点有助于解决同类问题。`;
        
        html += `
          <div class="knowledge-card" style="animation-delay: ${index * 0.1}s">
            <div class="knowledge-card-header">
              <span class="knowledge-card-icon">${this.getKnowledgeIcon(kp)}</span>
              <span class="knowledge-card-title">${this.escapeHtml(kp)}</span>
            </div>
            <div class="knowledge-card-content">${this.escapeHtml(detail)}</div>
            <div class="knowledge-card-footer">
              <button class="btn btn-small btn-secondary" onclick="App.Pages.PhotoQA.showKnowledgeDetail('${this.escapeHtml(kp)}')">
                <i class="fas fa-book-open"></i> 深入学习
              </button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    },

    /**
     * 获取知识点图标
     */
    getKnowledgeIcon(knowledgePoint) {
      const iconMap = {
        '分数': '🔢',
        '乘除法': '✖️',
        '几何图形': '📐',
        '古诗': '📜',
        '写作': '️',
        '组词': '',
        '方程': '️',
        '应用题': ''
      };
      
      for (const [key, icon] of Object.entries(iconMap)) {
        if (knowledgePoint.includes(key)) {
          return icon;
        }
      }
      
      return '📚';
    },

    /**
     * 显示知识点详情（可扩展为弹窗或新页面）
     */
    showKnowledgeDetail(knowledgePoint) {
      this.showToast(`正在加载"${knowledgePoint}"的详细讲解...`, 'info');
      // TODO: 可以跳转到知识点详解页面或打开弹窗
    },

    /**
     * 简单的Markdown渲染
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
     * HTML转义
     */
    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * 保存到IndexedDB
     */
    async saveToDB(result) {
      try {
        if (App.Storage && App.Storage.db) {
          // 获取当前学生ID，如果没有则默认为1
          const studentId = App.Storage.config.getCurrentStudentId() || 1;
          
          await App.Storage.db.add('qa_records', {
            studentId: studentId,
            // 优先存压缩后的图，减小存储体积
            imageUrl: this.compressedImageBase64 || (this.currentImageBase64 ? 'data:image/jpeg;base64,' + this.currentImageBase64 : ''),
            question: result.question || '',
            answer: result.answer || '',
            steps: result.steps || '',
            knowledgePoints: result.knowledgePoints || [],
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('保存答疑记录失败:', e);
      }
    },

    /**
     * 重置表单
     */
    resetForm() {
      this.removeImage();
      
      const questionText = document.getElementById('question-text');
      if (questionText) questionText.value = '';

      const resultDiv = document.getElementById('qa-result');
      if (resultDiv) resultDiv.classList.add('hidden');

      const knowledgeSection = document.getElementById('knowledge-section');
      if (knowledgeSection) knowledgeSection.style.display = 'none';

      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
