import { describe, it, expect } from 'vitest';
import { validateApplication, NICHE_OPTIONS, DEAL_OPTIONS } from './creatorApplication.js';

const ok = { name: 'Sam', email: 'sam@example.com', instagram_handle: '@sam',
  portfolio_url: 'https://insta.com/reel/1', follower_count: '12000', niche: 'grooming' };

describe('validateApplication', () => {
  it('passes a complete valid form', () => {
    const r = validateApplication(ok);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
  });
  it('requires name, email, instagram, portfolio, followers, niche', () => {
    const r = validateApplication({});
    expect(r.valid).toBe(false);
    for (const f of ['name','email','instagram_handle','portfolio_url','follower_count','niche'])
      expect(r.errors[f]).toBeTruthy();
  });
  it('rejects a malformed email', () => {
    expect(validateApplication({ ...ok, email: 'nope' }).errors.email).toBeTruthy();
  });
  it('rejects a non-numeric follower count', () => {
    expect(validateApplication({ ...ok, follower_count: 'lots' }).errors.follower_count).toBeTruthy();
  });
  it('accepts couples as a niche', () => {
    expect(NICHE_OPTIONS).toContain('couples');
    expect(validateApplication({ ...ok, niche: 'couples' }).valid).toBe(true);
  });
  it('exposes deal options', () => {
    expect(DEAL_OPTIONS).toEqual(['ugc', 'affiliate', 'partnership']);
  });
});
