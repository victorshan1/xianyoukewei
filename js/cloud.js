/**
 * 乡村课堂AI助教平台 - 云端 API 客户端
 *
 * 封装与后端的全部交互：登录/注册、token 管理、班级与绑定、
 * 各业务数据的增删改查。登录状态和 token 持久化在 localStorage。
 *
 * 命名空间：window.App.Cloud
 */

(function () {
  'use strict';

  window.App = window.App || {};

  const TOKEN_KEY = 'rural_ai_cloud_token';
  const USER_KEY = 'rural_ai_cloud_user';
  const BASE_URL_KEY = 'rural_ai_cloud_base_url';
  const DEFAULT_BASE_URL = 'http://localhost:3000/api';

  const Cloud = {
    /**
     * 获取后端地址
     */
    getBaseUrl() {
      return localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
    },

    /**
     * 设置后端地址（去掉末尾斜杠）
     */
    setBaseUrl(url) {
      localStorage.setItem(BASE_URL_KEY, (url || DEFAULT_BASE_URL).replace(/\/+$/, ''));
    },

    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    getCurrentUser() {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      } catch {
        return null;
      }
    },

    isLoggedIn() {
      return !!this.getToken();
    },

    getRole() {
      const user = this.getCurrentUser();
      return user ? user.role : null;
    },

    /**
     * 统一请求封装：自动附加 token，解析 JSON，抛出带 status 的错误
     */
    async request(method, path, body) {
      const headers = { 'Content-Type': 'application/json' };
      const token = this.getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;

      let res;
      try {
        res = await fetch(this.getBaseUrl() + path, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
      } catch (e) {
        throw new Error('无法连接后端服务器，请检查后端地址和服务器是否已启动');
      }

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const err = new Error(data.error || `请求失败（HTTP ${res.status}）`);
        err.status = res.status;
        // 401 时清除过期登录态
        if (res.status === 401 && this.isLoggedIn()) {
          this.logout();
        }
        throw err;
      }

      return data;
    },

    // ============================================================
    // 账号
    // ============================================================

    async login(username, password) {
      const data = await this.request('POST', '/auth/login', { username, password });
      this._saveSession(data);
      return data.user;
    },

    async register(payload) {
      const data = await this.request('POST', '/auth/register', payload);
      this._saveSession(data);
      return data.user;
    },

    async me() {
      const data = await this.request('GET', '/auth/me');
      this.setCurrentUser(data.user);
      return data.user;
    },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    _saveSession(data) {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      if (data.user) this.setCurrentUser(data.user);
    },

    setCurrentUser(user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    // ============================================================
    // 班级与绑定
    // ============================================================

    async createClass(payload) {
      return this.request('POST', '/auth/classes', payload);
    },

    async myClass() {
      return this.request('GET', '/auth/my-class');
    },

    async bindStudent(studentId) {
      return this.request('POST', '/auth/bind-student', { studentId });
    },

    async bindChild(studentId, relation) {
      return this.request('POST', '/auth/bind-child', { studentId, relation });
    },

    async myChildren() {
      return this.request('GET', '/auth/my-children');
    },

    /**
     * 教师重置班级邀请码
     */
    async resetClassInvite() {
      return this.request('POST', '/auth/class-invite');
    },

    /**
     * 查询邀请码对应的班级与可加入的学生列表
     * @param {string} code - 6 位班级邀请码
     */
    async classInfo(code) {
      return this.request('GET', '/auth/class-info?code=' + encodeURIComponent(code));
    },

    /**
     * 忘记密码：通过密保答案重置密码
     */
    async resetPassword(payload) {
      return this.request('POST', '/auth/reset-password', payload);
    },

    // ============================================================
    // 业务数据（resource 与后端路由对应）
    // ============================================================

    async list(resource) {
      const data = await this.request('GET', '/' + resource);
      return data.data || [];
    },

    async create(resource, payload) {
      const data = await this.request('POST', '/' + resource, payload);
      return data.data;
    },

    /**
     * 更新云端记录（按云端 id）
     * @param {string} resource
     * @param {number} id 云端记录 id
     * @param {object} payload 需更新的字段
     */
    async update(resource, id, payload) {
      const data = await this.request('PUT', '/' + resource + '/' + id, payload);
      return data.data;
    },

    /**
     * 删除云端记录（按云端 id）
     * @param {string} resource
     * @param {number} id 云端记录 id
     */
    async remove(resource, id) {
      await this.request('DELETE', '/' + resource + '/' + id);
    }
  };

  window.App.Cloud = Cloud;
})();