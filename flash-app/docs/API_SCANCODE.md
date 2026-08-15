---
skill_name: SCANCODE
display_name: 扫码
description: 扫码能力提供二维码和条形码识别能力，可限制仅允许相机扫码，也可限定识别码型。
api_file: API_SCANCODE.md
enable: true
min_client_version: "1.0.70"
---

你可以使用扫码 API 调起客户端扫码能力，识别二维码或条形码内容。

# 扫码 API

```typescript
window.lingguang.scanCode(options?: LingguangScanCodeOptions): Promise<LingguangScanCodeResult>

type LingguangScanType = "barCode" | "qrCode";

interface LingguangScanCodeOptions {
  /**
   * 是否只允许相机扫码，默认 false
   */
  onlyFromCamera?: boolean;

  /**
   * 限定扫码类型，默认 ["barCode", "qrCode"]
   */
  scanType?: LingguangScanType[];
}

interface LingguangScanCodeResult {
  /**
   * 扫码识别出的文本内容
   */
  result: string;

  /**
   * 客户端返回的扫码类型，例如 QR_CODE
   */
  scanType: string;
}
```

## 使用示例

```typescript
const result = await window.lingguang.scanCode({
  onlyFromCamera: true,
  scanType: ["qrCode"],
});

console.log("扫码内容:", result.result);
console.log("扫码类型:", result.scanType);
```

## 成功返回示例

```json
{
  "result": "从二维码中识别到的内容",
  "scanType": "QR_CODE"
}
```

## 失败返回示例

```json
{
  "message": "用户取消扫码"
}
```
