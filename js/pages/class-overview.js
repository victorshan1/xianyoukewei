/**
 * 班级学情总览页面逻辑
 * 功能：班级统计数据、成绩分布图、学习趋势图、薄弱知识点分析
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.ClassOverview = {
    // 当前选中的班级
    currentClass: 'class1',
    // 当前选中的学科
    currentSubject: 'chinese',
    // 班级数据
    classData: {
      students: [],
      scores: [],
      profiles: []
    },

    /**
     * 初始化页面
     */
    async init() {
      await this.loadClassData();
      this.bindEvents();
      this.renderStatistics();
      this.renderCharts();
    },

    /**
     * 加载班级数据
     */
    async loadClassData() {
      try {
        if (App.Storage && App.Storage.db) {
          // 加载所有学生
          const allStudents = await App.Storage.db.getAll('students');
          
          // 班级映射表（将选择框的值映射到实际的班级名称）
          const classMap = {
            'class1': '三年级1班',
            'class2': '三年级2班',
            'class3': '四年级1班',
            'class4': '五年级1班'
          };
          
          const targetClassName = classMap[this.currentClass] || '四年级1班';
          
          // 根据班级筛选学生
          this.classData.students = allStudents.filter(s => s.className === targetClassName);
          
          // 获取筛选后的学生ID列表
          const studentIds = this.classData.students.map(s => s.id);
          
          // 加载所有成绩和画像
          const allScores = await App.Storage.db.getAll('scores');
          const allProfiles = await App.Storage.db.getAll('profiles');
          
          // 筛选出属于当前班级的成绩和画像
          this.classData.scores = allScores.filter(score => studentIds.includes(score.studentId));
          this.classData.profiles = allProfiles.filter(profile => studentIds.includes(profile.studentId));
          
          // 学科映射
          const subjectMap = {
            'chinese': '语文',
            'math': '数学',
            'english': '英语'
          };
          
          const targetSubject = subjectMap[this.currentSubject];
          
          // 进一步按学科筛选成绩
          if (targetSubject) {
            this.classData.scores = this.classData.scores.filter(score => score.subject === targetSubject);
          }
        }
      } catch (e) {
        console.error('加载班级数据失败:', e);
        this.showToast('加载数据失败', 'error');
      }
    },

    /**
     * 绑定事件
     */
    bindEvents() {
      // 班级选择
      const classSelect = document.getElementById('class-select');
      if (classSelect) {
        classSelect.addEventListener('change', (e) => {
          this.currentClass = e.target.value;
          this.refreshData();
        });
      }

      // 学科选择
      const subjectSelect = document.getElementById('subject-overview');
      if (subjectSelect) {
        subjectSelect.addEventListener('change', (e) => {
          this.currentSubject = e.target.value;
          this.refreshData();
        });
      }

      // 刷新按钮
      const refreshBtn = document.getElementById('refresh-overview');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshData());
      }
    },

    /**
     * 刷新数据
     */
    async refreshData() {
      await this.loadClassData();
      this.renderStatistics();
      this.renderCharts();
      this.showToast('数据已刷新', 'success');
    },

    /**
     * 渲染统计数据
     */
    renderStatistics() {
      const students = this.classData.students;
      const scores = this.classData.scores;
      const profiles = this.classData.profiles;

      // 班级人数
      document.getElementById('stat-students').textContent = students.length;

      // 计算平均分
      if (scores.length > 0) {
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        const avgScore = (totalScore / scores.length).toFixed(1);
        document.getElementById('stat-avg-score').textContent = avgScore;
      } else {
        document.getElementById('stat-avg-score').textContent = '--';
      }

      // 作业完成率（简化：假设有成绩记录的学生都完成了作业）
      const studentsWithScores = new Set(scores.map(s => s.studentId));
      const homeworkRate = students.length > 0 
        ? Math.round((studentsWithScores.size / students.length) * 100)
        : 0;
      document.getElementById('stat-homework-rate').textContent = homeworkRate + '%';

      // 优秀率（分数 >= 90 为优秀）
      const excellentScores = scores.filter(s => s.score >= 90);
      const excellentRate = scores.length > 0
        ? Math.round((excellentScores.length / scores.length) * 100)
        : 0;
      document.getElementById('stat-excellent-rate').textContent = excellentRate + '%';
    },

    /**
     * 渲染图表
     */
    renderCharts() {
      this.renderScoreDistribution();
      this.renderLearningTrend();
      this.renderWeakPoints();
    },

    /**
     * 渲染成绩分布图
     */
    renderScoreDistribution() {
      const container = document.getElementById('score-distribution-chart');
      if (!container) return;

      const scores = this.classData.scores;
      if (scores.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); text-align:center; padding:40px 0;">暂无成绩数据</p>';
        return;
      }

      // 统计各分数段人数
      const ranges = [
        { label: '0-59', min: 0, max: 59, count: 0 },
        { label: '60-69', min: 60, max: 69, count: 0 },
        { label: '70-79', min: 70, max: 79, count: 0 },
        { label: '80-89', min: 80, max: 89, count: 0 },
        { label: '90-100', min: 90, max: 100, count: 0 }
      ];

      scores.forEach(score => {
        const range = ranges.find(r => score.score >= r.min && score.score <= r.max);
        if (range) range.count++;
      });

      const xData = ranges.map(r => r.label);
      const yData = ranges.map(r => r.count);

      const option = App.EChartsHelper.barChartOption(xData, yData, { barWidth: '60%' });
      App.EChartsHelper.create(container, option);
    },

    /**
     * 渲染学习趋势图
     */
    renderLearningTrend() {
      const container = document.getElementById('learning-trend-chart');
      if (!container) return;

      const scores = this.classData.scores;
      if (scores.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); text-align:center; padding:40px 0;">暂无趋势数据</p>';
        return;
      }

      // 按日期分组计算平均分
      const dateGroups = {};
      scores.forEach(score => {
        if (!dateGroups[score.date]) {
          dateGroups[score.date] = [];
        }
        dateGroups[score.date].push(score.score);
      });

      const trendData = Object.keys(dateGroups)
        .sort()
        .slice(-7)
        .map(date => ({
          date: date.substring(5),
          avg: Math.round(dateGroups[date].reduce((a, b) => a + b, 0) / dateGroups[date].length)
        }));

      const xData = trendData.map(t => t.date);
      const yData = trendData.map(t => t.avg);

      const option = App.EChartsHelper.areaChartOption(xData, [{ name: '平均分', data: yData }]);
      App.EChartsHelper.create(container, option);
    },

    /**
     * 渲染薄弱知识点（改为热力图）
     */
    renderWeakPoints() {
      const container = document.getElementById('weak-points-list');
      if (!container) return;

      const scores = this.classData.scores;
      if (scores.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); text-align:center; padding:40px 0;">暂无知识点数据</p>';
        return;
      }

      // 统计各知识点的平均得分率
      const knowledgeStats = {};
      scores.forEach(score => {
        if (score.knowledgePoints && score.knowledgePoints.length > 0) {
          score.knowledgePoints.forEach(kp => {
            if (!knowledgeStats[kp]) {
              knowledgeStats[kp] = { total: 0, count: 0 };
            }
            knowledgeStats[kp].total += (score.score / score.maxScore) * 100;
            knowledgeStats[kp].count++;
          });
        }
      });

      // 计算平均得分率并排序
      const knowledgeList = Object.keys(knowledgeStats)
        .map(kp => ({
          name: kp,
          avgRate: Math.round(knowledgeStats[kp].total / knowledgeStats[kp].count),
          count: knowledgeStats[kp].count
        }))
        .sort((a, b) => a.avgRate - b.avgRate);

      if (knowledgeList.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); text-align:center; padding:40px 0;">暂无知识点数据</p>';
        return;
      }

      // 创建热力图容器
      container.innerHTML = '<div id="knowledge-heatmap" style="width:100%;height:300px;"></div>';
      const heatmapContainer = document.getElementById('knowledge-heatmap');

      // 准备热力图数据
      const xLabels = knowledgeList.map(k => k.name);
      const yLabels = ['得分率'];
      const heatmapData = knowledgeList.map((k, i) => [i, 0, k.avgRate]);

      const option = App.EChartsHelper.heatmapOption(xLabels, yLabels, heatmapData);
      App.EChartsHelper.create(heatmapContainer, option);
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
