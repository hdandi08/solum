export function isAutomatedBrowser(navigatorLike = globalThis.navigator) {
  return navigatorLike?.webdriver === true;
}
