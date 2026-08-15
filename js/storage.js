/**
 * 乡村课堂AI助教平台 - 数据存储层
 * 
 * 提供 localStorage 和 IndexedDB 的封装，支持配置数据、结构化数据、
 * 示例数据初始化、数据导入导出等功能。
 * 
 * 命名空间：window.App.Storage
 * 子模块：config（localStorage）、db（IndexedDB）、seed（示例数据）、export（导入导出）
 */

(function () {
  'use strict';

  // 确保全局命名空间存在
  window.App = window.App || {};

  // ============================================================
  // 一、localStorage 封装 —— 配置数据
  // 命名空间：App.Storage.config
  // 用于存储小量配置数据，如 API Key、当前端口等
  // ============================================================
  const CONFIG_PREFIX = 'rural_ai_';

  const config = {
    /**
     * 获取 API Key
     * @returns {string|null}
     */
    getApiKey() {
      return localStorage.getItem(CONFIG_PREFIX + 'api_key');
    },

    /**
     * 设置 API Key
     * @param {string} key
     */
    setApiKey(key) {
      localStorage.setItem(CONFIG_PREFIX + 'api_key', key);
    },

    /**
     * 获取当前端口（teacher / student / parent）
     * @returns {string}
     */
    getCurrentPortal() {
      return localStorage.getItem(CONFIG_PREFIX + 'current_portal') || 'teacher';
    },

    /**
     * 设置当前端口
     * @param {string} portal - teacher / student / parent
     */
    setPortal(portal) {
      localStorage.setItem(CONFIG_PREFIX + 'current_portal', portal);
    },

    /**
     * 获取 API Base URL
     * @returns {string|null}
     */
    getApiBaseUrl() {
      return localStorage.getItem(CONFIG_PREFIX + 'api_base_url');
    },

    /**
     * 设置 API Base URL
     * @param {string} url
     */
    setApiBaseUrl(url) {
      localStorage.setItem(CONFIG_PREFIX + 'api_base_url', url);
    },

    /**
     * 获取 AI 模型
     * @returns {string|null}
     */
    getModel() {
      return localStorage.getItem(CONFIG_PREFIX + 'model');
    },

    /**
     * 设置 AI 模型
     * @param {string} model
     */
    setModel(model) {
      localStorage.setItem(CONFIG_PREFIX + 'model', model);
    },

    /**
     * 获取当前学生 ID（学生端使用）
     * @returns {number|null}
     */
    getCurrentStudentId() {
      const id = localStorage.getItem(CONFIG_PREFIX + 'current_student_id');
      return id ? parseInt(id) : null;
    },

    /**
     * 设置当前学生 ID
     * @param {number} studentId
     */
    setCurrentStudentId(studentId) {
      localStorage.setItem(CONFIG_PREFIX + 'current_student_id', studentId.toString());
    },

    /**
     * 获取通用配置项
     * @param {string} key
     * @returns {any}
     */
    getConfig(key) {
      const raw = localStorage.getItem(CONFIG_PREFIX + key);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return raw;
      }
    },

    /**
     * 设置通用配置项
     * @param {string} key
     * @param {any} value
     */
    setConfig(key, value) {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(CONFIG_PREFIX + key, str);
    }
  };

  // ============================================================
  // 二、IndexedDB 封装 —— 结构化数据
  // 命名空间：App.Storage.db
  // 数据库名称：rural_ai_tutor，版本：1
  // ============================================================
  const DB_NAME = 'rural_ai_tutor';
  const DB_VERSION = 3;

  // 数据库连接实例（单例）
  let _dbInstance = null;

  /**
   * Object Store 定义列表
   * 每个 store 包含名称、keyPath、索引定义
   */
  const STORE_DEFINITIONS = [
    {
      name: 'students',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_class', keyPath: 'className', unique: false },
        { name: 'by_name', keyPath: 'name', unique: false }
      ]
    },
    {
      name: 'scores',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_student', keyPath: 'studentId', unique: false },
        { name: 'by_date', keyPath: 'date', unique: false }
      ]
    },
    {
      name: 'profiles',
      options: { keyPath: 'studentId' },
      indexes: []
    },
    {
      name: 'lessons',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_subject_grade', keyPath: ['subject', 'grade'], unique: false }
      ]
    },
    {
      name: 'qa_records',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_student', keyPath: 'studentId', unique: false }
      ]
    },
    {
      name: 'practice_records',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_student', keyPath: 'studentId', unique: false },
        { name: 'by_knowledge', keyPath: 'knowledgePoint', unique: false }
      ]
    },
    {
      name: 'reports',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_student_type', keyPath: ['studentId', 'type'], unique: false }
      ]
    },
    {
      name: 'wrong_answers',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_student', keyPath: 'studentId', unique: false },
        { name: 'by_subject', keyPath: 'subject', unique: false },
        { name: 'by_status', keyPath: 'status', unique: false }
      ]
    },
    {
      name: 'messages',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_student', keyPath: 'studentId', unique: false },
        { name: 'by_created', keyPath: 'createdAt', unique: false }
      ]
    },
    {
      // 删除标记表：记录"本地已删除但云端还保留"的记录特征，供同步时反向删除
      name: 'deletions',
      options: { keyPath: 'id', autoIncrement: true },
      indexes: [
        { name: 'by_resource', keyPath: 'resource', unique: false }
      ]
    }
  ];

  const db = {
    /**
     * 初始化数据库（创建/升级 Object Store）
     * @returns {Promise<void>}
     */
    init() {
      return new Promise((resolve, reject) => {
        if (_dbInstance) {
          resolve();
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // 数据库升级或首次创建时触发
        request.onupgradeneeded = function (event) {
          const database = event.target.result;
          const existingStores = Array.from(database.objectStoreNames);

          STORE_DEFINITIONS.forEach(function (def) {
            // 如果 store 已存在则跳过
            if (existingStores.includes(def.name)) return;

            const store = database.createObjectStore(def.name, def.options);
            // 创建索引
            def.indexes.forEach(function (idx) {
              store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
            });
          });
        };

        request.onsuccess = function (event) {
          _dbInstance = event.target.result;
          resolve();
        };

        request.onerror = function (event) {
          reject(new Error('IndexedDB 打开失败: ' + event.target.error));
        };
      });
    },

    /**
     * 获取数据库实例（内部使用）
     * @returns {Promise<IDBDatabase>}
     */
    _getDb() {
      if (_dbInstance) return Promise.resolve(_dbInstance);
      return db.init().then(function () { return _dbInstance; });
    },

    /**
     * 通用事务执行器（内部使用）
     * @param {string} storeName - Object Store 名称
     * @param {IDBTransactionMode} mode - 事务模式（readonly / readwrite）
     * @param {function} callback - 接收 store，返回 request 或 Promise
     * @returns {Promise<any>}
     */
    _transaction(storeName, mode, callback) {
      return db._getDb().then(function (database) {
        return new Promise(function (resolve, reject) {
          const tx = database.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          const result = callback(store);

          // 如果 callback 返回的是 IDBRequest
          if (result && typeof result.onsuccess !== 'undefined') {
            result.onsuccess = function () {
              resolve(result.result);
            };
            result.onerror = function () {
              reject(result.error);
            };
          } else if (result && typeof result.then === 'function') {
            // 如果 callback 返回的是 Promise
            result.then(resolve).catch(reject);
          } else {
            // 普通值（如 update / delete 操作）
            tx.oncomplete = function () { resolve(result); };
            tx.onerror = function () { reject(tx.error); };
          }
        });
      });
    },

    /**
     * 添加一条记录
     * @param {string} storeName
     * @param {object} data
     * @returns {Promise<number>} 返回自增 id
     */
    add(storeName, data) {
      return db._transaction(storeName, 'readwrite', function (store) {
        return store.add(data);
      });
    },

    /**
     * 根据 id 获取一条记录
     * @param {string} storeName
     * @param {number|string} id
     * @returns {Promise<object|null>}
     */
    get(storeName, id) {
      return db._transaction(storeName, 'readonly', function (store) {
        return store.get(id);
      });
    },

    /**
     * 获取 store 中所有记录
     * @param {string} storeName
     * @returns {Promise<object[]>}
     */
    getAll(storeName) {
      return db._transaction(storeName, 'readonly', function (store) {
        return store.getAll();
      });
    },

    /**
     * 通过索引查询记录
     * @param {string} storeName
     * @param {string} indexName - 索引名称
     * @param {any} value - 索引值
     * @returns {Promise<object[]>}
     */
    getByIndex(storeName, indexName, value) {
      return db._transaction(storeName, 'readonly', function (store) {
        const index = store.index(indexName);
        return index.getAll(value);
      });
    },

    /**
     * 更新一条记录（根据 id 合并更新）
     * @param {string} storeName
     * @param {number|string} id
     * @param {object} data - 要更新的字段
     * @returns {Promise<void>}
     */
    update(storeName, id, data) {
      return db._transaction(storeName, 'readwrite', function (store) {
        return new Promise(function (resolve, reject) {
          const getReq = store.get(id);
          getReq.onsuccess = function () {
            const existing = getReq.result;
            if (!existing) {
              reject(new Error('记录不存在，id: ' + id));
              return;
            }
            // 合并数据
            const merged = Object.assign({}, existing, data);
            // 确保 id 字段不被覆盖
            merged[existing.constructor === Object ? (store.keyPath || 'id') : 'id'] = id;
            const putReq = store.put(merged);
            putReq.onsuccess = function () { resolve(); };
            putReq.onerror = function () { reject(putReq.error); };
          };
          getReq.onerror = function () { reject(getReq.error); };
        });
      });
    },

    /**
     * 删除一条记录
     * @param {string} storeName
     * @param {number|string} id
     * @returns {Promise<void>}
     */
    delete(storeName, id) {
      return db._transaction(storeName, 'readwrite', function (store) {
        return store.delete(id);
      });
    },

    /**
     * 批量添加记录
     * @param {string} storeName
     * @param {object[]} dataArray
     * @returns {Promise<void>}
     */
    batchAdd(storeName, dataArray) {
      return db._transaction(storeName, 'readwrite', function (store) {
        return new Promise(function (resolve, reject) {
          let completed = 0;
          let hasError = false;

          if (dataArray.length === 0) {
            resolve();
            return;
          }

          dataArray.forEach(function (item) {
            const req = store.add(item);
            req.onsuccess = function () {
              completed++;
              if (completed === dataArray.length) resolve();
            };
            req.onerror = function () {
              if (!hasError) {
                hasError = true;
                reject(req.error);
              }
            };
          });
        });
      });
    },

    /**
     * 清除指定 store 的所有数据（云同步拉取时使用）
     * @param {string} storeName
     * @returns {Promise<void>}
     */
    clear(storeName) {
      return db._getDb().then(function (database) {
        return new Promise(function (resolve, reject) {
          const tx = database.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.clear();
          req.onsuccess = function () { resolve(); };
          req.onerror = function () { reject(req.error); };
        });
      });
    },

    // ============================================================
    // 删除标记（deletions）：供云同步反向删除本地已删除的记录
    // ============================================================

    /**
     * 新增一条删除标记
     * @param {object} item - { resource, keyJson, createdAt }
     * @returns {Promise<void>}
     */
    addDeletion(item) {
      return db._transaction('deletions', 'readwrite', function (store) {
        return store.add(item);
      });
    },

    /**
     * 获取所有删除标记
     * @returns {Promise<object[]>}
     */
    getDeletions() {
      return db.getAll('deletions');
    },

    /**
     * 删除一条删除标记
     * @param {number} id
     * @returns {Promise<void>}
     */
    clearDeletion(id) {
      return db.delete('deletions', id);
    },

    /**
     * 清除指定资源的所有删除标记
     * @param {string} resource
     * @returns {Promise<void>}
     */
    clearDeletionsByResource(resource) {
      return db._getDb().then(function (database) {
        return new Promise(function (resolve, reject) {
          const tx = database.transaction('deletions', 'readwrite');
          const store = tx.objectStore('deletions');
          const index = store.index('by_resource');
          const req = index.getAll(resource);
          req.onsuccess = function () {
            const items = req.result;
            let completed = 0;
            if (items.length === 0) { resolve(); return; }
            items.forEach(function (it) {
              const delReq = store.delete(it.id);
              delReq.onsuccess = function () {
                completed++;
                if (completed === items.length) resolve();
              };
              delReq.onerror = function () { reject(delReq.error); };
            });
          };
          req.onerror = function () { reject(req.error); };
        });
      });
    },

    /**
     * 清除所有 store 的数据
     * @returns {Promise<void>}
     */
    clearAll() {
      return db._getDb().then(function (database) {
        const promises = [];
        STORE_DEFINITIONS.forEach(function (def) {
          promises.push(new Promise(function (resolve, reject) {
            const tx = database.transaction(def.name, 'readwrite');
            const store = tx.objectStore(def.name);
            const req = store.clear();
            req.onsuccess = function () { resolve(); };
            req.onerror = function () { reject(req.error); };
          }));
        });
        return Promise.all(promises);
      });
    }
  };

  // ============================================================
  // 三、数据初始化和示例数据
  // 命名空间：App.Storage.seed
  // ============================================================

  /**
   * 生成指定范围内的随机整数
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成随机日期字符串（YYYY-MM-DD）
   * @param {number} year
   * @param {number} month - 1~12
   * @returns {string}
   */
  function randomDate(year, month) {
    const day = randomInt(1, 28);
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  const seed = {
    /**
     * 检查是否需要初始化（students 表为空时认为需要）
     * @returns {Promise<boolean>}
     */
    needsSeed() {
      return db.getAll('students').then(function (students) {
        return students.length === 0;
      });
    },

    /**
     * 填充示例数据
     * @returns {Promise<void>}
     */
    async seed() {
      const now = new Date().toISOString();

      // --- 学生数据 ---
      const studentNames = [
        '张小明', '李小红', '王小刚', '赵小丽', '刘小强',
        '陈小芳', '杨小伟', '黄小燕', '周小军', '吴小梅'
      ];

      const studentsData = studentNames.map(function (name, i) {
        return {
          name: name,
          grade: '三年级',
          className: '三年级1班',
          studentNo: '20240301' + String(i + 1).padStart(2, '0'),
          createdAt: now
        };
      });

      // 批量添加学生，收集返回的 id
      const studentIds = [];
      for (const s of studentsData) {
        const id = await db.add('students', s);
        studentIds.push(id);
      }

      // --- 成绩数据 ---
      const subjects = ['语文', '数学', '英语'];
      const types = ['作业', '测验', '考试'];
      const knowledgePointsMap = {
        '语文': ['拼音', '组词', '阅读理解', '写作', '古诗背诵'],
        '数学': ['加减法', '乘除法', '分数', '几何图形', '应用题'],
        '英语': ['单词拼写', '语法', '听力', '口语', '阅读']
      };

      const scoresData = [];
      studentIds.forEach(function (sid) {
        // 每名学生 2~3 条成绩记录
        const count = randomInt(2, 3);
        for (let i = 0; i < count; i++) {
          const subject = subjects[i % subjects.length];
          const kps = knowledgePointsMap[subject];
          scoresData.push({
            studentId: sid,
            subject: subject,
            type: types[i % types.length],
            score: randomInt(60, 100),
            maxScore: 100,
            knowledgePoints: [kps[randomInt(0, kps.length - 1)], kps[randomInt(0, kps.length - 1)]],
            date: randomDate(2025, randomInt(1, 6)),
            createdAt: now
          });
        }
      });
      await db.batchAdd('scores', scoresData);

      // --- 画像数据 ---
      const dimensionsLabels = ['知识掌握', '学习习惯', '思维能力', '实践应用', '进步趋势'];
      const attributionExamples = [
        { reason: '粗心大意', probability: 0.4 },
        { reason: '概念不清', probability: 0.3 },
        { reason: '练习不足', probability: 0.2 },
        { reason: '审题不仔细', probability: 0.1 }
      ];
      const suggestionExamples = [
        '建议加强基础概念的理解，多做练习题巩固。',
        '做题时注意审题，养成检查的习惯。',
        '可以增加课外阅读，拓宽知识面。',
        '建议每天坚持练习口算，提高计算速度和准确率。',
        '鼓励多思考、多提问，培养独立思考能力。'
      ];

      const profilesData = studentIds.map(function (sid) {
        return {
          studentId: sid,
          dimensions: dimensionsLabels.map(function () { return randomInt(60, 90); }),
          attribution: {
            items: attributionExamples.slice()
          },
          suggestions: [
            suggestionExamples[randomInt(0, suggestionExamples.length - 1)],
            suggestionExamples[randomInt(0, suggestionExamples.length - 1)]
          ],
          updatedAt: now
        };
      });
      await db.batchAdd('profiles', profilesData);

      // --- 教案记录 ---
      const lessonsData = [
        {
          subject: '语文',
          grade: '三年级',
          topic: '古诗两首——《望庐山瀑布》《绝句》',
          content: '# 教案：古诗两首\n\n## 教学目标\n1. 认识本课生字，会写要求书写的字。\n2. 有感情地朗读并背诵两首古诗。\n3. 理解诗句意思，感受诗中描绘的景象。\n\n## 教学重难点\n- 重点：理解诗句意思，背诵古诗。\n- 难点：体会诗人表达的思想感情。\n\n## 教学过程\n### 一、导入新课（5分钟）\n展示庐山瀑布图片，激发学生兴趣。\n\n### 二、初读古诗（10分钟）\n教师范读，学生跟读，注意节奏和韵律。\n\n### 三、理解诗意（15分钟）\n逐句讲解，结合图片帮助学生理解。\n\n### 四、背诵积累（5分钟）\n学生自由背诵，同桌互背。\n\n## 板书设计\n古诗两首\n望庐山瀑布 —— 李白\n绝句 —— 杜甫',
          homeworkLevels: {
            basic: '背诵并默写两首古诗。',
            advanced: '用自己的话描述诗中描绘的景象，写一段100字的小短文。',
            extended: '搜集其他描写自然风光的古诗，选择一首进行赏析。'
          },
          createdAt: now
        },
        {
          subject: '数学',
          grade: '三年级',
          topic: '两位数乘一位数',
          content: '# 教案：两位数乘一位数\n\n## 教学目标\n1. 掌握两位数乘一位数的计算方法。\n2. 能正确进行竖式计算。\n3. 能运用所学知识解决实际问题。\n\n## 教学重难点\n- 重点：竖式计算的方法。\n- 难点：进位的处理。\n\n## 教学过程\n### 一、复习导入（5分钟）\n口算练习：20×3、12×2\n\n### 二、探究新知（15分钟）\n以 24×3 为例，讲解竖式计算方法。\n\n### 三、巩固练习（15分钟）\n完成课本练习题，教师巡视指导。\n\n### 四、课堂小结（5分钟）\n总结竖式计算的步骤和注意事项。\n\n## 板书设计\n两位数乘一位数\n24 × 3 = 72\n竖式计算步骤：\n1. 个位相乘\n2. 十位相乘\n3. 注意进位',
          homeworkLevels: {
            basic: '完成课本第45页第1~5题。',
            advanced: '计算 36×4、58×3、47×6，并验算。',
            extended: '生活中的数学：超市里一支铅笔3元，买12支需要多少钱？请列式计算。'
          },
          createdAt: now
        },
        {
          subject: '英语',
          grade: '三年级',
          topic: 'Unit 3 Look at me! Part A',
          content: '# 教案：Unit 3 Look at me! Part A\n\n## 教学目标\n1. 能听懂、会说 face, ear, eye, nose, mouth 等单词。\n2. 能听懂指令并做出相应动作。\n3. 培养学生学习英语的兴趣。\n\n## 教学重难点\n- 重点：五官单词的发音和认读。\n- 难点：eye 和 ear 的发音区分。\n\n## 教学过程\n### 一、热身导入（5分钟）\n唱英文歌曲 Head Shoulders Knees and Toes。\n\n### 二、新课呈现（15分钟）\n利用图片和肢体语言教授五官单词。\n\n### 三、趣味操练（15分钟）\n游戏：Touch your... 教师说指令，学生指五官。\n\n### 四、拓展延伸（5分钟）\n画一画自己的脸，并用英语标注五官。\n\n## 板书设计\nUnit 3 Look at me!\nface 脸\neye 眼睛\neaar 耳朵\nnose 鼻子\nmouth 嘴巴',
          homeworkLevels: {
            basic: '听录音跟读五官单词5遍。',
            advanced: '用英语向家人介绍自己的五官。',
            extended: '制作一张五官单词卡片，配上图画。'
          },
          createdAt: now
        }
      ];
      await db.batchAdd('lessons', lessonsData);

      // --- 答疑记录 ---
      const qaData = [];
      // 为前5名学生各生成1~2条答疑记录
      for (let i = 0; i < 5; i++) {
        const count = randomInt(1, 2);
        for (let j = 0; j < count; j++) {
          const subject = subjects[randomInt(0, 2)];
          const kps = knowledgePointsMap[subject];
          qaData.push({
            studentId: studentIds[i],
            imageUrl: '',
            question: subject === '数学' ? '小明有15个苹果，给了小红6个，还剩几个？' : '请解释"望庐山瀑布"中"飞流直下三千尺"的意思。',
            answer: subject === '数学'
              ? '这是一道减法应用题。\n\n**解题步骤：**\n1. 已知：小明有15个苹果\n2. 给了小红6个\n3. 求剩余：15 - 6 = 9\n\n**答：还剩9个苹果。**\n\n**涉及知识点：** 减法运算、应用题理解'
              : '"飞流直下三千尺"的意思是：瀑布从高高的山上飞快地流下来，好像有三千尺那么长。\n\n**解析：**\n- "飞流"指瀑布水流很快\n- "直下"指从高处直接落下来\n- "三千尺"是夸张手法，形容瀑布非常长、非常壮观\n\n这句诗用了夸张的修辞手法，表达了诗人对庐山瀑布壮观景象的赞叹。\n\n**涉及知识点：** 古诗理解、修辞手法（夸张）',
            knowledgePoints: subject === '数学' ? ['减法运算', '应用题'] : ['古诗理解', '修辞手法'],
            createdAt: now
          });
        }
      }
      await db.batchAdd('qa_records', qaData);

      // --- 练习记录 ---
      const practiceData = [];
      const practiceKps = ['加减法', '乘除法', '拼音', '组词', '单词拼写'];
      studentIds.forEach(function (sid) {
        // 每名学生 2~3 条练习记录
        const count = randomInt(2, 3);
        for (let i = 0; i < count; i++) {
          const total = randomInt(5, 15);
          const correct = randomInt(Math.floor(total * 0.5), total);
          practiceData.push({
            studentId: sid,
            knowledgePoint: practiceKps[i % practiceKps.length],
            difficulty: randomInt(1, 3),
            totalQuestions: total,
            correctCount: correct,
            timeSpent: randomInt(120, 600),
            createdAt: now
          });
        }
      });
      await db.batchAdd('practice_records', practiceData);

      // --- 学情报告 ---
      const reportsData = [];
      studentIds.slice(0, 5).forEach(function (sid) {
        // 周报
        reportsData.push({
          studentId: sid,
          type: 'weekly',
          startDate: '2025-06-01',
          endDate: '2025-06-07',
          data: {
            studyHours: randomInt(5, 15),
            homeworkCompletion: randomInt(70, 100),
            testScores: { '语文': randomInt(75, 95), '数学': randomInt(70, 100), '英语': randomInt(70, 95) },
            weakPoints: ['应用题', '阅读理解'],
            trend: 'stable'
          },
          createdAt: now
        });
        // 月报
        reportsData.push({
          studentId: sid,
          type: 'monthly',
          startDate: '2025-05-01',
          endDate: '2025-05-31',
          data: {
            studyHours: randomInt(20, 50),
            homeworkCompletion: randomInt(75, 100),
            testScores: { '语文': randomInt(75, 95), '数学': randomInt(70, 100), '英语': randomInt(70, 95) },
            weakPoints: ['分数', '写作'],
            trend: 'up'
          },
          createdAt: now
        });
      });
      await db.batchAdd('reports', reportsData);
    }
  };

  // ============================================================
  // 四、数据导出/导入
  // 命名空间：App.Storage.export
  // ============================================================
  const exportModule = {
    /**
     * 导出所有数据为 JSON 字符串
     * @returns {Promise<string>}
     */
    async exportAll() {
      const result = {};

      // 导出 localStorage 配置
      result._config = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CONFIG_PREFIX)) {
          result._config[key] = localStorage.getItem(key);
        }
      }

      // 导出 IndexedDB 各 store 数据
      for (const def of STORE_DEFINITIONS) {
        result[def.name] = await db.getAll(def.name);
      }

      return JSON.stringify(result, null, 2);
    },

    /**
     * 从 JSON 字符串导入数据（会先清除现有数据）
     * @param {string} jsonString
     * @returns {Promise<void>}
     */
    async importAll(jsonString) {
      const data = JSON.parse(jsonString);

      // 先清除所有数据
      await db.clearAll();

      // 恢复 localStorage 配置
      if (data._config) {
        Object.keys(data._config).forEach(function (key) {
          localStorage.setItem(key, data._config[key]);
        });
      }

      // 恢复 IndexedDB 各 store 数据
      for (const def of STORE_DEFINITIONS) {
        if (data[def.name] && data[def.name].length > 0) {
          await db.batchAdd(def.name, data[def.name]);
        }
      }
    }
  };

  // ============================================================
  // 挂载到全局命名空间
  // ============================================================
  window.App.Storage = {
    config: config,
    db: db,
    seed: seed,
    export: exportModule
  };

})();
