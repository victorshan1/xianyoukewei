---
skill_name: ACCELEROMETER
display_name: 加速度
description: 用于读取设备加速度数据，获取 x/y/z 轴加速度信息，支持设置采样频率和监听数据变化回调。适用于体感交互、运动检测、摇一摇等场景。
api_file: API_ACCELEROMETER.md
enable: true
min_client_version: "1.0.58"
---

你可以使用加速度 API 来做体感交互、摇一摇、运动状态识别和动态效果控制等场景。

# 加速度 API

```typescript
window.lingguang.startAccelerometer(options?: AccelerometerStartOptions): Promise<void>
window.lingguang.stopAccelerometer(): Promise<void>
window.lingguang.onAccelerometerChange(callback: (reading: AccelerometerReading) => void): void
```

**window.lingguang.startAccelerometer 方法失败时（reject）返回：**

```javascript
{
  code: 'PERMISSION_REQUIRED',  // 错误类型枚举（string）
  message: '需要权限'  // 错误信息（string）
}
```

```typescript
type SensorInterval = 'game' | 'ui' | 'normal'

interface AccelerometerReading {
  x: number  // x 轴加速度值，单位 m/s²
  y: number  // y 轴加速度值，单位 m/s²
  z: number  // z 轴加速度值，单位 m/s²
}

interface AccelerometerStartOptions {
  /**
   * 监听频率，可选值：'game'（约 20ms/次）、'ui'（约 60ms/次）、'normal'（约 200ms/次）。
   * 默认值为 'normal'。
   */
  interval?: SensorInterval
}
```
