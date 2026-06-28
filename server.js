/*
 * SoftSell — a small sales website.
 *
 * Visitors must log in before they can see the goods for sale.
 * User accounts are maintained by hand in users.json (no database).
 * Products are maintained by hand in products.json.
 *
 * Zero dependencies — runs with just Node.js:
 *     node server.js
 * then open http://localhost:3000
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// ---------------------------------------------------------------------------
// Data files (edited by hand)
// ---------------------------------------------------------------------------

function loadJSON(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return JSON.parse(raw);
}

function loadUsers() {
  try {
    return loadJSON('users.json').users || {};
  } catch (err) {
    console.error('Could not read users.json:', err.message);
    return {};
  }
}

function loadProducts() {
  try {
    return loadJSON('products.json').products || [];
  } catch (err) {
    console.error('Could not read products.json:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// In-memory sessions (reset on restart — fine for this use case)
// ---------------------------------------------------------------------------

const sessions = new Map(); // sessionId -> { username }

function createSession(username) {
  const id = crypto.randomBytes(24).toString('hex');
  sessions.set(id, { username });
  return id;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return out;
}

function currentUser(req) {
  const sid = parseCookies(req).sid;
  if (sid && sessions.has(sid)) return sessions.get(sid).username;
  return null;
}

// Constant-time-ish credential check.
function checkCredentials(username, password) {
  const users = loadUsers();
  if (!Object.prototype.hasOwnProperty.call(users, username)) return false;
  const expected = String(users[username]);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(password));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Request body parsing (form-urlencoded)
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // basic flood guard
    });
    req.on('end', () => resolve(data));
  });
}

function parseForm(body) {
  const out = {};
  new URLSearchParams(body).forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — SoftSell</title>
<style>
  :root { --brand:#4f46e5; --brand-dark:#3730a3; --bg:#0f172a; --card:#ffffff; --ink:#0f172a; --muted:#64748b; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color:var(--ink);
         background:linear-gradient(160deg,#1e293b,#0f172a); min-height:100vh; }
  header.site { display:flex; align-items:center; justify-content:space-between;
                padding:18px 28px; color:#fff; }
  .brand { font-size:22px; font-weight:800; letter-spacing:-.5px; }
  .brand span { color:#a5b4fc; }
  header.site a { color:#c7d2fe; text-decoration:none; font-weight:600; }
  header.site a:hover { color:#fff; }
  main { max-width:1040px; margin:0 auto; padding:24px 28px 64px; }
  .auth-card { max-width:380px; margin:8vh auto; background:var(--card); border-radius:16px;
               padding:32px; box-shadow:0 20px 50px rgba(0,0,0,.35); }
  .auth-card h1 { margin:0 0 4px; font-size:24px; }
  .auth-card p.sub { margin:0 0 22px; color:var(--muted); font-size:14px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 6px; }
  input { width:100%; padding:11px 12px; border:1px solid #cbd5e1; border-radius:9px; font-size:15px; }
  input:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 3px rgba(79,70,229,.15); }
  button { width:100%; margin-top:22px; padding:12px; border:0; border-radius:9px; cursor:pointer;
           background:var(--brand); color:#fff; font-size:15px; font-weight:700; }
  button:hover { background:var(--brand-dark); }
  .error { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:10px 12px;
           border-radius:9px; font-size:14px; margin-bottom:8px; }
  .hint { margin-top:18px; font-size:12px; color:var(--muted); text-align:center; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:20px; }
  .product { background:var(--card); border-radius:14px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,.18);
             display:flex; flex-direction:column; }
  .product h3 { margin:0 0 6px; font-size:18px; }
  .product .desc { color:var(--muted); font-size:14px; flex:1; }
  .product .price { font-size:24px; font-weight:800; margin:14px 0 12px; }
  .badge { align-self:flex-start; background:#eef2ff; color:var(--brand-dark); font-size:11px;
           font-weight:700; padding:3px 9px; border-radius:999px; margin-bottom:10px; text-transform:uppercase; }
  .buy { background:var(--brand); color:#fff; text-align:center; padding:10px; border-radius:9px;
         text-decoration:none; font-weight:700; }
  .buy:hover { background:var(--brand-dark); }
  .welcome { color:#e2e8f0; margin:0 0 22px; }
  .welcome h2 { color:#fff; margin:0 0 4px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function loginPage(error) {
  const body = `
<header class="site"><div class="brand">Soft<span>Sell</span></div></header>
<main>
  <form class="auth-card" method="POST" action="/login">
    <h1>Sign in</h1>
    <p class="sub">Log in to browse the SoftSell store.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <label for="username">Username</label>
    <input id="username" name="username" autocomplete="username" autofocus required>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
    <p class="hint">Accounts are issued by your SoftSell administrator.</p>
  </form>
</main>`;
  return layout('Sign in', body);
}

function storePage(username) {
  const products = loadProducts();
  const cards = products.map((p) => `
    <div class="product">
      ${p.badge ? `<div class="badge">${escapeHtml(p.badge)}</div>` : ''}
      <h3>${escapeHtml(p.name)}</h3>
      <div class="desc">${escapeHtml(p.description)}</div>
      <div class="price">$${Number(p.price).toFixed(2)}</div>
      <a class="buy" href="/buy?id=${encodeURIComponent(p.id)}">Buy now</a>
    </div>`).join('');

  const body = `
<header class="site">
  <div class="brand">Soft<span>Sell</span></div>
  <div>Signed in as <strong>${escapeHtml(username)}</strong> &nbsp;·&nbsp; <a href="/logout">Log out</a></div>
</header>
<main>
  <div class="welcome">
    <h2>Goods for sale</h2>
    <p>Browse our software products below.</p>
  </div>
  <div class="grid">
    ${cards || '<p style="color:#fff">No products available yet. Edit products.json to add some.</p>'}
  </div>
</main>`;
  return layout('Store', body);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function send(res, status, contentType, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': contentType, ...headers });
  res.end(body);
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const user = currentUser(req);

  // --- Login (POST) ---
  if (pathname === '/login' && req.method === 'POST') {
    const form = parseForm(await readBody(req));
    if (checkCredentials(form.username, form.password)) {
      const sid = createSession(form.username);
      return redirect(res, '/', {
        'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`,
      });
    }
    return send(res, 401, 'text/html; charset=utf-8', loginPage('Invalid username or password.'));
  }

  // --- Logout ---
  if (pathname === '/logout') {
    const sid = parseCookies(req).sid;
    if (sid) sessions.delete(sid);
    return redirect(res, '/login', { 'Set-Cookie': 'sid=; Max-Age=0; Path=/' });
  }

  // --- Login page (GET) ---
  if (pathname === '/login') {
    if (user) return redirect(res, '/');
    return send(res, 200, 'text/html; charset=utf-8', loginPage(null));
  }

  // ---- Everything below requires authentication ----
  if (!user) return redirect(res, '/login');

  // --- Store (home) ---
  if (pathname === '/' || pathname === '/store') {
    return send(res, 200, 'text/html; charset=utf-8', storePage(user));
  }

  // --- Buy (placeholder confirmation) ---
  if (pathname === '/buy') {
    const id = url.searchParams.get('id');
    const product = loadProducts().find((p) => p.id === id);
    const name = product ? product.name : 'that item';
    return send(res, 200, 'text/html; charset=utf-8', layout('Checkout', `
<header class="site"><div class="brand">Soft<span>Sell</span></div>
  <div><a href="/">&larr; Back to store</a></div></header>
<main><div class="auth-card">
  <h1>Thanks!</h1>
  <p class="sub">Your interest in <strong>${escapeHtml(name)}</strong> has been recorded.
  Checkout/payment is not wired up in this demo.</p>
  <a class="buy" href="/" style="display:block">Continue shopping</a>
</div></main>`));
  }

  // --- 404 ---
  return send(res, 404, 'text/html; charset=utf-8', layout('Not found',
    '<main><div class="auth-card"><h1>404</h1><p class="sub">Page not found.</p>' +
    '<a class="buy" href="/" style="display:block">Go to store</a></div></main>'));
});

server.listen(PORT, () => {
  console.log(`SoftSell running at http://localhost:${PORT}`);
  console.log('Manage logins in users.json · manage products in products.json');
});
