# PaiseAura

PaiseAura is a React and TypeScript personal finance dashboard for tracking income, expenses, budgets, recurring payments, savings goals, and analytics.

## Features

- Dashboard with income, expense, balance, and spending summaries
- Transaction management with filtering, editing, deletion, and undo support
- Category and budget tracking
- Recurring payment reminders and mark-as-paid workflow
- Savings goals with deposits, editing, deletion, and progress tracking
- Analytics and reports with date ranges, category/payment-method breakdowns, and exports
- Profile, preferences, theme, backup export, and backup import
- Responsive layout for desktop and mobile screens

## Tech stack

- React
- TypeScript
- Vite
- Recharts
- Lucide React
- Local browser storage

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Deploy to GitHub

Create a repository on GitHub, then run these commands from the project directory:

```bash
git init
git add .
git commit -m "Initial PaiseAura app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repository>.git
git push -u origin main
```

If this project is already connected to a GitHub repository, use:

```bash
git add .
git commit -m "Prepare PaiseAura for Netlify"
git push
```

Do not commit `.env` files, API keys, passwords, or other secrets.

## Deploy to Netlify

### Netlify dashboard

1. Sign in to [Netlify](https://www.netlify.com/).
2. Select **Add new project** and choose **Import an existing project**.
3. Connect GitHub and select the PaiseAura repository.
4. Netlify will read the included `netlify.toml`.
5. Confirm the settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Select **Deploy**.

The `netlify.toml` file also configures the SPA fallback so refreshing a route continues to load the React application.

### Netlify CLI

After installing and authenticating the Netlify CLI, you can deploy with:

```bash
npm run build
netlify deploy --prod --dir=dist
```

## Data and hosting behavior

PaiseAura currently stores application data in the browser's `localStorage`. This means:

- Demo data is seeded automatically the first time the app opens in a browser.
- Each browser and device has its own separate data.
- Data is not shared between users or devices.
- Deploying to Netlify does not create a shared database.
- Clearing browser storage can remove locally saved data.

Use **Settings → Export Backup** to download local data and **Settings → Import Backup** to restore it in another browser. A shared multi-user account system would require a backend database and authentication service.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |
