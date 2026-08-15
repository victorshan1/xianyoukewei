/**
 * 端到端冒烟测试 - 三端权限与业务接口
 *
 * 模拟完整业务场景：教师建班招生 → 学生绑定 → 家长绑孩子 →
 * 教师录成绩/画像/教案/报告 → 学生提交答疑/练习/错题 → 各端查看与越权拦截。
 *
 * 运行：node scripts/smoke-test.mjs （需先启动 node src/index.js）
 */

const BASE = 'http://localhost:3000';
let pass = 0;
let fail = 0;

// ============ 清理数据库，保证测试可重复运行 ============
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, '..', 'data', 'rural-ai.db');
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

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  return { status: res.status, data };
}

// 便捷登录
async function login(username, password = '123456') {
  const { data } = await api('POST', '/api/auth/login', { body: { username, password } });
  return data.token;
}

console.log('\n===== 一、账号与绑定 =====');

// 1. 教师注册并创建班级
await api('POST', '/api/auth/register', { body: { username: 'teacher1', password: '123456', role: 'teacher', name: '王老师' } });
const teacherToken = await login('teacher1');
const clsRes = await api('POST', '/api/auth/classes', { token: teacherToken, body: { name: '四年级1班', grade: '四年级' } });
const cls = clsRes.data.data;
check('教师创建班级成功', cls && cls.id === 1, JSON.stringify(clsRes.data));
const classId = cls.id;

// 2. 教师添加两名学生（自动归班）
const s1 = (await api('POST', '/api/students', { token: teacherToken, body: { name: '张小明', grade: '四年级', className: '四年级1班', studentNo: '2024040101' } })).data.data;
const s2 = (await api('POST', '/api/students', { token: teacherToken, body: { name: '李小红', grade: '四年级', className: '四年级1班', studentNo: '2024040102' } })).data.data;
check('教师新增学生1（自动归属班级）', s1.id === 1 && s1.classId === classId, JSON.stringify(s1));
check('教师新增学生2（自动归属班级）', s2.id === 2 && s2.classId === classId, JSON.stringify(s2));

// 3. 学生注册并绑定身份
await api('POST', '/api/auth/register', { body: { username: 'student1', password: '123456', role: 'student', name: '张小明' } });
const studentToken = await login('student1');
const bind1 = await api('POST', '/api/auth/bind-student', { token: studentToken, body: { studentId: s1.id } });
check('学生绑定自己的身份', bind1.status === 200, JSON.stringify(bind1.data));

// 4. 家长注册并绑定孩子
await api('POST', '/api/auth/register', { body: { username: 'parent1', password: '123456', role: 'parent', name: '张爸爸' } });
const parentToken = await login('parent1');
const bind2 = await api('POST', '/api/auth/bind-child', { token: parentToken, body: { studentId: s1.id } });
check('家长绑定孩子', bind2.status === 200, JSON.stringify(bind2.data));
const children = await api('GET', '/api/auth/my-children', { token: parentToken });
check('家长查看孩子列表', children.data.data.length === 1 && children.data.data[0].name === '张小明');

console.log('\n===== 二、教师端业务 =====');

// 5. 教师录入成绩
const sc = await api('POST', '/api/scores', { token: teacherToken, body: { studentId: s1.id, subject: '数学', type: '考试', score: 92, maxScore: 100, knowledgePoints: ['分数', '应用题'], date: '2025-05-25' } });
check('教师录入成绩', sc.status === 201 && sc.data.data.knowledgePoints.includes('分数'), JSON.stringify(sc.data));

// 6. 教师生成画像
const pf = await api('POST', '/api/profiles', { token: teacherToken, body: { studentId: s1.id, dimensions: [85, 78, 90, 72, 88], attribution: { items: [{ reason: '粗心大意', probability: 0.4 }] }, suggestions: ['加强审题训练'] } });
check('教师生成学生画像', pf.status === 200 && pf.data.data.dimensions.length === 5);

// 7. 教师创建教案
const lp = await api('POST', '/api/lessons', { token: teacherToken, body: { subject: '语文', grade: '四年级', topic: '古诗两首', content: '# 教案内容', homeworkLevels: { basic: '背诵古诗', advanced: '赏析', extended: '仿写' } } });
check('教师创建教案', lp.status === 201 && lp.data.data.homeworkLevels.basic === '背诵古诗');

// 8. 教师生成报告
const rp = await api('POST', '/api/reports', { token: teacherToken, body: { studentId: s1.id, type: 'weekly', startDate: '2025-06-01', endDate: '2025-06-07', data: { studyHours: 10, homeworkCompletion: 95, weakPoints: ['应用题'], trend: 'up' } } });
check('教师生成学情报告', rp.status === 201 && rp.data.data.data.weakPoints.length === 1);

console.log('\n===== 三、学生端业务 =====');

// 9. 学生提交答疑（自动绑定到自己）
const qa = await api('POST', '/api/qa', { token: studentToken, body: { question: '小明有15个苹果，给了小红6个，还剩几个？', answer: '15 - 6 = 9，还剩9个', knowledgePoints: ['减法', '应用题'] } });
check('学生提交答疑（自动归属自己）', qa.status === 201 && qa.data.data.studentId === s1.id, JSON.stringify(qa.data));

// 10. 学生提交练习记录
const pr = await api('POST', '/api/practice', { token: studentToken, body: { knowledgePoint: '乘除法', difficulty: 2, totalQuestions: 10, correctCount: 8, timeSpent: 300 } });
check('学生提交练习记录', pr.status === 201 && pr.data.data.studentId === s1.id);

// 11. 学生添加错题
const wa = await api('POST', '/api/wrong-answers', { token: studentToken, body: { subject: '数学', question: '3/4 + 1/2 = ?', correctAnswer: '5/4', knowledgePoint: '分数加减法' } });
check('学生添加错题', wa.status === 201 && wa.data.data.studentId === s1.id);
const waId = wa.data.data.id;

// 12. 学生更新错题掌握状态
const st = await api('PUT', `/api/wrong-answers/${waId}/status`, { token: studentToken, body: { status: 'mastered' } });
check('学生更新错题状态', st.status === 200 && st.data.data.status === 'mastered');

// 13. 学生查看自己的答疑/错题
const myQa = await api('GET', '/api/qa', { token: studentToken });
check('学生只能看到自己的答疑', myQa.data.data.length === 1);

console.log('\n===== 四、家长端查看 =====');

// 14. 家长查看孩子的成绩/报告/错题
const pScores = await api('GET', `/api/scores?studentId=${s1.id}`, { token: parentToken });
check('家长查看孩子成绩', pScores.status === 200 && pScores.data.data.length === 1);

const pReports = await api('GET', `/api/reports?studentId=${s1.id}`, { token: parentToken });
check('家长查看孩子报告', pReports.data.data.length === 1);

const pWrong = await api('GET', `/api/wrong-answers?studentId=${s1.id}`, { token: parentToken });
check('家长查看孩子错题', pWrong.data.data.length === 1);

console.log('\n===== 五、同角色数据隔离准备 =====');

// 5a. 学生2（李小红）注册并绑定身份
await api('POST', '/api/auth/register', { body: { username: 'student2', password: '123456', role: 'student', name: '李小红' } });
const student2Token = await login('student2');
const bind3 = await api('POST', '/api/auth/bind-student', { token: student2Token, body: { studentId: s2.id } });
check('学生2绑定自己的身份', bind3.status === 200, JSON.stringify(bind3.data));

// 5b. 教师为学生2录入业务数据（成绩/画像/报告）
await api('POST', '/api/scores', { token: teacherToken, body: { studentId: s2.id, subject: '语文', type: '考试', score: 88, maxScore: 100, date: '2025-05-26' } });
await api('POST', '/api/profiles', { token: teacherToken, body: { studentId: s2.id, dimensions: [80, 85, 70, 90, 75], attribution: {}, suggestions: [] } });
await api('POST', '/api/reports', { token: teacherToken, body: { studentId: s2.id, type: 'weekly', startDate: '2025-06-01', endDate: '2025-06-07', data: { studyHours: 8, homeworkCompletion: 90 } } });

// 5c. 学生2提交答疑/练习/错题
const qa2 = await api('POST', '/api/qa', { token: student2Token, body: { question: '小红的问题', answer: '参考答案', knowledgePoints: ['语文'] } });
const pr2 = await api('POST', '/api/practice', { token: student2Token, body: { knowledgePoint: '阅读理解', totalQuestions: 8, correctCount: 6 } });
const wa2 = await api('POST', '/api/wrong-answers', { token: student2Token, body: { subject: '数学', question: '小红错题', correctAnswer: '答案' } });
check('学生2提交答疑/练习/错题', qa2.status === 201 && pr2.status === 201 && wa2.status === 201, `qa=${qa2.status} pr=${pr2.status} wa=${wa2.status}`);
const qa2Id = qa2.data.data.id;
const pr2Id = pr2.data.data.id;
const wa2Id = wa2.data.data.id;

console.log('\n===== 六、跨角色越权拦截 =====');

// 15. 家长尝试查看非孩子的学生数据（学生2）→ 403
const pOther = await api('GET', `/api/scores?studentId=${s2.id}`, { token: parentToken });
check('家长访问他人孩子数据被拒(403)', pOther.status === 403, `status=${pOther.status}`);

// 16. 学生尝试录入成绩 → 403
const sScore = await api('POST', '/api/scores', { token: studentToken, body: { studentId: s1.id, subject: '数学', score: 100 } });
check('学生录入成绩被拒(403)', sScore.status === 403, `status=${sScore.status}`);

// 17. 未登录访问业务接口 → 401
const noAuth = await api('GET', '/api/qa');
check('未登录访问被拒(401)', noAuth.status === 401, `status=${noAuth.status}`);

// 18. 教师查看全班学生成绩/答疑（现在有 s1、s2 两条）
const tScores = await api('GET', '/api/scores', { token: teacherToken });
check('教师查看全班成绩', tScores.data.data.length === 2, `len=${tScores.data.data.length}`);
const tQa = await api('GET', '/api/qa', { token: teacherToken });
check('教师查看全班答疑', tQa.data.data.length === 2, `len=${tQa.data.data.length}`);

// 19. 学生尝试删除不存在的记录 → 404
const delOther = await api('DELETE', '/api/wrong-answers/9999', { token: studentToken });
check('删除不存在记录返回404', delOther.status === 404, `status=${delOther.status}`);

console.log('\n===== 七、同角色数据隔离（学生A访问学生B） =====');

// 20-25. 学生1读取学生2的各种数据 → 403
const v1 = await api('GET', `/api/scores?studentId=${s2.id}`, { token: studentToken });
check('学生访问他人成绩被拒(403)', v1.status === 403, `status=${v1.status}`);
const v2 = await api('GET', `/api/profiles?studentId=${s2.id}`, { token: studentToken });
check('学生访问他人画像被拒(403)', v2.status === 403, `status=${v2.status}`);
const v3 = await api('GET', `/api/reports?studentId=${s2.id}`, { token: studentToken });
check('学生访问他人报告被拒(403)', v3.status === 403, `status=${v3.status}`);
const v4 = await api('GET', `/api/qa?studentId=${s2.id}`, { token: studentToken });
check('学生访问他人答疑被拒(403)', v4.status === 403, `status=${v4.status}`);
const v5 = await api('GET', `/api/practice?studentId=${s2.id}`, { token: studentToken });
check('学生访问他人练习被拒(403)', v5.status === 403, `status=${v5.status}`);
const v6 = await api('GET', `/api/wrong-answers?studentId=${s2.id}`, { token: studentToken });
check('学生访问他人错题被拒(403)', v6.status === 403, `status=${v6.status}`);

// 26-29. 学生1修改/删除学生2的记录 → 403
const m1 = await api('PUT', `/api/qa/${qa2Id}`, { token: studentToken, body: { answer: '篡改答案' } });
check('学生修改他人答疑被拒(403)', m1.status === 403, `status=${m1.status}`);
const m2 = await api('PUT', `/api/practice/${pr2Id}`, { token: studentToken, body: { correctCount: 99 } });
check('学生修改他人练习被拒(403)', m2.status === 403, `status=${m2.status}`);
const m3 = await api('PUT', `/api/wrong-answers/${wa2Id}/status`, { token: studentToken, body: { status: 'mastered' } });
check('学生修改他人错题被拒(403)', m3.status === 403, `status=${m3.status}`);
const m4 = await api('DELETE', `/api/wrong-answers/${wa2Id}`, { token: studentToken });
check('学生删除他人错题被拒(403)', m4.status === 403, `status=${m4.status}`);

// 30. 反向：学生2访问学生1数据 → 403
const v7 = await api('GET', `/api/scores?studentId=${s1.id}`, { token: student2Token });
check('反向：学生B访问学生A数据被拒(403)', v7.status === 403, `status=${v7.status}`);

// 31. 学生1访问自己的数据仍正常（隔离不误伤）
const v8 = await api('GET', `/api/scores?studentId=${s1.id}`, { token: studentToken });
check('学生访问自己的数据正常(200)', v8.status === 200, `status=${v8.status}`);

// 32. 教师跨班越权：另一教师访问本班学生数据 → 403
await api('POST', '/api/auth/register', { body: { username: 'teacher2', password: '123456', role: 'teacher', name: '李老师' } });
const teacher2Token = await login('teacher2');
await api('POST', '/api/auth/classes', { token: teacher2Token, body: { name: '三年级2班', grade: '三年级' } });
const t2o = await api('GET', `/api/scores?studentId=${s1.id}`, { token: teacher2Token });
check('教师访问他人班级学生数据被拒(403)', t2o.status === 403, `status=${t2o.status}`);

console.log(`\n========== 测试结果：${pass} 通过 / ${fail} 失败 ==========\n`);
process.exit(fail > 0 ? 1 : 0);