import { describe, expect, it } from 'vitest';
import { resolveBuyKit } from './buyLanding.js';
describe('buy kit URL selection', () => {
  it('accepts known kits case insensitively', () => {
    expect(resolveBuyKit('RITUAL')).toBe('ritual');
    expect(resolveBuyKit('Ground')).toBe('ground');
  });
  it('leaves missing and unknown kits unselected', () => {
    for (const value of [null, '', 'xyz', 'sovereign', 'constructor']) expect(resolveBuyKit(value)).toBe(null);
  });
});
