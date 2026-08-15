/**
 * 页面HTML模板 - 内嵌所有页面内容，支持file://协议直接打开
 * 无需fetch加载，避免CORS限制
 */
(function() {
  'use strict';

  const templates = {
    'lesson-plan': `
<!-- 备课助手页面 -->
<section id="lesson-plan-page" class="page-container port-teacher">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-book-open"></i> 备课助手</h1>
    <div class="classroom-decor">
      <div class="teacher-figure">
        <div class="hair"></div>
        <div class="head"></div>
        <div class="body"></div>
        <div class="pointer"></div>
      </div>
      <span>👩‍🏫 让每一堂课都精彩</span>
      <div class="student-figure-group">
        <div class="student-figure"><div class="head"></div><div class="body"></div></div>
        <div class="student-figure girl"><div class="head"></div><div class="body"></div></div>
        <div class="student-figure"><div class="head"></div><div class="body"></div></div>
      </div>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">📚✨</span>AI智能生成教学方案，提升备课效率<span class="title-decoration right">🎯💡</span></p>
  </div>

  <!-- 功能入口 -->
  <div class="feature-grid">
    <a class="feature-card" href="#/teacher/lesson-plan" onclick="return false;">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-book-open"></i></div>
      <div class="feature-title"><span class="scene-emoji">📚</span>智能备课</div>
      <div class="feature-desc">按课标生成教案与分层作业</div>
    </a>
    <a class="feature-card" href="#/teacher/student-profile">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-user-graduate"></i></div>
      <div class="feature-title"><span class="scene-emoji">📊</span>学生画像</div>
      <div class="feature-desc">五维雷达图 + 归因分析</div>
    </a>
    <a class="feature-card" href="#/teacher/class-overview">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-chart-bar"></i></div>
      <div class="feature-title"><span class="scene-emoji">🏫</span>班级总览</div>
      <div class="feature-desc">班级学情数据一目了然</div>
    </a>
    <a class="feature-card" href="#/teacher/messages">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-comments"></i></div>
      <div class="feature-title"><span class="scene-emoji">💬</span>家校沟通</div>
      <div class="feature-desc">查看家长留言，及时回复</div>
    </a>
  </div>

  <!-- 输入表单 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-edit"></i> 课程信息</h2>
    </div>
    <div class="card-body">
      <form id="lesson-plan-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="subject"><i class="fas fa-book"></i> 学科</label>
            <select class="form-select" id="subject" required>
              <option value="">请选择学科</option>
              <option value="语文">语文</option>
              <option value="数学">数学</option>
              <option value="英语">英语</option>
              <option value="物理">物理</option>
              <option value="化学">化学</option>
              <option value="生物">生物</option>
              <option value="历史">历史</option>
              <option value="地理">地理</option>
              <option value="政治">政治</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="grade"><i class="fas fa-graduation-cap"></i> 年级</label>
            <select class="form-select" id="grade" required>
              <option value="">请选择年级</option>
              <option value="一年级">一年级</option>
              <option value="二年级">二年级</option>
              <option value="三年级">三年级</option>
              <option value="四年级">四年级</option>
              <option value="五年级">五年级</option>
              <option value="六年级">六年级</option>
              <option value="七年级">七年级</option>
              <option value="八年级">八年级</option>
              <option value="九年级">九年级</option>
              <option value="高一">高一</option>
              <option value="高二">高二</option>
              <option value="高三">高三</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="duration"><i class="fas fa-clock"></i> 课时</label>
            <select class="form-select" id="duration">
              <option value="1课时">1课时</option>
              <option value="2课时">2课时</option>
              <option value="3课时">3课时</option>
            </select>
          </div>
        </div>

        <!-- 教案模板选择 -->
        <div class="form-group">
          <label class="form-label"><i class="fas fa-th-large"></i> 教案模板</label>
          <div class="template-grid">
            <label class="template-card active" data-template="new-lesson">
              <input type="radio" name="lesson-template" value="new-lesson" checked style="display:none;">
              <div class="template-icon">📖</div>
              <div class="template-name">新授课</div>
              <div class="template-desc">知识讲解 + 课堂练习</div>
            </label>
            <label class="template-card" data-template="review">
              <input type="radio" name="lesson-template" value="review" style="display:none;">
              <div class="template-icon">🔄</div>
              <div class="template-name">复习课</div>
              <div class="template-desc">知识梳理 + 巩固练习</div>
            </label>
            <label class="template-card" data-template="experiment">
              <input type="radio" name="lesson-template" value="experiment" style="display:none;">
              <div class="template-icon"></div>
              <div class="template-name">实验课</div>
              <div class="template-desc">实验操作 + 观察记录</div>
            </label>
            <label class="template-card" data-template="commentary">
              <input type="radio" name="lesson-template" value="commentary" style="display:none;">
              <div class="template-icon">📝</div>
              <div class="template-name">讲评课</div>
              <div class="template-desc">试卷讲评 + 错题分析</div>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="topic"><i class="fas fa-lightbulb"></i> 课题名称</label>
          <input type="text" class="form-input" id="topic" placeholder="例如：《春晓》古诗赏析" required>
        </div>

        <div class="form-group">
          <label class="form-label" for="objectives"><i class="fas fa-bullseye"></i> 教学目标（可选）</label>
          <textarea class="form-textarea" id="objectives" placeholder="请输入教学目标，如：理解诗歌意境，掌握生字词..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="requirements"><i class="fas fa-star"></i> 特殊要求（可选）</label>
          <textarea class="form-textarea" id="requirements" placeholder="请输入特殊要求，如：适合基础薄弱的学生，增加互动环节..."></textarea>
        </div>

        <button type="submit" class="btn btn-primary btn-large btn-block">
          <i class="fas fa-magic"></i> 生成教学方案
        </button>
      </form>
    </div>
  </div>

  <!-- 结果展示区域 -->
  <div id="lesson-plan-result" class="hidden">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-file-alt"></i> 生成的教学方案</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-secondary btn-small edit-toggle-btn" id="edit-toggle-btn"><i class="fas fa-edit"></i> 编辑</button>
          <button class="btn btn-secondary btn-small" id="copy-plan-btn"><i class="fas fa-copy"></i> 复制方案</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 预览模式 -->
        <div id="plan-preview">
          <div id="plan-content"></div>
        </div>
        <!-- 编辑模式 -->
        <div id="plan-editor" class="hidden">
          <div class="editor-toolbar" id="editor-toolbar">
            <button data-cmd="bold" title="加粗"><i class="fas fa-bold"></i></button>
            <button data-cmd="italic" title="斜体"><i class="fas fa-italic"></i></button>
            <button data-cmd="underline" title="下划线"><i class="fas fa-underline"></i></button>
            <button data-cmd="insertUnorderedList" title="无序列表"><i class="fas fa-list-ul"></i></button>
            <button data-cmd="insertOrderedList" title="有序列表"><i class="fas fa-list-ol"></i></button>
            <button data-cmd="formatBlock" data-value="h2" title="标题"><i class="fas fa-heading"></i></button>
            <button data-cmd="formatBlock" data-value="p" title="正文"><i class="fas fa-paragraph"></i></button>
            <button data-cmd="removeFormat" title="清除格式"><i class="fas fa-eraser"></i></button>
          </div>
          <div class="editor-content" id="plan-editable" contenteditable="true"></div>
          <div class="editor-actions">
            <button class="btn btn-primary btn-small" id="save-edit-btn"><i class="fas fa-save"></i> 保存修改</button>
            <button class="btn btn-secondary btn-small" id="cancel-edit-btn"><i class="fas fa-times"></i> 取消编辑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分层作业区域 -->
    <div class="card" id="homework-section">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-layer-group"></i> 分层作业</h2>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-small edit-toggle-btn" id="edit-homework-btn"><i class="fas fa-edit"></i> 编辑</button>
          <button class="btn btn-secondary btn-small" id="copy-homework-btn"><i class="fas fa-copy"></i> 复制作业</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 预览模式 -->
        <div id="homework-preview">
          <div id="homework-content"></div>
        </div>
        <!-- 编辑模式 -->
        <div id="homework-editor" class="hidden">
          <div class="editor-toolbar" id="homework-toolbar">
            <button data-cmd="bold" title="加粗"><i class="fas fa-bold"></i></button>
            <button data-cmd="italic" title="斜体"><i class="fas fa-italic"></i></button>
            <button data-cmd="underline" title="下划线"><i class="fas fa-underline"></i></button>
            <button data-cmd="insertUnorderedList" title="无序列表"><i class="fas fa-list-ul"></i></button>
            <button data-cmd="insertOrderedList" title="有序列表"><i class="fas fa-list-ol"></i></button>
            <button data-cmd="formatBlock" data-value="h3" title="标题"><i class="fas fa-heading"></i></button>
            <button data-cmd="formatBlock" data-value="p" title="正文"><i class="fas fa-paragraph"></i></button>
            <button data-cmd="removeFormat" title="清除格式"><i class="fas fa-eraser"></i></button>
          </div>
          <div class="editor-content" id="homework-editable" contenteditable="true"></div>
          <div class="editor-actions">
            <button class="btn btn-primary btn-small" id="save-homework-edit-btn"><i class="fas fa-save"></i> 保存修改</button>
            <button class="btn btn-secondary btn-small" id="cancel-homework-edit-btn"><i class="fas fa-times"></i> 取消编辑</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
`,

    'messages': `
<!-- 家校沟通页面（教师端） -->
<section id="messages-page" class="page-container port-teacher">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-comments"></i> 家校沟通</h1>
    <div class="classroom-decor">
      <span>💬</span>
      <span>架起家校之间的温暖桥梁 🌉</span>
      <span>👩‍🏫💞👨‍👩‍👧</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">📨💝</span>查看家长留言，及时沟通反馈<span class="title-decoration right">🌉🤝</span></p>
  </div>

  <!-- 功能入口 -->
  <div class="feature-grid">
    <a class="feature-card" href="#/teacher/lesson-plan">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-book-open"></i></div>
      <div class="feature-title"><span class="scene-emoji">📚</span>智能备课</div>
      <div class="feature-desc">按课标生成教案与分层作业</div>
    </a>
    <a class="feature-card" href="#/teacher/student-profile">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-user-graduate"></i></div>
      <div class="feature-title"><span class="scene-emoji">📊</span>学生画像</div>
      <div class="feature-desc">五维雷达图 + 归因分析</div>
    </a>
    <a class="feature-card" href="#/teacher/class-overview">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-chart-bar"></i></div>
      <div class="feature-title"><span class="scene-emoji">🏫</span>班级总览</div>
      <div class="feature-desc">班级学情数据一目了然</div>
    </a>
  </div>

  <!-- 家长留言列表 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-envelope-open-text"></i> 家长留言</h2>
      <button class="btn btn-secondary" id="tmsg-refresh-btn" style="margin-left: auto;">
        <i class="fas fa-sync-alt"></i> 刷新
      </button>
    </div>
    <div class="card-body">
      <div id="tmsg-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding: 4px;">
        <div style="text-align: center; color: var(--text-tertiary); padding: 32px 0;">暂无家长留言</div>
      </div>
      <div id="tmsg-status" style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);"></div>
    </div>
  </div>

  <!-- 回复留言 -->
  <div class="card hidden" id="tmsg-reply-card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-reply"></i> 回复家长</h2>
    </div>
    <div class="card-body">
      <div id="tmsg-reply-target" style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;"></div>
      <div style="display: flex; gap: 10px;">
        <input type="text" class="form-input" id="tmsg-reply-input" placeholder="输入回复内容..." style="flex: 1;">
        <button class="btn btn-primary" id="tmsg-reply-send-btn"><i class="fas fa-paper-plane"></i> 发送回复</button>
        <button class="btn btn-secondary" id="tmsg-reply-cancel-btn">取消</button>
      </div>
    </div>
  </div>
</section>
`,

    'student-profile': `
<!-- 学生画像页面 -->
<section id="student-profile-page" class="page-container port-teacher">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-user-graduate"></i> 学生画像</h1>
    <div class="classroom-decor">
      <span>📊</span>
      <span>看见每个孩子的独特光芒 ✨</span>
      <span>👨‍🎓👩‍🎓👩‍🎓👨‍🎓</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">🎯🔍</span>AI分析学生学习数据，生成个性化学习画像<span class="title-decoration right">📈💡</span></p>
  </div>

  <div class="profile-layout">
    <!-- 学生列表区域 -->
    <div class="card student-list-card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-users"></i> 学生列表</h2>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-small" id="export-students-btn" title="导出学生数据"><i class="fas fa-download"></i> 导出</button>
          <button class="btn btn-secondary btn-small" id="import-students-btn" title="导入学生数据"><i class="fas fa-upload"></i> 导入</button>
          <button class="btn btn-primary btn-small" id="add-student-btn"><i class="fas fa-plus"></i> 添加</button>
        </div>
      </div>
      <div class="card-body">
        <div class="form-group">
          <input type="text" class="form-input" id="student-search" placeholder="🔍 搜索学生姓名...">
        </div>
        <div id="student-list">
          <div class="loading-container">
            <p style="color: var(--text-tertiary);">加载中...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 画像展示区域 -->
    <div class="card profile-detail-card">
      <div class="card-header">
        <h2 class="card-title" id="profile-student-name"><i class="fas fa-chart-radar"></i> 学生画像</h2>
        <button class="btn btn-secondary btn-small" id="add-score-btn" style="display:none;"><i class="fas fa-plus-circle"></i> 录入成绩</button>
      </div>
      <div class="card-body">
        <div id="profile-content">
          <div class="chart-placeholder">
            <div>
              <p style="font-size: 48px; margin-bottom: var(--spacing-md);"><i class="fas fa-chart-pie" style="color: var(--teacher-color);"></i></p>
              <p>请从左侧选择一位学生查看画像</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
.profile-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--spacing-lg);
}
.student-list-card {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}
.student-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  border-bottom: 1px solid var(--border-light);
}
.student-item:last-child { border-bottom: none; }
.student-item:hover { background: var(--teacher-bg); }
.student-item.active { background: var(--teacher-bg); border-left: 3px solid var(--teacher-color); }
.student-info { flex: 1; }
.student-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.student-meta { font-size: 12px; color: var(--text-tertiary); }
.student-actions { display: flex; gap: 4px; }
.btn-icon {
  background: transparent; border: none; cursor: pointer;
  padding: 4px 8px; border-radius: var(--radius-sm);
  font-size: 16px; transition: var(--transition);
}
.btn-icon:hover { background: var(--teacher-bg); }
.profile-section { margin-bottom: 24px; }
.section-title {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}
.radar-chart-container { display: flex; justify-content: center; padding: 16px 0; }
#radar-chart { max-width: 100%; height: auto; }
.attribution-list { display: flex; flex-direction: column; gap: 12px; }
.attribution-item { display: flex; align-items: center; gap: 12px; }
.attribution-label { width: 100px; font-size: 13px; color: var(--text-secondary); flex-shrink: 0; }
.attribution-bar {
  flex: 1; height: 20px; background: var(--bg-body);
  border-radius: var(--radius-full); overflow: hidden;
}
.attribution-fill {
  height: 100%; background: var(--teacher-gradient);
  border-radius: var(--radius-full); transition: width 0.5s ease;
}
.attribution-value { width: 40px; font-size: 13px; font-weight: 600; color: var(--text-primary); text-align: right; }
.suggestions-list { display: flex; flex-direction: column; gap: 8px; }
@media (max-width: 768px) {
  .profile-layout { grid-template-columns: 1fr; }
  .student-list-card { max-height: none; }
  .attribution-label { width: 80px; }
}
</style>
`,

    'class-overview': `
<!-- 班级学情总览页面 -->
<section id="class-overview-page" class="page-container port-teacher">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-chart-bar"></i> 班级学情总览</h1>
    <div class="classroom-decor">
      <span>🏫</span>
      <span>全班同学一起进步 🌟</span>
      <span>📚📖✏️📐</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">📊🎯</span>全面了解班级整体学习情况，精准把握教学方向<span class="title-decoration right">🚀💪</span></p>
  </div>

  <!-- 班级选择 -->
  <div class="card">
    <div class="card-body" style="padding: var(--spacing-md) var(--spacing-lg);">
      <div class="form-row" style="align-items: flex-end;">
        <div class="form-group mb-0">
          <label class="form-label" for="class-select"><i class="fas fa-school"></i> 选择班级</label>
          <select class="form-select" id="class-select" style="width: 200px;">
            <option value="class1">三年级(1)班</option>
            <option value="class2">三年级(2)班</option>
            <option value="class3">四年级(1)班</option>
            <option value="class4">五年级(1)班</option>
          </select>
        </div>
        <div class="form-group mb-0">
          <label class="form-label" for="subject-overview"><i class="fas fa-book"></i> 选择学科</label>
          <select class="form-select" id="subject-overview" style="width: 200px;">
            <option value="chinese">语文</option>
            <option value="math">数学</option>
            <option value="english">英语</option>
          </select>
        </div>
        <button class="btn btn-primary" id="refresh-overview"><i class="fas fa-sync-alt"></i> 刷新数据</button>
      </div>
    </div>
  </div>

  <!-- 统计卡片 -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon primary"><i class="fas fa-users"></i></div>
      <div class="stat-content">
        <div class="stat-label">班级人数</div>
        <div class="stat-value" id="stat-students">--</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon success"><i class="fas fa-chart-line"></i></div>
      <div class="stat-content">
        <div class="stat-label">平均分</div>
        <div class="stat-value" id="stat-avg-score">--</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon warning"><i class="fas fa-clipboard-check"></i></div>
      <div class="stat-content">
        <div class="stat-label">作业完成率</div>
        <div class="stat-value" id="stat-homework-rate">--</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon info"><i class="fas fa-trophy"></i></div>
      <div class="stat-content">
        <div class="stat-label">优秀率</div>
        <div class="stat-value" id="stat-excellent-rate">--</div>
      </div>
    </div>
  </div>

  <!-- 图表区域 -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg);">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-chart-area"></i> 成绩分布</h2>
      </div>
      <div class="card-body">
        <div class="chart-placeholder" id="score-distribution-chart">
          <p>成绩分布图表区域</p>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-chart-line"></i> 学习趋势</h2>
      </div>
      <div class="card-body">
        <div class="chart-placeholder" id="learning-trend-chart">
          <p>学习趋势图表区域</p>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-exclamation-triangle"></i> 薄弱知识点排行</h2>
    </div>
    <div class="card-body">
      <div id="weak-points-list">
        <div class="chart-placeholder">
          <p>薄弱知识点分析区域</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
.score-distribution-chart {
  display: flex; justify-content: space-around; align-items: flex-end;
  height: 200px; padding: 20px 10px; gap: 10px;
}
.bar-item { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 8px; }
.bar-value { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.bar-container {
  width: 40px; height: 150px; background: var(--bg-body);
  border-radius: var(--radius-sm); position: relative; display: flex; align-items: flex-end;
}
.bar-fill {
  width: 100%; background: var(--teacher-gradient);
  border-radius: var(--radius-sm); transition: height 0.5s ease;
}
.bar-label { font-size: 12px; color: var(--text-primary); font-weight: 500; }
.bar-percentage { font-size: 11px; color: var(--text-tertiary); }
.weak-points-list { display: flex; flex-direction: column; gap: 12px; }
.weak-point-item {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: var(--bg-body); border-radius: var(--radius-md);
}
.weak-point-rank {
  width: 28px; height: 28px; background: var(--teacher-gradient);
  color: white; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0;
}
.weak-point-info { flex: 0 0 120px; }
.weak-point-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.weak-point-meta { font-size: 12px; color: var(--text-tertiary); }
.weak-point-bar { flex: 1; height: 8px; background: var(--border-light); border-radius: 4px; overflow: hidden; }
.weak-point-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.weak-point-value { width: 50px; text-align: right; font-weight: 700; font-size: 14px; }
@media (max-width: 768px) {
  .score-distribution-chart { height: 150px; }
  .bar-container { width: 30px; height: 100px; }
  .weak-point-info { flex: 0 0 80px; }
  .weak-point-name { font-size: 13px; }
}
</style>
`,

    'photo-qa': `
<!-- 拍照答疑页面 -->
<section id="photo-qa-page" class="page-container port-student">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-camera"></i> 拍照答疑</h1>
    <div class="classroom-decor">
      <span>📸</span>
      <span>遇到难题不用怕，AI老师来帮忙 💡</span>
      <span>🙋‍♂️🙋‍♀️✨</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">📷🎤</span>拍照或语音提问，AI智能解答学习难题<span class="title-decoration right">🧠🔍</span></p>
  </div>

  <!-- 功能入口 -->
  <div class="feature-grid">
    <a class="feature-card" href="#/student/photo-qa" onclick="return false;">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-camera"></i></div>
      <div class="feature-title"><span class="scene-emoji">📷</span>拍照答疑</div>
      <div class="feature-desc">拍题目，AI秒出解析</div>
    </a>
    <a class="feature-card" href="#/student/practice">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-pen-fancy"></i></div>
      <div class="feature-title"><span class="scene-emoji">✏️</span>针对性练习</div>
      <div class="feature-desc">薄弱知识点专项训练</div>
    </a>
    <a class="feature-card" href="#/student/photo-qa" onclick="return false;">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-microphone"></i></div>
      <div class="feature-title"><span class="scene-emoji">🎤</span>语音提问</div>
      <div class="feature-desc">语音输入，解放双手</div>
    </a>
  </div>

  <!-- 输入区域 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-cloud-upload-alt"></i> 上传题目</h2>
    </div>
    <div class="card-body">
      <!-- 图片上传区域 -->
      <div class="upload-area" id="image-upload-area">
        <div class="upload-icon"><i class="fas fa-camera-retro"></i></div>
        <div class="upload-text">点击上传题目图片</div>
        <div class="upload-hint">支持拍照或从相册选择，JPG、PNG 格式，不超过 5MB</div>
        <input type="file" id="image-input" accept="image/*" style="display: none;">
      </div>

      <!-- 拍照按钮（移动端显示） -->
      <div style="margin-top: var(--spacing-md); text-align: center;" class="mobile-only">
        <button class="btn btn-secondary btn-large" id="camera-btn">
          <i class="fas fa-camera"></i> 拍照答题
        </button>
        <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
      </div>

      <!-- 图片预览 -->
      <div id="image-preview" class="hidden" style="margin-top: var(--spacing-md);">
        <img id="preview-image" style="max-width: 100%; border-radius: var(--radius-md);">
        <button class="btn btn-secondary mt-sm" id="remove-image-btn"><i class="fas fa-times"></i> 移除图片</button>
      </div>

      <!-- 语音输入 -->
      <div style="margin-top: var(--spacing-lg); text-align: center;">
        <button class="btn btn-secondary btn-large" id="voice-input-btn">
          <i class="fas fa-microphone"></i> 语音输入问题
        </button>
        <div id="voice-status" class="hidden mt-sm" style="color: var(--text-tertiary);">
          正在录音...点击停止
        </div>
      </div>

      <!-- 文字补充 -->
      <div class="form-group mt-lg">
        <label class="form-label" for="question-text"><i class="fas fa-pencil-alt"></i> 补充说明（可选）</label>
        <textarea class="form-textarea" id="question-text" placeholder="如果有需要补充说明的内容，请在此输入..."></textarea>
      </div>

      <!-- 学科选择 -->
      <div class="form-group">
        <label class="form-label" for="qa-subject"><i class="fas fa-book"></i> 选择学科</label>
        <select class="form-select" id="qa-subject" style="width: 200px;">
          <option value="">自动识别</option>
          <option value="语文">语文</option>
          <option value="数学">数学</option>
          <option value="英语">英语</option>
          <option value="物理">物理</option>
          <option value="化学">化学</option>
          <option value="生物">生物</option>
        </select>
      </div>

      <button class="btn btn-primary btn-large btn-block" id="submit-question-btn">
        <i class="fas fa-paper-plane"></i> 提交问题
      </button>
    </div>
  </div>

  <!-- 结果展示区域 -->
  <div id="qa-result" class="hidden">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-check-circle"></i> 解答结果</h2>
        <button class="btn btn-secondary" id="new-question-btn"><i class="fas fa-redo"></i> 继续提问</button>
      </div>
      <div class="card-body">
        <div id="answer-content"></div>
      </div>
    </div>

    <!-- 知识点卡片区域 -->
    <div class="card" id="knowledge-section" style="display:none;">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-lightbulb"></i> 知识点卡片</h2>
      </div>
      <div class="card-body">
        <div id="knowledge-cards"></div>
      </div>
    </div>
  </div>
</section>

<style>
@media (max-width: 768px) {
  .upload-area { padding: 24px; }
  .upload-icon { font-size: 36px; }
}
</style>
`,

    'practice': `
<!-- 针对性练习页面 -->
<section id="practice-page" class="page-container port-student">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-pen-fancy"></i> 针对性练习</h1>
    <div class="classroom-decor">
      <span>✏️</span>
      <span>勤加练习，天天进步 💪</span>
      <span>📝🧮📖🔬</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">🎯📚</span>AI根据你的学习情况，智能推荐练习题<span class="title-decoration right">🏅✨</span></p>
  </div>

  <!-- 练习设置 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-cog"></i> 练习设置</h2>
    </div>
    <div class="card-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="practice-subject"><i class="fas fa-book"></i> 学科</label>
          <select class="form-select" id="practice-subject" required>
            <option value="">请选择学科</option>
            <option value="语文">语文</option>
            <option value="数学">数学</option>
            <option value="英语">英语</option>
            <option value="物理">物理</option>
            <option value="化学">化学</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="practice-grade"><i class="fas fa-graduation-cap"></i> 年级</label>
          <select class="form-select" id="practice-grade" required>
            <option value="">请选择年级</option>
            <option value="三年级">三年级</option>
            <option value="四年级">四年级</option>
            <option value="五年级">五年级</option>
            <option value="六年级">六年级</option>
            <option value="七年级">七年级</option>
            <option value="八年级">八年级</option>
            <option value="九年级">九年级</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="practice-difficulty"><i class="fas fa-signal"></i> 难度</label>
          <select class="form-select" id="practice-difficulty">
            <option value="easy">基础</option>
            <option value="medium">中等</option>
            <option value="hard">提高</option>
            <option value="adaptive">自适应</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="practice-count"><i class="fas fa-list-ol"></i> 题目数量</label>
          <select class="form-select" id="practice-count">
            <option value="5">5题</option>
            <option value="10" selected>10题</option>
            <option value="15">15题</option>
            <option value="20">20题</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="practice-topic"><i class="fas fa-bullseye"></i> 知识点（可选）</label>
        <input type="text" class="form-input" id="practice-topic" placeholder="例如：分数加减法、古诗词填空...">
      </div>

      <button class="btn btn-primary btn-large btn-block" id="start-practice-btn">
        <i class="fas fa-play-circle"></i> 开始练习
      </button>
    </div>
  </div>

  <!-- 题目展示区域 -->
  <div id="practice-questions" class="hidden">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-question-circle"></i> 练习题</h2>
        <div>
          <span class="badge badge-primary" id="progress-badge">0/0</span>
          <button class="btn btn-secondary" id="submit-practice-btn" style="margin-left: var(--spacing-sm);">
            <i class="fas fa-check"></i> 提交答案
          </button>
        </div>
      </div>
      <div class="card-body" id="questions-container">
        <!-- 题目将在这里动态生成 -->
      </div>
    </div>
  </div>

  <!-- 答题结果 -->
  <div id="practice-result" class="hidden">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-star"></i> 练习结果</h2>
        <button class="btn btn-primary" id="new-practice-btn"><i class="fas fa-redo"></i> 再来一组</button>
      </div>
      <div class="card-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon success"><i class="fas fa-check"></i></div>
            <div class="stat-content">
              <div class="stat-label">正确题数</div>
              <div class="stat-value" id="correct-count">0</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon warning"><i class="fas fa-times"></i></div>
            <div class="stat-content">
              <div class="stat-label">错误题数</div>
              <div class="stat-value" id="wrong-count">0</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon student"><i class="fas fa-percentage"></i></div>
            <div class="stat-content">
              <div class="stat-label">正确率</div>
              <div class="stat-value" id="accuracy-rate">0%</div>
            </div>
          </div>
        </div>

        <div id="result-detail" style="margin-top: var(--spacing-lg);">
          <!-- 详细答题解析 -->
        </div>
      </div>
    </div>
  </div>
</section>
`,

    'wrong-book': `
<!-- 错题本页面 -->
<section id="wrong-book-page" class="page-container port-student">
  <div class="page-header">
    <h1 class="page-title"><i class="fas fa-book-open"></i> 错题本</h1>
    <p class="page-subtitle">📝✏️ 记录每一道错题，攻克每一个薄弱点 🎯💡</p>
  </div>

  <!-- 功能入口 -->
  <div class="feature-grid">
    <a class="feature-card" href="#/student/wrong-book" onclick="return false;">
      <div class="feature-icon"><i class="fas fa-book-open"></i></div>
      <div class="feature-title">错题本</div>
      <div class="feature-desc">我的错题，逐个攻克</div>
    </a>
    <a class="feature-card" href="#/student/photo-qa">
      <div class="feature-icon"><i class="fas fa-camera"></i></div>
      <div class="feature-title">拍照答疑</div>
      <div class="feature-desc">拍题目，AI秒出解析</div>
    </a>
    <a class="feature-card" href="#/student/practice">
      <div class="feature-icon"><i class="fas fa-pen-fancy"></i></div>
      <div class="feature-title">针对性练习</div>
      <div class="feature-desc">薄弱知识点专项训练</div>
    </a>
  </div>

  <!-- 统计卡片 -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon warning"><i class="fas fa-times-circle"></i></div>
      <div class="stat-content">
        <div class="stat-label">待攻克</div>
        <div class="stat-value" id="stat-wrong-count">0</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
      <div class="stat-content">
        <div class="stat-label">已掌握</div>
        <div class="stat-value" id="stat-mastered-count">0</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon student"><i class="fas fa-percentage"></i></div>
      <div class="stat-content">
        <div class="stat-label">掌握率</div>
        <div class="stat-value" id="stat-mastery-rate">0%</div>
      </div>
    </div>
  </div>

  <!-- 筛选栏 -->
  <div class="card">
    <div class="card-body" style="padding: var(--spacing-md) var(--spacing-lg);">
      <div style="display: flex; gap: var(--spacing-md); align-items: center; flex-wrap: wrap;">
        <div class="form-group mb-0">
          <label class="form-label" for="wrong-subject-filter"><i class="fas fa-book"></i> 学科</label>
          <select class="form-select" id="wrong-subject-filter" style="width: 150px;">
            <option value="">全部学科</option>
            <option value="语文">语文</option>
            <option value="数学">数学</option>
            <option value="英语">英语</option>
            <option value="物理">物理</option>
            <option value="化学">化学</option>
          </select>
        </div>
        <div class="form-group mb-0">
          <label class="form-label"><i class="fas fa-filter"></i> 状态</label>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn btn-primary btn-small wrong-filter-btn active" data-status="">全部</button>
            <button class="btn btn-secondary btn-small wrong-filter-btn" data-status="wrong">待攻克</button>
            <button class="btn btn-secondary btn-small wrong-filter-btn" data-status="mastered">已掌握</button>
          </div>
        </div>
        <div style="margin-left: auto;">
          <button class="btn btn-secondary btn-small" id="add-wrong-btn">
            <i class="fas fa-plus"></i> 手动添加
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 错题列表 -->
  <div id="wrong-list-container">
    <div class="loading-container">
      <div class="spinner"></div>
      <div>加载中...</div>
    </div>
  </div>
</section>

<!-- 添加错题弹窗模板 -->
<template id="add-wrong-modal-template">
  <div class="modal-overlay">
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3><i class="fas fa-plus-circle"></i> 添加错题</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label"><i class="fas fa-book"></i> 学科</label>
          <select class="form-select" id="add-wrong-subject" required>
            <option value="">请选择学科</option>
            <option value="语文">语文</option>
            <option value="数学">数学</option>
            <option value="英语">英语</option>
            <option value="物理">物理</option>
            <option value="化学">化学</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-question-circle"></i> 题目</label>
          <textarea class="form-textarea" id="add-wrong-question" placeholder="请输入题目内容..." rows="3" required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-user-edit"></i> 我的答案</label>
          <input type="text" class="form-input" id="add-wrong-answer" placeholder="你写的答案">
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-check-circle"></i> 正确答案</label>
          <input type="text" class="form-input" id="add-wrong-correct" placeholder="正确答案">
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-lightbulb"></i> 解析（可选）</label>
          <textarea class="form-textarea" id="add-wrong-explanation" placeholder="为什么错了？正确思路是什么？" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fas fa-tag"></i> 知识点（可选）</label>
          <input type="text" class="form-input" id="add-wrong-knowledge" placeholder="例如：分数加减法">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="save-wrong-btn"><i class="fas fa-save"></i> 保存</button>
      </div>
    </div>
  </div>
</template>

<style>
.wrong-item {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  transition: var(--transition);
  border-left: 4px solid var(--danger);
}
.wrong-item.mastered {
  border-left-color: var(--success);
  opacity: 0.75;
}
.wrong-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.wrong-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}
.wrong-item-subject {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  background: var(--danger-light);
  color: var(--danger);
}
.wrong-item.mastered .wrong-item-subject {
  background: var(--success-light);
  color: var(--success);
}
.wrong-item-date {
  font-size: 12px;
  color: var(--text-tertiary);
}
.wrong-item-question {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: var(--spacing-sm);
}
.wrong-item-answer {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  font-size: 13px;
}
.wrong-answer-wrong {
  color: var(--danger);
}
.wrong-answer-correct {
  color: var(--success);
}
.wrong-answer-wrong i, .wrong-answer-correct i {
  margin-right: 4px;
}
.wrong-item-explanation {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  background: var(--bg-body);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}
.wrong-item-knowledge {
  display: inline-block;
  padding: 2px 10px;
  background: var(--primary-light-bg, rgba(255,107,53,0.08));
  color: var(--primary);
  border-radius: var(--radius-full);
  font-size: 12px;
  margin-right: 6px;
}
.wrong-item-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.wrong-item-actions .btn {
  font-size: 12px;
  padding: 5px 14px;
}
.wrong-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}
.wrong-empty i {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.3;
}
</style>
`,

    'report': `
<!-- 学情报告页面 -->
<section id="report-page" class="page-container port-parent">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-chart-line"></i> 学情报告</h1>
    <div class="classroom-decor">
      <span>👨‍👩‍👧</span>
      <span>陪伴孩子，共同成长 🌱</span>
      <span>💝📊🌈</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">💞📈</span>全面了解孩子的学习情况，与学校保持同步<span class="title-decoration right">🌟🏡</span></p>
  </div>

  <!-- 功能入口 -->
  <div class="feature-grid">
    <a class="feature-card" href="#/parent/report" onclick="return false;">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-chart-line"></i></div>
      <div class="feature-title"><span class="scene-emoji">📊</span>学情报告</div>
      <div class="feature-desc">周报/月报可视化分析</div>
    </a>
    <a class="feature-card" href="#/parent/communication">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-comments"></i></div>
      <div class="feature-title"><span class="scene-emoji">💬</span>家校沟通</div>
      <div class="feature-desc">AI生成个性化沟通话术</div>
    </a>
    <a class="feature-card" href="#/parent/report" onclick="return false;">
      <div class="corner-decoration"></div>
      <div class="feature-icon"><i class="fas fa-child"></i></div>
      <div class="feature-title"><span class="scene-emoji">🌱</span>成长档案</div>
      <div class="feature-desc">记录孩子每一步成长</div>
    </a>
  </div>

  <!-- 报告类型切换 -->
  <div class="card">
    <div class="card-body" style="padding: var(--spacing-md) var(--spacing-lg);">
      <div style="display: flex; gap: var(--spacing-md); align-items: center; flex-wrap: wrap;">
        <div class="form-group mb-0">
          <label class="form-label" for="student-select"><i class="fas fa-user"></i> 我的孩子</label>
          <select class="form-select" id="student-select" style="width: 200px;">
            <option value="">加载中...</option>
          </select>
        </div>
        <div class="form-group mb-0">
          <label class="form-label"><i class="fas fa-calendar-alt"></i> 报告类型</label>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn btn-primary" id="weekly-report-btn"><i class="fas fa-calendar-week"></i> 周报</button>
            <button class="btn btn-secondary" id="monthly-report-btn"><i class="fas fa-calendar"></i> 月报</button>
          </div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label" for="report-period"><i class="fas fa-clock"></i> 时间段</label>
          <select class="form-select" id="report-period" style="width: 200px;">
            <option value="current">本周</option>
            <option value="last">上周</option>
            <option value="custom">自定义</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <!-- 学习概况统计 -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon parent"><i class="fas fa-book-reader"></i></div>
      <div class="stat-content">
        <div class="stat-label">学习时长</div>
        <div class="stat-value" id="stat-study-hours">--</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon success"><i class="fas fa-check-circle"></i></div>
      <div class="stat-content">
        <div class="stat-label">作业完成率</div>
        <div class="stat-value" id="stat-homework-completion">--</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon warning"><i class="fas fa-chart-bar"></i></div>
      <div class="stat-content">
        <div class="stat-label">平均成绩</div>
        <div class="stat-value" id="stat-average-score">--</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon info"><i class="fas fa-bullseye"></i></div>
      <div class="stat-content">
        <div class="stat-label">知识点掌握</div>
        <div class="stat-value" id="stat-knowledge-mastery">--</div>
      </div>
    </div>
  </div>

  <!-- 图表区域 -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg);">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-chart-line"></i> 成绩趋势</h2>
      </div>
      <div class="card-body">
        <div class="chart-placeholder" id="score-trend-chart">
          <p>成绩趋势图表区域</p>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-chart-pie"></i> 学科表现</h2>
      </div>
      <div class="card-body">
        <div class="chart-placeholder" id="subject-performance-chart">
          <p>学科表现图表区域</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 详细分析 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-search"></i> 学习情况分析</h2>
    </div>
    <div class="card-body">
      <div id="analysis-content">
        <div class="loading-container">
          <p style="color: var(--text-tertiary);">暂无分析数据</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 教师建议 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-lightbulb"></i> 教师建议</h2>
    </div>
    <div class="card-body">
      <div id="teacher-suggestions">
        <div class="loading-container">
          <p style="color: var(--text-tertiary);">暂无教师建议</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
.analysis-section { line-height: 1.8; }
.analysis-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.score-table { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.score-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; background: var(--bg-body); border-radius: var(--radius-md);
}
.score-subject { font-size: 14px; color: var(--text-primary); font-weight: 500; }
.score-value { font-size: 16px; font-weight: 700; }
.weak-points { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.weak-tag {
  display: inline-block; padding: 6px 14px; background: var(--danger-light);
  color: var(--danger); border-radius: var(--radius-full); font-size: 13px; font-weight: 600;
}
.dimension-bars { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
.dimension-item { display: flex; align-items: center; gap: 12px; }
.dimension-label { width: 100px; font-size: 13px; color: var(--text-secondary); }
.dimension-bar {
  flex: 1; height: 20px; background: var(--bg-body);
  border-radius: var(--radius-full); overflow: hidden;
}
.dimension-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.5s ease; }
.dimension-value { width: 40px; text-align: right; font-size: 13px; font-weight: 600; color: var(--text-primary); }
@media (max-width: 768px) { .dimension-label { width: 80px; } }
</style>
`,

    'communication': `
<!-- 家校沟通页面 -->
<section id="communication-page" class="page-container port-parent">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-comments"></i> 家校沟通</h1>
    <div class="classroom-decor">
      <span>🏡</span>
      <span>架起家校之间的温暖桥梁 🌉</span>
      <span>💞🤝✉️</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">💬💝</span>AI辅助生成沟通话术，促进家校良好互动<span class="title-decoration right">🌉🤝</span></p>
  </div>

  <!-- 沟通场景选择 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-list-alt"></i> 选择沟通场景</h2>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label class="form-label" for="communication-scenario"><i class="fas fa-tag"></i> 沟通场景</label>
        <select class="form-select" id="communication-scenario" required>
          <option value="">请选择场景</option>
          <option value="homework">📝 询问作业情况</option>
          <option value="performance">📊 了解学习表现</option>
          <option value="behavior">🙋 沟通行为问题</option>
          <option value="attendance">📅 请假/考勤</option>
          <option value="activity">🎉 学校活动咨询</option>
          <option value="feedback">💡 反馈意见</option>
          <option value="other">📌 其他</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="communication-target"><i class="fas fa-user-tie"></i> 沟通对象</label>
        <select class="form-select" id="communication-target">
          <option value="teacher">班主任</option>
          <option value="subject-teacher">科任老师</option>
          <option value="principal">校领导</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="communication-content"><i class="fas fa-edit"></i> 具体内容（可选）</label>
        <textarea class="form-textarea" id="communication-content" placeholder="请描述您想了解或沟通的具体内容..."></textarea>
      </div>

      <button class="btn btn-primary btn-large btn-block" id="generate-script-btn">
        <i class="fas fa-magic"></i> 生成沟通话术
      </button>
    </div>
  </div>

  <!-- 话术展示区域 -->
  <div id="communication-script" class="hidden">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-comment-dots"></i> 沟通话术建议</h2>
        <button class="btn btn-secondary" id="copy-script-btn"><i class="fas fa-copy"></i> 复制话术</button>
      </div>
      <div class="card-body">
        <div id="script-content"></div>
      </div>
    </div>

    <!-- 沟通技巧 -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title"><i class="fas fa-lightbulb"></i> 沟通技巧提示</h2>
      </div>
      <div class="card-body">
        <div id="communication-tips">
          <ul style="line-height: 2; color: var(--text-secondary); list-style: none;">
            <li><i class="fas fa-check-circle" style="color: var(--parent-color); margin-right: 8px;"></i>保持礼貌和尊重的语气</li>
            <li><i class="fas fa-check-circle" style="color: var(--parent-color); margin-right: 8px;"></i>先表达感谢，再提出问题</li>
            <li><i class="fas fa-check-circle" style="color: var(--parent-color); margin-right: 8px;"></i>具体描述问题，避免笼统</li>
            <li><i class="fas fa-check-circle" style="color: var(--parent-color); margin-right: 8px;"></i>倾听老师的观点和建议</li>
            <li><i class="fas fa-check-circle" style="color: var(--parent-color); margin-right: 8px;"></i>共同商讨解决方案</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- 在线沟通：给老师留言 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-comment-dots"></i> 给老师留言</h2>
      <button class="btn btn-secondary" id="msg-refresh-btn" style="margin-left: auto;">
        <i class="fas fa-sync-alt"></i> 刷新
      </button>
    </div>
    <div class="card-body">
      <div id="msg-child-info" class="hidden" style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;"></div>

      <!-- 消息历史 -->
      <div id="msg-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 420px; overflow-y: auto; padding: 4px;">
        <div style="text-align: center; color: var(--text-tertiary); padding: 24px 0;">暂无消息，给老师留个言吧</div>
      </div>

      <!-- 发送消息 -->
      <div style="display: flex; gap: 10px; margin-top: 14px;">
        <input type="text" class="form-input" id="msg-input" placeholder="输入留言内容，例如：老师您好，想了解孩子最近的表现..." style="flex: 1;">
        <button class="btn btn-primary" id="msg-send-btn"><i class="fas fa-paper-plane"></i> 发送</button>
      </div>
      <div id="msg-status" style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);"></div>
    </div>
  </div>
</section>
`,

    'settings': `
<!-- 设置页面 -->
<section id="settings-page" class="page-container">
  <div class="page-header-bg"></div>
  <div class="page-header">
    <div class="arc-decoration"></div>
    <h1 class="page-title"><i class="fas fa-cog"></i> 设置</h1>
    <div class="classroom-decor">
      <span>⚙️</span>
      <span>个性化配置您的专属AI助教 🔧</span>
      <span>🔑🤖🔐</span>
    </div>
    <p class="page-subtitle"><span class="title-decoration left">🔧⚙️</span>配置AI服务和应用参数<span class="title-decoration right">🛠️🔩</span></p>
  </div>

  <!-- API Key配置 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-key"></i> API Key 配置</h2>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label class="form-label" for="api-key"><i class="fas fa-lock"></i> API Key</label>
        <input type="password" class="form-input" id="api-key" placeholder="请输入您的API Key">
        <div style="margin-top: var(--spacing-xs); font-size: 12px; color: var(--text-tertiary);">
          <i class="fas fa-shield-alt"></i> API Key仅存储在本地浏览器中，不会上传到任何服务器
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="api-base-url"><i class="fas fa-link"></i> API Base URL（可选）</label>
        <input type="text" class="form-input" id="api-base-url" placeholder="https://api.example.com/v1">
      </div>

      <div class="form-group">
        <label class="form-label" for="model-select"><i class="fas fa-robot"></i> AI模型</label>
        <select class="form-select" id="model-select">
          <option value="qwen-max">通义千问 Max（推荐）</option>
          <option value="qwen-plus">通义千问 Plus（轻量）</option>
          <option value="qwen-turbo">通义千问 Turbo（快速）</option>
          <option value="qwen-vl-max">通义千问 VL Max（视觉理解）</option>
          <option value="qwen-vl-plus">通义千问 VL Plus（视觉轻量）</option>
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek-reasoner">DeepSeek Reasoner</option>
          <option value="custom">自定义模型</option>
        </select>
      </div>

      <div class="form-group hidden" id="custom-model-group">
        <label class="form-label" for="custom-model"><i class="fas fa-edit"></i> 自定义模型名称</label>
        <input type="text" class="form-input" id="custom-model" placeholder="例如：gpt-4o、deepseek-chat">
        <div style="margin-top: var(--spacing-xs); font-size: 12px; color: var(--text-tertiary);">
          <i class="fas fa-info-circle"></i> 选择"自定义模型"时，请输入完整的模型名称
        </div>
      </div>

      <div style="display: flex; gap: var(--spacing-sm);">
        <button class="btn btn-primary" id="save-settings-btn"><i class="fas fa-save"></i> 保存配置</button>
        <button class="btn btn-secondary" id="test-connection-btn"><i class="fas fa-plug"></i> 测试连接</button>
      </div>

      <div id="settings-message" class="hidden mt-md"></div>
    </div>
  </div>

  <!-- 账号与云同步 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-cloud"></i> 账号与云同步</h2>
    </div>
    <div class="card-body">
      <!-- 后端地址配置 -->
      <div class="form-group">
        <label class="form-label" for="cloud-base-url"><i class="fas fa-server"></i> 后端服务地址</label>
        <input type="text" class="form-input" id="cloud-base-url" placeholder="http://localhost:3000/api">
        <div style="margin-top: var(--spacing-xs); font-size: 12px; color: var(--text-tertiary);">
          <i class="fas fa-info-circle"></i> 登录后可将本地数据上传到云端，实现教师/学生/家长三端数据互通
        </div>
      </div>

      <!-- 未登录：登录/注册表单 -->
      <div id="cloud-login-panel">
        <div class="form-group">
          <label class="form-label" for="cloud-username"><i class="fas fa-user"></i> 用户名</label>
          <input type="text" class="form-input" id="cloud-username" placeholder="请输入用户名">
        </div>
        <div class="form-group">
          <label class="form-label" for="cloud-password"><i class="fas fa-lock"></i> 密码</label>
          <input type="password" class="form-input" id="cloud-password" placeholder="至少6位">
        </div>
        <div class="form-group">
          <label class="form-label" for="cloud-role"><i class="fas fa-user-tag"></i> 身份</label>
          <select class="form-select" id="cloud-role">
            <option value="teacher">教师</option>
            <option value="student">学生</option>
            <option value="parent">家长</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="cloud-security-question"><i class="fas fa-shield-alt"></i> 密保问题 <span style="font-weight:400;color:var(--text-tertiary,#999);">（可选，用于找回密码）</span></label>
          <select class="form-select" id="cloud-security-question">
            <option value="">不设置密保</option>
            <option value="我的生日是哪一天？">我的生日是哪一天？</option>
            <option value="我的出生城市是哪里？">我的出生城市是哪里？</option>
            <option value="我最喜欢的老师是谁？">我最喜欢的老师是谁？</option>
            <option value="我小学的校名是什么？">我小学的校名是什么？</option>
            <option value="我的宠物名字是什么？">我的宠物名字是什么？</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="cloud-security-answer"><i class="fas fa-key"></i> 密保答案</label>
          <input type="text" class="form-input" id="cloud-security-answer" placeholder="请输入密保答案">
        </div>
        <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap; align-items: center;">
          <button class="btn btn-primary" id="cloud-login-btn"><i class="fas fa-sign-in-alt"></i> 登录</button>
          <button class="btn btn-secondary" id="cloud-register-btn"><i class="fas fa-user-plus"></i> 注册</button>
          <button class="btn btn-link" id="cloud-forgot-btn" style="margin-left:auto; color:var(--primary,#4A90D9);"><i class="fas fa-unlock-alt"></i> 忘记密码？</button>
        </div>
        <!-- 忘记密码面板 -->
        <div id="cloud-forgot-panel" class="hidden" style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px dashed var(--border-color,#e5e7eb);">
          <div class="form-group">
            <label class="form-label" for="cloud-fp-username"><i class="fas fa-user"></i> 用户名</label>
            <input type="text" class="form-input" id="cloud-fp-username" placeholder="请输入用户名">
          </div>
          <div class="form-group">
            <label class="form-label" for="cloud-fp-answer"><i class="fas fa-key"></i> 密保答案</label>
            <input type="text" class="form-input" id="cloud-fp-answer" placeholder="请输入注册时设置的密保答案">
          </div>
          <div class="form-group">
            <label class="form-label" for="cloud-fp-password"><i class="fas fa-lock"></i> 新密码</label>
            <input type="password" class="form-input" id="cloud-fp-password" placeholder="至少6位">
          </div>
          <button class="btn btn-primary" id="cloud-fp-submit-btn"><i class="fas fa-check"></i> 重置密码</button>
        </div>
      </div>

      <!-- 已登录：用户信息 + 同步操作 -->
      <div id="cloud-user-panel" class="hidden">
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--surface-secondary, #f5f7fa); border-radius: 10px;">
          <div style="font-size: 40px; color: var(--primary, #4A90D9);"><i class="fas fa-user-circle"></i></div>
          <div>
            <div id="cloud-user-name" style="font-size: 16px; font-weight: 600;">--</div>
            <div id="cloud-user-detail" style="font-size: 13px; color: var(--text-tertiary, #888);">--</div>
          </div>
        </div>
        <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap; margin-top: var(--spacing-md);">
          <button class="btn btn-primary" id="cloud-push-btn"><i class="fas fa-arrow-up"></i> 上传本地数据到云端</button>
          <button class="btn btn-secondary" id="cloud-pull-btn"><i class="fas fa-arrow-down"></i> 从云端拉取数据</button>
          <button class="btn btn-danger" id="cloud-logout-btn"><i class="fas fa-sign-out-alt"></i> 退出登录</button>
        </div>
        <div id="cloud-sync-result" class="mt-md" style="font-size: 13px; color: var(--text-secondary);"></div>
        <!-- 角色专属：班级邀请码 / 加入班级 / 绑定孩子 -->
        <div id="cloud-role-panel" style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px dashed var(--border-color,#e5e7eb);"></div>
      </div>
    </div>
  </div>

  <!-- 数据管理 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-database"></i> 数据管理</h2>
    </div>
    <div class="card-body">
      <p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">
        <i class="fas fa-info-circle"></i> 所有数据存储在浏览器本地，清除浏览器数据会导致数据丢失
      </p>
      <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
        <button class="btn btn-secondary" id="export-data-btn"><i class="fas fa-download"></i> 导出数据</button>
        <button class="btn btn-secondary" id="import-data-btn"><i class="fas fa-upload"></i> 导入数据</button>
        <button class="btn btn-danger" id="clear-data-btn"><i class="fas fa-trash-alt"></i> 清除所有数据</button>
      </div>
    </div>
  </div>

  <!-- 关于 -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title"><i class="fas fa-heart"></i> 关于</h2>
    </div>
    <div class="card-body">
      <p style="color: var(--text-secondary); line-height: 1.8;">
        <strong style="background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 18px;">乡村课堂AI助教</strong> v1.0.0<br><br>
        面向乡村教育的AI助教平台，帮助教师提升教学效率，帮助学生个性化学习，帮助家长了解孩子学习情况。<br><br>
        <i class="fas fa-shield-alt" style="color: var(--primary);"></i> 本平台采用纯前端架构，所有数据存储在本地浏览器中，保护用户隐私。
      </p>
    </div>
  </div>
</section>
`,

  };

  window.PageTemplates = templates;
})();