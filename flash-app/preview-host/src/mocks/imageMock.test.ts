import { describe, expect, it, vi } from 'vitest';
import { createImageMock } from './imageMock';

describe('createImageMock', () => {
  it('selects browser files and returns their data URL from uploadImage', async () => {
    const files = [
      new File(['first image'], 'first.png', { type: 'image/png' }),
      new File(['second image'], 'second.png', { type: 'image/png' }),
    ];
    const chooseFiles = vi.fn(() => Promise.resolve(files));
    const readFileAsDataUrl = vi
      .fn<(file: File) => Promise<string>>()
      .mockResolvedValueOnce('data:image/png;base64,Zmlyc3Q=')
      .mockResolvedValueOnce('data:image/png;base64,c2Vjb25k');
    const imageMock = createImageMock({ chooseFiles, readFileAsDataUrl });

    const chooseResult = (await imageMock.chooseImage({
      options: { count: 2 },
    })) as {
      tempFiles: Array<{ path: string; size: number }>;
    };

    expect(chooseFiles).toHaveBeenCalledWith(2);
    expect(chooseResult.tempFiles).toHaveLength(2);
    expect(chooseResult.tempFiles[0]?.path).toMatch(/^local-preview-image:\/\//);
    await expect(
      imageMock.uploadImage({
        options: { filePath: chooseResult.tempFiles[0]?.path },
      }),
    ).resolves.toEqual({
      url: 'data:image/png;base64,Zmlyc3Q=',
      name: 'first.png',
      size: files[0]?.size,
    });
  });

  it('rejects an image path that was not selected in this preview session', async () => {
    const imageMock = createImageMock();

    await expect(
      imageMock.uploadImage({
        options: { filePath: 'local-preview-image://missing' },
      }),
    ).rejects.toThrow('Selected image is no longer available');
  });
});
