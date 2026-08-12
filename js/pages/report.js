/**
 * 学情报告页面逻辑（家长端）
 * 功能：周报/月报切换、统计数据、趋势图表、学科表现、教师建议
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.Report = {
    currentStudentId: null,
    reportType: 'weekly', // weekly | monthly
    students: [],
    reports: [],
    scores: [],
    profiles: [],

    async init() {
      await this.loadData();
      this.bindEvents();
      this.renderBoundChild();
      this.loadReport();
    },

    async loadData() {
      try {
        if (App.Storage && App.Storage.db) {
          // 家长端：只加载绑定的孩子数据
          const boundId = App.Storage.config.getCurrentStudentId();
          if (boundId) {
            const boundStudent = await App.Storage.db.get('students', boundId);
            this.students = boundStudent ? [boundStudent] : [];
            this.reports = await App.Storage.db.getByIndex('reports', 'by_student_type', [boundId, 'weekly']);
            const monthlyReports = await App.Storage.db.getByIndex('reports', 'by_student_type', [boundId, 'monthly']);
            this.reports = this.reports.concat(monthlyReports);
            this.scores = await App.Storage.db.getByIndex('scores', 'by_student', boundId);
            this.profiles = await App.Storage.db.getAll('profiles');
            this.profiles = this.profiles.filter(p => p.studentId === boundId);
          } else {
            // 未绑定孩子，加载全部（首次使用）
            this.students = await App.Storage.db.getAll('students');
            this.reports = await App.Storage.db.getAll('reports');
            this.scores = await App.Storage.db.getAll('scores');
            this.profiles = await App.Storage.db.getAll('profiles');
          }
        }
      } catch (e) {
        console.error('加载数据失败:', e);
      }
    },

    bindEvents() {
      const weeklyBtn = document.getElementById('weekly-report-btn');
      const monthlyBtn = document.getElementById('monthly-report-btn');
      const periodSelect = document.getElementById('report-period');

      if (weeklyBtn) weeklyBtn.addEventListener('click', () => this.switchReportType('weekly'));
      if (monthlyBtn) monthlyBtn.addEventListener('click', () => this.switchReportType('monthly'));
      if (periodSelect) periodSelect.addEventListener('change', () => this.loadReport());
    },

    /**
     * 渲染绑定的孩子信息（家长端不显示选择下拉框，直接显示孩子姓名）
     */
    renderBoundChild() {
      const select = document.getElementById('student-select');
      if (!select) return;

      const boundId = App.Storage.config.getCurrentStudentId();

      if (boundId && this.students.length > 0) {
        // 已绑定：显示孩子姓名，禁用选择
        const child = this.students[0];
        select.innerHTML = `<option value="${child.id}" selected>${child.name}（我的孩子）</option>`;
        select.disabled = true;
        this.currentStudentId = child.id;
      } else if (this.students.length === 1) {
        // 只有一个学生，直接显示
        const child = this.students[0];
        select.innerHTML = `<option value="${child.id}" selected>${child.name}</option>`;
        select.disabled = true;
        this.currentStudentId = child.id;
      } else if (this.students.length > 1) {
        // 未绑定但有多个学生，显示选择框（首次使用引导绑定）
        select.innerHTML = this.students.map(s => 
          `<option value="${s.id}">${s.name}</option>`
        ).join('');
        this.currentStudentId = this.students[0].id;
        select.addEventListener('change', (e) => {
          this.currentStudentId = parseInt(e.target.value);
          // 绑定选择的孩子
          App.Storage.config.setCurrentStudentId(this.currentStudentId);
          this.loadReport();
        });
      } else {
        select.innerHTML = '<option value="">暂无孩子数据</option>';
      }
    },

    switchReportType(type) {
      this.reportType = type;
      const weeklyBtn = document.getElementById('weekly-report-btn');
      const monthlyBtn = document.getElementById('monthly-report-btn');

      if (weeklyBtn && monthlyBtn) {
        weeklyBtn.className = type === 'weekly' ? 'btn btn-primary' : 'btn btn-secondary';
        monthlyBtn.className = type === 'monthly' ? 'btn btn-primary' : 'btn btn-secondary';
      }

      this.loadReport();
    },

    loadReport() {
      if (!this.currentStudentId) return;

      const student = this.students.find(s => s.id === this.currentStudentId);
      const profile = this.profiles.find(p => p.studentId === this.currentStudentId);
      const studentScores = this.scores.filter(s => s.studentId === this.currentStudentId);
      const report = this.reports.find(r => 
        r.studentId === this.currentStudentId && r.type === this.reportType
      );

      // 渲染统计卡片
      this.renderStats(student, studentScores, profile, report);
      // 渲染图表
      this.renderScoreTrend(studentScores);
      this.renderSubjectPerformance(studentScores);
      // 渲染分析内容
      this.renderAnalysis(student, studentScores, profile, report);
    },

    renderStats(student, scores, profile, report) {
      // 学习时长
      const studyHours = report ? report.data.studyHours : '--';
      document.getElementById('stat-study-hours').textContent = 
        studyHours !== '--' ? studyHours + '小时' : '--';

      // 作业完成率
      const homeworkCompletion = report ? report.data.homeworkCompletion : '--';
      document.getElementById('stat-homework-completion').textContent = 
        homeworkCompletion !== '--' ? homeworkCompletion + '%' : '--';

      // 平均成绩
      if (scores.length > 0) {
        const avg = (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1);
        document.getElementById('stat-average-score').textContent = avg;
      }

      // 知识点掌握
      if (profile && profile.dimensions) {
        const mastery = Math.round(profile.dimensions.reduce((a, b) => a + b, 0) / profile.dimensions.length);
        document.getElementById('stat-knowledge-mastery').textContent = mastery + '%';
      }
    },

    renderScoreTrend(scores) {
      const container = document.getElementById('score-trend-chart');
      if (!container) return;

      if (scores.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); text-align:center; padding:40px 0;">暂无成绩数据</p>';
        return;
      }

      const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
      const xData = sorted.map(s => s.date.substring(5));
      const yData = sorted.map(s => s.score);

      const option = App.EChartsHelper.areaChartOption(xData, [{ name: '成绩', data: yData }]);
      App.EChartsHelper.create(container, option);
    },

    renderSubjectPerformance(scores) {
      const container = document.getElementById('subject-performance-chart');
      if (!container) return;

      if (scores.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); text-align:center; padding:40px 0;">暂无学科数据</p>';
        return;
      }

      // 按学科分组
      const subjectGroups = {};
      scores.forEach(s => {
        if (!subjectGroups[s.subject]) subjectGroups[s.subject] = [];
        subjectGroups[s.subject].push(s.score);
      });

      const subjects = Object.keys(subjectGroups);
      const avgScores = subjects.map(s => Math.round(subjectGroups[s].reduce((a, b) => a + b, 0) / subjectGroups[s].length));

      const option = App.EChartsHelper.barChartOption(subjects, avgScores);
      App.EChartsHelper.create(container, option);
    },

    renderAnalysis(student, scores, profile, report) {
      const analysisDiv = document.getElementById('analysis-content');
      const suggestionsDiv = document.getElementById('teacher-suggestions');

      if (!analysisDiv) return;

      if (!student) {
        analysisDiv.innerHTML = '<p style="color: var(--text-tertiary);">暂无分析数据</p>';
        return;
      }

      // 学习情况分析
      let analysisHtml = '';

      if (report && report.data) {
        const data = report.data;
        analysisHtml += '<div class="analysis-section">';
        analysisHtml += `<h4 class="analysis-title">📊 学习概况</h4>`;
        analysisHtml += `<p>本${this.reportType === 'weekly' ? '周' : '月'}学习时长 <strong>${data.studyHours}小时</strong>，`;
        analysisHtml += `作业完成率 <strong>${data.homeworkCompletion}%</strong>。</p>`;

        // 各科成绩
        if (data.testScores) {
          analysisHtml += '<h4 class="analysis-title" style="margin-top:16px;">📝 各科成绩</h4>';
          analysisHtml += '<div class="score-table">';
          Object.entries(data.testScores).forEach(([subject, score]) => {
            const color = score >= 90 ? 'var(--success-color)' : score >= 75 ? 'var(--warning-color)' : 'var(--danger-color)';
            analysisHtml += `
              <div class="score-row">
                <span class="score-subject">${subject}</span>
                <span class="score-value" style="color:${color}">${score}分</span>
              </div>
            `;
          });
          analysisHtml += '</div>';
        }

        // 薄弱知识点
        if (data.weakPoints && data.weakPoints.length > 0) {
          analysisHtml += '<h4 class="analysis-title" style="margin-top:16px;">⚠️ 薄弱知识点</h4>';
          analysisHtml += '<div class="weak-points">';
          data.weakPoints.forEach(point => {
            analysisHtml += `<span class="weak-tag">${point}</span>`;
          });
          analysisHtml += '</div>';
        }

        // 趋势
        if (data.trend) {
          const trendMap = { up: '📈 上升趋势', down: '📉 下降趋势', stable: '➡️ 保持稳定' };
          analysisHtml += `<p style="margin-top:12px;">整体趋势：<strong>${trendMap[data.trend] || data.trend}</strong></p>`;
        }

        analysisHtml += '</div>';
      } else {
        // 没有报告数据时，根据成绩和画像生成简要分析
        analysisHtml += '<div class="analysis-section">';
        if (scores.length > 0) {
          const avg = (scores.reduce((s, v) => s + v.score, 0) / scores.length).toFixed(1);
          analysisHtml += `<p>近期共完成 <strong>${scores.length}</strong> 次测试，平均分 <strong>${avg}</strong> 分。</p>`;
        } else {
          analysisHtml += '<p>暂无成绩记录。</p>';
        }

        if (profile && profile.dimensions) {
          const labels = ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'];
          analysisHtml += '<h4 class="analysis-title" style="margin-top:16px;">📊 五维能力</h4>';
          analysisHtml += '<div class="dimension-bars">';
          profile.dimensions.forEach((val, i) => {
            const color = val >= 80 ? 'var(--success-color)' : val >= 60 ? 'var(--warning-color)' : 'var(--danger-color)';
            analysisHtml += `
              <div class="dimension-item">
                <span class="dimension-label">${labels[i]}</span>
                <div class="dimension-bar">
                  <div class="dimension-fill" style="width:${val}%;background:${color};"></div>
                </div>
                <span class="dimension-value">${val}</span>
              </div>
            `;
          });
          analysisHtml += '</div>';
        }
        analysisHtml += '</div>';
      }

      analysisDiv.innerHTML = analysisHtml;

      // 教师建议
      if (suggestionsDiv) {
        if (profile && profile.suggestions && profile.suggestions.length > 0) {
          suggestionsDiv.innerHTML = profile.suggestions.map(s => `
            <div class="suggestion-item">
              <span class="suggestion-icon">💡</span>
              <span>${s}</span>
            </div>
          `).join('');
        } else {
          suggestionsDiv.innerHTML = '<p style="color: var(--text-tertiary);">暂无教师建议，教师可在学生画像中为学生生成建议</p>';
        }
      }
    }
  };
})();
