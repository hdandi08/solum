// Product films + banner. Transcoded by scripts/build-product-videos.sh, hosted on CDN.
// Flip `ready` to true per item AFTER uploading the matching .media-build/*.{mp4,webm} to CDN.
import { CDN } from './ritualVideo.js';
const P = `${CDN}/video/products`;

export const BANNER = {
  mp4:  `${CDN}/video/banner/banner_1080.mp4`,
  webm: `${CDN}/video/banner/banner_1080.webm`,
  poster: '/video/banner-poster.jpg',
  ready: false,
};

// keyed by product slug
export const PRODUCT_VIDEO = {
  '01-body-wash':        { mp4:`${P}/01_720.mp4`, webm:`${P}/01_720.webm`, poster:'/products/01/poster.jpg', ready:false },
  '02-italy-towel-mitt': { mp4:`${P}/02_720.mp4`, webm:`${P}/02_720.webm`, poster:'/products/02/poster.jpg', ready:false },
  '05-atlas-clay':       { mp4:`${P}/05_720.mp4`, webm:`${P}/05_720.webm`, poster:'/products/05/poster.jpg', ready:false },
  '06-argan-oil':        { mp4:`${P}/06_720.mp4`, webm:`${P}/06_720.webm`, poster:'/products/06/poster.jpg', ready:false },
  '07-body-lotion':      { mp4:`${P}/07_720.mp4`, webm:`${P}/07_720.webm`, poster:'/products/07/poster.jpg', ready:false },
};

export function videoFor(slug) {
  const v = PRODUCT_VIDEO[slug];
  return v && v.ready ? v : null; // null ⇒ caller uses poster/still
}
