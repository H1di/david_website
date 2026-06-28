# SoftSell

A small sales website. Visitors **must log in before they can see the goods for
sale**. Accounts are maintained by hand by the developer — no signup, no database.

It runs as a **fully static site**, so it can be hosted on **GitHub Pages** with
no server. (A zero-dependency Node version, `server.js`, is also included for
local use — see the bottom of this file.)

## ⚠️ Security note — read this first

Because GitHub Pages serves only static files, the login check runs **in the
browser**. This is a *basic gate, not real security*:

- Anyone can open `users.json` / `products.json` directly in their browser.
- A determined visitor can bypass the JavaScript.

**On a public repository the passwords are visible to everyone.** Only use this
for low-stakes gating (a private demo, an internal list), and never put genuinely
sensitive data behind it. For real auth you need a backend (the `server.js`
version is a starting point, but still needs HTTPS + password hashing for
production).

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment**, set **Source = Deploy from a branch**, pick
   your branch (e.g. `main`) and folder **`/ (root)`**, then **Save**.
4. Wait a minute, then open the URL GitHub shows
   (`https://<you>.github.io/<repo>/`).

The included `.nojekyll` file tells GitHub Pages to serve the files as-is.

## Run locally

Because the page uses `fetch()`, opening `index.html` directly as a `file://`
won't work — serve the folder over HTTP:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Managing logins (`users.json`)

Add, change, or remove accounts by editing `users.json`:

```json
{
  "users": {
    "admin": "softsell2026",
    "David": "hoholnigga"
  }
}
```

Each entry is `"username": "password"`. Changes take effect on the next page
load (no build step).

Seeded accounts: `admin` / `softsell2026`, `demo` / `demo`, `David` / `hoholnigga`.

## Managing products (`products.json`)

Edit the `products` array in `products.json`. Changes show up on the next page
refresh.

```json
{
  "id": "ss-pro",
  "name": "SoftSell Pro License",
  "description": "Full-featured license...",
  "price": 299.0,
  "badge": "Best value"
}
```

`badge` is optional (use `""` for none).

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire static site (login gate + store, HTML/CSS/JS in one file) |
| `users.json` | Login accounts, edited by hand |
| `products.json` | The goods for sale, edited by hand |
| `.nojekyll` | Tells GitHub Pages to skip Jekyll processing |
| `server.js` | Optional Node.js server version (not used by GitHub Pages) |

## Optional: Node.js server version

`server.js` is a zero-dependency server that does the same auth/store flow
server-side (slightly stronger, since `users.json` isn't shipped to the browser):

```sh
node server.js   # http://localhost:3000
```

GitHub Pages cannot run this — it's only for environments where you can run Node.
