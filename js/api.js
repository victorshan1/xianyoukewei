/**
 * Qwen API 集成层
 * 为乡村课堂AI助教平台提供AI能力
 * 使用 Qwen 系列模型 API，兼容 OpenAI 格式
 */

(function() {
  'use strict';

  // 确保全局命名空间存在
  window.App = window.App || {};

  /**
   * API 核心配置和请求封装
   */
  const API = {
    // 基础配置
    _baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    get baseURL() {
      const customUrl = (window.App && window.App.Storage && window.App.Storage.config)
        ? window.App.Storage.config.getApiBaseUrl()
        : localStorage.getItem('rural_ai_api_base_url');
      return customUrl || this._baseURL;
    },
    defaultTimeout: 30000, // 默认超时时间：30秒
    defaultModel: 'qwen-max',
    lightweightModel: 'qwen-plus',
    visionModel: 'qwen-vl-max',

    /**
     * 获取当前配置的模型名称（优先从 storage 读取）
     * @returns {string}
     */
    getCurrentModel() {
      const stored = (window.App && window.App.Storage && window.App.Storage.config)
        ? window.App.Storage.config.getModel()
        : localStorage.getItem('rural_ai_model');
      return stored || this.defaultModel;
    },

    /**
     * 从 Storage 获取 API Key
     * @returns {string} API Key
     * @throws {Error} 当 API Key 未配置时抛出错误
     */
    getApiKey() {
      const apiKey = (window.App && window.App.Storage && window.App.Storage.config) 
        ? window.App.Storage.config.getApiKey() 
        : localStorage.getItem('qwen_api_key');
      if (!apiKey) {
        const error = new Error('API Key 未配置，请在设置页面配置 API Key');
        error.type = 'auth';
        throw error;
      }
      return apiKey;
    },

    /**
     * 通用请求方法
     * @param {string} endpoint - API 端点路径
     * @param {object} body - 请求体
     * @param {object} options - 可选配置
     * @param {number} options.timeout - 超时时间（毫秒）
     * @returns {Promise<object>} 响应数据
     */
    async request(endpoint, body, options = {}) {
      const timeout = options.timeout || this.defaultTimeout;
      const apiKey = this.getApiKey();

      // 调用开始回调
      if (this.callbacks.onStart) {
        this.callbacks.onStart();
      }

      try {
        // 创建 AbortController 用于超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 解析响应
        const data = await response.json();

        // 检查 API 错误
        if (!response.ok) {
          const error = new Error(data.error?.message || 'API 请求失败');
          error.type = 'api';
          error.statusCode = response.status;
          error.details = data.error;
          throw error;
        }

        // 调用成功回调
        if (this.callbacks.onSuccess) {
          this.callbacks.onSuccess(data);
        }

        return data;

      } catch (error) {
        // 区分错误类型
        if (error.name === 'AbortError') {
          error.type = 'timeout';
          error.message = '请求超时，请重试';
        } else if (error.type === 'auth') {
          // API Key 未配置，保持原样
        } else if (error.type === 'api') {
          // API 错误，保持原样
        } else {
          // 网络错误
          error.type = 'network';
          error.message = '网络连接失败，请检查网络后重试';
        }

        // 调用错误回调
        if (this.callbacks.onError) {
          this.callbacks.onError({
            type: error.type,
            message: error.message,
            details: error.details
          });
        }

        throw error;

      } finally {
        // 调用结束回调（无论成功失败）
        if (this.callbacks.onEnd) {
          this.callbacks.onEnd();
        }
      }
    },

    /**
     * 带重试的请求方法
     * @param {Function} requestFn - 请求函数
     * @param {object} options - 重试配置
     * @param {number} options.maxRetries - 最大重试次数
     * @param {number} options.delay - 重试间隔（毫秒）
     * @returns {Promise<any>} 响应数据
     */
    async retry(requestFn, options = {}) {
      const maxRetries = options.maxRetries || 3;
      const delay = options.delay || 1000;

      let lastError;
      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await requestFn();
        } catch (error) {
          lastError = error;
          
          // 认证错误不重试
          if (error.type === 'auth') {
            throw error;
          }

          // 最后一次重试失败，抛出错误
          if (i === maxRetries) {
            throw lastError;
          }

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    },

    /**
     * 状态回调管理
     */
    callbacks: {
      onStart: null,
      onSuccess: null,
      onError: null,
      onEnd: null,

      /**
       * 设置回调函数
       * @param {object} callbacks - 回调函数对象
       */
      setCallbacks(callbacks) {
        if (callbacks.onStart) this.onStart = callbacks.onStart;
        if (callbacks.onSuccess) this.onSuccess = callbacks.onSuccess;
        if (callbacks.onError) this.onError = callbacks.onError;
        if (callbacks.onEnd) this.onEnd = callbacks.onEnd;
      }
    }
  };

  /**
   * 文本生成 API
   */
  API.text = {
    /**
     * 通用文本生成
     * @param {object[]} messages - 消息数组
     * @param {object} options - 可选配置
     * @param {string} options.model - 模型名称
     * @param {number} options.temperature - 温度参数
     * @param {number} options.maxTokens - 最大 token 数
     * @returns {Promise<string>} 生成的文本
     */
    async chat(messages, options = {}) {
      const body = {
        model: options.model || API.getCurrentModel(),
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      };

      const response = await API.request('/chat/completions', body);
      if (!response.choices || !response.choices[0]) {
        const error = new Error('API 返回格式异常，请检查 API Key 和 Base URL 是否正确');
        error.type = 'api';
        throw error;
      }
      return response.choices[0].message.content;
    },

    /**
     * 生成教案
     * @param {string} subject - 学科
     * @param {string} grade - 年级
     * @param {string} topic - 课题
     * @param {string} templateType - 教案模板类型：new-lesson/review/experiment/commentary
     * @returns {Promise<string>} 教案内容
     */
    async generateLessonPlan(subject, grade, topic, templateType) {
      const templateConfigs = {
        'new-lesson': {
          name: '新授课',
          sections: '教学目标（知识与技能、过程与方法、情感态度与价值观）\n   - 教学重点和难点\n   - 教学准备（教具、学具）\n   - 教学过程（导入、新授、练习、小结、作业）\n   - 板书设计',
          focus: '设计互动性强的新授环节，循序渐进地引导学生掌握新知识'
        },
        'review': {
          name: '复习课',
          sections: '复习目标\n   - 知识梳理框架（思维导图或表格形式）\n   - 重点难点回顾\n   - 典型例题精讲（3-5道）\n   - 巩固练习\n   - 易错点提醒',
          focus: '帮助学生系统梳理知识脉络，强化薄弱环节，注重知识的联系与整合'
        },
        'experiment': {
          name: '实验课',
          sections: '实验教学目标\n   - 实验原理\n   - 实验器材清单（优先使用乡村易得材料）\n   - 实验步骤（详细、安全）\n   - 观察记录表\n   - 实验结论与讨论\n   - 安全注意事项',
          focus: '注重实验安全性和可操作性，使用简单易得的实验材料，培养学生的动手能力和科学探究精神'
        },
        'commentary': {
          name: '讲评课',
          sections: '讲评目标\n   - 整体情况分析（得分率、典型错误）\n   - 逐题讲评（正确答案、错误原因、解题思路）\n   - 知识点归纳\n   - 变式训练（2-3道同类题）\n   - 学习方法指导',
          focus: '针对学生常见错误进行深度分析，帮助学生理解错误原因，掌握正确的解题方法'
        }
      };

      const config = templateConfigs[templateType] || templateConfigs['new-lesson'];

      const prompt = `你是一位经验丰富的${subject}教师，请为${grade}学生设计一份关于"${topic}"的${config.name}教案。

要求：
1. 符合课程标准要求
2. 包含以下完整部分：
   - ${config.sections}
3. 考虑乡村学校实际情况，使用简单易得的教学资源
4. ${config.focus}

请以结构化的格式输出完整教案。`;

      const messages = [
        {
          role: 'system',
          content: '你是一位专业的教育助手，擅长设计符合乡村教育实际的教学方案。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      return await this.chat(messages, { maxTokens: 3000 });
    },

    /**
     * 生成分层作业
     * @param {string} subject - 学科
     * @param {string} grade - 年级
     * @param {string} topic - 课题
     * @returns {Promise<object>} 分层作业对象 { basic, advanced, extended }
     */
    async generateHomework(subject, grade, topic) {
      const prompt = `你是一位${subject}教师，请为${grade}学生设计关于"${topic}"的分层作业。

要求：
1. 基础题（5道）：巩固基本概念和基础技能，适合所有学生
2. 提高题（3道）：需要一定思考和分析能力，适合中等及以上学生
3. 拓展题（2道）：综合性强，需要创新思维，适合学有余力的学生

每道题请包含：
- 题目内容
- 参考答案
- 考查的知识点

请以 JSON 格式返回，结构如下：
{
  "basic": "基础题内容（包含题目和答案）",
  "advanced": "提高题内容（包含题目和答案）",
  "extended": "拓展题内容（包含题目和答案）"
}`;

      const messages = [
        {
          role: 'system',
          content: '你是一位专业的教育助手，擅长设计分层作业。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.chat(messages, { maxTokens: 3000 });
      
      // 尝试解析 JSON
      try {
        // 提取 JSON 部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // 解析失败，返回原始文本
      }

      // 如果解析失败，返回默认结构
      return {
        basic: response,
        advanced: '',
        extended: ''
      };
    },

    /**
     * 生成个性化教学建议
     * @param {object} studentProfile - 学生画像数据
     * @returns {Promise<string>} 教学建议
     */
    async generateSuggestions(studentProfile) {
      const prompt = `基于以下学生画像数据，请生成针对性的教学建议：

学生信息：
- 姓名：${studentProfile.name || '学生'}
- 年级：${studentProfile.grade || '未知'}
- 学科表现：${JSON.stringify(studentProfile.performance || {})}
- 学习特点：${studentProfile.learningStyle || '未知'}
- 兴趣爱好：${studentProfile.interests || '未知'}
- 家庭情况：${studentProfile.familyBackground || '未知'}
- 其他特征：${studentProfile.otherInfo || '无'}

请从以下方面给出建议：
1. 教学策略调整
2. 个性化辅导方案
3. 家校沟通建议
4. 学习动机激发方法
5. 具体可操作的改进措施

建议要具体、可操作，考虑乡村教育实际情况。`;

      const messages = [
        {
          role: 'system',
          content: '你是一位经验丰富的教育专家，擅长根据学生特点提供个性化教学建议。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      return await this.chat(messages, { maxTokens: 2500 });
    },

    /**
     * 生成学情分析报告
     * @param {object} data - 学情数据
     * @param {string} type - 报告类型：'weekly'（周报）或 'monthly'（月报）
     * @returns {Promise<string>} 分析报告
     */
    async generateAnalysisReport(data, type = 'weekly') {
      const periodText = type === 'weekly' ? '周' : '月';
      
      const prompt = `请根据以下数据生成${periodText}学情分析报告：

数据概览：
${JSON.stringify(data, null, 2)}

报告要求：
1. 整体学习情况分析
2. 各知识点掌握情况
3. 学生表现分层（优秀、良好、待提高）
4. 存在的问题和原因分析
5. 下一步教学建议
6. 需要重点关注的学生及辅导方案

报告要数据驱动、客观准确、建议具体可行。`;

      const messages = [
        {
          role: 'system',
          content: '你是一位专业的教育数据分析师，擅长从数据中发现问题并提供教学改进建议。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      return await this.chat(messages, { maxTokens: 3000 });
    },

    /**
     * 生成家校沟通话术
     * @param {string} scenario - 沟通场景
     * @param {object} studentData - 学生数据
     * @returns {Promise<string>} 沟通话术
     */
    async generateCommunicationScript(scenario, studentData) {
      const prompt = `请为以下家校沟通场景生成话术：

沟通场景：${scenario}

学生情况：
- 姓名：${studentData.name || '学生'}
- 年级：${studentData.grade || '未知'}
- 近期表现：${studentData.recentPerformance || '未知'}
- 需要沟通的问题：${studentData.issue || '未知'}
- 家庭背景：${studentData.familyBackground || '未知'}

话术要求：
1. 语气亲切、尊重家长
2. 客观描述学生情况，避免指责
3. 提出具体可行的建议
4. 体现对学生的关心和支持
5. 考虑乡村家长的文化水平和沟通习惯

请生成：
- 开场白
- 问题描述
- 建议方案
- 结束语`;

      const messages = [
        {
          role: 'system',
          content: '你是一位经验丰富的班主任，擅长与家长进行有效沟通。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      return await this.chat(messages, { maxTokens: 2000 });
    },

    /**
     * 生成练习题
     * @param {string} knowledgePoint - 知识点
     * @param {number} difficulty - 难度（1-5）
     * @param {number} count - 题目数量
     * @returns {Promise<object[]>} 题目数组
     */
    async generatePracticeQuestions(knowledgePoint, difficulty = 3, count = 5) {
      const difficultyText = ['', '基础', '较易', '中等', '较难', '困难'][difficulty];
      
      const prompt = `请生成${count}道关于"${knowledgePoint}"的练习题，难度为${difficultyText}（${difficulty}/5）。

每道题请包含：
1. 题目内容
2. 四个选项（如果是选择题）或留空（如果是填空/解答题）
3. 正确答案
4. 详细解析
5. 考查的具体知识点

请以 JSON 数组格式返回，每个题目对象结构如下：
{
  "question": "题目内容",
  "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"] 或 null,
  "answer": "正确答案",
  "explanation": "详细解析",
  "knowledgePoint": "考查的知识点"
}`;

      const messages = [
        {
          role: 'system',
          content: '你是一位专业的命题教师，擅长设计高质量的练习题。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.chat(messages, { maxTokens: 3000 });
      
      // 尝试解析 JSON 数组
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // 解析失败
      }

      // 解析失败，返回包含原始文本的数组
      return [{
        question: response,
        options: null,
        answer: '',
        explanation: '',
        knowledgePoint: knowledgePoint
      }];
    }
  };

  /**
   * 视觉理解 API
   */
  API.vision = {
    /**
     * 将图片转换为 base64 编码
     * @param {File|Blob} file - 图片文件
     * @returns {Promise<string>} base64 编码的图片
     */
    imageToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // 返回 base64 数据（去掉 data:image/xxx;base64, 前缀）
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    /**
     * 识别图片中的题目并解析
     * @param {string} imageBase64 - base64 编码的图片
     * @returns {Promise<object>} 解析结果 { question, answer, steps, knowledgePoints }
     */
    async analyzeQuestion(imageBase64) {
      const prompt = `请识别图片中的题目并进行详细解析。

要求：
1. 准确识别题目内容
2. 给出正确答案
3. 提供详细的解题步骤
4. 总结涉及的知识点

请以 JSON 格式返回，结构如下：
{
  "question": "识别出的题目内容",
  "answer": "正确答案",
  "steps": "详细的解题步骤（用数字标号）",
  "knowledgePoints": ["知识点1", "知识点2", ...]
}`;

      const body = {
        model: API.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      };

      const response = await API.request('/chat/completions', body);
      if (!response.choices || !response.choices[0]) {
        const error = new Error('API 返回格式异常，请检查 API Key 和 Base URL 是否正确');
        error.type = 'api';
        throw error;
      }
      const content = response.choices[0].message.content;

      // 尝试解析 JSON
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // 解析失败
      }

      // 解析失败，返回默认结构
      return {
        question: content,
        answer: '',
        steps: '',
        knowledgePoints: []
      };
    }
  };

  // 将 API 挂载到全局命名空间
  window.App.API = API;

  console.log('[App.API] Qwen API 集成层已加载');
})();
