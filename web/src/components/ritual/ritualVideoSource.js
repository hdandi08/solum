export function selectRitualVideoSource(video, isMobile) {
  return isMobile ? video.mobile : video.desktop;
}
