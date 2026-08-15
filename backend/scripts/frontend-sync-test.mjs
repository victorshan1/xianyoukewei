/**
 * 前端云同步逻辑端到端测试
 *
 * 直接加载前端 js/cloud.js 与 js/sync.js，用 Node 模拟浏览器环境
 * （localStorage + IndexedDB），验证"教师上传 → 学生提交 → 教师/家长拉取"三端互通链路。
 *
 * 运行：node scripts/frontend-sync-test.mjs （需先启动后端 node src/index.js）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_JS = path.join(__dirname, '..', '..', 'js');
const BASE = 'http://localhost:3000/api';

// ============ 清理数据库，保证测试可重复运行 ============
const DB_FILE = path.join(__dirname, '..', 'data', 'rural-ai.db');
if (fs.existsSync(DB_FILE)) {
  const db = new DatabaseSync(DB_FILE);
  db.exec(`
    DELETE FROM messages;
    DELETE FROM parent_students;
    DELETE FROM wrong_answers;
    DELETE FROM reports;
    DELETE FROM practice_records;
    DELETE FROM qa_records;
    DELETE FROM lessons;
    DELETE FROM profiles;
    DELETE FROM scores;
    DELETE FROM students;
    DELETE FROM classes;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('users','classes','students','scores','profiles','lessons','qa_records','practice_records','reports','wrong_answers','parent_students','messages');
  `);
  db.close();
  console.log('🧹 已清理测试数据库');
}

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${detail}`); }
}

// ============ 模拟浏览器环境 ============
const memStore = {};
global.localStorage = {
  getItem: (k) => (k in memStore ? memStore[k] : null),
  setItem: (k, v) => { memStore[k] = String(v); },
  removeItem: (k) => { delete memStore[k]; }
};
global.window = global;
global.App = global.App || {};

// 内存版 IndexedDB（含 messages、deletions）
const memory = {};
for (const s of ['students', 'scores', 'profiles', 'lessons', 'qa_records', 'practice_records', 'reports', 'wrong_answers', 'messages', 'deletions']) {
  memory[s] = [];
}
global.App.Storage = {
  db: {
    async getAll(s) { return memory[s].slice(); },
    async add(s, item) { memory[s].push(item); return item; },
    async batchAdd(s, items) { memory[s].push(...items); },
    async clear(s) { memory[s] = []; },
    async delete(s, id) { memory[s] = memory[s].filter((x) => x.id !== id); },
    async addDeletion(item) { memory.deletions.push(Object.assign({ id: memory.deletions.length + 1 }, item)); },
    async getDeletions() { return memory.deletions.slice(); },
    async clearDeletion(id) { memory.deletions = memory.deletions.filter((x) => x.id !== id); }
  }
};

// 加载前端 cloud.js 与 sync.js（执行 IIFE 挂到 window.App）
eval(fs.readFileSync(path.join(FRONTEND_JS, 'cloud.js'), 'utf8'));
eval(fs.readFileSync(path.join(FRONTEND_JS, 'sync.js'), 'utf8'));

const Cloud = global.App.Cloud;
const Sync = global.App.Sync;

function unique(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

// 便捷登录/注册
async function reg(role, username) {
  const user = await Cloud.register({ username, password: '123456', role, name: username });
  return user;
}

console.log('\n===== 一、教师端：注册 + 建班 + 上传 =====');

// 教师注册（自动登录，token 已存 localStorage）
await reg('teacher', unique('t'));
const t = Cloud.getCurrentUser();
check('教师注册并自动登录', t && t.role === 'teacher', JSON.stringify(t));

// 创建班级
const clsRes = await Cloud.createClass({ name: '四年级1班', grade: '四年级' });
const classId = clsRes.data.id;
check('教师创建班级', clsRes.data.id === 1, JSON.stringify(clsRes.data));

// 本地准备演示数据（模拟浏览器里的演示数据）
memory.students.push(
  { name: '张小明', grade: '四年级', className: '四年级1班', studentNo: '2024040101', gender: '男' },
  { name: '李小红', grade: '四年级', className: '四年级1班', studentNo: '2024040102', gender: '女' }
);
memory.scores.push(
  { studentId: 1, subject: '数学', type: '考试', score: 92, maxScore: 100, knowledgePoints: ['分数', '应用题'], date: '2025-05-25' }
);
memory.profiles.push(
  { studentId: 1, dimensions: [85, 78, 90, 72, 88], attribution: { items: [{ reason: '粗心', probability: 0.4 }] }, suggestions: ['加强审题'] }
);
memory.lessons.push(
  { subject: '语文', grade: '四年级', topic: '古诗两首', content: '教案内容', homeworkLevels: { basic: '背诵', advanced: '赏析', extended: '仿写' } }
);
memory.reports.push(
  { studentId: 1, type: 'weekly', startDate: '2025-06-01', endDate: '2025-06-07', data: { studyHours: 10, weakPoints: ['应用题'], trend: 'up' } }
);

// 教师上传
const pushRes = await Sync.pushAll();
check('教师上传学生(2条)', pushRes.details.students.created === 2, JSON.stringify(pushRes.details));
check('教师上传成绩(1条)', pushRes.details.scores.created === 1);
check('教师上传画像(1条)', pushRes.details.profiles.created === 1);
check('教师上传教案(1条)', pushRes.details.lessons.created === 1);
check('教师上传报告(1条)', pushRes.details.reports.created === 1);

// 再次上传：无新增，但本地记录已存在则更新云端
const pushAgain = await Sync.pushAll();
check('重复上传无新增(created=0)', pushAgain.created === 0, JSON.stringify(pushAgain.details));
check('重复上传更新云端(updated=6)', pushAgain.updated === 6, JSON.stringify(pushAgain.details));

console.log('\n===== 二、学生端：注册 + 绑定 + 提交 =====');

// 学生注册（切换账号）
await Cloud.logout();
const sUser = await reg('student', unique('s'));
check('学生注册', sUser.role === 'student');

// 学生绑定自己的学生身份（绑定 张小明 id=1）
const bindStu = await Cloud.bindStudent(1);
check('学生绑定身份(张小明)', bindStu.data.studentId === 1, JSON.stringify(bindStu.data));

// 学生本地有答疑、练习、错题
memory.qa_records.push(
  { studentId: 1, question: '小明有15个苹果，给了小红6个，还剩几个？', answer: '15-6=9', knowledgePoints: ['减法'] }
);
memory.practice_records.push(
  { studentId: 1, knowledgePoint: '乘除法', difficulty: 2, totalQuestions: 10, correctCount: 8, timeSpent: 300 }
);
memory.wrong_answers.push(
  { studentId: 1, subject: '数学', question: '3/4 + 1/2 = ?', correctAnswer: '5/4', knowledgePoint: '分数加减法' }
);

const sPush = await Sync.pushAll();
check('学生上传答疑(1条)', sPush.details.qa_records.created === 1, JSON.stringify(sPush.details));
check('学生上传练习(1条)', sPush.details.practice_records.created === 1);
check('学生上传错题(1条)', sPush.details.wrong_answers.created === 1);

console.log('\n===== 三、家长端：注册 + 绑定孩子 + 拉取 =====');

await Cloud.logout();
const pUser = await reg('parent', unique('p'));
check('家长注册', pUser.role === 'parent');

const bindChild = await Cloud.bindChild(1, '爸爸');
check('家长绑定孩子(张小明)', bindChild.data.studentId === 1, JSON.stringify(bindChild.data));

// 家长清空本地后从云端拉取
for (const s of Object.keys(memory)) memory[s] = [];
const pullRes = await Sync.pullAll();
check('家长拉取到孩子成绩(1条)', pullRes.details.scores === 1, JSON.stringify(pullRes.details));
check('家长拉取到孩子报告(1条)', pullRes.details.reports === 1);
check('家长拉取到孩子错题(1条)', pullRes.details.wrong_answers === 1);
check('家长拉取到孩子答疑(1条)', pullRes.details.qa_records === 1);
check('家长拉取到孩子画像(1条)', pullRes.details.profiles === 1);
check('家长仅拉取到绑定孩子(1条)', pullRes.details.students === 1);

console.log('\n===== 四、教师端：拉取看到学生提交的数据 =====');

// 教师登录后拉取，应看到学生上传的答疑/练习/错题
await Cloud.logout();
await Cloud.login('probe_nonexist_1', '123456').catch(() => {});
// 重新以刚才教师账号登录
const teacherUsername = t.username;
await Cloud.logout();
await Cloud.login(teacherUsername, '123456');

for (const s of Object.keys(memory)) memory[s] = [];
const tPull = await Sync.pullAll();
check('教师拉取到学生答疑(1条)', tPull.details.qa_records === 1, JSON.stringify(tPull.details));
check('教师拉取到学生练习(1条)', tPull.details.practice_records === 1);
check('教师拉取到学生错题(1条)', tPull.details.wrong_answers === 1);

console.log('\n===== 五、家校沟通：家长发消息 → 教师查看/回复 → 家长拉取 =====');

// 家长登录发消息
await Cloud.logout();
await Cloud.login(pUser.username, '123456');
const parentMsg = {
  studentId: 1,
  senderRole: 'parent',
  content: '老师您好，想了解孩子这周的数学学习情况',
  createdAt: new Date().toISOString()
};
memory.messages.push(parentMsg);
const pMsgPush = await Sync.pushAll();
check('家长上传留言(1条)', pMsgPush.details.messages.created === 1, JSON.stringify(pMsgPush.details));

// 教师登录查看家长留言
await Cloud.logout();
await Cloud.login(teacherUsername, '123456');
for (const s of Object.keys(memory)) memory[s] = [];
const tMsgPull = await Sync.pullAll();
check('教师拉取到家长留言(1条)', tMsgPull.details.messages === 1, JSON.stringify(tMsgPull.details));
const teacherSeesParentMsg = memory.messages.some((m) => m.senderRole === 'parent' && m.studentId === 1);
check('教师看到家长留言内容', teacherSeesParentMsg, JSON.stringify(memory.messages));

// 教师回复家长
const teacherReply = {
  studentId: 1,
  senderRole: 'teacher',
  content: '家长您好，孩子这周数学学习认真，应用题需加强',
  createdAt: new Date().toISOString()
};
memory.messages.push(teacherReply);
const tReplyPush = await Sync.pushAll();
check('教师上传回复(1条)', tReplyPush.details.messages.created === 1, JSON.stringify(tReplyPush.details));

// 家长拉取看到教师回复
await Cloud.logout();
await Cloud.login(pUser.username, '123456');
for (const s of Object.keys(memory)) memory[s] = [];
const pMsgPull = await Sync.pullAll();
check('家长拉取到消息(2条)', pMsgPull.details.messages === 2, JSON.stringify(pMsgPull.details));
const parentSeesTeacherReply = memory.messages.some((m) => m.senderRole === 'teacher' && m.studentId === 1);
check('家长看到教师回复', parentSeesTeacherReply, JSON.stringify(memory.messages));

console.log('\n===== 六、更新同步 + 删除同步 =====');

// 更新同步：教师修改张小明姓名并上传
await Cloud.logout();
await Cloud.login(teacherUsername, '123456');
for (const s of Object.keys(memory)) memory[s] = [];
await Sync.pullAll();
const xm = memory.students.find((s) => s.studentNo === '2024040101');
check('本地有张小明', !!xm, JSON.stringify(memory.students));
xm.name = '张小明（改）';
const updPush = await Sync.pushAll();
check('更新同步：云端已存在则更新', updPush.details.students.updated === 2, JSON.stringify(updPush.details.students));
// 验证云端已更新
for (const s of Object.keys(memory)) memory[s] = [];
await Sync.pullAll();
const xmUpdated = memory.students.find((s) => s.studentNo === '2024040101');
check('云端姓名已更新', xmUpdated && xmUpdated.name === '张小明（改）', JSON.stringify(xmUpdated));

// 删除同步：教师删除张小明
await Sync.removeLocal('students', xmUpdated);
const delPush = await Sync.pushAll();
check('删除同步：云端删除记录(removed=1)', delPush.removed === 1, JSON.stringify(delPush.details));
// 验证云端已删除
for (const s of Object.keys(memory)) memory[s] = [];
await Sync.pullAll();
const xmGone = memory.students.some((s) => s.studentNo === '2024040101');
check('云端张小明已删除', !xmGone, JSON.stringify(memory.students));
check('云端仅剩李小红', memory.students.length === 1, JSON.stringify(memory.students));

console.log('\n===== 七、邀请码绑定 + 忘记密码 =====');

// 当前是教师登录。教师查看班级信息，应包含 6 位邀请码
const myClassRes = await Cloud.myClass();
const inviteCode = myClassRes.data.invite_code;
check('教师班级含邀请码(6位)', typeof inviteCode === 'string' && /^[A-Z2-9]{6}$/.test(inviteCode), inviteCode);

// 教师重置邀请码，应生成新码
const resetRes = await Cloud.resetClassInvite();
const newCode = resetRes.data.inviteCode;
check('教师重置邀请码成功', newCode !== inviteCode && /^[A-Z2-9]{6}$/.test(newCode), `${inviteCode} → ${newCode}`);

// 新学生注册后，凭邀请码查询班级并绑定自己
await Cloud.logout();
const invStu = await reg('student', unique('s_inv'));
const stuInfo = await Cloud.classInfo(newCode);
check('学生凭邀请码查到班级', stuInfo.data.name === '四年级1班', JSON.stringify(stuInfo.data));
const lxh = stuInfo.data.students.find((s) => s.name === '李小红');
check('学生看到可选学生(李小红)', !!lxh, JSON.stringify(stuInfo.data.students));
const stuBind = await Cloud.bindStudent(lxh.id);
check('学生通过邀请码绑定自己(李小红)', stuBind.data.name === '李小红', JSON.stringify(stuBind.data));

// 无效邀请码应被拒绝
let invalidErr = '';
try { await Cloud.classInfo('ZZZZZZ'); } catch (e) { invalidErr = e.message; }
check('无效邀请码被拒绝', invalidErr.includes('无效'), invalidErr);

// ===== 忘记密码 =====
// 1) 注册一个未设置密保的账号，重置应被拒绝
await Cloud.logout();
const noSec = await Cloud.register({ username: unique('nosec'), password: '123456', role: 'parent', name: '无密保' });
let noSecErr = '';
try { await Cloud.resetPassword({ username: noSec.username, securityAnswer: 'xxx', newPassword: '888888' }); } catch (e) { noSecErr = e.message; }
check('未设置密保账号无法找回', noSecErr.includes('未设置密保'), noSecErr);

// 2) 注册一个设置密保的账号，用错误答案应被拒绝
const secUser = await Cloud.register({ username: unique('sec'), password: '123456', role: 'parent', name: '有密保', securityQuestion: '我的生日是哪一天？', securityAnswer: '中秋' });
let wrongAnsErr = '';
try { await Cloud.resetPassword({ username: secUser.username, securityAnswer: '春节', newPassword: '888888' }); } catch (e) { wrongAnsErr = e.message; }
check('密保答案错误被拒绝', wrongAnsErr.includes('答案错误'), wrongAnsErr);

// 3) 用正确密保答案重置密码（大小写不敏感）
await Cloud.resetPassword({ username: secUser.username, securityAnswer: '中秋', newPassword: '888888' });
check('密保答案正确重置成功', true);

// 4) 用新密码登录成功
await Cloud.logout();
const relogin = await Cloud.login(secUser.username, '888888').catch((e) => e);
check('重置后可用新密码登录', relogin && relogin.username === secUser.username, JSON.stringify(relogin));

// 5) 旧密码登录失败
await Cloud.logout();
let oldPwdErr = '';
try { await Cloud.login(secUser.username, '123456'); } catch (e) { oldPwdErr = e.message; }
check('旧密码登录被拒绝', oldPwdErr.includes('用户名或密码错误'), oldPwdErr);

console.log(`\n========== 测试结果：${pass} 通过 / ${fail} 失败 ==========\n`);
process.exit(fail > 0 ? 1 : 0);