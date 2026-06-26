#!/usr/bin/env python3
"""Live-watch SOLUM tracking events in PostHog — for testing instrumentation.

Usage:
  PH=<personal_api_key> python3 scripts/posthog/watch_events.py [minutes] [host_substr]

  minutes     lookback window (default 20)
  host_substr only show events whose $host CONTAINS this (e.g. "amplifyapp" for dev,
              "bysolum" for prod). Omit to show all hosts.

Shows the program's events with their $host + key props so you can confirm each fires
on the right environment (dev events carry the amplify host; prod carry bysolum.*).
"""
import os, sys, json, ssl, urllib.request

SSL = ssl.create_default_context(); SSL.check_hostname = False; SSL.verify_mode = ssl.CERT_NONE
PH = os.environ["PH"]; PID = "166881"

minutes = int(sys.argv[1]) if len(sys.argv) > 1 else 20
host_substr = sys.argv[2] if len(sys.argv) > 2 else None

EVENTS = ['QualifiedVisit', 'ritual_video_progress', 'checkout_details_submitted',
          'checkout_delivery_submitted', 'checkout_initiated', 'buy_page_viewed',
          'purchase', 'scroll_depth', 'section_viewed', 'product_page_viewed']
ev_list = ",".join(f"'{e}'" for e in EVENTS)

host_clause = f"and properties.$host like '%{host_substr}%'" if host_substr else ""
q = f"""
select event,
       properties.$host as host,
       count() as n,
       max(timestamp) as last_seen,
       arrayStringConcat(groupUniqArray(3)(
         concat(ifNull(properties.reason,''), ifNull(toString(properties.percent),''),
                ifNull(properties.kit,''), ifNull(properties.section,''),
                ifNull(toString(properties.server_side),''))), ' | ') as sample_props
from events
where timestamp > now() - interval {minutes} minute
  and event in ({ev_list})
  {host_clause}
group by event, host
order by last_seen desc
"""

req = urllib.request.Request(
    f"https://eu.posthog.com/api/projects/{PID}/query/",
    data=json.dumps({"query": {"kind": "HogQLQuery", "query": q}}).encode(),
    headers={"Authorization": f"Bearer {PH}", "Content-Type": "application/json"})
with urllib.request.urlopen(req, context=SSL) as r:
    rows = json.load(r).get("results", [])

scope = f"host~'{host_substr}'" if host_substr else "all hosts"
print(f"\nEvents in last {minutes}m ({scope}) — {len(rows)} event/host combos\n")
print(f"{'EVENT':<28} {'HOST':<34} {'N':>4}  LAST(UTC)           SAMPLE")
print("-" * 110)
for ev, host, n, last, props in rows:
    print(f"{ev:<28} {str(host):<34} {n:>4}  {str(last)[:19]}  {props[:30]}")
print()
