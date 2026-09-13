export interface ThumbnailResult { thumbnailUrl: string; width: number; height: number }
export async function createThumbnailWithDimensions(file: File, sourceUrl?: string, signal?: AbortSignal): Promise<ThumbnailResult> {
  const url = sourceUrl ?? URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer); image.onload = null; image.onerror = null;
        signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new DOMException('Cancelled', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('图片读取超时')), 30000);
      image.onload = () => finish(); image.onerror = () => finish(new Error('无法解码图片'));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort(); else image.src = url;
    });
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height) throw new Error('无效的图片尺寸');
    const scale = Math.min(1, 400 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建缩略图');
    // Flatten transparent PNG/WEBP onto white instead of JPEG's black background.
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encode = (type: string) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.78));
    let blob: Blob | null;
    try { blob = await encode('image/jpeg'); } catch { blob = null; }
    if (!blob) blob = await encode('image/png');
    if (!blob) throw new Error('缩略图生成失败');
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return { thumbnailUrl: URL.createObjectURL(blob), width, height };
  } finally {
    image.src = ''; canvas.width = canvas.height = 0;
    if (!sourceUrl) URL.revokeObjectURL(url);
  }
}
export async function createThumbnail(file: File): Promise<string> {
  return (await createThumbnailWithDimensions(file)).thumbnailUrl;
}
