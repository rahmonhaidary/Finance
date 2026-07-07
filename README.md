# Ledgerline — Personal & Business Finance Tracker

A React app for tracking balances, transactions, budgets, and invoices across your personal finances and any number of businesses. Data is saved in your browser (localStorage), so it stays on the device you use it on. Use the CSV export in the Transactions tab as a backup.

## Deploy to a live website with GitHub Pages (free)

1. Upload everything in this folder to your GitHub repository (replace the old `tracker` file). Make sure the `.github` folder is included.
2. On your repo page, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Go to the **Actions** tab — a "Deploy to GitHub Pages" run will start (or re-run it via "Run workflow").
4. When it finishes, your site is live at **https://rahmonhaidary.github.io/Finance/**

Every time you change the code on GitHub, the site rebuilds automatically.

## Run it on your own computer (optional)

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).
