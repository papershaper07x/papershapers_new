import sharp from 'sharp';
sharp.cache(false);
sharp.concurrency(1);
export const MAX_IMAGE_BYTES = 250_000;
export const MAX_DECODE_PIXELS = 4_000_000;
export class ImageProcessingBusyError extends Error {}
let processing = false;
export async function compressNoticeImage(encoded: unknown) {
  if (processing) throw new ImageProcessingBusyError('Image processing is busy. Please try again shortly.');
  processing = true;
  try { return await encodeImage(encoded); }
  finally { processing = false; }
}
async function encodeImage(encoded: unknown) {
  if (typeof encoded !== 'string' || encoded.length > 1_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Choose a JPEG, PNG or WebP image under 1 MB.');
  const input = Buffer.from(encoded,'base64');
  if (input.length > 1_000_000 || input.toString('base64') !== encoded) throw new Error('Image is too large or invalid.');
  const magic = input.subarray(0,12);
  const permitted = magic[0] === 0xff && magic[1] === 0xd8 || magic.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || magic.toString('ascii',0,4) === 'RIFF' && magic.toString('ascii',8,12) === 'WEBP';
  if (!permitted) throw new Error('Only JPEG, PNG and WebP images are accepted.');
  const image = sharp(input,{limitInputPixels:MAX_DECODE_PIXELS,failOn:'warning'});
  const info = await image.metadata();
  if (!['jpeg','png','webp'].includes(info.format ?? '') || (info.pages ?? 1) > 1 || !info.width || !info.height || info.width > 8000 || info.height > 8000) throw new Error('Animated or oversized images are not supported.');
  // Re-encoding strips EXIF, GPS, filenames and embedded metadata by default.
  for (const size of [1200,900,640]) {
    const result = await sharp(input,{limitInputPixels:MAX_DECODE_PIXELS}).rotate().resize(size,size,{fit:'inside',withoutEnlargement:true}).webp({quality:72}).toBuffer({resolveWithObject:true});
    if (result.data.length <= MAX_IMAGE_BYTES) return {bytes:result.data,width:result.info.width,height:result.info.height,mime:'image/webp' as const};
  }
  throw new Error('This image cannot be reduced safely. Choose a simpler image.');
}
