---
skill_name: COMPASS
display_name: 罗盘
description: 用于读取设备罗盘方向数据，获取设备朝向与正北方向的夹角，支持设置采样频率和监听数据变化回调。适用于导航、方向判定、AR 方向交互等场景。
api_file: API_COMPASS.md
enable: true
min_client_version: "1.0.58"
---

你可以使用罗盘 API 获取设备当前朝向，用于导航、方向提示、地理方位交互等场景。

# 罗盘 API

```typescript
window.lingguang.startCompass(options?: CompassStartOptions): Promise<void>
window.lingguang.stopCompass(): Promise<void>
window.lingguang.onCompassChange(callback: (reading: CompassReading) => void): void
```

**window.lingguang.startCompass 方法失败时（reject）返回：**

```javascript
{
  code: 'PERMISSION_REQUIRED',  // 错误类型枚举（string）
  message: '需要权限'  // 错误信息（string）
}
```

```typescript
type SensorInterval = 'game' | 'ui' | 'normal'

interface CompassReading {
  direction: number // 面对方向与正北方向顺时针夹角，范围 [0, 360)
}

interface CompassStartOptions {
  /**
   * 监听频率，可选值：'game'（约 20ms/次）、'ui'（约 60ms/次）、'normal'（约 200ms/次）。
   * 默认值为 'normal'。
   */
  interval?: SensorInterval
}
```
