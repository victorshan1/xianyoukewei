import type { Plugin } from 'vite'

type NodeAny = any

const AUDIO_WRAPPER_SUFFIX = '/src/lib/audio.ts'
const AUDIO_FORMAT_SUFFIX = '/src/lib/audio-format.ts'
const AUDIO_RUNTIME_SUFFIX = '/src/lib/audioRuntime.ts'
const TONE_WRAPPER_SUFFIX = '/src/lib/tone.ts'
const CONTROLLED_AUDIO_WRAPPER_SUFFIXES = new Set([AUDIO_WRAPPER_SUFFIX, AUDIO_FORMAT_SUFFIX, AUDIO_RUNTIME_SUFFIX, TONE_WRAPPER_SUFFIX])

const BLOCKED_AUDIO_CONSTRUCTORS = new Set([
  'Audio',
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
  'AudioContext2',
])

const BLOCKED_AUDIO_METHODS = new Set([
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
  'captureStream',
  'mozCaptureStream',
  'webkitCaptureStream',
])

const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self'])

const BLOCKED_TONE_CONTEXT_EXPORTS = new Set(['getContext', 'setContext', 'context', 'Context', 'OfflineContext'])

const AUDIO_API_REPLACEMENT_HINT =
  '如需合成/乐器音效，请改用 import * as Tone from "@/lib/tone"；如需播放音频文件，请使用 import { Howl, Howler } from "@/lib/audio"。'

function normalizeModuleId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex >= 0 ? id.slice(0, queryIndex) : id
}

function getPropName(node: NodeAny): string | null {
  if (!node) return null
  if (node.type === 'Identifier') return node.name ?? null
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null
  return null
}

function getMemberPropName(node: NodeAny): string | null {
  if (!node || node.type !== 'MemberExpression') return null
  if (node.computed) {
    const prop = node.property
    if (prop?.type === 'Literal' && typeof prop.value === 'string') return prop.value
    return null
  }
  return getPropName(node.property)
}

function getCalleeName(node: NodeAny): string | null {
  if (!node) return null
  if (node.type === 'Identifier') return node.name ?? null
  if (node.type === 'MemberExpression') return getMemberPropName(node)
  if (node.type === 'ChainExpression') return getCalleeName(node.expression)
  return null
}

function getStaticStringValue(node: NodeAny): string | null {
  if (!node) return null
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value?.cooked ?? null
  }
  return null
}

function computeLineCol(code: string, index: number) {
  let line = 1
  let col = 1
  for (let i = 0; i < index && i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      line++
      col = 1
    } else {
      col++
    }
  }
  return { line, column: col }
}

function getCodeSnippet(code: string, start: number, end: number): string {
  const snippet = code.slice(start, end).trim()
  if (snippet.length > 100) {
    return `${snippet.slice(0, 97)}...`
  }
  return snippet
}

function walk(node: NodeAny, visit: (n: NodeAny) => void) {
  if (!node || typeof node !== 'object') return
  visit(node)

  for (const key of Object.keys(node)) {
    const value = node[key]
    if (!value) continue
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit)
    } else if (value && typeof value.type === 'string') {
      walk(value, visit)
    }
  }
}

function unwrapChainExpression(node: NodeAny): NodeAny {
  if (node?.type === 'ChainExpression') return node.expression
  return node
}

function extractMemberChain(node: NodeAny): string[] | null {
  const root = unwrapChainExpression(node)
  if (!root || root.type !== 'MemberExpression') return null

  const parts: string[] = []
  let current: NodeAny = root

  while (current?.type === 'MemberExpression') {
    const prop = getMemberPropName(current)
    if (!prop) return null
    parts.unshift(prop)
    current = unwrapChainExpression(current.object)
  }

  if (current?.type !== 'Identifier' && current?.type !== 'ThisExpression') return null
  parts.unshift(current.type === 'ThisExpression' ? 'this' : current.name)
  return parts
}

function serializeMemberChain(node: NodeAny): string | null {
  const chain = extractMemberChain(node)
  if (!chain) return null
  return chain.join('.')
}

function isHowlerSource(source: string | null): boolean {
  return source === 'howler' || source?.startsWith('howler/') === true
}

function isToneSource(source: string | null): boolean {
  return source === 'tone' || source?.startsWith('tone/') === true
}

function isToneWrapperSource(source: string | null): boolean {
  return Boolean(source && (source === '@/lib/tone' || source === '@/lib/tone.ts' || source.endsWith('/lib/tone') || source.endsWith('/lib/tone.ts')))
}

function isCreateAudioElement(node: NodeAny): boolean {
  if (!node || node.type !== 'CallExpression') return false

  const callee = node.callee
  if (callee?.type !== 'MemberExpression') return false
  if (getMemberPropName(callee) !== 'createElement') return false

  const objectName = getPropName(callee.object)
  if (objectName !== 'document') return false

  return getStaticStringValue(node.arguments?.[0])?.toLowerCase() === 'audio'
}

export function blockAudioApisPlugin(): Plugin {
  return {
    name: 'block-audio-apis',
    enforce: 'post',
    apply: 'build',

    transform(code, id) {
      if (id.includes('/node_modules/')) return null
      if (id.startsWith('\0')) return null

      const normalizedId = normalizeModuleId(id)
      if (Array.from(CONTROLLED_AUDIO_WRAPPER_SUFFIXES).some(suffix => normalizedId.endsWith(suffix))) {
        return null
      }

      let ast: NodeAny
      try {
        ast = this.parse(code)
      } catch {
        return null
      }

      const errorsByStart = new Map<number, {
        start: number
        end: number
        message: string
        codeSnippet?: string
      }>()
      const blockedConstructorAliases = new Set<string>()
      const blockedInstanceIdentifiers = new Set<string>()
      const blockedInstanceMemberChains = new Set<string>()
      const toneNamespaceIdentifiers = new Set<string>()
      const blockedToneContextIdentifiers = new Set<string>()
      const toneDestinationIdentifiers = new Set<string>()
      const toneGetDestinationIdentifiers = new Set<string>()

      const addError = (item: {
        start: number
        end: number
        message: string
        codeSnippet?: string
      }) => {
        const existing = errorsByStart.get(item.start)
        if (!existing || item.end > existing.end) {
          errorsByStart.set(item.start, item)
        }
      }

      const isBlockedConstructorExpression = (node: NodeAny): boolean => {
        if (!node) return false

        const target = unwrapChainExpression(node)

        if (target?.type === 'Identifier') {
          return BLOCKED_AUDIO_CONSTRUCTORS.has(target.name) || blockedConstructorAliases.has(target.name)
        }

        if (target?.type === 'MemberExpression') {
          const objectName = getPropName(target.object)
          const propertyName = getMemberPropName(target)
          return Boolean(objectName && propertyName && GLOBAL_OBJECTS.has(objectName) && BLOCKED_AUDIO_CONSTRUCTORS.has(propertyName))
        }

        return false
      }

      const isBlockedInstanceSource = (node: NodeAny): boolean => {
        if (!node) return false

        const target = unwrapChainExpression(node)

        if (target?.type === 'Identifier') {
          return blockedInstanceIdentifiers.has(target.name)
        }

        if (target?.type === 'MemberExpression') {
          const chain = serializeMemberChain(target)
          return Boolean(chain && blockedInstanceMemberChains.has(chain))
        }

        if (target?.type === 'NewExpression') {
          return isBlockedConstructorExpression(target.callee)
        }

        if (target?.type === 'CallExpression') {
          return isCreateAudioElement(target)
        }

        return false
      }

      const isToneNamespaceMember = (node: NodeAny, blockedMembers: Set<string>): boolean => {
        const chain = extractMemberChain(node)
        return Boolean(chain && toneNamespaceIdentifiers.has(chain[0]) && blockedMembers.has(chain[1]))
      }

      const isBlockedToneContextSource = (node: NodeAny): boolean => {
        const target = unwrapChainExpression(node)

        if (target?.type === 'Identifier') {
          return blockedToneContextIdentifiers.has(target.name)
        }

        if (target?.type === 'MemberExpression') {
          const chain = extractMemberChain(target)
          return Boolean(
            chain &&
              toneNamespaceIdentifiers.has(chain[0]) &&
              (BLOCKED_TONE_CONTEXT_EXPORTS.has(chain[1]) || chain.includes('rawContext') || chain.includes('context')),
          )
        }

        if (target?.type === 'CallExpression') {
          const callee = unwrapChainExpression(target.callee)
          if (callee?.type === 'Identifier') {
            return blockedToneContextIdentifiers.has(callee.name)
          }
          return isToneNamespaceMember(callee, new Set(['getContext']))
        }

        return false
      }

      const isToneDestinationSource = (node: NodeAny): boolean => {
        const target = unwrapChainExpression(node)

        if (target?.type === 'Identifier') {
          return toneDestinationIdentifiers.has(target.name)
        }

        if (target?.type === 'MemberExpression') {
          const chain = extractMemberChain(target)
          return Boolean(chain && toneNamespaceIdentifiers.has(chain[0]) && (chain[1] === 'Destination' || chain[1] === 'Master'))
        }

        if (target?.type === 'CallExpression') {
          const callee = unwrapChainExpression(target.callee)
          if (callee?.type === 'Identifier') {
            return toneGetDestinationIdentifiers.has(callee.name)
          }
          return isToneNamespaceMember(callee, new Set(['getDestination']))
        }

        return false
      }

      walk(ast, (node) => {
        if (node.type === 'ImportDeclaration') {
          const source = getStaticStringValue(node.source)
          if (isToneWrapperSource(source)) {
            for (const specifier of node.specifiers ?? []) {
              const localName = specifier.local?.name
              if (!localName) continue

              if (specifier.type === 'ImportNamespaceSpecifier') {
                toneNamespaceIdentifiers.add(localName)
                continue
              }

              if (specifier.type === 'ImportSpecifier') {
                const importedName = getPropName(specifier.imported)
                if (importedName === 'Tone') {
                  toneNamespaceIdentifiers.add(localName)
                }
                if (importedName === 'Destination' || importedName === 'Master') {
                  toneDestinationIdentifiers.add(localName)
                }
                if (importedName === 'getDestination') {
                  toneGetDestinationIdentifiers.add(localName)
                }
                if (importedName && BLOCKED_TONE_CONTEXT_EXPORTS.has(importedName)) {
                  blockedToneContextIdentifiers.add(localName)
                }
              }
            }
          }
          return
        }

        if (node.type === 'VariableDeclarator' && node.id?.type === 'Identifier') {
          const name = node.id.name
          const init = node.init

          if (isBlockedConstructorExpression(init)) {
            blockedConstructorAliases.add(name)
          }

          if (isBlockedInstanceSource(init)) {
            blockedInstanceIdentifiers.add(name)
          }

          if (isToneDestinationSource(init)) {
            toneDestinationIdentifiers.add(name)
          }

          return
        }

        if (node.type === 'AssignmentExpression' && node.operator === '=') {
          const left = unwrapChainExpression(node.left)
          const right = node.right

          if (left?.type === 'Identifier') {
            if (isBlockedConstructorExpression(right)) {
              blockedConstructorAliases.add(left.name)
            }
            if (isBlockedInstanceSource(right)) {
              blockedInstanceIdentifiers.add(left.name)
            }
            if (isToneDestinationSource(right)) {
              toneDestinationIdentifiers.add(left.name)
            }
            return
          }

          if (left?.type === 'MemberExpression' && isBlockedInstanceSource(right)) {
            const chain = serializeMemberChain(left)
            if (chain) {
              blockedInstanceMemberChains.add(chain)
            }
          }
        }
      })

      walk(ast, (node) => {
        if (node.type === 'AssignmentExpression') {
          const left = unwrapChainExpression(node.left)
          if (left?.type === 'MemberExpression' && getMemberPropName(left) === 'mute' && isToneDestinationSource(left.object)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止业务代码直接修改 Tone.js 总输出静音状态，静音必须由宿主 window.app.mute/unmute 统一管控。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          return
        }

        if (node.type === 'ImportDeclaration') {
          const source = getStaticStringValue(node.source)
          if (isHowlerSource(source)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止直接从 howler 导入，请改用 @/lib/audio。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          if (isToneSource(source)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止直接从 tone 导入，请改用 @/lib/tone。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          if (isToneWrapperSource(source)) {
            for (const specifier of node.specifiers ?? []) {
              if (specifier.type !== 'ImportSpecifier') continue
              const importedName = getPropName(specifier.imported)
              if (!importedName || !BLOCKED_TONE_CONTEXT_EXPORTS.has(importedName)) continue

              const start = specifier.start ?? node.start ?? 0
              const end = specifier.end ?? start + 20
              addError({
                start,
                end,
                message: `禁止从 @/lib/tone 导入 Tone.js 底层上下文能力 ${importedName}，请使用 Synth、Sampler、Transport、start 等高层能力。`,
                codeSnippet: getCodeSnippet(code, start, end),
              })
            }
          }
          return
        }

        if (node.type === 'ImportExpression') {
          const source = getStaticStringValue(node.source)
          if (isHowlerSource(source)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止动态导入 howler，请改用 @/lib/audio。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          if (isToneSource(source)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止动态导入 tone，请改用 @/lib/tone。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          return
        }

        if (node.type === 'CallExpression') {
          const calleeName = getCalleeName(node.callee)

          if (calleeName === 'require') {
            const source = getStaticStringValue(node.arguments?.[0])
            if (isHowlerSource(source)) {
              const start = node.start ?? 0
              const end = node.end ?? start + 20
              addError({
                start,
                end,
                message: '禁止通过 require 引入 howler，请改用 @/lib/audio。',
                codeSnippet: getCodeSnippet(code, start, end),
              })
            }
            if (isToneSource(source)) {
              const start = node.start ?? 0
              const end = node.end ?? start + 20
              addError({
                start,
                end,
                message: '禁止通过 require 引入 tone，请改用 @/lib/tone。',
                codeSnippet: getCodeSnippet(code, start, end),
              })
            }
          }

          if (node.callee?.type === 'Identifier' && blockedToneContextIdentifiers.has(node.callee.name)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: `禁止调用 Tone.js 底层上下文能力 ${node.callee.name}，请使用 @/lib/tone 暴露的高层音频能力。`,
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }

          if (isToneNamespaceMember(node.callee, new Set(['getContext', 'setContext']))) {
            const methodName = getMemberPropName(unwrapChainExpression(node.callee))
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: `禁止调用 Tone.js 底层上下文能力 ${methodName}，请使用 @/lib/tone 暴露的高层音频能力。`,
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }

          if (isCreateAudioElement(node)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止创建原生 <audio> 元素，请改用 @/lib/audio。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }

          if (node.callee?.type === 'MemberExpression') {
            const methodName = getMemberPropName(node.callee)
            const objectExpr = unwrapChainExpression(node.callee.object)
            if (methodName && BLOCKED_AUDIO_METHODS.has(methodName) && isBlockedInstanceSource(objectExpr)) {
              const start = node.start ?? 0
              const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: `禁止使用原生音频方法 ${methodName}。${AUDIO_API_REPLACEMENT_HINT}`,
              codeSnippet: getCodeSnippet(code, start, end),
            })
            }
          }
          return
        }

        if (node.type === 'JSXOpeningElement' && node.name?.type === 'JSXIdentifier' && node.name.name === 'audio') {
          const start = node.start ?? 0
          const end = node.end ?? start + 20
          addError({
            start,
            end,
            message: '禁止使用 <audio> 标签，请改用 @/lib/audio。',
            codeSnippet: getCodeSnippet(code, start, end),
          })
          return
        }

        if (node.type === 'MemberExpression') {
          const objectName = getPropName(node.object)
          const propertyName = getMemberPropName(node)

          if (isToneNamespaceMember(node, BLOCKED_TONE_CONTEXT_EXPORTS) || (propertyName === 'rawContext' && isBlockedToneContextSource(node.object))) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: '禁止访问 Tone.js 底层 AudioContext/rawContext，请使用 @/lib/tone 的高层音频能力。',
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }

          if (propertyName && objectName && GLOBAL_OBJECTS.has(objectName) && BLOCKED_AUDIO_CONSTRUCTORS.has(propertyName)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: `禁止使用原生音频构造器 ${objectName}.${propertyName}。${AUDIO_API_REPLACEMENT_HINT}`,
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          return
        }

        if (node.type === 'NewExpression') {
          const calleeName = getCalleeName(node.callee)
          if (
            (calleeName && blockedToneContextIdentifiers.has(calleeName)) ||
            isToneNamespaceMember(node.callee, new Set(['Context', 'OfflineContext']))
          ) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: `禁止实例化 Tone.js 底层上下文对象 ${calleeName ?? 'Context'}，请使用 @/lib/tone 的高层音频能力。`,
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
          if (calleeName && BLOCKED_AUDIO_CONSTRUCTORS.has(calleeName)) {
            const start = node.start ?? 0
            const end = node.end ?? start + 20
            addError({
              start,
              end,
              message: `禁止实例化原生音频对象 ${calleeName}。${AUDIO_API_REPLACEMENT_HINT}`,
              codeSnippet: getCodeSnippet(code, start, end),
            })
          }
        }
      })

      const errors = Array.from(errorsByStart.values()).sort((a, b) => a.start - b.start)
      if (!errors.length) return null

      const errorMessages = errors
        .map((error, index) => {
          const loc = computeLineCol(code, error.start)
          return `  ${index + 1}. ${error.message}\n     位置: ${loc.line}:${loc.column}${error.codeSnippet ? `\n     代码: ${error.codeSnippet}` : ''}`
        })
        .join('\n')

      const first = errors[0]
      const loc = computeLineCol(code, first.start)

      this.error({
        id,
        message:
          `[block-audio-apis] 构建失败: 发现 ${errors.length} 处不允许的音频 API 使用\n` +
          `文件: ${id}\n\n` +
          `错误:\n${errorMessages}\n\n` +
          '提示: 新应用音频能力必须统一走脚手架音频 wrapper。播放音频文件请使用 import { Howl, Howler } from "@/lib/audio"；合成/乐器音效请使用 import * as Tone from "@/lib/tone"。',
        loc,
      })

      return null
    },
  }
}
