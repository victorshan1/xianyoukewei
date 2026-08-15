import fs from 'node:fs/promises';

export type ManifestViolation = {
  message: string;
};

export type AppOrientation = 'portrait' | 'landscape';

export type AppManifest = {
  navigationBar: {
    visible: boolean;
    title: string;
    backgroundColor: string;
    foregroundColor: string;
  };
  orientation: AppOrientation;
  artifact: {
    title: string;
    versionDescription: string;
    shareDescription?: string;
    coverImage: string;
  };
  localStorage?: boolean;
};

export const MANIFEST_EXAMPLE = [
  '{',
  '  "navigationBar": {',
  '    "visible": true,',
  '    "title": "应用标题",',
  '    "backgroundColor": "#ffffff",',
  '    "foregroundColor": "#000000"',
  '  },',
  '  "orientation": "portrait",',
  '  "artifact": {',
  '    "title": "应用标题",',
  '    "versionDescription": "版本说明",',
  '    "shareDescription": "分享描述",',
  '    "coverImage": "public/cover.jpg"',
  '  }',
  '}',
].join('\n');

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const FORBIDDEN_HTML_TITLE_CHARS_PATTERN = /[<>&"']/;
const VALID_ORIENTATIONS = new Set<string>(['portrait', 'landscape']);
const VALID_COVER_IMAGE_EXTENSIONS = new Set<string>(['.png', '.jpg', '.jpeg']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateNavigationBar(navigationBar: Record<string, unknown>): ManifestViolation[] {
  const errors: ManifestViolation[] = [];
  const requiredKeys = ['visible', 'title', 'backgroundColor', 'foregroundColor'] as const;

  for (const key of requiredKeys) {
    if (!(key in navigationBar)) {
      errors.push({
        message: `manifest.json 中的 navigationBar.${key} 为必填字段。`,
      });
    }
  }

  if ('visible' in navigationBar && typeof navigationBar.visible !== 'boolean') {
    errors.push({
      message: 'manifest.json 中的 navigationBar.visible 必须是布尔值。',
    });
  }

  if ('title' in navigationBar) {
    if (typeof navigationBar.title !== 'string') {
      errors.push({
        message: 'manifest.json 中的 navigationBar.title 必须是字符串。',
      });
    } else if (navigationBar.title.trim().length === 0) {
      errors.push({
        message: 'manifest.json 中的 navigationBar.title 不能为空字符串。',
      });
    } else if (FORBIDDEN_HTML_TITLE_CHARS_PATTERN.test(navigationBar.title)) {
      errors.push({
        message: 'manifest.json 中的 navigationBar.title 不能包含 HTML 特殊字符 < > & " \'。',
      });
    }
  }

  if ('backgroundColor' in navigationBar) {
    if (typeof navigationBar.backgroundColor !== 'string') {
      errors.push({
        message: 'manifest.json 中的 navigationBar.backgroundColor 必须是字符串。',
      });
    } else if (!HEX_COLOR_PATTERN.test(navigationBar.backgroundColor)) {
      errors.push({
        message: 'manifest.json 中的 navigationBar.backgroundColor 必须是合法的 6 位十六进制颜色值，例如 #ffffff。',
      });
    }
  }

  if ('foregroundColor' in navigationBar) {
    if (typeof navigationBar.foregroundColor !== 'string') {
      errors.push({
        message: 'manifest.json 中的 navigationBar.foregroundColor 必须是字符串。',
      });
    } else if (!HEX_COLOR_PATTERN.test(navigationBar.foregroundColor)) {
      errors.push({
        message: 'manifest.json 中的 navigationBar.foregroundColor 必须是合法的 6 位十六进制颜色值，例如 #000000。',
      });
    }
  }

  return errors;
}

function validateOrientation(manifest: Record<string, unknown>): ManifestViolation[] {
  const errors: ManifestViolation[] = [];

  if (!('orientation' in manifest)) {
    errors.push({
      message: 'manifest.json 中的 orientation 为必填字段，必须填写 "portrait" 或 "landscape"。',
    });
    return errors;
  }

  if (typeof manifest.orientation !== 'string') {
    errors.push({
      message: 'manifest.json 中的 orientation 必须是字符串。',
    });
    return errors;
  }

  if (!VALID_ORIENTATIONS.has(manifest.orientation)) {
    errors.push({
      message: 'manifest.json 中的 orientation 只允许填写 "portrait" 或 "landscape"。',
    });
  }

  return errors;
}

function hasValidCoverImageExtension(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return Array.from(VALID_COVER_IMAGE_EXTENSIONS).some((extension) => lowerValue.endsWith(extension));
}

function validateProjectRelativePath(value: string): string | null {
  const normalized = value.replace(/\\/g, '/').trim();
  const lowerValue = normalized.toLowerCase();

  if (!normalized) {
    return '不能为空字符串';
  }

  if (lowerValue.startsWith('http://') || lowerValue.startsWith('https://') || lowerValue.startsWith('//')) {
    return '必须是源码包内相对路径，不能是远程 URL';
  }

  if (normalized.startsWith('/')) {
    return '必须是相对路径，不能以 / 开头';
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '..')) {
    return '不能包含 .. 路径片段';
  }

  if (!hasValidCoverImageExtension(normalized)) {
    return '只支持 png、jpg、jpeg 格式';
  }

  return null;
}

function validateArtifact(artifact: Record<string, unknown>): ManifestViolation[] {
  const errors: ManifestViolation[] = [];
  const requiredKeys = ['title', 'versionDescription', 'coverImage'] as const;

  for (const key of requiredKeys) {
    if (!(key in artifact)) {
      errors.push({
        message: `manifest.json 中的 artifact.${key} 为必填字段。`,
      });
    }
  }

  if ('title' in artifact) {
    if (typeof artifact.title !== 'string') {
      errors.push({
        message: 'manifest.json 中的 artifact.title 必须是字符串。',
      });
    } else if (artifact.title.trim().length === 0) {
      errors.push({
        message: 'manifest.json 中的 artifact.title 不能为空字符串。',
      });
    }
  }

  if ('versionDescription' in artifact) {
    if (typeof artifact.versionDescription !== 'string') {
      errors.push({
        message: 'manifest.json 中的 artifact.versionDescription 必须是字符串。',
      });
    } else if (artifact.versionDescription.trim().length === 0) {
      errors.push({
        message: 'manifest.json 中的 artifact.versionDescription 不能为空字符串。',
      });
    }
  }

  if ('shareDescription' in artifact && typeof artifact.shareDescription !== 'string') {
    errors.push({
      message: 'manifest.json 中的 artifact.shareDescription 必须是字符串。',
    });
  }

  if ('coverImage' in artifact) {
    if (typeof artifact.coverImage !== 'string') {
      errors.push({
        message: 'manifest.json 中的 artifact.coverImage 必须是字符串。',
      });
    } else {
      const pathError = validateProjectRelativePath(artifact.coverImage);
      if (pathError) {
        errors.push({
          message: `manifest.json 中的 artifact.coverImage ${pathError}。`,
        });
      }
    }
  }

  return errors;
}

function validateManifest(manifest: unknown): ManifestViolation[] {
  if (!isRecord(manifest)) {
    return [{
      message: 'manifest.json 顶层必须是 JSON 对象。',
    }];
  }

  const errors: ManifestViolation[] = [];

  if (!('navigationBar' in manifest)) {
    errors.push({
      message: 'manifest.json 必须包含 navigationBar 对象。',
    });
  } else if (!isRecord(manifest.navigationBar)) {
    errors.push({
      message: 'manifest.json 中的 navigationBar 必须是对象。',
    });
  } else {
    errors.push(...validateNavigationBar(manifest.navigationBar));
  }

  errors.push(...validateOrientation(manifest));

  if (!('artifact' in manifest)) {
    errors.push({
      message: 'manifest.json 必须包含 artifact 对象。',
    });
  } else if (!isRecord(manifest.artifact)) {
    errors.push({
      message: 'manifest.json 中的 artifact 必须是对象。',
    });
  } else {
    errors.push(...validateArtifact(manifest.artifact));
  }

  return errors;
}

export async function readManifestFile(manifestPath: string): Promise<string> {
  return fs.readFile(manifestPath, 'utf8');
}

export function parseAndValidateManifest(manifestContent: string): {
  manifest: AppManifest | null;
  errors: ManifestViolation[];
  parseError: string | null;
} {
  let manifest: unknown;

  try {
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    return {
      manifest: null,
      errors: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }

  const errors = validateManifest(manifest);
  if (errors.length) {
    return {
      manifest: null,
      errors,
      parseError: null,
    };
  }

  return {
    manifest: manifest as AppManifest,
    errors: [],
    parseError: null,
  };
}

export function getManifestTitle(manifest: AppManifest): string {
  return `${manifest.navigationBar.title} - 灵光闪应用`;
}

export function getInlineManifestJson(manifest: AppManifest): string {
  return JSON.stringify(manifest).replace(/</g, '\\u003c');
}
