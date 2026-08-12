/**
 * 乡村课堂AI助教平台 - 演示数据模块
 * 
 * 提供"开箱即用"的演示数据，让评委/用户首次打开就能看到完整效果。
 * 数据设计有故事性：有进步的学生、有困难的学生、有特色的教案。
 * 
 * 命名空间：window.App.DemoData
 */

(function () {
  'use strict';

  window.App = window.App || {};

  const DEMO_FLAG = 'rural_ai_demo_loaded';

  /**
   * 检查是否已加载过演示数据
   */
  function isDemoLoaded() {
    return localStorage.getItem(DEMO_FLAG) === '1';
  }

  /**
   * 标记演示数据已加载
   */
  function markDemoLoaded() {
    localStorage.setItem(DEMO_FLAG, '1');
  }

  /**
   * 清除演示数据标记（用于重新加载）
   */
  function clearDemoFlag() {
    localStorage.removeItem(DEMO_FLAG);
  }

  // ============================================================
  // 演示数据定义
  // ============================================================

  /**
   * 学生数据 - 5个有故事的学生
   */
  const DEMO_STUDENTS = [
    {
      name: '张小明',
      grade: '四年级',
      className: '四年级1班',
      studentNo: '2024040101',
      gender: '男',
      avatar: '',
      note: '数学好，语文弱，最近进步明显'
    },
    {
      name: '李小红',
      grade: '四年级',
      className: '四年级1班',
      studentNo: '2024040102',
      gender: '女',
      avatar: '👧',
      note: '全面发展，班长，学习自觉'
    },
    {
      name: '王小刚',
      grade: '四年级',
      className: '四年级1班',
      studentNo: '2024040103',
      gender: '男',
      avatar: '👦',
      note: '基础薄弱，需要重点关注'
    },
    {
      name: '赵小丽',
      grade: '四年级',
      className: '四年级1班',
      studentNo: '2024040104',
      gender: '女',
      avatar: '',
      note: '英语突出，数学需加强'
    },
    {
      name: '陈小芳',
      grade: '四年级',
      className: '四年级1班',
      studentNo: '2024040105',
      gender: '女',
      avatar: '👧',
      note: '留守儿童，学习认真但缺乏辅导'
    }
  ];

  /**
   * 成绩数据 - 有时间趋势，能看出进步/退步
   */
  function buildScores(studentIds) {
    const now = new Date();
    const scores = [];

    // 张小明：数学持续进步，语文稳步提升
    const xmScores = [
      { subject: '数学', type: '测验', score: 72, maxScore: 100, knowledgePoints: ['乘除法', '应用题'], date: '2025-03-15' },
      { subject: '数学', type: '考试', score: 85, maxScore: 100, knowledgePoints: ['乘除法', '分数', '几何图形'], date: '2025-04-20' },
      { subject: '数学', type: '考试', score: 92, maxScore: 100, knowledgePoints: ['分数', '几何图形', '应用题'], date: '2025-05-25' },
      { subject: '语文', type: '测验', score: 65, maxScore: 100, knowledgePoints: ['阅读理解', '写作'], date: '2025-03-15' },
      { subject: '语文', type: '考试', score: 78, maxScore: 100, knowledgePoints: ['阅读理解', '写作', '古诗背诵'], date: '2025-04-20' },
      { subject: '语文', type: '考试', score: 82, maxScore: 100, knowledgePoints: ['阅读理解', '写作'], date: '2025-05-25' },
      { subject: '英语', type: '考试', score: 88, maxScore: 100, knowledgePoints: ['单词拼写', '语法'], date: '2025-05-25' }
    ];

    // 李小红：全面优秀
    const xhScores = [
      { subject: '语文', type: '考试', score: 95, maxScore: 100, knowledgePoints: ['阅读理解', '写作', '古诗背诵'], date: '2025-05-25' },
      { subject: '数学', type: '考试', score: 98, maxScore: 100, knowledgePoints: ['乘除法', '分数', '几何图形'], date: '2025-05-25' },
      { subject: '英语', type: '考试', score: 96, maxScore: 100, knowledgePoints: ['单词拼写', '语法', '阅读'], date: '2025-05-25' },
      { subject: '语文', type: '测验', score: 92, maxScore: 100, knowledgePoints: ['组词', '阅读理解'], date: '2025-04-20' },
      { subject: '数学', type: '测验', score: 95, maxScore: 100, knowledgePoints: ['分数', '应用题'], date: '2025-04-20' }
    ];

    // 王小刚：基础薄弱，波动大
    const xgScores = [
      { subject: '数学', type: '测验', score: 45, maxScore: 100, knowledgePoints: ['加减法', '乘除法'], date: '2025-03-15' },
      { subject: '数学', type: '考试', score: 52, maxScore: 100, knowledgePoints: ['加减法', '乘除法', '分数'], date: '2025-04-20' },
      { subject: '数学', type: '考试', score: 58, maxScore: 100, knowledgePoints: ['乘除法', '分数'], date: '2025-05-25' },
      { subject: '语文', type: '考试', score: 62, maxScore: 100, knowledgePoints: ['拼音', '组词', '阅读理解'], date: '2025-05-25' },
      { subject: '语文', type: '测验', score: 55, maxScore: 100, knowledgePoints: ['拼音', '组词'], date: '2025-04-20' },
      { subject: '英语', type: '考试', score: 50, maxScore: 100, knowledgePoints: ['单词拼写', '听力'], date: '2025-05-25' }
    ];

    // 赵小丽：英语强，数学弱
    const xlScores = [
      { subject: '英语', type: '考试', score: 96, maxScore: 100, knowledgePoints: ['单词拼写', '语法', '口语'], date: '2025-05-25' },
      { subject: '英语', type: '测验', score: 92, maxScore: 100, knowledgePoints: ['单词拼写', '听力'], date: '2025-04-20' },
      { subject: '数学', type: '考试', score: 68, maxScore: 100, knowledgePoints: ['分数', '几何图形', '应用题'], date: '2025-05-25' },
      { subject: '数学', type: '测验', score: 62, maxScore: 100, knowledgePoints: ['分数', '应用题'], date: '2025-04-20' },
      { subject: '语文', type: '考试', score: 85, maxScore: 100, knowledgePoints: ['阅读理解', '写作'], date: '2025-05-25' }
    ];

    // 陈小芳：认真但成绩中等，稳步提升
    const xfScores = [
      { subject: '语文', type: '测验', score: 70, maxScore: 100, knowledgePoints: ['阅读理解', '写作'], date: '2025-03-15' },
      { subject: '语文', type: '考试', score: 78, maxScore: 100, knowledgePoints: ['阅读理解', '写作', '古诗背诵'], date: '2025-04-20' },
      { subject: '语文', type: '考试', score: 83, maxScore: 100, knowledgePoints: ['阅读理解', '写作'], date: '2025-05-25' },
      { subject: '数学', type: '测验', score: 68, maxScore: 100, knowledgePoints: ['乘除法', '分数'], date: '2025-03-15' },
      { subject: '数学', type: '考试', score: 75, maxScore: 100, knowledgePoints: ['乘除法', '分数', '应用题'], date: '2025-04-20' },
      { subject: '数学', type: '考试', score: 80, maxScore: 100, knowledgePoints: ['分数', '应用题'], date: '2025-05-25' },
      { subject: '英语', type: '考试', score: 76, maxScore: 100, knowledgePoints: ['单词拼写', '语法'], date: '2025-05-25' }
    ];

    const allStudentScores = [xmScores, xhScores, xgScores, xlScores, xfScores];
    const nowStr = now.toISOString();

    studentIds.forEach(function (sid, i) {
      allStudentScores[i].forEach(function (s) {
        scores.push({
          studentId: sid,
          subject: s.subject,
          type: s.type,
          score: s.score,
          maxScore: s.maxScore,
          knowledgePoints: s.knowledgePoints,
          date: s.date,
          createdAt: nowStr
        });
      });
    });

    return scores;
  }

  /**
   * 学生画像数据 - 五维雷达图 + 归因分析
   */
  function buildProfiles(studentIds) {
    const now = new Date().toISOString();
    const profiles = [];

    // 张小明：数学强，语文弱，进步快
    profiles.push({
      studentId: studentIds[0],
      dimensions: [78, 72, 80, 75, 88], // 知识掌握, 学习习惯, 思维能力, 实践应用, 进步趋势
      dimensionLabels: ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'],
      attribution: {
        math: [
          { reason: '粗心计算错误', probability: 0.35 },
          { reason: '应用题理解偏差', probability: 0.30 },
          { reason: '概念掌握不牢', probability: 0.20 },
          { reason: '时间不够', probability: 0.15 }
        ],
        chinese: [
          { reason: '阅读量不足', probability: 0.40 },
          { reason: '写作练习少', probability: 0.30 },
          { reason: '古诗积累不够', probability: 0.20 },
          { reason: '审题不仔细', probability: 0.10 }
        ]
      },
      suggestions: [
        '数学方面继续保持，建议挑战更高难度的应用题，培养数学思维。',
        '语文需要加强课外阅读，建议每天阅读30分钟，积累好词好句。',
        '写作能力可以通过写日记来提升，从每天写50字开始。',
        '近期进步明显，值得表扬！建议设立小目标，持续激励。'
      ],
      strengths: ['数学逻辑思维强', '课堂积极发言', '近期进步显著'],
      weaknesses: ['语文阅读理解', '写作表达', '古诗积累'],
      updatedAt: now
    });

    // 李小红：全面优秀
    profiles.push({
      studentId: studentIds[1],
      dimensions: [95, 92, 90, 88, 85],
      dimensionLabels: ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'],
      attribution: {
        math: [
          { reason: '偶尔粗心', probability: 0.60 },
          { reason: '难题思路不清晰', probability: 0.25 },
          { reason: '时间分配不当', probability: 0.15 }
        ],
        chinese: [
          { reason: '作文深度不够', probability: 0.50 },
          { reason: '古诗理解偏差', probability: 0.30 },
          { reason: '审题不仔细', probability: 0.20 }
        ]
      },
      suggestions: [
        '整体表现优秀，建议担任小组长，帮助其他同学。',
        '可以尝试参加数学竞赛，拓展思维深度。',
        '作文方面建议多读优秀范文，学习写作技巧。',
        '注意劳逸结合，不要给自己太大压力。'
      ],
      strengths: ['各科均衡发展', '学习习惯好', '领导力强', '乐于助人'],
      weaknesses: ['作文深度', '竞赛题型'],
      updatedAt: now
    });

    // 王小刚：基础薄弱，需要重点帮扶
    profiles.push({
      studentId: studentIds[2],
      dimensions: [48, 55, 52, 45, 62],
      dimensionLabels: ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'],
      attribution: {
        math: [
          { reason: '基础概念不清', probability: 0.45 },
          { reason: '练习量不足', probability: 0.30 },
          { reason: '注意力不集中', probability: 0.15 },
          { reason: '缺乏学习方法', probability: 0.10 }
        ],
        chinese: [
          { reason: '拼音基础不牢', probability: 0.35 },
          { reason: '阅读量太少', probability: 0.30 },
          { reason: '写字不规范', probability: 0.20 },
          { reason: '学习兴趣不高', probability: 0.15 }
        ]
      },
      suggestions: [
        '建议从基础抓起，每天复习前一天的知识点，巩固基础。',
        '数学需要加强口算练习，建议每天做20道口算题。',
        '语文建议从拼音和组词开始，逐步提升阅读能力。',
        '家长（监护人）需要多关注孩子的学习，每天检查作业完成情况。',
        '建议安排学习伙伴，让李小红帮助他，同伴学习效果更好。'
      ],
      strengths: ['体育好', '动手能力强'],
      weaknesses: ['数学基础', '语文阅读', '学习习惯', '注意力集中'],
      updatedAt: now
    });

    // 赵小丽：英语强，数学弱
    profiles.push({
      studentId: studentIds[3],
      dimensions: [72, 80, 75, 70, 78],
      dimensionLabels: ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'],
      attribution: {
        math: [
          { reason: '空间想象力不足', probability: 0.35 },
          { reason: '应用题分析能力弱', probability: 0.30 },
          { reason: '计算粗心', probability: 0.20 },
          { reason: '公式记忆不牢', probability: 0.15 }
        ],
        english: [
          { reason: '偶尔拼写错误', probability: 0.50 },
          { reason: '语法细节忽略', probability: 0.30 },
          { reason: '听力紧张', probability: 0.20 }
        ]
      },
      suggestions: [
        '英语是优势学科，建议保持并拓展，可以参加英语角活动。',
        '数学需要加强几何图形的学习，建议用实物模型辅助理解。',
        '应用题建议多画图分析，把文字转化为图形帮助理解。',
        '计算能力需要提升，建议每天做10道计算题。'
      ],
      strengths: ['英语发音标准', '口语表达好', '学习态度认真'],
      weaknesses: ['数学几何', '应用题分析', '计算准确率'],
      updatedAt: now
    });

    // 陈小芳：留守儿童，认真但缺辅导
    profiles.push({
      studentId: studentIds[4],
      dimensions: [68, 75, 65, 60, 72],
      dimensionLabels: ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'],
      attribution: {
        math: [
          { reason: '无人辅导作业', probability: 0.40 },
          { reason: '概念理解不深', probability: 0.30 },
          { reason: '练习方法不当', probability: 0.20 },
          { reason: '缺乏自信', probability: 0.10 }
        ],
        chinese: [
          { reason: '课外阅读资源少', probability: 0.45 },
          { reason: '写作缺乏指导', probability: 0.30 },
          { reason: '古诗背诵困难', probability: 0.25 }
        ]
      },
      suggestions: [
        '孩子学习很认真，需要更多鼓励和支持。',
        '建议学校图书馆多借书给她，弥补家庭阅读资源的不足。',
        '数学应用题可以教她用画图法，降低理解难度。',
        '建议老师多关注她的情绪状态，留守儿童需要更多关爱。',
        '可以通过AI助教平台给她推送针对性练习，弥补辅导缺失。'
      ],
      strengths: ['学习态度认真', '作业按时完成', '尊敬老师'],
      weaknesses: ['数学应用题', '课外阅读量', '自信心不足'],
      updatedAt: now
    });

    return profiles;
  }

  /**
   * 教案数据 - 3份有质量的教案
   */
  const DEMO_LESSONS = [
    {
      subject: '语文',
      grade: '四年级',
      topic: '古诗两首——《望庐山瀑布》《绝句》',
      lessonType: '新授课',
      content: '# 教案：古诗两首\n\n## 教学目标\n1. 认识本课生字，会写要求书写的字。\n2. 有感情地朗读并背诵两首古诗。\n3. 理解诗句意思，感受诗中描绘的景象，体会诗人情感。\n\n## 教学重难点\n- **重点**：理解诗句意思，背诵古诗。\n- **难点**：体会诗人表达的思想感情，学习夸张的修辞手法。\n\n## 教学过程\n\n### 一、导入新课（5分钟）\n展示庐山瀑布和成都草堂的图片，提问："你看到了什么？有什么感受？"\n激发学生兴趣，引出课题。\n\n### 二、初读古诗（10分钟）\n1. 教师范读，学生跟读，注意节奏和韵律。\n2. 学生自由朗读，圈出不认识的字。\n3. 学习生字：瀑、炉、紫、尺、疑、银、绝、鹭。\n\n### 三、理解诗意（15分钟）\n\n**《望庐山瀑布》——李白**\n- "日照香炉生紫烟"：阳光照在香炉峰上，升起紫色的烟雾。\n- "遥看瀑布挂前川"：远远看去，瀑布像一条白练挂在山前。\n- "飞流直下三千尺"：瀑布从高处飞快地流下来，好像有三千尺那么长。（夸张）\n- "疑是银河落九天"：让人怀疑是银河从天上落下来。（想象）\n\n**《绝句》——杜甫**\n- 逐句讲解，结合图片帮助学生理解。\n\n### 四、感情朗读（5分钟）\n学生自由朗读，同桌互背，指名背诵。\n\n### 五、课堂小结（5分钟）\n两首诗都描写了自然美景，但表达方式不同：李白用夸张和想象，杜甫用白描手法。\n\n## 板书设计\n```\n古诗两首\n望庐山瀑布 —— 李白（夸张、想象）\n绝句 —— 杜甫（白描、写实）\n```\n\n## 教学反思\n本节课通过图片导入，学生兴趣浓厚。在理解诗意环节，部分学生对"夸张"修辞手法理解有困难，下次可以增加更多例子。',
      homeworkLevels: {
        basic: '背诵并默写两首古诗，抄写生字各3遍。',
        advanced: '用自己的话描述诗中描绘的景象，写一段100字的小短文。选择其中一首诗，画出诗中的画面。',
        extended: '搜集李白和杜甫的其他写景诗各一首，进行对比赏析。尝试用夸张手法写一首小诗。'
      },
      knowledgePoints: ['古诗理解', '修辞手法', '生字词', '背诵积累'],
      estimatedTime: 40,
      createdAt: new Date().toISOString()
    },
    {
      subject: '数学',
      grade: '四年级',
      topic: '分数的初步认识',
      lessonType: '新授课',
      content: '# 教案：分数的初步认识\n\n## 教学目标\n1. 结合具体情境初步认识分数，理解分数的含义。\n2. 能正确读写分数，知道分数各部分的名称。\n3. 能用分数表示简单图形中的涂色部分。\n\n## 教学重难点\n- **重点**：理解分数的含义，能正确读写分数。\n- **难点**：理解"平均分"是分数产生的前提。\n\n## 教学过程\n\n### 一、情境导入（5分钟）\n故事引入：中秋节到了，妈妈买了4个月饼，平均分给2个孩子，每人几个？\n如果只有1个月饼，平均分给2个孩子，每人多少？\n引出"一半"的概念，进而引出分数。\n\n### 二、探究新知（15分钟）\n\n**1. 认识二分之一**\n- 把一个月饼平均分成2份，每份是这个月饼的二分之一，写作 1/2。\n- 强调"平均分"的重要性。\n\n**2. 认识其他分数**\n- 把一张正方形纸平均分成4份，每份是这张纸的四分之一，写作 1/4。\n- 涂色表示分数：涂1份是1/4，涂2份是2/4。\n\n**3. 分数各部分名称**\n- 分数线、分子、分母的含义。\n\n### 三、巩固练习（15分钟）\n1. 判断：哪些图形的涂色部分可以用1/2表示？\n2. 用分数表示下面图形中的涂色部分。\n3. 生活应用：一块蛋糕平均切成8块，吃了3块，用分数怎么表示？\n\n### 四、课堂小结（5分钟）\n- 什么是分数？\n- 分数产生的条件是什么？（平均分）\n- 分数各部分叫什么？\n\n## 板书设计\n```\n分数的初步认识\n平均分 → 分数\n1/2  读作：二分之一\n1/4  读作：四分之一\n分子 / 分母\n      分数线\n```',
      homeworkLevels: {
        basic: '完成课本第92页练习，读写分数并涂色表示。',
        advanced: '找一找生活中的分数，用画图的方式表示出来。完成课本第93页拓展题。',
        extended: '动手做：用一张纸折出1/2、1/4、1/8，并涂上不同颜色。思考：1/2和1/4哪个大？为什么？'
      },
      knowledgePoints: ['分数概念', '平均分', '分数读写', '分数比较'],
      estimatedTime: 40,
      createdAt: new Date().toISOString()
    },
    {
      subject: '英语',
      grade: '四年级',
      topic: 'Unit 4 My Home - Part A Let\'s talk',
      lessonType: '对话课',
      content: '# 教案：Unit 4 My Home - Part A\n\n## 教学目标\n1. 能听懂、会说：Is this your bedroom? Yes, it is. / No, it isn\'t.\n2. 能听懂、会说房间名称：bedroom, living room, kitchen, bathroom, study。\n3. 能在实际情境中运用句型询问和确认房间。\n\n## 教学重难点\n- **重点**：房间词汇和询问句型。\n- **难点**：bedroom 和 bathroom 的发音区分。\n\n## 教学过程\n\n### 一、热身导入（5分钟）\n歌曲：My Home\n展示教师自己家的平面图，介绍各房间。\n\n### 二、新课呈现（15分钟）\n1. 利用课件展示各房间图片，教授词汇。\n2. 游戏：Quick Response - 教师说房间名，学生指图片。\n3. 引入对话：Is this your bedroom? Yes, it is. / No, it isn\'t. It\'s the living room.\n\n### 三、趣味操练（15分钟）\n1. 角色扮演：两人一组，用句型对话。\n2. 游戏：Blindfold Guess - 蒙眼摸房间模型猜名称。\n3. 拓展：设计自己的理想房间，用英语介绍。\n\n### 四、总结作业（5分钟）\n回顾词汇和句型，布置作业。\n\n## 板书设计\n```\nUnit 4 My Home\nbedroom    living room\nkitchen    bathroom    study\n\nIs this your ...?\nYes, it is. / No, it isn\'t.\n```',
      homeworkLevels: {
        basic: '听录音跟读对话5遍，抄写房间单词各3遍。',
        advanced: '画一画自己的家，用英语标注各房间名称。和家人用英语对话练习。',
        extended: '制作一个英语房间卡片游戏，和家人一起玩。录制一段介绍自己家的英语小视频。'
      },
      knowledgePoints: ['房间词汇', '询问句型', '听力理解', '口语表达'],
      estimatedTime: 40,
      createdAt: new Date().toISOString()
    }
  ];

  /**
   * 答疑记录
   */
  function buildQARecords(studentIds) {
    const now = new Date().toISOString();
    return [
      {
        studentId: studentIds[2], // 王小刚
        imageUrl: '',
        question: '老师，12×3怎么算？我总是算错。',
        answer: '王小刚同学，12×3可以这样算：\n\n**方法一：拆分法**\n12 × 3 = (10 + 2) × 3 = 10×3 + 2×3 = 30 + 6 = 36\n\n**方法二：竖式计算**\n```\n  12\n×  3\n----\n  36\n```\n步骤：\n1. 先算个位：2 × 3 = 6，写在个位\n2. 再算十位：1 × 3 = 3，写在十位\n3. 结果是 36\n\n**小贴士**：乘法就是几个相同的数相加。12×3 就是 12+12+12 = 36。\n\n**涉及知识点**：两位数乘一位数、竖式计算',
        knowledgePoints: ['乘除法', '竖式计算'],
        createdAt: now
      },
      {
        studentId: studentIds[0], // 张小明
        imageUrl: '',
        question: '"飞流直下三千尺"用了什么修辞手法？',
        answer: '这句诗用了**夸张**的修辞手法。\n\n**解析：**\n- "三千尺"并不是真的有三千尺那么长\n- 诗人用夸张的手法，形容瀑布从高处飞流而下的壮观景象\n- 让人感受到瀑布的气势磅礴\n\n**类似的夸张诗句还有：**\n- "白发三千丈，缘愁似个长"——李白\n- "危楼高百尺，手可摘星辰"——李白\n\n**涉及知识点**：古诗理解、修辞手法（夸张）',
        knowledgePoints: ['古诗理解', '修辞手法'],
        createdAt: now
      },
      {
        studentId: studentIds[3], // 赵小丽
        imageUrl: '',
        question: 'How to say "厨房" in English?',
        answer: '"厨房" in English is **kitchen**.\n\n**发音提示**：/kɪtʃɪn/\n- 注意不是 "kitchen" 读成 "kichen"，中间有 /tʃ/ 的音\n- 可以和 "bedroom"（卧室）、"bathroom"（浴室）一起记忆\n\n**例句**：\n- My mother is in the kitchen.（我妈妈在厨房里。）\n- The kitchen is very clean.（厨房很干净。）\n\n**涉及知识点**：房间词汇、英语发音',
        knowledgePoints: ['单词拼写', '口语表达'],
        createdAt: now
      }
    ];
  }

  /**
   * 练习记录
   */
  function buildPracticeRecords(studentIds) {
    const now = new Date().toISOString();
    const records = [];

    // 张小明 - 数学练习表现好
    records.push({ studentId: studentIds[0], knowledgePoint: '乘除法', difficulty: 2, totalQuestions: 10, correctCount: 9, timeSpent: 300, date: '2025-05-20', createdAt: now });
    records.push({ studentId: studentIds[0], knowledgePoint: '分数', difficulty: 2, totalQuestions: 10, correctCount: 7, timeSpent: 420, date: '2025-05-22', createdAt: now });
    records.push({ studentId: studentIds[0], knowledgePoint: '阅读理解', difficulty: 2, totalQuestions: 5, correctCount: 3, timeSpent: 600, date: '2025-05-23', createdAt: now });

    // 李小红 - 全面优秀
    records.push({ studentId: studentIds[1], knowledgePoint: '分数', difficulty: 3, totalQuestions: 10, correctCount: 10, timeSpent: 240, date: '2025-05-20', createdAt: now });
    records.push({ studentId: studentIds[1], knowledgePoint: '写作', difficulty: 3, totalQuestions: 5, correctCount: 5, timeSpent: 900, date: '2025-05-22', createdAt: now });

    // 王小刚 - 基础练习
    records.push({ studentId: studentIds[2], knowledgePoint: '加减法', difficulty: 1, totalQuestions: 20, correctCount: 14, timeSpent: 600, date: '2025-05-20', createdAt: now });
    records.push({ studentId: studentIds[2], knowledgePoint: '乘除法', difficulty: 1, totalQuestions: 15, correctCount: 8, timeSpent: 720, date: '2025-05-22', createdAt: now });
    records.push({ studentId: studentIds[2], knowledgePoint: '拼音', difficulty: 1, totalQuestions: 10, correctCount: 6, timeSpent: 480, date: '2025-05-23', createdAt: now });

    // 赵小丽 - 英语强数学弱
    records.push({ studentId: studentIds[3], knowledgePoint: '单词拼写', difficulty: 2, totalQuestions: 15, correctCount: 14, timeSpent: 300, date: '2025-05-20', createdAt: now });
    records.push({ studentId: studentIds[3], knowledgePoint: '几何图形', difficulty: 2, totalQuestions: 10, correctCount: 5, timeSpent: 540, date: '2025-05-22', createdAt: now });
    records.push({ studentId: studentIds[3], knowledgePoint: '应用题', difficulty: 2, totalQuestions: 5, correctCount: 2, timeSpent: 600, date: '2025-05-23', createdAt: now });

    // 陈小芳 - 稳步提升
    records.push({ studentId: studentIds[4], knowledgePoint: '阅读理解', difficulty: 2, totalQuestions: 5, correctCount: 3, timeSpent: 480, date: '2025-05-20', createdAt: now });
    records.push({ studentId: studentIds[4], knowledgePoint: '乘除法', difficulty: 2, totalQuestions: 10, correctCount: 7, timeSpent: 540, date: '2025-05-22', createdAt: now });
    records.push({ studentId: studentIds[4], knowledgePoint: '分数', difficulty: 2, totalQuestions: 10, correctCount: 8, timeSpent: 480, date: '2025-05-25', createdAt: now });

    return records;
  }

  /**
   * 学情报告
   */
  function buildReports(studentIds) {
    const now = new Date().toISOString();
    const reports = [];

    const weeklyData = [
      { studyHours: 8, homeworkCompletion: 90, testScores: { '语文': 82, '数学': 92, '英语': 88 }, weakPoints: ['阅读理解', '写作'], trend: 'up', avgScore: 87, className: '四年级1班' },
      { studyHours: 12, homeworkCompletion: 100, testScores: { '语文': 95, '数学': 98, '英语': 96 }, weakPoints: ['作文深度'], trend: 'stable', avgScore: 96, className: '四年级1班' },
      { studyHours: 5, homeworkCompletion: 65, testScores: { '语文': 62, '数学': 58, '英语': 50 }, weakPoints: ['加减法', '乘除法', '拼音', '组词'], trend: 'up', avgScore: 57, className: '四年级1班' },
      { studyHours: 9, homeworkCompletion: 95, testScores: { '语文': 85, '数学': 68, '英语': 96 }, weakPoints: ['几何图形', '应用题'], trend: 'stable', avgScore: 83, className: '四年级1班' },
      { studyHours: 7, homeworkCompletion: 85, testScores: { '语文': 83, '数学': 80, '英语': 76 }, weakPoints: ['应用题', '课外阅读'], trend: 'up', avgScore: 80, className: '四年级1班' }
    ];

    const monthlyData = [
      { studyHours: 35, homeworkCompletion: 88, testScores: { '语文': 78, '数学': 85, '英语': 85 }, weakPoints: ['阅读理解', '写作', '古诗背诵'], trend: 'up', avgScore: 83, className: '四年级1班' },
      { studyHours: 45, homeworkCompletion: 98, testScores: { '语文': 93, '数学': 95, '英语': 94 }, weakPoints: ['作文深度', '竞赛题型'], trend: 'stable', avgScore: 94, className: '四年级1班' },
      { studyHours: 22, homeworkCompletion: 60, testScores: { '语文': 58, '数学': 52, '英语': 48 }, weakPoints: ['加减法', '乘除法', '拼音', '组词', '单词拼写'], trend: 'up', avgScore: 53, className: '四年级1班' },
      { studyHours: 38, homeworkCompletion: 92, testScores: { '语文': 82, '数学': 65, '英语': 93 }, weakPoints: ['几何图形', '应用题', '分数'], trend: 'stable', avgScore: 80, className: '四年级1班' },
      { studyHours: 30, homeworkCompletion: 82, testScores: { '语文': 78, '数学': 75, '英语': 73 }, weakPoints: ['应用题', '课外阅读', '写作'], trend: 'up', avgScore: 75, className: '四年级1班' }
    ];

    studentIds.forEach(function (sid, i) {
      reports.push({
        studentId: sid,
        type: 'weekly',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        data: weeklyData[i],
        createdAt: now
      });
      reports.push({
        studentId: sid,
        type: 'monthly',
        startDate: '2025-05-01',
        endDate: '2025-05-31',
        data: monthlyData[i],
        createdAt: now
      });
    });

    return reports;
  }

  /**
   * 错题本数据
   */
  function buildWrongAnswers(studentIds) {
    const now = new Date().toISOString();
    return [
      // 王小刚 - 数学基础薄弱
      {
        studentId: studentIds[2],
        subject: '数学',
        question: '计算：25 × 4 = ?',
        myAnswer: '254',
        correctAnswer: '100',
        explanation: '25 × 4 表示 4 个 25 相加，即 25+25+25+25=100。也可以拆分：25×4 = 25×2×2 = 50×2 = 100。',
        knowledgePoints: ['乘除法'],
        knowledgePoint: '乘除法',
        status: 'wrong',
        source: 'practice',
        date: '2025-05-20',
        createdAt: now
      },
      {
        studentId: studentIds[2],
        subject: '数学',
        question: '一个长方形长8厘米，宽5厘米，周长是多少？',
        myAnswer: '13厘米',
        correctAnswer: '26厘米',
        explanation: '长方形周长 = (长+宽)×2 = (8+5)×2 = 13×2 = 26厘米。注意要乘以2，因为长方形有两条长和两条宽。',
        knowledgePoints: ['几何图形'],
        knowledgePoint: '几何图形',
        status: 'wrong',
        source: 'practice',
        date: '2025-05-22',
        createdAt: now
      },
      {
        studentId: studentIds[2],
        subject: '语文',
        question: '给"高兴"写一个近义词和一个反义词。',
        myAnswer: '近义词：开心，反义词：伤心',
        correctAnswer: '近义词：快乐/愉快/欢喜，反义词：难过/悲伤/痛苦',
        explanation: '"高兴"的近义词有：快乐、愉快、欢喜、开心等。反义词有：难过、悲伤、痛苦、忧愁等。写答案时要选最准确的词语。',
        knowledgePoints: ['组词'],
        knowledgePoint: '组词',
        status: 'mastered',
        source: 'practice',
        date: '2025-05-18',
        createdAt: now
      },
      // 张小明 - 语文弱
      {
        studentId: studentIds[0],
        subject: '语文',
        question: '"欲穷千里目，更上一层楼"出自哪首诗？作者是谁？',
        myAnswer: '李白《静夜思》',
        correctAnswer: '王之涣《登鹳雀楼》',
        explanation: '"欲穷千里目，更上一层楼"出自唐代诗人王之涣的《登鹳雀楼》。全诗：白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
        knowledgePoints: ['古诗背诵'],
        knowledgePoint: '古诗背诵',
        status: 'wrong',
        source: 'practice',
        date: '2025-05-23',
        createdAt: now
      },
      {
        studentId: studentIds[0],
        subject: '语文',
        question: '用"不但……而且……"造句。',
        myAnswer: '我不但吃饭，而且喝水。',
        correctAnswer: '他不但学习好，而且体育也很棒。（前后两个分句要有递进关系）',
        explanation: '"不但……而且……"表示递进关系，后面的内容要比前面的更进一步。"吃饭"和"喝水"是并列关系，不是递进关系。应该用在有程度加深的内容上。',
        knowledgePoints: ['写作'],
        knowledgePoint: '写作',
        status: 'wrong',
        source: 'practice',
        date: '2025-05-25',
        createdAt: now
      },
      // 赵小丽 - 数学弱
      {
        studentId: studentIds[3],
        subject: '数学',
        question: '比较大小：3/4 和 2/3 哪个大？',
        myAnswer: '2/3 大',
        correctAnswer: '3/4 大',
        explanation: '通分比较：3/4 = 9/12，2/3 = 8/12。因为 9/12 > 8/12，所以 3/4 > 2/3。也可以化成小数：3/4=0.75，2/3≈0.667。',
        knowledgePoints: ['分数'],
        knowledgePoint: '分数',
        status: 'wrong',
        source: 'practice',
        date: '2025-05-22',
        createdAt: now
      },
      {
        studentId: studentIds[3],
        subject: '数学',
        question: '一个三角形三个角分别是60°、60°、60°，这是什么三角形？',
        myAnswer: '直角三角形',
        correctAnswer: '等边三角形（也是锐角三角形）',
        explanation: '三个角都是60°的三角形是等边三角形。直角三角形必须有一个角是90°。等边三角形的三个角相等，都是60°，三条边也相等。',
        knowledgePoints: ['几何图形'],
        knowledgePoint: '几何图形',
        status: 'mastered',
        source: 'practice',
        date: '2025-05-20',
        createdAt: now
      },
      // 陈小芳 - 稳步提升中
      {
        studentId: studentIds[4],
        subject: '数学',
        question: '小明有24个苹果，平均分给6个小朋友，每人几个？',
        myAnswer: '3个',
        correctAnswer: '4个',
        explanation: '24  6 = 4（个）。可以用乘法口诀验证：四六二十四，所以 24÷6=4。',
        knowledgePoints: ['乘除法'],
        knowledgePoint: '乘除法',
        status: 'wrong',
        source: 'practice',
        date: '2025-05-25',
        createdAt: now
      }
    ];
  }

  // ============================================================
  // 公开接口
  // ============================================================

  const DemoData = {
    /**
     * 加载演示数据到数据库
     * 如果已有数据则先清除
     * @returns {Promise<object>} 返回加载结果统计
     */
    async load() {
      const Storage = window.App.Storage;
      if (!Storage) {
        throw new Error('Storage 模块未初始化');
      }

      // 初始化数据库
      await Storage.db.init();

      // 清除旧数据
      await Storage.db.clearAll();

      // 1. 添加学生
      const studentIds = [];
      for (const s of DEMO_STUDENTS) {
        const id = await Storage.db.add('students', s);
        studentIds.push(id);
      }

      // 2. 添加成绩
      const scores = buildScores(studentIds);
      await Storage.db.batchAdd('scores', scores);

      // 3. 添加画像
      const profiles = buildProfiles(studentIds);
      await Storage.db.batchAdd('profiles', profiles);

      // 4. 添加教案
      await Storage.db.batchAdd('lessons', DEMO_LESSONS);

      // 5. 添加答疑记录
      const qaRecords = buildQARecords(studentIds);
      await Storage.db.batchAdd('qa_records', qaRecords);

      // 6. 添加练习记录
      const practiceRecords = buildPracticeRecords(studentIds);
      await Storage.db.batchAdd('practice_records', practiceRecords);

      // 7. 添加学情报告
      const reports = buildReports(studentIds);
      await Storage.db.batchAdd('reports', reports);

      // 8. 添加错题本数据
      const wrongAnswers = buildWrongAnswers(studentIds);
      await Storage.db.batchAdd('wrong_answers', wrongAnswers);

      // 9. 设置默认学生（学生端用）
      Storage.config.setCurrentStudentId(studentIds[0]);

      // 10. 标记已加载
      markDemoLoaded();

      return {
        students: studentIds.length,
        scores: scores.length,
        profiles: profiles.length,
        lessons: DEMO_LESSONS.length,
        qaRecords: qaRecords.length,
        practiceRecords: practiceRecords.length,
        reports: reports.length,
        wrongAnswers: wrongAnswers.length
      };
    },

    /**
     * 检查是否需要加载演示数据
     */
    needsLoad() {
      return !isDemoLoaded();
    },

    /**
     * 重新加载演示数据（清除标记后重新加载）
     */
    async reload() {
      clearDemoFlag();
      return DemoData.load();
    },

    /**
     * 获取演示学生列表（用于页面展示）
     */
    getStudents() {
      return DEMO_STUDENTS;
    },

    /**
     * 获取演示统计摘要
     */
    getSummary() {
      return {
        studentCount: DEMO_STUDENTS.length,
        className: '四年级1班',
        schoolName: '云南省昭通市XX县XX镇中心小学',
        teacherName: '李老师',
        semester: '2025年春季学期'
      };
    }
  };

  window.App.DemoData = DemoData;

})();
