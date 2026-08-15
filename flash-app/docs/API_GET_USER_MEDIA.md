---
skill_name: GET_USER_MEDIA
display_name: 浏览器原生getUserMedia能力
description: 当且仅当使用浏览器原生API navigator.mediaDevices.getUserMedia(constraints) 时，参考本文档的示例代码
api_file: API_GET_USER_MEDIA.md
enable: true
min_client_version: "1.0.70"
---

# getUserMedia

使用 `navigator.mediaDevices.getUserMedia(constraints)` 获取媒体流时，遵循下面几条：

- 视频预览绑定到 `<video>`
- 如果要做音量检测、波形分析，应用 `AudioContext`
- 不要写 `el.src = stream`，应使用 `el.srcObject = stream`
- `video` 预览通常要加 `autoplay`、`playsInline`，本地预览建议 `muted`
- 停止采集或组件卸载时，执行 `stream.getTracks().forEach(track => track.stop())`

## 示例 1：采集麦克风并检测音量大小

```ts
async function startMicrophoneVolume(onVolumeChange: (volume: number) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  const dataArray = new Uint8Array(analyser.fftSize);

  source.connect(analyser);

  let rafId = 0;
  const updateVolume = () => {
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / dataArray.length);
    onVolumeChange(rms); // 数值通常在 0 到 1 之间

    rafId = requestAnimationFrame(updateVolume);
  };

  updateVolume();

  return () => {
    cancelAnimationFrame(rafId);
    stream.getTracks().forEach((track) => track.stop());
    source.disconnect();
    analyser.disconnect();
    audioContext.close();
  };
}
```

## 示例 2：采集摄像头并绑定到 `<video>`

```ts
async function startCamera(videoEl: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  videoEl.srcObject = stream;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true; // 本地预览建议静音

  await videoEl.play().catch(() => {});

  return () => {
    stream.getTracks().forEach((track) => track.stop());
    videoEl.srcObject = null;
  };
}
```
