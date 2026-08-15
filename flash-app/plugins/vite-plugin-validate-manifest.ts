import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { MANIFEST_EXAMPLE, parseAndValidateManifest, readManifestFile } from './manifest-utils';

export function validateManifestPlugin(): Plugin {
  let manifestPath = '';
  let rootPath = '';

  return {
    name: 'validate-manifest',
    enforce: 'pre',
    apply: 'build',

    configResolved(config) {
      rootPath = config.root;
      manifestPath = path.resolve(config.root, 'manifest.json');
    },

    async buildStart() {
      if (!manifestPath) return;

      let manifestContent = '';
      try {
        manifestContent = await readManifestFile(manifestPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.error({
          message:
            `[validate-manifest] 构建失败: 缺少根目录 manifest.json\n` +
            `文件: ${manifestPath}\n\n` +
            `错误:\n  1. 项目根目录必须存在 manifest.json。\n` +
            `  2. 读取文件失败: ${message}\n\n` +
            `示例:\n${MANIFEST_EXAMPLE}`,
          loc: {
            file: manifestPath,
            line: 1,
            column: 1,
          },
        });
      }

      const { manifest, errors, parseError } = parseAndValidateManifest(manifestContent);

      if (parseError) {
        this.error({
          message:
            `[validate-manifest] 构建失败: manifest.json 不是合法 JSON\n` +
            `文件: ${manifestPath}\n\n` +
            `错误:\n  1. ${parseError}\n\n` +
            `示例:\n${MANIFEST_EXAMPLE}`,
          loc: {
            file: manifestPath,
            line: 1,
            column: 1,
          },
        });
      }
      if (!errors.length && manifest) {
        const coverImagePath = path.resolve(rootPath, manifest.artifact.coverImage);
        try {
          const stat = await fs.stat(coverImagePath);
          if (!stat.isFile()) {
            throw new Error('路径不是文件');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.error({
            message:
              `[validate-manifest] 构建失败: artifact.coverImage 文件不存在或不可读取\n` +
              `manifest: ${manifestPath}\n` +
              `coverImage: ${manifest.artifact.coverImage}\n` +
              `解析路径: ${coverImagePath}\n\n` +
              `错误:\n  1. ${message}\n\n` +
              `要求: artifact.coverImage 必须指向源码包内存在的 png、jpg 或 jpeg 图片文件。`,
            loc: {
              file: manifestPath,
              line: 1,
              column: 1,
            },
          });
        }
        return;
      }

      const details = errors.map((error, index) => {
        return `  ${index + 1}. ${error.message}`;
      }).join('\n');

      this.error({
        message:
          `[validate-manifest] 构建失败: manifest.json 校验未通过\n` +
          `文件: ${manifestPath}\n\n` +
          `错误:\n${details}\n\n` +
          `要求: navigationBar 必须包含 visible、title、backgroundColor、foregroundColor 四个字段。\n` +
          `orientation 必须填写 "portrait" 或 "landscape"，并与应用实际主体验方向一致。\n` +
          `artifact.title、artifact.versionDescription、artifact.coverImage 为必填字段。\n` +
          `artifact.coverImage 必须是源码包内相对路径，只支持 png、jpg、jpeg。\n` +
          `颜色值必须使用合法的 6 位十六进制格式（#RRGGBB）。\n\n` +
          `示例:\n${MANIFEST_EXAMPLE}`,
        loc: {
          file: manifestPath,
          line: 1,
          column: 1,
        },
      });
    },
  };
}
