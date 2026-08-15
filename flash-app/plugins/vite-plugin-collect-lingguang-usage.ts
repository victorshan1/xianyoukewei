import fs from 'node:fs/promises';
import path from 'path';
import type { Plugin } from 'vite';

type NodeAny = any;

type UsageInfo = {
  count: number;
  getUserMedia?: {
    audio: boolean;
    video: boolean;
    dynamic: boolean;
  };
};

type UsageEntry = {
  api: string;
  label: string;
  icon: string;
};

type UsageReport = {
  audio: boolean;
  apis: UsageEntry[];
};

type ApiLabelInfo = {
  api: string;
  label: string;
  icon: string;
};

type ApiLabelMap = Record<string, ApiLabelInfo>;

const BARE_GLOBAL_API_MAP: Record<string, string> = {
  callLLM: 'callLLM',
  playTTS: 'playTTS',
  stopAllTTS: 'stopAllTTS',
  loadMap: 'loadMap',
};

const GET_USER_MEDIA_API = 'lingguang.mediaDevices.getUserMedia';

const DIRECT_BROWSER_API_MAP: Record<string, string> = {
  'navigator.mediaDevices.getUserMedia': GET_USER_MEDIA_API,
  'window.navigator.mediaDevices.getUserMedia': GET_USER_MEDIA_API,
  'globalThis.navigator.mediaDevices.getUserMedia': GET_USER_MEDIA_API,
};

const AUDIO_RUNTIME_HELPERS = new Set(['jsx', 'jsxs', 'jsxDEV', '_jsx', '_jsxs', '_jsxDEV', 'createElement']);

const WEB_AUDIO_CONSTRUCTORS = new Set([
  'AudioContext',
  'webkitAudioContext',
  'OfflineAudioContext',
  'webkitOfflineAudioContext',
  'AudioWorkletNode',
  'AnalyserNode',
  'AudioBufferSourceNode',
  'BiquadFilterNode',
  'ChannelMergerNode',
  'ChannelSplitterNode',
  'ConstantSourceNode',
  'ConvolverNode',
  'DelayNode',
  'DynamicsCompressorNode',
  'GainNode',
  'IIRFilterNode',
  'MediaElementAudioSourceNode',
  'MediaStreamAudioDestinationNode',
  'MediaStreamAudioSourceNode',
  'MediaStreamTrackAudioSourceNode',
  'OscillatorNode',
  'PannerNode',
  'PeriodicWave',
  'StereoPannerNode',
  'WaveShaperNode',
]);

const WEB_AUDIO_METHODS = new Set([
  'createAnalyser',
  'createBiquadFilter',
  'createBuffer',
  'createBufferSource',
  'createChannelMerger',
  'createChannelSplitter',
  'createConvolver',
  'createDelay',
  'createDynamicsCompressor',
  'createGain',
  'createIIRFilter',
  'createMediaElementSource',
  'createMediaStreamDestination',
  'createMediaStreamSource',
  'createMediaStreamTrackSource',
  'createOscillator',
  'createPanner',
  'createPeriodicWave',
  'createStereoPanner',
  'createWaveShaper',
  'decodeAudioData',
]);

function getPropName(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name ?? null;
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null;
  return null;
}

function getMemberPropName(node: NodeAny): string | null {
  if (!node || node.type !== 'MemberExpression') return null;
  if (node.computed) {
    const prop = node.property;
    if (prop?.type === 'Literal' && typeof prop.value === 'string') return prop.value;
    return null;
  }
  return getPropName(node.property);
}

function walk(node: NodeAny, visit: (n: NodeAny) => void) {
  if (!node || typeof node !== 'object') return;
  visit(node);

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit);
    } else if (value && typeof value.type === 'string') {
      walk(value, visit);
    }
  }
}

function unwrapChainExpression(node: NodeAny): NodeAny {
  if (node?.type === 'ChainExpression') return node.expression;
  return node;
}

function getStaticStringValue(node: NodeAny): string | null {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value?.cooked ?? null;
  }
  return null;
}

function extractMemberChain(node: NodeAny): string[] | null {
  const root = unwrapChainExpression(node);
  if (!root || root.type !== 'MemberExpression') return null;

  const parts: string[] = [];
  let current: NodeAny = root;

  while (current?.type === 'MemberExpression') {
    const prop = getMemberPropName(current);
    if (!prop) return null;
    parts.unshift(prop);

    current = unwrapChainExpression(current.object);
  }

  if (current?.type !== 'Identifier') return null;
  parts.unshift(current.name);
  return parts;
}

function normalizeMemberCall(chain: string[]): string | null {
  const directBrowserApi = DIRECT_BROWSER_API_MAP[chain.join('.')];
  if (directBrowserApi) return directBrowserApi;

  if (chain.length >= 3 && chain[0] === 'window' && chain[1] === 'lingguang') {
    return `lingguang.${chain.slice(2).join('.')}`;
  }

  if (chain.length >= 2 && chain[0] === 'lingguang') {
    return `lingguang.${chain.slice(1).join('.')}`;
  }

  if (chain.length === 2 && chain[0] === 'window' && chain[1] in BARE_GLOBAL_API_MAP) {
    return BARE_GLOBAL_API_MAP[chain[1]];
  }

  return null;
}

function isDirectBrowserGetUserMediaChain(chain: string[]): boolean {
  return DIRECT_BROWSER_API_MAP[chain.join('.')] === GET_USER_MEDIA_API;
}

function normalizeIdentifierCall(node: NodeAny): string | null {
  if (!node || node.type !== 'Identifier') return null;
  return BARE_GLOBAL_API_MAP[node.name] ?? null;
}

function getCalleeName(node: NodeAny): string | null {
  const target = unwrapChainExpression(node);
  if (!target) return null;
  if (target.type === 'Identifier') return target.name ?? null;
  if (target.type === 'MemberExpression') return getMemberPropName(target);
  return null;
}

function isAudioTagJsxElement(node: NodeAny): boolean {
  if (!node || node.type !== 'JSXOpeningElement') return false;
  return node.name?.type === 'JSXIdentifier' && node.name.name === 'audio';
}

function isAudioTagRuntimeCall(node: NodeAny): boolean {
  if (!node || node.type !== 'CallExpression') return false;

  const calleeName = getCalleeName(node.callee);
  if (!calleeName || !AUDIO_RUNTIME_HELPERS.has(calleeName)) return false;

  return getStaticStringValue(node.arguments?.[0]) === 'audio';
}

function isWebAudioUsage(node: NodeAny): boolean {
  if (!node) return false;

  if (node.type === 'NewExpression') {
    const calleeName = getCalleeName(node.callee);
    return Boolean(calleeName && WEB_AUDIO_CONSTRUCTORS.has(calleeName));
  }

  if (node.type === 'CallExpression') {
    const callee = unwrapChainExpression(node.callee);
    if (callee?.type !== 'MemberExpression') return false;

    const methodName = getMemberPropName(callee);
    return Boolean(methodName && WEB_AUDIO_METHODS.has(methodName));
  }

  return false;
}

function isHowlerUsage(node: NodeAny): boolean {
  if (!node) return false;

  if (node.type === 'ImportDeclaration') {
    const source = getStaticStringValue(node.source);
    return source === 'howler' || source?.startsWith('howler/') === true;
  }

  if (node.type === 'ImportExpression') {
    const source = getStaticStringValue(node.source);
    return source === 'howler' || source?.startsWith('howler/') === true;
  }

  if (node.type === 'CallExpression') {
    const calleeName = getCalleeName(node.callee);

    if (calleeName === 'require') {
      const source = getStaticStringValue(node.arguments?.[0]);
      return source === 'howler' || source?.startsWith('howler/') === true;
    }

    const memberChain = extractMemberChain(node.callee);
    if (!memberChain) return false;

    return memberChain[0] === 'Howler' || memberChain[0] === 'Howl';
  }

  if (node.type === 'NewExpression') {
    const calleeName = getCalleeName(node.callee);
    return calleeName === 'Howl';
  }

  return false;
}

function isToneSource(source: string | null): boolean {
  return Boolean(
    source &&
      (source === 'tone' ||
        source.startsWith('tone/') ||
        source === '@/lib/tone' ||
        source === '@/lib/tone.ts' ||
        source.endsWith('/lib/tone') ||
        source.endsWith('/lib/tone.ts'))
  );
}

function isToneUsage(node: NodeAny): boolean {
  if (!node) return false;

  if (node.type === 'ImportDeclaration') {
    return isToneSource(getStaticStringValue(node.source));
  }

  if (node.type === 'ImportExpression') {
    return isToneSource(getStaticStringValue(node.source));
  }

  if (node.type === 'CallExpression') {
    const calleeName = getCalleeName(node.callee);

    if (calleeName === 'require') {
      return isToneSource(getStaticStringValue(node.arguments?.[0]));
    }

    const memberChain = extractMemberChain(node.callee);
    return memberChain?.[0] === 'Tone';
  }

  if (node.type === 'NewExpression') {
    const memberChain = extractMemberChain(node.callee);
    if (memberChain?.[0] === 'Tone') return true;

    const calleeName = getCalleeName(node.callee);
    return Boolean(calleeName && /^(Poly)?Synth$|^(Sampler|Player|Players|Oscillator|Noise)$/.test(calleeName));
  }

  return false;
}

function normalizeModuleId(id: string): string {
  const queryIndex = id.indexOf('?');
  return queryIndex >= 0 ? id.slice(0, queryIndex) : id;
}

function recordUsage(map: Map<string, UsageInfo>, apiName: string) {
  const current = map.get(apiName);
  if (!current) {
    map.set(apiName, {
      count: 1,
    });
    return;
  }

  current.count++;
}

function analyzeGetUserMediaConstraintValue(node: NodeAny): { value: boolean; dynamic: boolean } {
  if (!node) return { value: false, dynamic: true };
  if (node.type === 'Literal' && typeof node.value === 'boolean') {
    return { value: node.value, dynamic: false };
  }
  if (node.type === 'ObjectExpression') {
    return { value: true, dynamic: false };
  }
  return { value: false, dynamic: true };
}

function analyzeGetUserMediaUsage(node: NodeAny): NonNullable<UsageInfo['getUserMedia']> {
  const usage = {
    audio: false,
    video: false,
    dynamic: false,
  };

  const target = unwrapChainExpression(node);
  if (!target || target.type !== 'ObjectExpression') {
    usage.dynamic = true;
    return usage;
  }

  for (const property of target.properties ?? []) {
    if (!property) continue;

    if (property.type !== 'Property' || property.kind !== 'init') {
      usage.dynamic = true;
      continue;
    }

    if (property.computed) {
      usage.dynamic = true;
      continue;
    }

    const keyName = getPropName(property.key);
    if (!keyName) {
      usage.dynamic = true;
      continue;
    }

    if (keyName !== 'audio' && keyName !== 'video') continue;

    const analyzedValue = analyzeGetUserMediaConstraintValue(property.value);
    usage[keyName] = usage[keyName] || analyzedValue.value;
    usage.dynamic = usage.dynamic || analyzedValue.dynamic;
  }

  return usage;
}

function mergeGetUserMediaUsage(
  map: Map<string, UsageInfo>,
  apiName: string,
  usage: NonNullable<UsageInfo['getUserMedia']>
) {
  const current = map.get(apiName);
  if (!current) {
    map.set(apiName, {
      count: 1,
      getUserMedia: { ...usage },
    });
    return;
  }

  current.count++;
  const currentUsage = current.getUserMedia ?? {
    audio: false,
    video: false,
    dynamic: false,
  };
  currentUsage.audio = currentUsage.audio || usage.audio;
  currentUsage.video = currentUsage.video || usage.video;
  currentUsage.dynamic = currentUsage.dynamic || usage.dynamic;
  current.getUserMedia = currentUsage;
}

function getGetUserMediaLabel(usage: UsageInfo, fallbackLabel: string): string {
  const mediaUsage = usage.getUserMedia;
  if (!mediaUsage) return fallbackLabel;
  if (mediaUsage.dynamic || (mediaUsage.audio && mediaUsage.video)) {
    return '麦克风与摄像头';
  }
  if (mediaUsage.audio) {
    return '麦克风';
  }
  if (mediaUsage.video) {
    return '摄像头';
  }
  return fallbackLabel;
}

function buildUsageEntry(api: string, usage: UsageInfo, apiLabelMap: ApiLabelMap): UsageEntry | null {
  const apiInfo = apiLabelMap[api];
  if (!apiInfo) return null;

  if (api === GET_USER_MEDIA_API) {
    return {
      ...apiInfo,
      label: getGetUserMediaLabel(usage, apiInfo.label),
    };
  }

  return apiInfo;
}

export function collectLingguangUsagePlugin(): Plugin {
  const usageMap = new Map<string, UsageInfo>();
  let hasAudioUsage = false;
  let distOutputFilePath = '';
  let rootOutputFilePath = '';
  let labelsFilePath = '';

  return {
    name: 'collect-lingguang-usage',
    enforce: 'post',
    apply: 'build',

    buildStart() {
      usageMap.clear();
      hasAudioUsage = false;
    },

    configResolved(config) {
      distOutputFilePath = path.resolve(config.root, config.build.outDir, 'lingguang-usage.json');
      rootOutputFilePath = path.resolve(config.root, 'lingguang-usage.json');
      labelsFilePath = path.resolve(config.root, 'lingguang-api-labels.json');
    },

    transform(code, id) {
      const normalizedId = normalizeModuleId(id);
      if (normalizedId.includes('/node_modules/')) return null;
      if (normalizedId.startsWith('\0')) return null;

      let ast: NodeAny;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }

      walk(ast, (node) => {
        if (!hasAudioUsage) {
          hasAudioUsage =
            isAudioTagJsxElement(node) ||
            isAudioTagRuntimeCall(node) ||
            isWebAudioUsage(node) ||
            isHowlerUsage(node) ||
            isToneUsage(node);
        }

        if (node.type !== 'CallExpression') return;

        const callee = unwrapChainExpression(node.callee);
        const chain = extractMemberChain(callee);
        const apiName = chain ? normalizeMemberCall(chain) : normalizeIdentifierCall(callee);
        if (!apiName) return;

        if (apiName === GET_USER_MEDIA_API && chain && isDirectBrowserGetUserMediaChain(chain)) {
          const getUserMediaUsage = analyzeGetUserMediaUsage(node.arguments?.[0]);
          if (!getUserMediaUsage.dynamic && !getUserMediaUsage.audio && !getUserMediaUsage.video) {
            return;
          }
          mergeGetUserMediaUsage(usageMap, apiName, getUserMediaUsage);
          return;
        }

        recordUsage(usageMap, apiName);
      });

      return null;
    },

    async closeBundle() {
      let apiLabelMap: ApiLabelMap = {};
      if (labelsFilePath) {
        try {
          const labelsContent = await fs.readFile(labelsFilePath, 'utf8');
          apiLabelMap = JSON.parse(labelsContent) as ApiLabelMap;
        } catch {
          apiLabelMap = {};
        }
      }

      const entries = Array.from(usageMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const report: UsageReport = {
        audio: hasAudioUsage,
        apis: entries
          .map(([api, usage]) => buildUsageEntry(api, usage, apiLabelMap))
          .filter((apiInfo): apiInfo is UsageEntry => Boolean(apiInfo)),
      };

      const content = `${JSON.stringify(report, null, 2)}\n`;

      const writeTasks: Array<Promise<void>> = [];

      if (distOutputFilePath) {
        writeTasks.push(
          fs.mkdir(path.dirname(distOutputFilePath), { recursive: true }).then(() => {
            return fs.writeFile(distOutputFilePath, content, 'utf8');
          })
        );
      }

      if (rootOutputFilePath) {
        writeTasks.push(fs.writeFile(rootOutputFilePath, content, 'utf8'));
      }

      await Promise.all(writeTasks);
    },
  };
}
