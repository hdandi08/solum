// Product films + banner — hosted on the CDN (CloudFront). Used in both dev and prod.
// Re-encode locally with scripts/build-product-videos.sh, upload to s3://solum-media-assets,
// then (if you changed an existing filename's content) invalidate CloudFront.
import { CDN } from './ritualVideo.js';
const P = `${CDN}/video/products`;

// Hero background: seamless ~16s ambient loop cut from the banner film (no title cards).
// mobile* = 960×540 renditions (~0.7–0.9MB vs 2.2–4MB) for phone-width viewports.
export const BANNER = {
  mp4: `${CDN}/video/banner/banner-loop.mp4`,
  webm: `${CDN}/video/banner/banner-loop.webm`,
  mobileMp4: `${CDN}/video/banner/banner-loop-mobile.mp4`,
  mobileWebm: `${CDN}/video/banner/banner-loop-mobile.webm`,
  poster: '/video/banner-poster.jpg',
  ready: true,
};

// Full 71s banner film — click-to-play in the unboxing section (mp4 carries the audio).
export const BANNER_FULL = {
  mp4: `${CDN}/video/banner/banner_1080.mp4`,
  poster: '/video/banner-poster.jpg',
  ready: true,
};

// keyed by product slug. Films exist for 01,02,05,06,07; 03 + 04 have none (poster/still).
const film = (nn) => ({
  mp4: `${P}/${nn}_720.mp4`,
  webm: `${P}/${nn}_720.webm`,
  poster: `/products/${nn}/poster.jpg`,
  ready: true,
});

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
