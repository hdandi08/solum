// CloudFront Function (runtime: cloudfront-js-2.0) — attach on VIEWER-RESPONSE.
//
// Purpose: set a first-party, HttpOnly, Secure `awc` cookie from the ?awc=
// landing parameter for Awin affiliate click tracking. Because the cookie is
// set server-side (in the HTTP response header) it is NOT subject to Safari /
// iOS ITP's 7-day cap on JavaScript-set cookies, which protects the full
// 45-day Awin cookie window on mobile traffic.
//
// When a transaction later fires, Awin reads this cookie into the `cks`
// parameter and attributes the sale to the affiliate click.
//
// Safe by design: the awc value is validated against a strict token pattern
// before being written into the Set-Cookie header (prevents header injection).

function handler(event) {
    var request = event.request;
    var response = event.response;

    var awc = request.querystring && request.querystring.awc;

    // Awin awc values are ID/hash tokens (alphanumerics, _ and -). Reject
    // anything else so a crafted query string cannot inject cookie attributes.
    if (awc && awc.value && /^[A-Za-z0-9_-]{1,256}$/.test(awc.value)) {
        if (!response.cookies) response.cookies = {};
        response.cookies['awc'] = {
            value: awc.value,
            attributes: 'Domain=.bysolum.co.uk; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax'
        };
    }

    return response;
}
