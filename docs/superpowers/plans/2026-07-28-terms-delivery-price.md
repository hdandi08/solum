# Terms Delivery Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public terms page state the £5.95 standard delivery price used by the active launch promotion.

**Architecture:** Preserve the existing static `TermsPage` structure. Add a focused Vitest server-render test for the real page output, then update only the two displayed delivery prices.

**Tech Stack:** React JSX, Vitest, Vite.

## Global Constraints

- Change only the two £3.85 delivery statements in `web/src/pages/TermsPage.jsx`.
- Do not alter checkout calculation, promotion timing, subscription content, or other terms content.
- The public delivery amount is exactly `£5.95`.

---

### Task 1: Lock the displayed delivery amount with a regression test

**Files:**
- Create: `web/src/pages/TermsPage.test.js`
- Modify: `web/src/pages/TermsPage.jsx:325,420`

**Interfaces:**
- Consumes: Static JSX source in `TermsPage.jsx`.
- Produces: A Vitest assertion that the rendered public terms page shows two `£5.95 per box` delivery statements and no `£3.85 per box` delivery statement.

- [x] **Step 1: Write the failing test**

```js
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../components/Nav', () => ({ default: () => null }));
vi.mock('../components/SolumFooter', () => ({ default: () => null }));
vi.mock('../lib/scroll.js', () => ({ jumpTop: () => {} }));

let TermsPage;

beforeAll(async () => {
  globalThis.React = React;
  TermsPage = (await import('./TermsPage.jsx')).default;
});

describe('TermsPage delivery terms', () => {
  it('states the £5.95 standard delivery price consistently', () => {
    const page = renderToStaticMarkup(
      <MemoryRouter><TermsPage /></MemoryRouter>,
    );

    expect(page.match(/£5\.95 per box/g)).toHaveLength(2);
    expect(page).not.toContain('£3.85 per box');
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm --prefix web run test:unit -- src/pages/TermsPage.test.js`

Expected: FAIL because the rendered terms page contains two `£3.85 per box` statements and no `£5.95 per box` statement.

- [x] **Step 3: Update the two public delivery statements**

```jsx
<span className="terms-info-value">£5.95 per box (Royal Mail Tracked 48)</span>
...
<span className="terms-info-value">£5.95 per box</span>
```

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm --prefix web run test:unit -- src/pages/TermsPage.test.js`

Expected: PASS with one passing test.

- [x] **Step 5: Run project verification**

Run: `npm --prefix web run test:unit && npm --prefix web run build`

Expected: Vitest completes with no failures and Vite exits successfully.

- [ ] **Step 6: Commit the implementation**

```bash
git add web/src/pages/TermsPage.jsx web/src/pages/TermsPage.test.js docs/superpowers/plans/2026-07-28-terms-delivery-price.md
git commit -m "fix: align terms delivery price"
```
