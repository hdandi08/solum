import { describe, expect, it } from 'vitest';
import { isAutomatedBrowser } from './analyticsEnvironment.js';

describe('isAutomatedBrowser', () => {
  it('returns true only for an explicit WebDriver browser', () => {
    expect(isAutomatedBrowser({ webdriver: true })).toBe(true);
    expect(isAutomatedBrowser({ webdriver: false })).toBe(false);
    expect(isAutomatedBrowser(undefined)).toBe(false);
  });
});
