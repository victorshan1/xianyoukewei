type UnknownRecord = Record<string, unknown>;

type LocalImage = {
  dataUrl: string;
  name: string;
  size: number;
};

type ImageMockDependencies = {
  chooseFiles?: (count: number) => Promise<File[]>;
  readFileAsDataUrl?: (file: File) => Promise<string>;
};

const LOCAL_IMAGE_PREFIX = 'local-preview-image://';

function toRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {};
}

function getRequestedCount(payload: unknown): number {
  const payloadRecord = toRecord(payload);
  const options = toRecord(payloadRecord['options']);
  const count = options['count'];
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return 9;
  }
  return Math.max(1, Math.min(9, Math.floor(count)));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Failed to read selected image'));
    });
    reader.readAsDataURL(file);
  });
}

function chooseFiles(count: number): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = count > 1;
    input.hidden = true;

    const cleanup = (): void => {
      input.remove();
    };
    input.addEventListener(
      'change',
      () => {
        const files = Array.from(input.files ?? []).slice(0, count);
        cleanup();
        if (files.length === 0) {
          const error = new Error('No image selected');
          error.name = 'USER_CANCEL';
          reject(error);
          return;
        }
        resolve(files);
      },
      { once: true },
    );
    input.addEventListener(
      'cancel',
      () => {
        cleanup();
        const error = new Error('Image selection cancelled');
        error.name = 'USER_CANCEL';
        reject(error);
      },
      { once: true },
    );
    document.body.append(input);
    input.click();
  });
}

export function createImageMock({
  chooseFiles: selectFiles = chooseFiles,
  readFileAsDataUrl: readDataUrl = readFileAsDataUrl,
}: ImageMockDependencies = {}): {
  chooseImage: (payload: unknown) => Promise<unknown>;
  uploadImage: (payload: unknown) => Promise<unknown>;
} {
  const images = new Map<string, LocalImage>();

  return {
    async chooseImage(payload) {
      const files = await selectFiles(getRequestedCount(payload));
      const tempFiles = await Promise.all(
        files.map(async (file) => {
          const id = crypto.randomUUID();
          images.set(id, {
            dataUrl: await readDataUrl(file),
            name: file.name,
            size: file.size,
          });
          return {
            path: `${LOCAL_IMAGE_PREFIX}${id}`,
            size: file.size,
          };
        }),
      );
      return { tempFiles };
    },
    uploadImage(payload) {
      const payloadRecord = toRecord(payload);
      const options = toRecord(payloadRecord['options']);
      const filePath = options['filePath'];
      if (typeof filePath !== 'string') {
        return Promise.reject(new Error('filePath is required'));
      }
      if (filePath.startsWith('data:')) {
        return Promise.resolve({ url: filePath });
      }
      if (!filePath.startsWith(LOCAL_IMAGE_PREFIX)) {
        return Promise.reject(new Error('Unknown local preview image path'));
      }
      const image = images.get(filePath.slice(LOCAL_IMAGE_PREFIX.length));
      if (image === undefined) {
        return Promise.reject(new Error('Selected image is no longer available'));
      }
      return Promise.resolve({
        url: image.dataUrl,
        name: image.name,
        size: image.size,
      });
    },
  };
}
