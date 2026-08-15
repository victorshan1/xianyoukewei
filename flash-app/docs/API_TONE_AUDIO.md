# Tone.js 音效 API 使用说明

当应用需要合成音效、乐器、节拍、环境声、交互反馈音时，使用脚手架提供的 Tone.js 受控入口。

## 引入方式

必须从 `@/lib/tone` 引入：

```ts
import * as Tone from '@/lib/tone'
```

禁止直接从 `tone` 引入，也禁止直接使用浏览器原生 `AudioContext` / `webkitAudioContext` / `OfflineAudioContext`。

## 基本用法

Tone.js 需要在用户点击、触摸等手势回调中启动音频上下文：

```ts
import * as Tone from '@/lib/tone'

const playClickSound = async () => {
  await Tone.start()

  const synth = new Tone.Synth().toDestination()
  synth.triggerAttackRelease('C5', '8n')
}
```

## 可使用能力

推荐使用 Tone.js 的高层音频能力：

- `Tone.Synth`
- `Tone.PolySynth`
- `Tone.MembraneSynth`
- `Tone.NoiseSynth`
- `Tone.Sampler`
- `Tone.Player`
- `Tone.Players`
- `Tone.Transport`
- `Tone.Sequence`
- `Tone.Loop`
- `Tone.Filter`
- `Tone.Reverb`
- `Tone.FeedbackDelay`
- `Tone.Chorus`

## 静音管控

应用通过 `@/lib/tone` 生成的音频会自动接受宿主 `window.app.mute()` / `window.app.unmute()` 管控。

业务代码不要直接修改 Tone.js 总输出静音状态，例如不要写：

```ts
Tone.getDestination().mute = false
Tone.Destination.mute = false
```

如果需要调节应用自己的音量，可以调节具体乐器、播放器或效果节点的音量，例如：

```ts
const synth = new Tone.Synth({
  volume: -8,
}).toDestination()
```

## 禁止使用的底层能力

为保证宿主静音、页面隐藏暂停和运行时安全管控生效，业务代码禁止访问 Tone.js 底层上下文能力：

- `Tone.getContext()`
- `Tone.setContext(...)`
- `Tone.context`
- `new Tone.Context(...)`
- `new Tone.OfflineContext(...)`
- `rawContext`

如果需要合成或播放声音，使用 Tone.js 的乐器、播放器、调度器和效果节点。
