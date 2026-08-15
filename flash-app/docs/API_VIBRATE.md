---
skill_name: VIBRATE
display_name: 震动反馈
description: 震动反馈提供设备震动/触觉反馈能力，可触发单次或节奏序列的震动提示；适用于按钮点击反馈、操作确认/错误提示、游戏事件提示、提醒与通知等场景。
api_file: API_VIBRATE.md
enable: true
min_client_version: "1.0.52"
---

你可以使用震动反馈API提供设备震动/触觉反馈能力，可触发单次或节奏序列的震动提示；适用于按钮点击反馈、操作确认/错误提示、游戏事件提示、提醒与通知等场景。

# 震动反馈API

```typescript
window.lingguang.vibrate(options?: LingguangVibrateOptions): void

/** 震动模式（与底层 short/long 对齐） */
type LingguangVibrateMode = "short" | "long";

/** 震动强度（与底层 type 对齐） */
type LingguangVibrateIntensity = "light" | "medium" | "heavy";

interface LingguangVibrateOptions {
  /**
   * 震动模式（默认 short）
   */
  mode?: LingguangVibrateMode;

  /**
   * 震动强度（默认 medium）
   */
  intensity?: LingguangVibrateIntensity;
}
```

## 使用示例

```typescript
// 短震动，中等强度
window.lingguang?.vibrate({ mode: "short", intensity: "medium" });

// 长震动，高强度
window.lingguang?.vibrate({ mode: "long", intensity: "heavy" });
```

