---
name: Ask before inserting test stock on dev server startup
description: When user starts the dev server (npm run dev / localhost), ask if they want test stock inserted in the DB before they test
type: feedback
---

When the user starts the local dev server (`npm run dev` or any command that boots localhost:5173), ask them if they want test stock inserted into the production DB before they start testing.

Stock is set via the `set-test-stock` edge function:
```
POST https://gvfptmjluxpngfjendbi.supabase.co/functions/v1/set-test-stock
{ "secret": "test-stock" }           → sets all products to 100
{ "secret": "test-stock", "reset": true } → resets all back to 0
```

**Why:** All product stock defaults to 0 in prod, which causes the checkout to show "Sold Out" and block testing. The user needs to be asked every session — don't assume they want it inserted.

**How to apply:** If you see `npm run dev`, `vite`, or the user mentions spinning up localhost, proactively ask: "Do you want me to insert test stock so the checkout doesn't show Sold Out?"
