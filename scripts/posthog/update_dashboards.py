#!/usr/bin/env python3
"""Add new program insights to the SOLUM Deep Funnel dashboard (id 776101).

Usage: PH=<personal_api_key> PID=166881 python3 scripts/posthog/update_dashboards.py

Adds, all filtered to production hosts only:
  1. True top-of-funnel: QualifiedVisit -> buy_page_viewed -> checkout_initiated -> purchase
  2. In-checkout leak:    buy_page_viewed -> checkout_details_submitted ->
                          checkout_delivery_submitted -> checkout_initiated -> purchase
  3. Ritual video drop-off: ritual_video_progress by percent (bar)

New events (QualifiedVisit, checkout_details_submitted, checkout_delivery_submitted,
ritual_video_progress) start empty until the instrumentation tasks ship.
"""
import os, json, ssl, urllib.request, urllib.error

SSL = ssl.create_default_context()
SSL.check_hostname = False
SSL.verify_mode = ssl.CERT_NONE

PH  = os.environ["PH"]
PID = os.environ["PID"]
DEEP_FUNNEL = 776101
BASE = f"https://eu.posthog.com/api/projects/{PID}"

# Production hosts only (excludes localhost:* and dev.*.amplifyapp.com)
PROD = [{"key": "$host", "type": "event", "operator": "regex",
         "value": r"^(www\.)?bysolum\.(com|co\.uk)\.?$"}]

def api(path, payload, method="POST"):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(),
        method=method, headers={"Authorization": f"Bearer {PH}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, context=SSL) as r:
        return json.load(r)

def ev(event, math="total", math_property=None):
    n = {"kind": "EventsNode", "event": event, "name": event, "math": math}
    if math_property:
        n["math_property"] = math_property
    return n

def funnel(name, steps, desc=None):
    src = {"kind": "FunnelsQuery", "series": [ev(s) for s in steps],
           "dateRange": {"date_from": "-30d"}, "properties": PROD,
           "funnelsFilter": {"funnelVizType": "steps"}}
    body = {"name": name, "dashboards": [DEEP_FUNNEL],
            "query": {"kind": "InsightVizNode", "source": src}}
    if desc:
        body["description"] = desc
    r = api("/insights/", body)
    print(f"  funnel {name[:50]:<50} -> {r.get('id')}")

def trend(name, series, display="ActionsLineGraph", breakdown=None, desc=None):
    src = {"kind": "TrendsQuery", "series": series, "interval": "day",
           "dateRange": {"date_from": "-30d"}, "properties": PROD,
           "trendsFilter": {"display": display}}
    if breakdown:
        src["breakdownFilter"] = {"breakdown": breakdown, "breakdown_type": "event"}
    body = {"name": name, "dashboards": [DEEP_FUNNEL],
            "query": {"kind": "InsightVizNode", "source": src}}
    if desc:
        body["description"] = desc
    r = api("/insights/", body)
    print(f"  trend  {name[:50]:<50} -> {r.get('id')}")

print(f"Updating Deep Funnel dashboard {DEEP_FUNNEL}...")
funnel("Lead funnel — QualifiedVisit → Purchase",
       ["QualifiedVisit", "buy_page_viewed", "checkout_initiated", "purchase"],
       desc="True top of funnel: engaged visitors -> buy -> pay. Populates once QualifiedVisit ships.")
funnel("In-checkout leak (step by step)",
       ["buy_page_viewed", "checkout_details_submitted", "checkout_delivery_submitted",
        "checkout_initiated", "purchase"],
       desc="Exposes WHERE the buy_page_viewed->checkout_initiated collapse happens.")
trend("Ritual video drop-off", [ev("ritual_video_progress")],
      display="ActionsBar", breakdown="percent",
      desc="Where viewers stop watching the ritual video (25/50/75/100%).")
print("DONE")
print(f"https://eu.posthog.com/project/{PID}/dashboard/{DEEP_FUNNEL}")
