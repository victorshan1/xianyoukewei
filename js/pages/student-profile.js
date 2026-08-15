/**
 * 学生画像页面逻辑
 * 功能：学生列表展示、五维雷达图、归因分析、个性化建议、数据录入
 */

(function() {
  'use strict';

  window.App = window.App || {};
  App.Pages = App.Pages || {};

  App.Pages.StudentProfile = {
    // 当前选中的学生
    currentStudent: null,
    // 当前学生的画像数据
    currentProfile: null,
    // 所有学生列表
    students: [],
    // 所有画像数据
    profiles: [],

    /**
     * 初始化页面
     */
    async init() {
      await this.loadData();
      this.bindEvents();
      this.renderStudentList();
    },

    /**
     * 加载数据
     */
    async loadData() {
      try {
        if (App.Storage && App.Storage.db) {
          this.students = await App.Storage.db.getAll('students');
          this.profiles = await App.Storage.db.getAll('profiles');
        }
      } catch (e) {
        console.error('加载数据失败:', e);
        this.showToast('加载数据失败', 'error');
      }
    },

    /**
     * 绑定事件
     */
    bindEvents() {
      // 搜索框
      const searchInput = document.getElementById('student-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.handleSearch(e.target.value);
        });
      }

      // 添加学生按钮
      const addBtn = document.getElementById('add-student-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.showAddStudentModal());
      }

      // 生成建议按钮
      const generateBtn = document.getElementById('generate-suggestions-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateSuggestions());
      }

      // 录入成绩按钮
      const addScoreBtn = document.getElementById('add-score-btn');
      if (addScoreBtn) {
        addScoreBtn.addEventListener('click', () => this.showAddScoreModal());
      }

      // 导出学生按钮
      const exportBtn = document.getElementById('export-students-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportStudents());
      }

      // 导入学生按钮
      const importBtn = document.getElementById('import-students-btn');
      if (importBtn) {
        importBtn.addEventListener('click', () => this.importStudents());
      }
    },

    /**
     * 处理搜索
     */
    handleSearch(keyword) {
      const filtered = this.students.filter(s => 
        s.name.toLowerCase().includes(keyword.toLowerCase())
      );
      this.renderStudentList(filtered);
    },

    /**
     * 渲染学生列表
     */
    renderStudentList(students = this.students) {
      const listContainer = document.getElementById('student-list');
      if (!listContainer) return;

      if (students.length === 0) {
        listContainer.innerHTML = '<div class="loading-container"><p style="color: var(--text-tertiary);">暂无学生数据</p></div>';
        return;
      }

      const html = students.map(student => {
        const profile = this.profiles.find(p => p.studentId === student.id);
        const avgScore = profile ? Math.round(profile.dimensions.reduce((a, b) => a + b, 0) / profile.dimensions.length) : 0;
        
        return `
          <div class="student-item ${this.currentStudent && this.currentStudent.id === student.id ? 'active' : ''}" 
               data-student-id="${student.id}">
            <div class="student-info">
              <div class="student-name">${student.name}</div>
              <div class="student-meta">${student.className || ''} | 综合得分: ${avgScore}</div>
            </div>
            <div class="student-actions">
              <button class="btn-icon" title="录入成绩" onclick="event.stopPropagation(); App.Pages.StudentProfile.showAddScoreModal(${student.id})">📝</button>
              <button class="btn-icon" title="编辑学生" onclick="event.stopPropagation(); App.Pages.StudentProfile.showEditStudentModal(${student.id})">✏️</button>
              <button class="btn-icon" title="删除学生" onclick="event.stopPropagation(); App.Pages.StudentProfile.deleteStudent(${student.id})">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      listContainer.innerHTML = html;

      // 绑定点击事件
      listContainer.querySelectorAll('.student-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-icon')) return;
          const studentId = parseInt(item.dataset.studentId);
          this.selectStudent(studentId);
        });
      });
    },

    /**
     * 选择学生
     */
    async selectStudent(studentId) {
      const student = this.students.find(s => s.id === studentId);
      if (!student) return;

      this.currentStudent = student;
      this.currentProfile = this.profiles.find(p => p.studentId === studentId);

      // 更新列表高亮
      document.querySelectorAll('.student-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.studentId) === studentId);
      });

      // 渲染画像
      this.renderProfile();
    },

    /**
     * 渲染学生画像
     */
    async renderProfile() {
      const profileContent = document.getElementById('profile-content');
      const profileName = document.getElementById('profile-student-name');
      const addScoreBtn = document.getElementById('add-score-btn');
      
      if (!profileContent || !profileName) return;

      if (!this.currentStudent) {
        profileName.textContent = '学生画像';
        if (addScoreBtn) addScoreBtn.style.display = 'none';
        profileContent.innerHTML = `
          <div class="chart-placeholder">
            <div>
              <p style="font-size: 48px; margin-bottom: var(--spacing-md);">📊</p>
              <p>请从左侧选择一位学生查看画像</p>
            </div>
          </div>
        `;
        return;
      }

      profileName.textContent = `${this.currentStudent.name} - 学习画像`;
      if (addScoreBtn) addScoreBtn.style.display = 'inline-block';

      // 获取学生成绩数据
      const scores = await App.Storage.db.getByIndex('scores', 'by_student', this.currentStudent.id);
      
      // 如果没有画像数据但有成绩数据，自动生成画像
      if (!this.currentProfile && scores.length > 0) {
        await this.autoGenerateProfile(scores);
        this.currentProfile = this.profiles.find(p => p.studentId === this.currentStudent.id);
      }

      if (!this.currentProfile) {
        profileContent.innerHTML = `
          <div class="chart-placeholder">
            <div>
              <p style="font-size: 48px; margin-bottom: var(--spacing-md);">📋</p>
              <p>暂无该学生的画像数据</p>
              <p style="font-size: 13px; color: var(--text-tertiary); margin-top: 8px;">请先录入成绩或点击生成画像</p>
              <button class="btn btn-primary" style="margin-top: 16px;" onclick="App.Pages.StudentProfile.generateSuggestions()">生成画像</button>
            </div>
          </div>
        `;
        return;
      }

      const profile = this.currentProfile;
      const dimensions = profile.dimensions || [0, 0, 0, 0, 0];
      const dimensionLabels = ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'];

      let html = `
        <div class="profile-section">
          <h3 class="section-title">五维能力雷达图</h3>
          <div id="radar-chart" style="width:100%;height:320px;"></div>
        </div>

        <div class="profile-section">
          <h3 class="section-title">成绩趋势</h3>
          <div id="score-trend-chart" style="width:100%;height:240px;"></div>
        </div>

        <div class="profile-section">
          <h3 class="section-title">归因分析</h3>
          <div class="attribution-list">
      `;

      // 归因分析
      if (profile.attribution && profile.attribution.items) {
        profile.attribution.items.forEach(item => {
          const percentage = Math.round(item.probability * 100);
          html += `
            <div class="attribution-item">
              <div class="attribution-label">${item.reason}</div>
              <div class="attribution-bar">
                <div class="attribution-fill" style="width: ${percentage}%"></div>
              </div>
              <div class="attribution-value">${percentage}%</div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>

        <div class="profile-section">
          <h3 class="section-title">知识点掌握情况</h3>
          <div id="knowledge-mastery">
            ${this.renderKnowledgeMastery(scores)}
          </div>
        </div>

        <div class="profile-section">
          <h3 class="section-title">成长轨迹</h3>
          <div id="growth-timeline">
            ${this.renderGrowthTimeline(scores)}
          </div>
        </div>

        <div class="profile-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 class="section-title" style="margin: 0;">个性化建议</h3>
            <button class="btn btn-secondary btn-small" id="generate-suggestions-btn">AI生成建议</button>
          </div>
          <div class="suggestions-list" id="suggestions-list">
      `;

      // 建议列表
      if (profile.suggestions && profile.suggestions.length > 0) {
        profile.suggestions.forEach((suggestion, index) => {
          html += `
            <div class="suggestion-item">
              <span class="suggestion-icon">💡</span>
              <span>${suggestion}</span>
            </div>
          `;
        });
      } else {
        html += '<p style="color: var(--text-tertiary);">暂无建议，点击"AI生成建议"按钮生成</p>';
      }

      html += `
          </div>
        </div>
      `;

      profileContent.innerHTML = html;

      // 绘制雷达图
      this.drawRadarChart(dimensions, dimensionLabels);

      // 绘制成绩趋势图
      this.renderScoreTrendECharts(scores);
      
      // 重新绑定生成建议按钮事件
      const generateBtn = document.getElementById('generate-suggestions-btn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateSuggestions());
      }
    },

    /**
     * 自动生成画像（基于成绩数据）
     */
    async autoGenerateProfile(scores) {
      if (scores.length === 0) return;

      // 计算五维得分
      const dimensions = this.calculateDimensions(scores);
      
      // 生成归因分析
      const attribution = this.generateAttribution(scores);
      
      // 生成初步建议
      const suggestions = this.generateInitialSuggestions(scores, dimensions);

      const newProfile = {
        studentId: this.currentStudent.id,
        dimensions: dimensions,
        attribution: attribution,
        suggestions: suggestions,
        updatedAt: new Date().toISOString()
      };

      await App.Storage.db.add('profiles', newProfile);
      this.profiles.push(newProfile);
    },

    /**
     * 计算五维得分
     */
    calculateDimensions(scores) {
      if (scores.length === 0) return [0, 0, 0, 0, 0];

      // 1. 知识掌握：平均分
      const avgScore = scores.reduce((sum, s) => sum + (s.score / s.maxScore * 100), 0) / scores.length;
      
      // 2. 学习习惯：作业完成率（假设作业类型为"作业"）
      const homeworkScores = scores.filter(s => s.type === '作业');
      const homeworkRate = homeworkScores.length > 0 
        ? homeworkScores.filter(s => s.score >= 60).length / homeworkScores.length * 100
        : 70; // 默认值
      
      // 3. 思维能力：高分题比例（>=80分）
      const highScores = scores.filter(s => s.score >= 80).length;
      const thinkingScore = (highScores / scores.length) * 100;
      
      // 4. 实践应用：应用题得分（假设知识点包含"应用"的题）
      const applicationScores = scores.filter(s => 
        s.knowledgePoints && s.knowledgePoints.some(kp => kp.includes('应用'))
      );
      const applicationScore = applicationScores.length > 0
        ? applicationScores.reduce((sum, s) => sum + (s.score / s.maxScore * 100), 0) / applicationScores.length
        : 70;
      
      // 5. 进步趋势：最近3次成绩 vs 之前成绩
      const sortedScores = [...scores].sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentScores = sortedScores.slice(0, 3);
      const olderScores = sortedScores.slice(3);
      
      let trendScore = 70; // 默认
      if (recentScores.length > 0 && olderScores.length > 0) {
        const recentAvg = recentScores.reduce((sum, s) => sum + (s.score / s.maxScore * 100), 0) / recentScores.length;
        const olderAvg = olderScores.reduce((sum, s) => sum + (s.score / s.maxScore * 100), 0) / olderScores.length;
        const diff = recentAvg - olderAvg;
        trendScore = Math.max(0, Math.min(100, 70 + diff)); // 基础70分，根据差距调整
      }

      return [
        Math.round(avgScore),
        Math.round(homeworkRate),
        Math.round(thinkingScore),
        Math.round(applicationScore),
        Math.round(trendScore)
      ];
    },

    /**
     * 生成归因分析
     */
    generateAttribution(scores) {
      const items = [];
      
      // 分析错题原因
      const lowScores = scores.filter(s => s.score < 80);
      
      if (lowScores.length === 0) {
        items.push({ reason: '表现优秀', probability: 1.0 });
      } else {
        // 粗心大意：分数在70-79之间
        const carelessCount = lowScores.filter(s => s.score >= 70).length;
        if (carelessCount > 0) {
          items.push({ reason: '粗心大意', probability: carelessCount / lowScores.length * 0.6 });
        }
        
        // 概念不清：分数在60-69之间
        const conceptCount = lowScores.filter(s => s.score >= 60 && s.score < 70).length;
        if (conceptCount > 0) {
          items.push({ reason: '概念不清', probability: conceptCount / lowScores.length * 0.5 });
        }
        
        // 练习不足：分数<60
        const practiceCount = lowScores.filter(s => s.score < 60).length;
        if (practiceCount > 0) {
          items.push({ reason: '练习不足', probability: practiceCount / lowScores.length * 0.7 });
        }
        
        // 审题不仔细：默认补充
        if (items.length > 0 && items.length < 4) {
          const remaining = 1 - items.reduce((sum, item) => sum + item.probability, 0);
          if (remaining > 0.05) {
            items.push({ reason: '审题不仔细', probability: remaining });
          }
        }
      }

      return { items };
    },

    /**
     * 生成初步建议
     */
    generateInitialSuggestions(scores, dimensions) {
      const suggestions = [];
      const dimensionLabels = ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'];
      
      // 找出最弱的维度
      const minIndex = dimensions.indexOf(Math.min(...dimensions));
      const weakDimension = dimensionLabels[minIndex];
      
      if (weakDimension === '知识掌握') {
        suggestions.push('建议加强基础知识的理解和记忆，可以通过制作知识卡片、定期复习来巩固。');
      } else if (weakDimension === '学习习惯') {
        suggestions.push('建议制定规律的学习计划，养成按时完成作业的好习惯，家长可以协助监督。');
      } else if (weakDimension === '思维能力') {
        suggestions.push('建议多做思考性题目，遇到难题先独立思考，培养分析问题和解决问题的能力。');
      } else if (weakDimension === '实践应用') {
        suggestions.push('建议多做应用题，将所学知识运用到实际生活中，提高知识迁移能力。');
      } else if (weakDimension === '进步趋势') {
        suggestions.push('近期成绩有波动，建议保持稳定学习节奏，避免临时抱佛脚。');
      }

      // 根据错题知识点给出建议
      const knowledgePoints = {};
      scores.forEach(score => {
        if (score.knowledgePoints) {
          score.knowledgePoints.forEach(kp => {
            if (!knowledgePoints[kp]) knowledgePoints[kp] = { total: 0, count: 0 };
            knowledgePoints[kp].total += score.score / score.maxScore * 100;
            knowledgePoints[kp].count++;
          });
        }
      });

      const weakKPs = Object.entries(knowledgePoints)
        .map(([kp, data]) => ({ kp, avg: data.total / data.count }))
        .filter(item => item.avg < 75)
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 2);

      if (weakKPs.length > 0) {
        suggestions.push(`薄弱知识点：${weakKPs.map(k => k.kp).join('、')}，建议针对性练习。`);
      }

      return suggestions;
    },

    /**
     * 渲染成绩趋势图
     */
    renderScoreTrend(scores) {
      if (scores.length === 0) {
        return '<p style="color: var(--text-tertiary); text-align: center; padding: 40px 0;">暂无成绩数据</p>';
      }

      // 按日期排序
      const sortedScores = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date));
      const maxScore = 100;
      const chartHeight = 180;
      const chartWidth = 100; // 百分比
      
      // 计算每个点的位置
      const points = sortedScores.map((score, index) => {
        const x = (index / Math.max(sortedScores.length - 1, 1)) * chartWidth;
        const y = chartHeight - (score.score / score.maxScore * chartHeight);
        return { x, y, score: score.score, date: score.date, subject: score.subject };
      });

      // 生成SVG路径
      const pathData = points.map((point, index) => {
        return `${index === 0 ? 'M' : 'L'} ${point.x}% ${point.y}px`;
      }).join(' ');

      let svg = `
        <svg width="100%" height="${chartHeight}" style="overflow: visible;">
          <!-- 网格线 -->
          <line x1="0" y1="0" x2="100%" y2="0" stroke="#E8E8E8" stroke-width="1"/>
          <line x1="0" y1="${chartHeight/2}" x2="100%" y2="${chartHeight/2}" stroke="#E8E8E8" stroke-width="1"/>
          <line x1="0" y1="${chartHeight}" x2="100%" y2="${chartHeight}" stroke="#E8E8E8" stroke-width="1"/>
          
          <!-- 折线 -->
          <path d="${pathData}" fill="none" stroke="#4A90D9" stroke-width="2"/>
      `;

      // 添加数据点
      points.forEach(point => {
        svg += `
          <circle cx="${point.x}%" cy="${point.y}px" r="4" fill="#4A90D9"/>
          <title>${point.date} ${point.subject}: ${point.score}分</title>
        `;
      });

      svg += '</svg>';

      // 添加日期标签
      const labels = points.map(point => {
        return `<span style="position: absolute; left: ${point.x}%; bottom: -20px; transform: translateX(-50%); font-size: 11px; color: var(--text-tertiary);">${point.date.slice(5)}</span>`;
      }).join('');

      return `<div style="position: relative; padding-bottom: 25px;">${svg}${labels}</div>`;
    },

    /**
     * 渲染成长轨迹时间轴
     */
    renderGrowthTimeline(scores) {
      if (scores.length === 0) {
        return '<p style="color: var(--text-tertiary); text-align: center; padding: 20px 0;">暂无成绩数据，请先录入成绩</p>';
      }

      // 按日期排序，取最近 8 次
      const sorted = [...scores].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-8);
      
      let html = '<div class="growth-timeline">';
      
      sorted.forEach((score, index) => {
        const percentage = Math.round(score.score / score.maxScore * 100);
        const trend = index > 0 ? percentage - Math.round(sorted[index - 1].score / sorted[index - 1].maxScore * 100) : 0;
        const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
        const trendColor = trend > 0 ? '#52C41A' : trend < 0 ? '#F5222D' : '#8C8C8C';
        
        html += `
          <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-date">${score.date}</span>
                <span class="timeline-subject">${score.subject}</span>
                <span class="timeline-type">${score.type}</span>
              </div>
              <div class="timeline-score">
                <span class="score-value">${score.score}</span>
                <span class="score-max">/${score.maxScore}</span>
                <span class="score-percentage">${percentage}%</span>
                ${index > 0 ? `<span class="score-trend" style="color: ${trendColor}">${trendIcon} ${Math.abs(trend)}%</span>` : ''}
              </div>
              ${score.knowledgePoints && score.knowledgePoints.length > 0 ? `
                <div class="timeline-knowledge">
                  <span class="knowledge-label">知识点：</span>
                  ${score.knowledgePoints.map(kp => `<span class="knowledge-tag">${kp}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      
      return html;
    },

    /**
     * 渲染知识点掌握情况
     */
    renderKnowledgeMastery(scores) {
      if (scores.length === 0) {
        return '<p style="color: var(--text-tertiary);">暂无知识点数据</p>';
      }

      // 统计每个知识点的掌握情况
      const knowledgeMap = {};
      scores.forEach(score => {
        if (score.knowledgePoints) {
          score.knowledgePoints.forEach(kp => {
            if (!knowledgeMap[kp]) {
              knowledgeMap[kp] = { total: 0, count: 0 };
            }
            knowledgeMap[kp].total += score.score / score.maxScore * 100;
            knowledgeMap[kp].count++;
          });
        }
      });

      // 转换为数组并排序
      const knowledgeList = Object.entries(knowledgeMap)
        .map(([kp, data]) => ({
          name: kp,
          mastery: Math.round(data.total / data.count)
        }))
        .sort((a, b) => b.mastery - a.mastery);

      if (knowledgeList.length === 0) {
        return '<p style="color: var(--text-tertiary);">暂无知识点数据</p>';
      }

      // 生成HTML
      let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
      knowledgeList.forEach(item => {
        const color = item.mastery >= 80 ? '#52C41A' : item.mastery >= 60 ? '#FA8C16' : '#F5222D';
        html += `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 100px; font-size: 13px; color: var(--text-secondary);">${item.name}</div>
            <div style="flex: 1; height: 20px; background: var(--bg-primary); border-radius: 10px; overflow: hidden;">
              <div style="height: 100%; width: ${item.mastery}%; background: ${color}; border-radius: 10px; transition: width 0.5s ease;"></div>
            </div>
            <div style="width: 40px; text-align: right; font-size: 13px; font-weight: 500; color: var(--text-primary);">${item.mastery}%</div>
          </div>
        `;
      });
      html += '</div>';

      return html;
    },

    /**
     * 绘制雷达图
     */
    drawRadarChart(values, labels) {
      const container = document.getElementById('radar-chart');
      if (!container || !window.echarts) return;

      const indicators = labels.map(l => ({ name: l, max: 100 }));
      const option = App.EChartsHelper.radarChartOption(indicators, values, { name: '能力值' });
      App.EChartsHelper.create(container, option);
    },

    /**
     * 用 ECharts 渲染成绩趋势
     */
    renderScoreTrendECharts(scores) {
      const container = document.getElementById('score-trend-chart');
      if (!container || !window.echarts) return;

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

    /**
     * 生成个性化建议
     */
    async generateSuggestions() {
      if (!this.currentStudent) {
        this.showToast('请先选择学生', 'warning');
        return;
      }

      const apiKey = (App.Storage && App.Storage.config) ? App.Storage.config.getApiKey() : null;
      if (!apiKey) {
        this.showToast('请先在设置页面配置 API Key', 'warning');
        return;
      }

      const btn = document.getElementById('generate-suggestions-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '生成中...';
      }

      try {
        // 获取学生成绩数据
        const scores = await App.Storage.db.getByIndex('scores', 'by_student', this.currentStudent.id);
        
        const profileData = {
          name: this.currentStudent.name,
          grade: this.currentStudent.grade,
          className: this.currentStudent.className,
          performance: scores.reduce((acc, score) => {
            if (!acc[score.subject]) {
              acc[score.subject] = [];
            }
            acc[score.subject].push(score.score);
            return acc;
          }, {}),
          currentProfile: this.currentProfile
        };

        const suggestions = await App.API.text.generateSuggestions(profileData);
        
        // 更新画像数据
        if (this.currentProfile) {
          this.currentProfile.suggestions = [suggestions];
          this.currentProfile.updatedAt = new Date().toISOString();
          await App.Storage.db.update('profiles', this.currentStudent.id, this.currentProfile);
        } else {
          // 创建新的画像
          const newProfile = {
            studentId: this.currentStudent.id,
            dimensions: [70, 70, 70, 70, 70],
            attribution: {
              items: [
                { reason: '需要更多数据', probability: 1.0 }
              ]
            },
            suggestions: [suggestions],
            updatedAt: new Date().toISOString()
          };
          await App.Storage.db.add('profiles', newProfile);
          this.currentProfile = newProfile;
        }

        // 重新加载数据并渲染
        await this.loadData();
        this.renderProfile();
        
        this.showToast('建议生成成功', 'success');
      } catch (error) {
        console.error('生成建议失败:', error);
        this.showToast(error.message || '生成失败，请重试', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'AI生成建议';
        }
      }
    },

    /**
     * 显示添加学生模态框
     */
    showAddStudentModal() {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">添加学生</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="add-student-form">
              <div class="form-group">
                <label class="form-label">姓名</label>
                <input type="text" class="form-input" id="student-name" required>
              </div>
              <div class="form-group">
                <label class="form-label">年级</label>
                <select class="form-select" id="student-grade" required>
                  <option value="一年级">一年级</option>
                  <option value="二年级">二年级</option>
                  <option value="三年级" selected>三年级</option>
                  <option value="四年级">四年级</option>
                  <option value="五年级">五年级</option>
                  <option value="六年级">六年级</option>
                  <option value="七年级">七年级</option>
                  <option value="八年级">八年级</option>
                  <option value="九年级">九年级</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">班级</label>
                <input type="text" class="form-input" id="student-class" value="1班" required>
              </div>
              <div class="form-group">
                <label class="form-label">学号</label>
                <input type="text" class="form-input" id="student-no" placeholder="可选">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" id="confirm-add-student">确定</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 绑定确定按钮
      document.getElementById('confirm-add-student').addEventListener('click', async () => {
        const name = document.getElementById('student-name').value.trim();
        const grade = document.getElementById('student-grade').value;
        const className = document.getElementById('student-class').value.trim();
        const studentNo = document.getElementById('student-no').value.trim();

        if (!name) {
          this.showToast('请输入学生姓名', 'warning');
          return;
        }

        try {
          const newStudent = {
            name,
            grade,
            className: `${grade}${className}`,
            studentNo: studentNo || '',
            createdAt: new Date().toISOString()
          };

          const id = await App.Storage.db.add('students', newStudent);
          newStudent.id = id;
          
          this.students.push(newStudent);
          this.renderStudentList();
          
          modal.remove();
          this.showToast('添加成功', 'success');
        } catch (error) {
          console.error('添加学生失败:', error);
          this.showToast('添加失败', 'error');
        }
      });
    },

    /**
     * 显示编辑学生模态框
     */
    showEditStudentModal(studentId) {
      const student = this.students.find(s => s.id === studentId);
      if (!student) {
        this.showToast('学生不存在', 'error');
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">编辑学生信息</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="edit-student-form">
              <div class="form-group">
                <label class="form-label">姓名</label>
                <input type="text" class="form-input" id="edit-student-name" value="${student.name}" required>
              </div>
              <div class="form-group">
                <label class="form-label">年级</label>
                <select class="form-select" id="edit-student-grade" required>
                  <option value="一年级" ${student.grade === '一年级' ? 'selected' : ''}>一年级</option>
                  <option value="二年级" ${student.grade === '二年级' ? 'selected' : ''}>二年级</option>
                  <option value="三年级" ${student.grade === '三年级' ? 'selected' : ''}>三年级</option>
                  <option value="四年级" ${student.grade === '四年级' ? 'selected' : ''}>四年级</option>
                  <option value="五年级" ${student.grade === '五年级' ? 'selected' : ''}>五年级</option>
                  <option value="六年级" ${student.grade === '六年级' ? 'selected' : ''}>六年级</option>
                  <option value="七年级" ${student.grade === '七年级' ? 'selected' : ''}>七年级</option>
                  <option value="八年级" ${student.grade === '八年级' ? 'selected' : ''}>八年级</option>
                  <option value="九年级" ${student.grade === '九年级' ? 'selected' : ''}>九年级</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">班级</label>
                <input type="text" class="form-input" id="edit-student-class" value="${student.className || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">学号</label>
                <input type="text" class="form-input" id="edit-student-no" value="${student.studentNo || ''}" placeholder="可选">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" id="confirm-edit-student">保存</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 绑定保存按钮
      document.getElementById('confirm-edit-student').addEventListener('click', async () => {
        const name = document.getElementById('edit-student-name').value.trim();
        const grade = document.getElementById('edit-student-grade').value;
        const className = document.getElementById('edit-student-class').value.trim();
        const studentNo = document.getElementById('edit-student-no').value.trim();

        if (!name) {
          this.showToast('请输入学生姓名', 'warning');
          return;
        }

        try {
          // 更新学生信息
          student.name = name;
          student.grade = grade;
          student.className = `${grade}${className}`;
          student.studentNo = studentNo;
          student.updatedAt = new Date().toISOString();

          await App.Storage.db.update('students', student.id, student);
          
          // 更新当前选中的学生
          if (this.currentStudent && this.currentStudent.id === student.id) {
            this.currentStudent = student;
          }
          
          this.renderStudentList();
          modal.remove();
          this.showToast('更新成功', 'success');
        } catch (error) {
          console.error('更新学生失败:', error);
          this.showToast('更新失败', 'error');
        }
      });
    },

    /**
     * 本地删除记录；若同步层可用则同时记录删除标记，供云端反向删除
     */
    async deleteLocal(storeName, record) {
      if (App.Sync && App.Sync.removeLocal) {
        await App.Sync.removeLocal(storeName, record);
      } else if (record && record.id !== undefined) {
        await App.Storage.db.delete(storeName, record.id);
      }
    },

    /**
     * 删除学生
     */
    async deleteStudent(studentId) {
      const student = this.students.find(s => s.id === studentId);
      if (!student) {
        this.showToast('学生不存在', 'error');
        return;
      }

      if (!confirm(`确定要删除学生"${student.name}"吗？\n\n删除后，该学生的所有成绩记录和画像数据也将被删除，此操作不可恢复。`)) {
        return;
      }

      try {
        // 删除学生记录（同步删除云端）
        await this.deleteLocal('students', student);

        // 删除相关的成绩记录
        const scores = await App.Storage.db.getByIndex('scores', 'by_student', studentId);
        for (const score of scores) {
          await this.deleteLocal('scores', score);
        }
        
        // 删除相关的画像数据
        const profile = this.profiles.find(p => p.studentId === studentId);
        if (profile) {
          await this.deleteLocal('profiles', profile);
        }

        // 更新本地数据
        this.students = this.students.filter(s => s.id !== studentId);
        this.profiles = this.profiles.filter(p => p.studentId !== studentId);
        
        // 如果删除的是当前选中的学生，清空画像显示
        if (this.currentStudent && this.currentStudent.id === studentId) {
          this.currentStudent = null;
          this.currentProfile = null;
          this.renderProfile();
        }

        this.renderStudentList();
        this.showToast('删除成功', 'success');
      } catch (error) {
        console.error('删除学生失败:', error);
        this.showToast('删除失败', 'error');
      }
    },

    /**
     * 显示录入成绩模态框
     */
    showAddScoreModal(studentId) {
      const student = studentId 
        ? this.students.find(s => s.id === studentId)
        : this.currentStudent;

      if (!student) {
        this.showToast('请先选择学生', 'warning');
        return;
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">录入成绩 - ${student.name}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="add-score-form">
              <div class="form-group">
                <label class="form-label">学科</label>
                <select class="form-select" id="score-subject" required>
                  <option value="语文">语文</option>
                  <option value="数学">数学</option>
                  <option value="英语">英语</option>
                  <option value="物理">物理</option>
                  <option value="化学">化学</option>
                  <option value="生物">生物</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">类型</label>
                <select class="form-select" id="score-type" required>
                  <option value="作业">作业</option>
                  <option value="测验">测验</option>
                  <option value="考试">考试</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">分数</label>
                <input type="number" class="form-input" id="score-value" min="0" max="100" required>
              </div>
              <div class="form-group">
                <label class="form-label">满分</label>
                <input type="number" class="form-input" id="score-max" value="100" min="1" required>
              </div>
              <div class="form-group">
                <label class="form-label">知识点（用逗号分隔）</label>
                <input type="text" class="form-input" id="score-knowledge" placeholder="例如：加减法,应用题">
              </div>
              <div class="form-group">
                <label class="form-label">日期</label>
                <input type="date" class="form-input" id="score-date" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" id="confirm-add-score">确定</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 绑定确定按钮
      document.getElementById('confirm-add-score').addEventListener('click', async () => {
        const subject = document.getElementById('score-subject').value;
        const type = document.getElementById('score-type').value;
        const score = parseInt(document.getElementById('score-value').value);
        const maxScore = parseInt(document.getElementById('score-max').value);
        const knowledgeStr = document.getElementById('score-knowledge').value;
        const date = document.getElementById('score-date').value;

        const knowledgePoints = knowledgeStr 
          ? knowledgeStr.split(/[,，]/).map(k => k.trim()).filter(k => k)
          : [];

        try {
          const newScore = {
            studentId: student.id,
            subject,
            type,
            score,
            maxScore,
            knowledgePoints,
            date,
            createdAt: new Date().toISOString()
          };

          await App.Storage.db.add('scores', newScore);
          
          modal.remove();
          this.showToast('成绩录入成功', 'success');
          
          // 提示是否更新画像
          if (confirm('是否立即更新学生画像？')) {
            await this.selectStudent(student.id);
            await this.generateSuggestions();
          }
        } catch (error) {
          console.error('录入成绩失败:', error);
          this.showToast('录入失败', 'error');
        }
      });
    },

    /**
     * 导出学生数据为JSON文件
     */
    async exportStudents() {
      if (this.students.length === 0) {
        this.showToast('暂无学生数据可导出', 'warning');
        return;
      }

      try {
        // 收集所有学生及其关联数据
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          students: []
        };

        for (const student of this.students) {
          const scores = await App.Storage.db.getByIndex('scores', 'by_student', student.id);
          const profile = this.profiles.find(p => p.studentId === student.id);

          exportData.students.push({
            ...student,
            scores: scores,
            profile: profile || null
          });
        }

        // 生成JSON文件并下载
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `学生数据_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast(`已导出 ${this.students.length} 名学生数据`, 'success');
      } catch (error) {
        console.error('导出失败:', error);
        this.showToast('导出失败', 'error');
      }
    },

    /**
     * 导入学生数据（从JSON文件）
     */
    importStudents() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';

      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          if (!data.students || !Array.isArray(data.students)) {
            this.showToast('文件格式不正确', 'error');
            return;
          }

          // 确认导入
          const count = data.students.length;
          if (!confirm(`即将导入 ${count} 名学生数据，是否继续？\n\n如存在同学号学生，将跳过重复项。`)) {
            return;
          }

          let imported = 0;
          let skipped = 0;

          for (const item of data.students) {
            // 检查学号是否重复
            if (item.studentNo) {
              const existing = this.students.find(s => s.studentNo === item.studentNo);
              if (existing) {
                skipped++;
                continue;
              }
            }

            // 导入学生基本信息
            const { scores, profile, id, ...studentInfo } = item;
            studentInfo.createdAt = studentInfo.createdAt || new Date().toISOString();

            const newId = await App.Storage.db.add('students', studentInfo);

            // 导入成绩记录
            if (scores && scores.length > 0) {
              for (const score of scores) {
                const { id: oldId, ...scoreData } = score;
                scoreData.studentId = newId;
                await App.Storage.db.add('scores', scoreData);
              }
            }

            // 导入画像数据
            if (profile) {
              const { id: oldId, ...profileData } = profile;
              profileData.studentId = newId;
              await App.Storage.db.add('profiles', profileData);
            }

            imported++;
          }

          // 重新加载数据
          await this.loadData();
          this.renderStudentList();

          let msg = `成功导入 ${imported} 名学生`;
          if (skipped > 0) msg += `，跳过 ${skipped} 名重复`;
          this.showToast(msg, 'success');
        } catch (error) {
          console.error('导入失败:', error);
          this.showToast('导入失败，请检查文件格式', 'error');
        }

        // 清理input元素
        input.remove();
      });

      document.body.appendChild(input);
      input.click();
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
