/**
 * 乡村课堂AI助教平台 - 数据同步层
 *
 * 把本地 IndexedDB 数据与云端后端同步，实现教师/学生/家长三端数据互通。
 *
 * - 上传（push）：把本地数据提交到云端，自动跳过云端已存在的记录（按特征字段去重）
 * - 拉取（pull）：把云端数据下载到本地（清空对应表后写入，以云端为准）
 *
 * 各角色可上传的数据：
 * - 教师：学生、成绩、画像、教案、报告
 * - 学生：答疑、练习、错题
 * - 家长：只查看（拉取孩子的数据）
 *
 * 命名空间：window.App.Sync
 */

(function () {
  'use strict';

  window.App = window.App || {};

  // 前端 store 与后端 resource 的映射
  const STORE_RESOURCE_MAP = {
    students: 'students',
    scores: 'scores',
    profiles: 'profiles',
    lessons: 'lessons',
    qa_records: 'qa',
    practice_records: 'practice',
    reports: 'reports',
    wrong_answers: 'wrong-answers',
    messages: 'messages'
  };

  // 各 store 用于去重匹配的特征字段（云端已有同特征记录则跳过上传）
  const MATCH_KEYS = {
    students: ['studentNo'],
    scores: ['studentId', 'subject', 'type', 'date', 'score'],
    profiles: ['studentId'],
    lessons: ['topic'],
    qa_records: ['question', 'createdAt'],
    practice_records: ['studentId', 'knowledgePoint', 'createdAt'],
    reports: ['studentId', 'type', 'startDate'],
    wrong_answers: ['studentId', 'question'],
    messages: ['studentId', 'senderId', 'content', 'createdAt']
  };

  // 各角色可上传的 store
  const PUSH_STORES_BY_ROLE = {
    teacher: ['students', 'scores', 'profiles', 'lessons', 'reports', 'messages'],
    student: ['qa_records', 'practice_records', 'wrong_answers'],
    parent: ['messages']
  };

  // 所有可拉取的 store（后端会按权限返回可访问的数据）
  const ALL_STORES = Object.keys(STORE_RESOURCE_MAP);

  // upsert 型资源：后端 POST 即"按唯一键覆盖保存"，无自增 id、无 PUT 接口。
  // 云端已存在同特征记录时也应继续 POST（覆盖），而非调用 PUT。
  const UPSERT_RESOURCES = ['profiles'];

  /**
   * 判断两条记录是否在指定字段上完全一致
   */
  function matchKeys(cloudItem, localItem, keys) {
    return keys.every(function (key) {
      const a = cloudItem[key];
      const b = localItem[key];
      if (a === undefined || b === undefined) return false;
      return String(a) === String(b);
    });
  }

  /**
   * 上传单个 store：
   * - 云端已存在同特征记录 → 用云端 id 更新（覆盖修改）
   * - 云端不存在 → 新增
   * @returns {Promise<{created:number, updated:number}>}
   */
  async function pushStore(storeName) {
    const resource = STORE_RESOURCE_MAP[storeName];
    if (!resource) return { created: 0, updated: 0 };

    const localItems = await App.Storage.db.getAll(storeName);
    if (localItems.length === 0) return { created: 0, updated: 0 };

    const cloudItems = await App.Cloud.list(resource);
    const keys = MATCH_KEYS[storeName];

    let created = 0;
    let updated = 0;
    for (const item of localItems) {
      const found = cloudItems.find((ci) => matchKeys(ci, item, keys));
      try {
        if (found) {
          if (UPSERT_RESOURCES.includes(resource)) {
            // upsert 型：POST 覆盖保存（计入更新）
            await App.Cloud.create(resource, item);
            updated++;
          } else {
            // 更新同步：云端已存在同特征记录，用云端 id 覆盖
            const { id, ...payload } = item;
            await App.Cloud.update(resource, found.id, payload);
            updated++;
          }
        } else {
          await App.Cloud.create(resource, item);
          created++;
        }
      } catch (e) {
        console.warn('[Sync] 上传失败:', storeName, e.message);
      }
    }
    return { created, updated };
  }

  /**
   * 判断云端记录是否包含指定的键值集合（用于删除匹配）
   */
  function cloudIncludes(cloudItem, keyObj) {
    return Object.keys(keyObj).every(function (key) {
      return String(cloudItem[key]) === String(keyObj[key]);
    });
  }

  /**
   * 处理删除标记：把"本地已删除但云端还保留"的记录同步删除
   * @returns {Promise<number>} 云端实际删除的记录数
   */
  async function pushDeletions() {
    const deletions = await App.Storage.db.getDeletions();
    if (deletions.length === 0) return 0;

    let removed = 0;
    for (const del of deletions) {
      let keyObj = {};
      try {
        keyObj = JSON.parse(del.keyJson || '{}');
      } catch (e) {
        keyObj = {};
      }
      const resource = del.resource;
      try {
        const cloudItems = await App.Cloud.list(resource);
        const target = cloudItems.find((ci) => cloudIncludes(ci, keyObj));
        if (target) {
          await App.Cloud.remove(resource, target.id);
          removed++;
        }
      } catch (e) {
        console.warn('[Sync] 删除同步失败:', resource, e.message);
        // 失败不清理标记，下次重试
        continue;
      }
      // 无论云端是否找到记录，本标记已处理完毕
      await App.Storage.db.clearDeletion(del.id);
    }
    return removed;
  }

  /**
   * 拉取单个 store：以云端数据覆盖本地
   * @returns {Promise<number>} 拉取到的记录数
   */
  async function pullStore(storeName) {
    const resource = STORE_RESOURCE_MAP[storeName];
    if (!resource) return 0;

    const cloudItems = await App.Cloud.list(resource);
    if (cloudItems.length === 0) return 0;

    await App.Storage.db.clear(storeName);
    await App.Storage.db.batchAdd(storeName, cloudItems);
    return cloudItems.length;
  }

  const Sync = {
    /**
     * 上传当前角色可上传的全部数据
     * @returns {Promise<{total:number, created:number, updated:number, details:object}>}
     */
    async pushAll() {
      const role = App.Cloud.getRole();
      const stores = PUSH_STORES_BY_ROLE[role] || [];
      const details = {};
      let total = 0;
      let created = 0;
      let updated = 0;

      for (const storeName of stores) {
        const r = await pushStore(storeName);
        details[storeName] = r;
        created += r.created;
        updated += r.updated;
        total += r.created + r.updated;
      }

      // 反向删除：把本地已删除的记录同步到云端
      const removed = await pushDeletions();
      if (removed > 0) details.removed = removed;

      return { total, created, updated, removed: removed || 0, details };
    },

    /**
     * 本地删除记录并记录删除标记（供下次同步时反向删除云端记录）
     * @param {string} storeName
     * @param {object} record - 被删除的本地记录
     * @returns {Promise<void>}
     */
    async removeLocal(storeName, record) {
      // 先从本地删除
      if (record && record.id !== undefined) {
        await App.Storage.db.delete(storeName, record.id);
      }
      // 记录特征字段，供云端反向删除
      const resource = STORE_RESOURCE_MAP[storeName];
      const keys = MATCH_KEYS[storeName];
      if (!resource || !keys || !record) return;
      const keyObj = {};
      keys.forEach(function (k) {
        if (record[k] !== undefined) keyObj[k] = record[k];
      });
      if (Object.keys(keyObj).length === 0) return;
      await App.Storage.db.addDeletion({
        resource,
        keyJson: JSON.stringify(keyObj),
        createdAt: new Date().toISOString()
      });
    },

    /**
     * 拉取全部数据到本地（以云端为准）
     * @returns {Promise<{total:number, details:object}>}
     */
    async pullAll() {
      const details = {};
      let total = 0;

      for (const storeName of ALL_STORES) {
        const n = await pullStore(storeName);
        if (n > 0) details[storeName] = n;
        total += n;
      }
      return { total, details };
    },

    /**
     * 拉取单个 store 到本地（以云端为准）
     * @param {string} storeName
     * @returns {Promise<number>}
     */
    async pullStore(storeName) {
      return pullStore(storeName);
    }
  };

  window.App.Sync = Sync;
})();