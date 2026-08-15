import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

const PRESETS = [
  { label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: '阿里云通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { label: '自定义', baseURL: '', model: '' },
];

export function Settings() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') ?? '');
  const [baseURL, setBaseURL] = useState(localStorage.getItem('ai_base_url') ?? 'https://api.deepseek.com/v1');
  const [model, setModel] = useState(localStorage.getItem('ai_model') ?? 'deepseek-chat');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_base_url', baseURL);
    localStorage.setItem('ai_model', model);
  }, [apiKey, baseURL, model]);

  const handlePreset = (idx: number) => {
    const p = PRESETS[idx];
    if (p) {
      setBaseURL(p.baseURL);
      setModel(p.model);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('请先填写 API Key');
      return;
    }
    if (!baseURL.trim()) {
      toast.error('请先填写 Base URL');
      return;
    }
    if (!model.trim()) {
      toast.error('请先填写模型名称');
      return;
    }

    setTesting(true);
    try {
      const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
      const result = await new Promise<{ ok: boolean; status: number; data?: unknown; errorText?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
        xhr.timeout = 15000;
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: true, status: xhr.status, data });
            } catch {
              resolve({ ok: false, status: xhr.status, errorText: '返回解析失败' });
            }
          } else {
            resolve({ ok: false, status: xhr.status, errorText: xhr.responseText });
          }
        };
        xhr.onerror = () => reject(new Error('网络请求失败'));
        xhr.ontimeout = () => reject(new Error('请求超时'));
        xhr.send(JSON.stringify({
          model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10,
        }));
      });

      if (!result.ok) {
        toast.error(`连接失败 (${result.status}): ${result.errorText}`);
        return;
      }

      const data = result.data as { choices?: { message?: { content?: string } }[] };
      if (data?.choices?.[0]?.message?.content) {
        toast.success('连接成功！API 配置正确');
      } else {
        toast.error('连接成功但返回格式异常');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      toast.error(`连接失败: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  const clearData = () => {
    if (window.confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
      const keys = [
        'rural_students', 'rural_scores', 'rural_lessons',
        'rural_wrong_answers', 'rural_practice', 'rural_demo_loaded',
      ];
      keys.forEach(k => localStorage.removeItem(k));
      toast.success('数据已清除');
    }
  };

  return (
    <div className="px-4 py-4 pb-24">
      <h2 className="text-lg font-bold text-gray-800 mb-4">AI 设置</h2>

      {/* API Key */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <label className="text-sm font-medium text-gray-700 mb-2 block">API Key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="输入你的 API Key"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent pr-16"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 px-2 py-1"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Base URL</label>
        <input
          type="text"
          value={baseURL}
          onChange={e => setBaseURL(e.target.value)}
          placeholder="https://api.deepseek.com/v1"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {/* Model */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <label className="text-sm font-medium text-gray-700 mb-2 block">模型名称</label>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="deepseek-chat"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {/* Presets */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <label className="text-sm font-medium text-gray-700 mb-2 block">快速选择</label>
        <div className="flex gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={p.label}
              onClick={() => handlePreset(idx)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                baseURL === p.baseURL
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test & Clear */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={testConnection}
          disabled={testing}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-500 text-white disabled:opacity-50 transition-all"
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
        <button
          onClick={clearData}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white transition-all"
        >
          清除数据
        </button>
      </div>

      {/* Tips */}
      <div className="bg-orange-50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-orange-800 mb-2">使用说明</h3>
        <ul className="text-xs text-orange-700 space-y-1.5">
          <li>• API Key 仅保存在本地浏览器中，不会上传到任何服务器</li>
          <li>• 支持所有 OpenAI 兼容格式的 API（DeepSeek、阿里云、OpenAI 等）</li>
          <li>• Base URL 不需要包含 /chat/completions 路径，系统会自动拼接</li>
          <li>• 数据存储在浏览器 localStorage 中，清除浏览器数据会丢失</li>
        </ul>
      </div>
    </div>
  );
}
