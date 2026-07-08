import { describe, it, expect } from 'vitest';
import { classifyMxResponse, checkEmailDomain } from './emailMx';

describe('classifyMxResponse', () => {
  it('flags NXDOMAIN as invalid (domain does not exist)', () => {
    expect(classifyMxResponse({ Status: 3 })).toBe('invalid');
  });
  it('flags NOERROR with no MX records as invalid', () => {
    expect(classifyMxResponse({ Status: 0 })).toBe('invalid');
    expect(classifyMxResponse({ Status: 0, Answer: [] })).toBe('invalid');
  });
  it('passes NOERROR with MX records as ok', () => {
    expect(classifyMxResponse({ Status: 0, Answer: [{ data: '10 mx.example.com.' }] })).toBe('ok');
  });
  it('treats SERVFAIL as unknown, never blocking', () => {
    expect(classifyMxResponse({ Status: 2 })).toBe('unknown');
  });
  it('treats REFUSED as unknown, never blocking', () => {
    expect(classifyMxResponse({ Status: 5 })).toBe('unknown');
  });
  it('treats a malformed response as unknown', () => {
    expect(classifyMxResponse({})).toBe('unknown');
  });
});

describe('checkEmailDomain', () => {
  it('returns ok for a domain with MX records', async () => {
    const fetchFn = async () => ({ json: async () => ({ Status: 0, Answer: [{ data: '10 mx.l.google.com.' }] }) });
    expect(await checkEmailDomain('gmail.com', { fetchFn })).toBe('ok');
  });
  it('returns invalid for NXDOMAIN', async () => {
    const fetchFn = async () => ({ json: async () => ({ Status: 3 }) });
    expect(await checkEmailDomain('gmail.con', { fetchFn })).toBe('invalid');
  });
  it('returns unknown when the lookup throws (network error)', async () => {
    const fetchFn = async () => { throw new TypeError('Failed to fetch'); };
    expect(await checkEmailDomain('gmail.com', { fetchFn })).toBe('unknown');
  });
  it('returns unknown when the lookup exceeds the timeout', async () => {
    const fetchFn = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    });
    expect(await checkEmailDomain('gmail.com', { fetchFn, timeoutMs: 50 })).toBe('unknown');
  });
  it('returns unknown when the response is not JSON', async () => {
    const fetchFn = async () => ({ json: async () => { throw new SyntaxError('bad json'); } });
    expect(await checkEmailDomain('gmail.com', { fetchFn })).toBe('unknown');
  });
});
