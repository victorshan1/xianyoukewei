import { Howl as RawHowl } from 'howler'

type HowlOptions = ConstructorParameters<typeof RawHowl>[0]

/**
 * 从 URL 中提取音频格式扩展名。
 * 例如 "https://example.com/audio.mp3?token=xxx" → "mp3"
 * 如果 URL 没有可识别的音频扩展名，返回 null。
 */
export const detectFormatFromUrl = (url: string): string | null => {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase()
    if (typeof ext === 'string' && ext.length > 0 && /^(mp3|mp4|webm|ogg|wav|flac|aac|m4a|wma|opus)$/.test(ext)) {
      return ext
    }
  } catch {
    // URL 解析失败，忽略
  }
  return null
}

/**
 * 格式名到 MIME 类型的映射，用于 canPlayType 探测。
 */
const FORMAT_TO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  flac: 'audio/flac',
  opus: 'audio/opus',
}

/**
 * 兜底格式探测优先级，按浏览器支持广度排序。
 * mp3 在移动端浏览器上支持最广。
 */
const FALLBACK_FORMAT_ORDER = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac']

/**
 * 通过 Audio.canPlayType() 检测浏览器支持的音频格式。
 * 结果在首次调用后缓存，避免重复创建 Audio 元素。
 */
let _cachedSupportedFormat: string | null | undefined = undefined

const detectSupportedFormatByCanPlayType = (): string | null => {
  if (_cachedSupportedFormat !== undefined) {
    return _cachedSupportedFormat
  }

  try {
    const audio = new Audio()
    for (const fmt of FALLBACK_FORMAT_ORDER) {
      const mime = FORMAT_TO_MIME[fmt]
      if (mime !== undefined && (audio.canPlayType(mime) === 'probably' || audio.canPlayType(mime) === 'maybe')) {
        _cachedSupportedFormat = fmt
        return fmt
      }
    }
  } catch {
    // canPlayType 不可用，忽略
  }

  _cachedSupportedFormat = null
  return null
}

/**
 * 自动推断音频 format。
 *
 * 在 html5: true 模式下，Howler 的 format 参数仅用于 canPlayType() 校验，
 * 浏览器的 <audio> 元素会自动从流数据中识别真正的音频编码格式。
 * 因此 format 不必与实际音频格式完全匹配，只需通过浏览器校验即可。
 *
 * 推断优先级：
 * 1. 用户显式指定 format → 直接使用
 * 2. URL 扩展名（如 .mp3 / .wav） → 直接提取
 * 3. Audio.canPlayType() 探测 → 找一个浏览器声明的支持格式
 */
export const resolveFormat = (options: HowlOptions): string[] | undefined => {
  // 优先级 1：用户显式指定
  const explicitFormat = options.format
  if (Array.isArray(explicitFormat) && explicitFormat.length > 0) {
    return explicitFormat
  }
  if (typeof explicitFormat === 'string' && explicitFormat.length > 0) {
    return [explicitFormat]
  }

  const urls: string[] = typeof options.src === 'string' ? [options.src] : options.src

  // 优先级 2：URL 扩展名
  for (const url of urls) {
    const fmt = detectFormatFromUrl(url)
    if (fmt !== null) {
      return [fmt]
    }
  }

  // 优先级 3：canPlayType 兜底
  const supported = detectSupportedFormatByCanPlayType()
  if (supported !== null) {
    return [supported]
  }

  // 全部失败，不传 format，让 Howler 自行处理
  return undefined
}
