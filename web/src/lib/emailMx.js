// MX-record email domain check — catches typos like gmail.con, hotmal.com.
// Design rule: only a DEFINITIVE negative blocks the buyer. Resolver errors,
// timeouts and network failures must always let the form through — a valid
// customer must never be trapped by our own validation infrastructure.

// dns.Status per RFC 1035: 0 NOERROR, 2 SERVFAIL, 3 NXDOMAIN, 5 REFUSED.
export function classifyMxResponse(dns) {
  if (dns.Status === 3) return 'invalid';                    // domain doesn't exist
  if (dns.Status === 0 && dns.Answer?.length) return 'ok';
  if (dns.Status === 0) return 'invalid';                    // domain exists, no mail server
  return 'unknown';                                          // resolver trouble — never block
}

export async function checkEmailDomain(domain, { timeoutMs = 2500, fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(timeoutMs) },
    );
    return classifyMxResponse(await res.json());
  } catch {
    return 'unknown';
  }
}
