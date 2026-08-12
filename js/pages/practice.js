/**
 * 针对性练习页面逻辑
 * 功能：练习设置、题目生成、答题交互、结果统计
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.Practice = {
    // 当前练习数据
    currentPractice: null,
    // 用户答案
    userAnswers: [],
    // 练习开始时间
    startTime: null,

    /**
     * 初始化页面
     */
    init() {
      this.bindEvents();
    },

    /**
     * 绑定事件
     */
    bindEvents() {
      // 开始练习按钮
      const startBtn = document.getElementById('start-practice-btn');
      if (startBtn) {
        startBtn.addEventListener('click', () => this.startPractice());
      }

      // 提交答案按钮
      const submitBtn = document.getElementById('submit-practice-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => this.submitPractice());
      }

      // 再来一组按钮
      const newBtn = document.getElementById('new-practice-btn');
      if (newBtn) {
        newBtn.addEventListener('click', () => this.resetPractice());
      }
    },

    /**
     * 开始练习
     */
    async startPractice() {
      // 获取设置
      const subject = document.getElementById('practice-subject').value;
      const grade = document.getElementById('practice-grade').value;
      const difficulty = document.getElementById('practice-difficulty').value;
      const count = parseInt(document.getElementById('practice-count').value);
      const topic = document.getElementById('practice-topic').value.trim();

      // 验证
      if (!subject || !grade) {
        this.showToast('请选择学科和年级', 'warning');
        return;
      }

      // 检查API Key
      const apiKey = (App.Storage && App.Storage.config) ? App.Storage.config.getApiKey() : null;
      if (!apiKey) {
        this.showToast('请先在设置页面配置 API Key', 'warning');
        return;
      }

      // 映射难度
      const difficultyMap = {
        'easy': 2,
        'medium': 3,
        'hard': 4,
        'adaptive': 3
      };
      const difficultyLevel = difficultyMap[difficulty] || 3;

      // 确定知识点
      const knowledgePoint = topic || this.getDefaultKnowledgePoint(subject);

      // 显示加载状态
      const startBtn = document.getElementById('start-practice-btn');
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block;"></div> 生成题目中...';
      }

      try {
        // 调用API生成题目
        const questions = await App.API.text.generatePracticeQuestions(
          knowledgePoint,
          difficultyLevel,
          count
        );

        // 保存练习数据
        this.currentPractice = {
          subject,
          grade,
          difficulty,
          knowledgePoint,
          questions,
          startTime: new Date()
        };

        this.userAnswers = new Array(questions.length).fill(null);
        this.startTime = Date.now();

        // 渲染题目
        this.renderQuestions(questions);

        // 显示题目区域
        const questionsDiv = document.getElementById('practice-questions');
        if (questionsDiv) {
          questionsDiv.classList.remove('hidden');
        }

        // 隐藏设置区域
        const settingsCard = document.querySelector('.card');
        if (settingsCard) {
          settingsCard.style.display = 'none';
        }

        // 滚动到题目
        questionsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

        this.showToast('题目生成成功，开始答题吧！', 'success');
      } catch (error) {
        console.error('生成题目失败:', error);
        this.showToast(error.message || '生成失败，请重试', 'error');
      } finally {
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.innerHTML = '开始练习';
        }
      }
    },

    /**
     * 获取默认知识点
     */
    getDefaultKnowledgePoint(subject) {
      const defaults = {
        '语文': '阅读理解',
        '数学': '应用题',
        '英语': '语法',
        '物理': '力学',
        '化学': '化学反应'
      };
      return defaults[subject] || '综合';
    },

    /**
     * 渲染题目
     */
    renderQuestions(questions) {
      const container = document.getElementById('questions-container');
      const progressBadge = document.getElementById('progress-badge');
      
      if (!container) return;

      if (progressBadge) {
        progressBadge.textContent = `0/${questions.length}`;
      }

      let html = '';
      questions.forEach((q, index) => {
        html += `
          <div class="question-item" data-index="${index}">
            <div class="question-header">
              <span class="question-number">第 ${index + 1} 题</span>
              <span class="question-type">${q.options ? '选择题' : '填空题'}</span>
            </div>
            <div class="question-content">${this.escapeHtml(q.question)}</div>
            <div class="question-options">
        `;

        if (q.options && q.options.length > 0) {
          // 选择题
          q.options.forEach((option, optIndex) => {
            const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D
            html += `
              <label class="option-label">
                <input type="radio" name="question-${index}" value="${optionLabel}" onchange="App.Pages.Practice.selectAnswer(${index}, '${optionLabel}')">
                <span class="option-text">${this.escapeHtml(option)}</span>
              </label>
            `;
          });
        } else {
          // 填空题
          html += `
            <textarea class="form-textarea" placeholder="请输入答案" onchange="App.Pages.Practice.selectAnswer(${index}, this.value)"></textarea>
          `;
        }

        html += `
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    /**
     * 选择答案
     */
    selectAnswer(questionIndex, answer) {
      this.userAnswers[questionIndex] = answer;

      // 更新进度
      const answeredCount = this.userAnswers.filter(a => a !== null).length;
      const progressBadge = document.getElementById('progress-badge');
      if (progressBadge && this.currentPractice) {
        progressBadge.textContent = `${answeredCount}/${this.currentPractice.questions.length}`;
      }
    },

    /**
     * 提交练习
     */
    async submitPractice() {
      if (!this.currentPractice) return;

      // 检查是否所有题目都已作答
      const unanswered = this.userAnswers.filter(a => a === null).length;
      if (unanswered > 0) {
        const confirmSubmit = confirm(`还有 ${unanswered} 题未作答，确定提交吗？`);
        if (!confirmSubmit) return;
      }

      const submitBtn = document.getElementById('submit-practice-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '批改中...';
      }

      try {
        // 计算结果
        const results = this.gradePractice();
        
        // 显示结果
        this.renderResults(results);

        // 保存到数据库
        await this.saveToDB(results);

        // 隐藏题目区域
        const questionsDiv = document.getElementById('practice-questions');
        if (questionsDiv) {
          questionsDiv.classList.add('hidden');
        }

        // 显示结果区域
        const resultDiv = document.getElementById('practice-result');
        if (resultDiv) {
          resultDiv.classList.remove('hidden');
          resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        this.showToast('提交成功！', 'success');
      } catch (error) {
        console.error('提交失败:', error);
        this.showToast('提交失败，请重试', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '提交答案';
        }
      }
    },

    /**
     * 批改练习
     */
    gradePractice() {
      const questions = this.currentPractice.questions;
      let correctCount = 0;
      const details = [];

      questions.forEach((q, index) => {
        const userAnswer = this.userAnswers[index];
        const correctAnswer = q.answer;
        const isCorrect = this.compareAnswers(userAnswer, correctAnswer);

        if (isCorrect) correctCount++;

        details.push({
          question: q.question,
          userAnswer: userAnswer || '未作答',
          correctAnswer: correctAnswer,
          explanation: q.explanation || '',
          knowledgePoint: q.knowledgePoint || '',
          isCorrect
        });
      });

      const totalTime = Math.round((Date.now() - this.startTime) / 1000); // 秒
      const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

      return {
        totalQuestions: questions.length,
        correctCount,
        wrongCount: questions.length - correctCount,
        accuracy,
        totalTime,
        details
      };
    },

    /**
     * 比较答案
     */
    compareAnswers(userAnswer, correctAnswer) {
      if (!userAnswer || !correctAnswer) return false;
      
      // 去除空格和标点，转为小写比较
      const normalize = (str) => {
        return str.replace(/[\s,.;:!?，。；：！？]/g, '').toLowerCase();
      };

      return normalize(userAnswer) === normalize(correctAnswer);
    },

    /**
     * 渲染结果
     */
    renderResults(results) {
      // 更新统计数据
      document.getElementById('correct-count').textContent = results.correctCount;
      document.getElementById('wrong-count').textContent = results.wrongCount;
      document.getElementById('accuracy-rate').textContent = results.accuracy + '%';

      // 渲染详细解析
      const detailDiv = document.getElementById('result-detail');
      if (!detailDiv) return;

      let html = '<h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">答题解析</h3>';

      results.details.forEach((detail, index) => {
        const statusClass = detail.isCorrect ? 'correct' : 'wrong';
        const statusIcon = detail.isCorrect ? '✓' : '✗';
        const statusText = detail.isCorrect ? '回答正确' : '回答错误';

        html += `
          <div class="result-item ${statusClass}">
            <div class="result-header">
              <span class="result-number">第 ${index + 1} 题</span>
              <span class="result-status ${statusClass}">${statusIcon} ${statusText}</span>
            </div>
            <div class="result-question">${this.escapeHtml(detail.question)}</div>
            <div class="result-answers">
              <div class="answer-row">
                <span class="answer-label">你的答案：</span>
                <span class="answer-value ${statusClass}">${this.escapeHtml(detail.userAnswer)}</span>
              </div>
              <div class="answer-row">
                <span class="answer-label">正确答案：</span>
                <span class="answer-value correct">${this.escapeHtml(detail.correctAnswer)}</span>
              </div>
            </div>
            ${detail.explanation ? `
              <div class="result-explanation">
                <strong>解析：</strong>${this.escapeHtml(detail.explanation)}
              </div>
            ` : ''}
            ${detail.knowledgePoint ? `
              <div class="result-knowledge">
                <span class="knowledge-tag">${this.escapeHtml(detail.knowledgePoint)}</span>
              </div>
            ` : ''}
          </div>
        `;
      });

      detailDiv.innerHTML = html;
    },

    /**
     * 保存到数据库
     */
    async saveToDB(results) {
      try {
        if (App.Storage && App.Storage.db) {
          // 获取当前学生ID，如果没有则默认为1
          const studentId = App.Storage.config.getCurrentStudentId() || 1;
          
          await App.Storage.db.add('practice_records', {
            studentId: studentId,
            knowledgePoint: this.currentPractice.knowledgePoint,
            difficulty: this.currentPractice.difficulty,
            totalQuestions: results.totalQuestions,
            correctCount: results.correctCount,
            timeSpent: results.totalTime,
            details: results.details,
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('保存练习记录失败:', e);
      }
    },

    /**
     * 重置练习
     */
    resetPractice() {
      this.currentPractice = null;
      this.userAnswers = [];
      this.startTime = null;

      // 隐藏结果区域
      const resultDiv = document.getElementById('practice-result');
      if (resultDiv) {
        resultDiv.classList.add('hidden');
      }

      // 显示设置区域
      const settingsCard = document.querySelector('.card');
      if (settingsCard) {
        settingsCard.style.display = 'block';
      }

      // 清空表单
      document.getElementById('practice-topic').value = '';

      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
