Build the $ARGUMENTS feature following SOLID principles:

## Structure

- `data/<name>.js` — static data and constants only, no JSX, no logic
- `hooks/use<Name>.js` — all state and derived logic, one hook per concern
- `components/<feature>/<ComponentName>.jsx` — one responsibility per file, ~60 lines max
- `pages/<Name>Page.jsx` — thin orchestrator: imports components, calls hooks, renders. No inline data, no business logic.

## Rules

- No monolithic files. If a file exceeds ~60 lines of JSX, split it.
- Pages never contain CSS blocks, data arrays, or state logic — those belong in their own files.
- Each component owns only its own CSS (inline `<style>` tag matching the existing codebase pattern).
- Hooks are pure logic — no JSX, no CSS.
- Data files are pure data — no imports from React or hooks.

## Checklist before committing

- [ ] Every file has one clear responsibility
- [ ] Page file is under 30 lines
- [ ] No data or logic defined inline in a page or component that renders it
- [ ] Hook tested mentally: could it be reused elsewhere without changes?
