#!/usr/bin/env python3
"""How many QualifiedVisit events fired per reason (esp. ritual_multi = swipe-qualified).

Usage: PH=<personal_api_key> PID=166881 python3 scripts/posthog/qv_reason_breakdown.py

Prints, prod hosts only:
  1. QualifiedVisit by reason, last 14 days (events + unique people)
  2. ritual_multi per day, last 14 days
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
    try:
        with urllib.request.urlopen(req, context=SSL) as r:
            return json.load(r)["results"]
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:800])
        raise

print("=== QualifiedVisit by reason (last 14 days, prod only) ===")
rows = q(f"""
SELECT coalesce(properties.reason, '(none)') AS reason,
       count() AS events,
       uniq(person_id) AS people
FROM events
WHERE event = 'QualifiedVisit'
  AND timestamp >= now() - INTERVAL 14 DAY
  AND {PROD}
GROUP BY reason
ORDER BY events DESC
""")
print(f"{'reason':<16}{'events':>10}{'people':>10}")
tot = 0
for reason, events, people in rows:
    print(f"{reason:<16}{events:>10}{people:>10}")
    tot += events
print(f"{'TOTAL':<16}{tot:>10}")

print("\n=== ritual_multi per day (last 14 days, prod only) ===")
rows = q(f"""
SELECT toDate(timestamp) AS day, count() AS events
FROM events
WHERE event = 'QualifiedVisit'
  AND properties.reason = 'ritual_multi'
  AND timestamp >= now() - INTERVAL 14 DAY
  AND {PROD}
GROUP BY day
ORDER BY day
""")
for day, events in rows:
    print(f"{day}  {events}")
if not rows:
    print("(no ritual_multi events yet)")
