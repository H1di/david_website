# SoftSell

A small sales website. Visitors **must log in before they can see the goods for sale**.
User accounts are maintained by hand by the developer — no database, no signup.

## Run

```sh
node server.js
```

Then open <http://localhost:3000>. Use `PORT=8080 node server.js` to change the port.

Requires only Node.js (zero dependencies — nothing to `npm install`).

## Managing logins (`users.json`)

Add, change, or remove accounts by editing `users.json`:

```json
{
  "users": {
    "admin": "softsell2026",
    "alice": "her-password"
  }
}
```

Each entry is `"username": "password"`. **Restart the server** after editing so new
credentials take effect. Passwords are plain text on purpose, to keep manual
maintenance simple.

Seeded accounts: `admin` / `softsell2026` and `demo` / `demo`.

## Managing products (`products.json`)

Edit the `products` array in `products.json`. Changes show up on the next page
refresh — no restart needed.

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

## How it works

- `server.js` — the whole app (Node's built-in `http`, no frameworks).
- Unauthenticated requests to any store page redirect to `/login`.
- A successful login creates an in-memory session and sets an `HttpOnly` cookie.
- Sessions live in memory, so everyone is logged out when the server restarts.

> Note: this is a lightweight setup for easy maintenance. For a public production
> deployment you'd want HTTPS, hashed passwords, and persistent sessions.
