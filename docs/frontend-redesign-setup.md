# Frontend Redesign Setup Guide

This document covers the one-time setup steps needed before the Stage 1 redesign (shadcn/ui + Tailwind v4).

---

## Prerequisites

Make sure you have Node.js and npm available. If not installed:

```bash
# Option A — via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc          # or ~/.zshrc
nvm install --lts
nvm use --lts

# Option B — via dnf (Fedora)
sudo dnf install nodejs npm

# Verify
node --version   # should be >= 18
npm --version
```

---

## Step 1 — Install peer dependencies

```bash
cd /home/stfferdo/DEVELOPMENT/minga_expenses_v1/frontend

npm install clsx tailwind-merge class-variance-authority lucide-react
```

These are required by shadcn/ui components.

---

## Step 2 — Create jsconfig.json (required for import alias)

This project uses plain JavaScript (no TypeScript), so there is no `tsconfig.json`.
shadcn's CLI needs a `jsconfig.json` at the root of the `frontend/` folder to detect the `@` alias.

Create the file at:
```
/home/stfferdo/DEVELOPMENT/minga_expenses_v1/frontend/jsconfig.json
```

With this exact content:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

> The `@` alias is also configured in `vite.config.js` — `jsconfig.json` is only needed so the shadcn CLI can validate it.

---

## Step 3 — Install shadcn/ui

shadcn/ui supports Tailwind v4 natively. Run the interactive init:

```bash
npx shadcn@latest init
```

When prompted, answer:
- **Select a component library:** Radix
- **Which preset:** Nova  *(Lucide icons + Geist font — we override colors with our own theme)*
- **Open in browser?** No

This creates:
- `src/lib/utils.js` — the `cn()` helper
- `components.json` — shadcn config
- Updates `src/index.css` with CSS variable theme tokens

---

## Step 4 — Add shadcn components

Run these one by one (or all at once):

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add textarea
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add separator
npx shadcn@latest add tabs
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add calendar
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add scroll-area
npx shadcn@latest add tooltip
```

Each command copies the component source into `src/components/ui/`.

---

## Step 5 — Verify the setup

```bash
npm run dev
```

The app should start without errors at `http://localhost:5173`. The existing pages will still look the same — the new components are just available, not yet used.

---

## What was already done (committed to repo)

- `vite.config.js` updated with `@` path alias pointing to `src/`
- Todo: theme CSS vars, Layout redesign, ExpenseForm, ExpenseList, Settings page, routes

---

## After setup — next steps

Once you confirm `npm run dev` works with no errors, Claude Code will:
1. Update `index.css` with light/dark CSS variable theme (matching the Expensix dark style)
2. Add `ThemeProvider` context
3. Redesign `Layout.jsx` — bottom nav + FAB on mobile, top nav on desktop
4. Redesign `ExpenseForm.jsx` — shadcn inputs, Command-based searchable selects, Dialog for "+ New"
5. Redesign `ExpenseList.jsx` — shadcn Table, filters
6. Create `Settings.jsx` — Master Lists with Tabs + Dialog
7. Redesign `Login.jsx` and `Dashboard.jsx`
8. Update `App.jsx` routes (`/settings`, `/reports` placeholder)
