#!/usr/bin/env python3
"""Invisible-bounce rate: visitors whose HTML arrived (early_hit) but whose app
bundle never booted (no $pageview). Split by ad vs organic and device class.

Usage: source .env.posthog && PH=$PH python3 scripts/posthog/invisible_bounce.py
"""
import os, json, ssl, urllib.request

SSL = ssl.create_default_context()
SSL.check_hostname = False
SSL.verify_mode = ssl.CERT_NONE

PH  = os.environ["PH"]
PID = os.environ.get("PID", "166881")
BASE = f"https://eu.posthog.com/api/projects/{PID}"
PROD = "properties.$host NOT LIKE '%localhost%' AND properties.$host NOT LIKE '%amplifyapp%'"

def q(hogql):
    req = urllib.request.Request(
        f"{BASE}/query/",
        data=json.dumps({"query": {"kind": "HogQLQuery", "query": hogql}}).encode(),
        headers={"Authorization": f"Bearer {PH}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, context=SSL) as r:
        return json.load(r)["results"]

print("=== early_hit vs $pageview per day (last 14 days) ===")
print(f"{'day':<12}{'src':<10}{'device':<9}{'early_hit':>10}{'pageview':>10}{'lost':>7}{'lost%':>7}")
rows = q(f"""
SELECT day, src, device, sumIf(n, event='early_hit') AS hits, sumIf(n, event='$pageview') AS views
FROM (
  SELECT toDate(timestamp) AS day,
         if(coalesce(properties.utm_source,'')!='', 'ad', 'organic') AS src,
         multiIf(event='early_hit' AND toFloat(properties.screen_width) <= 767, 'mobile',
                 event='early_hit', 'desktop',
                 properties.$device_type='Mobile', 'mobile', 'desktop') AS device,
         event, count() AS n
  FROM events
  WHERE event IN ('early_hit','$pageview')
    AND timestamp >= now() - INTERVAL 14 DAY
    AND (event='early_hit' OR ({PROD}))
  GROUP BY day, src, device, event
)
GROUP BY day, src, device ORDER BY day DESC, src, device
""")
for day, src, device, hits, views in rows:
    lost = max(hits - views, 0)
    pct = f"{lost/hits*100:5.1f}%" if hits else "    —"
    print(f"{str(day):<12}{src:<10}{device:<9}{hits:>10}{views:>10}{lost:>7}{pct:>7}")

print("\nNote: $pageview counts SPA route changes too; compare homepage-path-only if it")
print("overshoots. early_hit has no bot filtering — expect a few % baseline 'loss' even")
print("on desktop organic; the signal is the DELTA between ad-mobile and that baseline.")
