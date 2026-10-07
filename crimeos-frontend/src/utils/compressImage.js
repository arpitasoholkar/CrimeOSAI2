/**
 * Downscales and re-encodes an image file in the browser before upload, so
 * large phone-camera photos (often 3-8MB) don't get sent as-is. GIFs are
 * passed through untouched since canvas re-encoding would drop animation.
 *
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [opts]
 * @returns {Promise<File>} a new (usually much smaller) File, or the
 *   original file if compression isn't applicable or fails.
 */
export async function compressImage(file, opts = {}) {
  const { maxDimension = 1280, quality = 0.82 } = opts

  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, quality))
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.\w+$/, outType === 'image/png' ? '.png' : '.jpg')
    return new File([blob], newName, { type: outType, lastModified: Date.now() })
  } catch {
    // Compression is a nice-to-have; never block the upload on it.
    return file
  }
}
