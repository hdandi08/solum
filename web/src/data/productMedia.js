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

// keyed by product slug. DEV serves the gitignored local film previews (ready:true) so the
// product films are visible on `npm run dev` before CDN upload. Prod uses the CDN path with
// ready:false (poster/still) until each film is uploaded and the flag flipped.
const film = (nn) => DEV
  ? { mp4:`/products/${nn}/film.mp4`, webm:`/products/${nn}/film.webm`, poster:`/products/${nn}/poster.jpg`, ready:true }
  : { mp4:`${P}/${nn}_720.mp4`, webm:`${P}/${nn}_720.webm`, poster:`/products/${nn}/poster.jpg`, ready:false };

export const PRODUCT_VIDEO = {
  '01-body-wash':        film('01'),
  '02-italy-towel-mitt': film('02'),
  '05-atlas-clay':       film('05'),
  '06-argan-oil':        film('06'),
  '07-body-lotion':      film('07'),
};

export function videoFor(slug) {
  const v = PRODUCT_VIDEO[slug];
  return v && v.ready ? v : null; // null ⇒ caller uses poster/still
}
