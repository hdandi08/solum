// Shared ritual video + product data for the home teaser and the /ritual page.
// CDN is live — see docs/superpowers/specs/2026-06-16-ritual-video-redesign.md

export const CDN = 'https://d2ni3owln6t6zz.cloudfront.net';

export const DAILY_VIDEO = {
  desktop: `${CDN}/video/daily/solum_daily_desktop_v2.mp4`,
  mobile:  `${CDN}/video/daily/solum_daily_mobile_v2.mp4`,
};

// Weekly film not yet shot. When ready, transcode to these paths and flip WEEKLY_READY.
// export const WEEKLY_VIDEO = {
//   desktop: `${CDN}/video/weekly/solum_weekly_desktop.mp4`,
//   mobile:  `${CDN}/video/weekly/solum_weekly_mobile.mp4`,
// };
export const WEEKLY_READY = false;

export const DAILY_POSTER = {
  desktop: '/video/daily-poster-desktop.jpg',
  mobile:  '/video/daily-poster-mobile.jpg',
};

export const GOLD = '#c8a96e';

export const RITUALS = {
  daily: {
    freq: 'Every shower',
    title: 'Daily Ritual',
    time: '10 min · 5 products',
    short: '10 min · 5 products',
    copy: 'Start here. The foundation everything builds on.',
    duration: '1:19',
    products: [
      { num: '04', name: 'Scalp Massager',   img: '/products/04/still.webp' },
      { num: '01', name: 'Body Wash',         img: '/products/01/still.webp' },
      { num: '03', name: 'Back Scrub Cloth',  img: '/products/03/still.webp' },
      { num: '08', name: 'Intimate Cleansing Cloth',   img: '/products/08/still.webp' },
      { num: '07', name: 'Body Lotion',       img: '/products/07/still.webp' },
    ],
  },
  weekly: {
    freq: 'Once a week',
    title: 'Weekly Ritual',
    time: '22 min · 4 products',
    short: '22 min · 4 products',
    copy: 'Replaces daily that day. Come back once the daily habit is locked in.',
    duration: null,
    products: [
      { num: '05', name: 'Atlas Clay Mask',   img: '/products/05/still.webp' },
      { num: '04', name: 'Scalp Massager',    img: '/products/04/still.webp' },
      { num: '02', name: 'Italy Towel Mitt',  img: '/products/02/still.webp' },
      { num: '06', name: 'Argan Body Oil',    img: '/products/06/still.webp' },
    ],
  },
};
