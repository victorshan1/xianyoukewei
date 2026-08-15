const SYSTEM_PROMPT = '你是乡村课堂AI助教，一位经验丰富、耐心细致的教学助手。请用简洁、易懂的语言回答，适合乡村师生使用。';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

function getConfig(): AIConfig {
  const apiKey = localStorage.getItem('ai_api_key') ?? '';
  const baseURL = localStorage.getItem('ai_base_url') ?? 'https://api.deepseek.com/v1';
  const model = localStorage.getItem('ai_model') ?? 'deepseek-chat';
  return { apiKey, baseURL, model };
}

async function callLLM(messages: ChatMessage[], timeout?: number): Promise<string> {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AI 请求超时'));
    }, timeout ?? 60000);

    const url = `${config.baseURL.replace(/\/$/, '')}/chat/completions`;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${config.apiKey}`);

    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`API 请求失败 (${xhr.status}): ${xhr.responseText}`));
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.length > 0) {
          resolve(content);
        } else {
          reject(new Error('AI 返回格式异常'));
        }
      } catch {
        reject(new Error('AI 返回解析失败'));
      }
    };

    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error('网络请求失败'));
    };

    xhr.ontimeout = () => {
      clearTimeout(timer);
      reject(new Error('AI 请求超时'));
    };

    xhr.timeout = (timeout ?? 60000);

    xhr.send(JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      temperature: 0.7,
    }));
  });
}

export const aiService = {
  async generateLessonPlan(subject: string, grade: string, topic: string, templateType: string): Promise<string> {
    const templates: Record<string, string> = {
      'new-lesson': '新授课',
      'review': '复习课',
      'experiment': '实验课',
      'commentary': '讲评课',
    };
    const typeName = templates[templateType] ?? '新授课';
    const prompt = `请为${grade}${subject}课"${topic}"设计一份${typeName}教案。
要求包含：教学目标、教学重难点、教学准备、教学过程（导入、新授/复习、练习、小结、作业）、板书设计。
注意结合乡村教学实际，设计互动性强的环节。`;

    return callLLM([
      { role: 'system', content: SYSTEM_PROMPT + '你擅长编写教案。' },
      { role: 'user', content: prompt },
    ]);
  },

  async solveQuestion(question: string): Promise<{ steps: string[]; knowledgePoints: string[]; summary: string }> {
    const prompt = `请解答以下题目，并按以下JSON格式返回：
{"steps": ["步骤1说明", "步骤2说明", ...], "knowledgePoints": ["知识点1", "知识点2", ...], "summary": "总结说明"}

题目：${question}

请确保返回的是有效的JSON格式。`;

    const result = await callLLM([
      { role: 'system', content: SYSTEM_PROMPT + '你擅长解答题目，会分步骤讲解。请以JSON格式返回结果。' },
      { role: 'user', content: prompt },
    ], 30000);

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch !== null) {
        const parsed = JSON.parse(jsonMatch[0]) as { steps?: string[]; knowledgePoints?: string[]; summary?: string };
        return {
          steps: Array.isArray(parsed.steps) ? parsed.steps : [result],
          knowledgePoints: Array.isArray(parsed.knowledgePoints) ? parsed.knowledgePoints : [],
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        };
      }
    } catch { /* fall through */ }

    return { steps: [result], knowledgePoints: [], summary: '' };
  },

  async generatePractice(subject: string, knowledgePoint: string, count: number): Promise<{ questions: { question: string; options: string[]; answer: string; explanation: string }[] }> {
    const prompt = `请出${String(count)}道${subject}练习题，知识点：${knowledgePoint}。
按以下JSON格式返回：
{"questions": [{"question": "题目", "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"], "answer": "A", "explanation": "解析"}]}

请确保返回有效的JSON格式。`;

    const result = await callLLM([
      { role: 'system', content: SYSTEM_PROMPT + '你擅长出题，请以JSON格式返回。' },
      { role: 'user', content: prompt },
    ], 30000);

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch !== null) {
        const parsed = JSON.parse(jsonMatch[0]) as { questions?: { question: string; options: string[]; answer: string; explanation: string }[] };
        if (Array.isArray(parsed.questions)) {
          return { questions: parsed.questions };
        }
      }
    } catch { /* fall through */ }

    return { questions: [] };
  },

  async generateSuggestions(studentName: string, radarData: { dimension: string; value: number }[]): Promise<string> {
    const dataStr = radarData.map(r => `${r.dimension}: ${String(r.value)}分`).join('，');
    const prompt = `学生${studentName}的五维能力评估：${dataStr}。
请给出3-5条具体的、可操作的教学建议，适合乡村教学条件。每条建议用"• "开头。`;

    return callLLM([
      { role: 'system', content: SYSTEM_PROMPT + '你擅长根据学生数据给出教学建议。' },
      { role: 'user', content: prompt },
    ]);
  },

  async generateReport(studentName: string, scores: { subject: string; score: number; fullScore: number }[]): Promise<string> {
    const scoresStr = scores.map(s => `${s.subject}: ${String(s.score)}/${String(s.fullScore)}`).join('，');
    const prompt = `学生${studentName}近期成绩：${scoresStr}。
请用通俗易懂的语言写一段学情报告（100-200字），包含：整体表现、进步/退步情况、需要关注的方面、给家长的建议。`;

    return callLLM([
      { role: 'system', content: SYSTEM_PROMPT + '你擅长写学情报告，语言要通俗易懂，适合家长阅读。' },
      { role: 'user', content: prompt },
    ]);
  },
};
