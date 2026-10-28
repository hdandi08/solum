import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectRitualVideoSource } from './ritualVideoSource.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const selector = () => readFileSync(resolve(__dirname, 'RitualVideoSelector.jsx'), 'utf8');

const video = {
  desktop: 'https://cdn.example.test/daily-desktop.mp4',
  mobile: 'https://cdn.example.test/daily-mobile.mp4',
};

describe('selectRitualVideoSource', () => {
  it('returns the mobile file only for the mobile breakpoint', () => {
    expect(selectRitualVideoSource(video, true)).toBe(video.mobile);
    expect(selectRitualVideoSource(video, false)).toBe(video.desktop);
  });
});

describe('RitualVideoSelector', () => {
  it('renders one explicit responsive video URL instead of browser-selected media sources', () => {
    const component = selector();

    expect(component).toContain("import { selectRitualVideoSource } from './ritualVideoSource.js';");
    expect(component).toContain('const isMobile = useIsMobileRitualViewport();');
    expect(component).toContain('const videoSrc = selectRitualVideoSource(video, isMobile);');
    expect(component).toContain('src={videoSrc}');
    expect(component).not.toContain('<source src={video.mobile} media="(max-width:768px)" />');
    expect(component).not.toContain('<source src={video.desktop} />');
  });
});
