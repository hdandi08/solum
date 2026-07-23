#!/usr/bin/env python3
"""Push the SOLUM product feed to Awin's Retail Advertiser Product API.

Reads the live feed (CSV, real stock) from the awin-feed Supabase endpoint,
transforms it to Awin's Google-Shopping JSONL format, and POSTs it. Each POST
replaces the whole feed on Awin (version increments). Run daily via GitHub
Actions. Requires env AWIN_API_TOKEN (Bearer). Exits non-zero on validation
errors so the workflow surfaces failures.
"""
import csv, io, json, os, sys, urllib.request

FEED_CSV_URL = 'https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/awin-feed'
AWIN_ENDPOINT = 'https://api.awin.com/advertisers/129171/awinfeeds/retail/en_GB/products'
# Kits have no GTIN — supply an MPN so Awin's gtin-or-(mpn+brand) rule is met.
MPN = {'ground': 'SOLUM-KIT-GROUND', 'ritual': 'SOLUM-KIT-RITUAL'}


def build_jsonl(rows):
    products = []
    for row in rows:
        pid = row['product_id']
        products.append({
            'id': pid,
            'title': row['product_name'],
            'description': row['description'],
            'link': row['merchant_deep_link'],
            'image_link': row['merchant_image_url'],
            'availability': 'in_stock' if row['in_stock'] == '1' else 'out_of_stock',
            'price': f"{row['search_price']} {row['currency']}",
            'brand': row['brand_name'],
            'condition': 'new',
            'mpn': MPN.get(pid, pid),
        })
    return ('\n'.join(json.dumps(p, ensure_ascii=False) for p in products) + '\n').encode('utf-8')


def main():
    token = os.environ['AWIN_API_TOKEN']

    with urllib.request.urlopen(FEED_CSV_URL, timeout=30) as r:
        rows = list(csv.DictReader(io.StringIO(r.read().decode('utf-8'))))
    if not rows:
        print('No rows in source feed — aborting', file=sys.stderr)
        sys.exit(1)

    body = build_jsonl(rows)
    req = urllib.request.Request(AWIN_ENDPOINT, data=body, method='POST', headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/jsonlines',
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = resp.read().decode('utf-8')

    print('Awin response:', out)
    if '"errors"' in out or '"status":"paused"' in out:
        print('PUSH FAILED — Awin reported validation errors', file=sys.stderr)
        sys.exit(1)
    print(f'Pushed {len(rows)} products to Awin OK')


if __name__ == '__main__':
    main()
