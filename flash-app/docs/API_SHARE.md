---
skill_name: SHARE
display_name: 分享
description: 调起客户端分享面板，将当前闪应用分享给微信、小红书、QQ、口令、复制链接或分享海报等渠道。
api_file: API_SHARE.md
enable: true
---

# 分享 API

使用 `window.lingguang.app.share(options)` 调起客户端分享面板。推荐默认传 `content: []`，让客户端使用默认分享面板形态。

```typescript
type LingguangSharePlatform =
  | "wechat"
  | "xiaohongshu"
  | "qq"
  | "qzone"
  | "passcode"
  | "link"
  | "poster";

interface LingguangShareOptions {
  /**
   * 分享渠道配置。推荐传空数组，表示使用默认分享面板形态。
   *
   * 只有在极特殊情况下确实需要指定渠道时，才传入一个或多个平台项。
   * 每个数组项只允许包含 platform 字段。
   */
  content: Array<{
    platform: LingguangSharePlatform;
  }>;
}

interface LingguangShareResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

window.lingguang.app.share(options: LingguangShareOptions): Promise<LingguangShareResult>
```

## 使用规则

- 必须传 `content` 字段。
- 默认推荐使用 `content: []`，表示由客户端展示默认分享面板。
- `content` 可以是空数组。
- 只有在确实需要指定分享渠道时，才传入平台项，例如 `{ platform: "wechat" }`。
- 公开支持的平台枚举只有：`wechat`、`xiaohongshu`、`qq`、`qzone`、`passcode`、`link`、`poster`。
- 每个 `content` 数组项只包含 `platform` 字段，不要传其他未公开字段。
- 不要绕过 `window.lingguang.app.share(...)` 调用底层接口。

## 默认分享面板示例

```typescript
try {
  const result = await window.lingguang.app.share({
    content: [],
  });

  if (!result.success) {
    console.warn("分享未完成:", result.message);
  }
} catch (error) {
  console.error("分享失败:", error);
}
```

## 指定平台示例

```typescript
await window.lingguang.app.share({
  content: [
    { platform: "wechat" },
    { platform: "xiaohongshu" },
  ],
});
```
