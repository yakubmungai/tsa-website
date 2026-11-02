/**
 * Uploads through a server action.
 *
 * Vercel rejects any function request body over 4.5MB with a 413 before our
 * code runs, whatever `serverActions.bodySizeLimit` says. The browser then sees
 * a non-action response, the awaited action throws, and the applicant is told
 * to "check your connection" — with nothing saved. Phone photos are routinely
 * 4–8MB, so images are shrunk in the browser first.
 */

/** What the file itself may be once prepared, leaving room for the form fields. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Raw image size we will attempt to shrink. Beyond this, decoding gets risky on phones. */
export const MAX_RAW_IMAGE_BYTES = 30 * 1024 * 1024;

const MAX_EDGE_PX = 2000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

/**
 * Re-encode an image as a JPEG no larger than MAX_EDGE_PX on its long edge.
 * Returns the original file when it is not an image, is already small, or the
 * browser cannot decode it (e.g. HEIC outside Safari) — the caller checks size.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 1.5 * 1024 * 1024) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    }
  }
  return file;
}
