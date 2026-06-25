// Product films + banner. Transcoded by scripts/build-product-videos.sh, hosted on CDN.
// Flip `ready` to true per item AFTER uploading the matching .media-build/*.{mp4,webm} to CDN.
import { CDN } from './ritualVideo.js';
const P = `${CDN}/video/products`;

// In `npm run dev` we preview the locally-transcoded files (gitignored, never committed)
// so the hero loop is visible before CDN upload. A production `vite build` uses the CDN
// path with ready:false (poster only) until the file is uploaded and the flag flipped.
const DEV = import.meta.env.DEV;

// Hero background: seamless ~16s ambient loop cut from the banner film (no title cards).
export const BANNER = DEV
  ? { mp4: '/video/banner-loop.mp4', webm: '/video/banner-loop.webm', poster: '/video/banner-poster.jpg', ready: true }
  : { mp4: `${CDN}/video/banner/banner-loop.mp4`, webm: `${CDN}/video/banner/banner-loop.webm`, poster: '/video/banner-poster.jpg', ready: false };

// Full 71s banner film — reused by the unboxing section (Task 7), not the hero loop.
export const BANNER_FULL = {
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
