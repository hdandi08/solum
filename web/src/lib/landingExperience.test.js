import { describe, it, expect, vi } from 'vitest';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const fresh = async () => { vi.resetModules(); return (await import('./landingExperience.js')).getLandingExperience; };

describe('gifting attribution', () => {
  it('retains the gifting experience through checkout and a full-page payment return', async () => {
    const storage = memoryStorage();
    let get = await fresh();
    const gift = get({ pathname: '/gift', search: '', storage, now: 1000 });
    expect(gift).toEqual({ landing_experience: 'christmas_gifting', gift_occasion: 'christmas' });
    expect(get({ pathname: '/buy', search: '?kit=ritual', storage, now: 2000 })).toEqual(gift);
    get = await fresh();
    expect(get({ pathname: '/success', search: '', storage, now: 3000 })).toEqual(gift);
  });
  it('restores a breakout journey from its explicit experience parameter', async () => {
    const get = await fresh();
    expect(get({ pathname: '/buy', search: '?source=gift&experience=christmas_gifting', storage: memoryStorage(), now: 1000 }).landing_experience).toBe('christmas_gifting');
  });
  it('does not label ordinary traffic or infer Christmas from a generic gift source', async () => {
    const get = await fresh();
    expect(get({ pathname: '/', search: '', storage: memoryStorage(), now: 1000 })).toEqual({});
    expect(get({ pathname: '/buy', search: '?source=gift', storage: memoryStorage(), now: 1000 })).toEqual({});
  });
  it('expires old attribution', async () => {
    const storage = memoryStorage();
    const get = await fresh();
    get({ pathname: '/gift', search: '', storage, now: 1000 });
    expect(get({ pathname: '/buy', search: '', storage, now: 1000 + 25 * 60 * 60 * 1000 })).toEqual({});
  });
  it('keeps SPA attribution when browser storage is blocked', async () => {
    const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
    const get = await fresh();
    get({ pathname: '/gift', search: '', storage, now: 1000 });
    expect(get({ pathname: '/buy', search: '', storage, now: 2000 }).landing_experience).toBe('christmas_gifting');
  });
});
