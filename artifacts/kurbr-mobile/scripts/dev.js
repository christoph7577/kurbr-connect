/**
 * Dev wrapper for KURBR Mobile.
 *
 * Opens $PORT on BOTH IPv4 (0.0.0.0) and IPv6 (::, ipv6Only) so the port
 * appears in /proc/net/tcp AND /proc/net/tcp6. Replit's health checker may
 * read either file. Then starts Metro on $PORT+1 for Expo Go.
 */

const http = require("http");
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = PORT + 1;
const projectRoot = path.resolve(__dirname, "..");

console.log(`[dev] PORT=${PORT}  Metro=${METRO_PORT}`);

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>KURBR Mobile</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0b0f15;color:#f0f2f5;font-family:-apple-system,sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;padding:24px;text-align:center}
    .logo{font-size:2.5rem;font-weight:700;color:#ff6600;margin-bottom:8px}
    .tag{color:#7e8fa0;margin-bottom:40px}
    .card{background:#111820;border:1px solid #202c3a;border-radius:12px;
          padding:32px;max-width:420px;width:100%}
    .card h2{margin-bottom:12px}
    .card p{font-size:.9rem;color:#7e8fa0;line-height:1.7}
    .hint{margin-top:16px;padding:12px;background:#1b2430;border-radius:8px;
          font-size:.8rem;color:#9eb3c6}
  </style>
</head>
<body>
  <div class="logo">KURBR</div>
  <div class="tag">On-demand junk hauling</div>
  <div class="card">
    <h2>Mobile App — Expo Go</h2>
    <p>Scan the QR code from the Replit URL bar using
    <strong>Expo Go</strong> on iOS or Android.</p>
    <div class="hint">Metro bundler running on port ${METRO_PORT}</div>
  </div>
</body>
</html>`;

function handleRequest(req, res) {
  console.log(`[health] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  if (req.url === "/status") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("packager-status:running");
  } else if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(LANDING_HTML);
  }
}

function listenServer(serverOrPort, host, opts) {
  return new Promise((resolve, reject) => {
    const srv = typeof serverOrPort === "number"
      ? http.createServer(handleRequest)
      : serverOrPort;

    srv.on("connection", (socket) => {
      console.log(`[health] TCP conn from ${socket.remoteAddress}:${socket.remotePort}`);
    });

    const listenOpts = opts
      ? { port: PORT, host, ...opts }
      : { port: PORT, host };

    srv.listen(listenOpts, () => {
      console.log(`[health] Bound ${JSON.stringify(srv.address())}`);
      resolve(srv);
    });

    srv.on("error", (err) => {
      console.warn(`[health] Error on ${host}: ${err.message} (${err.code})`);
      reject(err);
    });
  });
}

async function startHealthServers() {
  // Bind IPv4 — appears in /proc/net/tcp
  const srv4 = http.createServer(handleRequest);
  try {
    await listenServer(srv4, "0.0.0.0");
    console.log(`[health] IPv4 0.0.0.0:${PORT} ✓`);
  } catch (err) {
    console.warn(`[health] IPv4 failed: ${err.message}`);
  }

  // Bind IPv6-only — appears in /proc/net/tcp6
  const srv6 = http.createServer(handleRequest);
  try {
    await listenServer(srv6, "::", { ipv6Only: true });
    console.log(`[health] IPv6 :::${PORT} (ipv6Only) ✓`);
  } catch (err) {
    console.warn(`[health] IPv6 failed: ${err.message}`);
  }

  return { srv4, srv6 };
}

function startMetro() {
  console.log(`[dev] Spawning Metro on port ${METRO_PORT}...`);
  const metro = spawn(
    "pnpm",
    ["exec", "expo", "start", "--port", String(METRO_PORT)],
    {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(METRO_PORT) },
      stdio: "inherit",
    },
  );
  metro.on("error", (err) => console.error(`[dev] Metro error: ${err.message}`));
  metro.on("exit", (code, signal) => {
    console.log(`[dev] Metro exited code=${code} signal=${signal}`);
    process.exit(code ?? 0);
  });
  return metro;
}

async function main() {
  process.on("uncaughtException", (err) =>
    console.error(`[dev] uncaught: ${err.message}`)
  );
  process.on("SIGTERM", () => { console.log("[dev] SIGTERM"); process.exit(0); });
  process.on("SIGINT", () => { console.log("[dev] SIGINT"); process.exit(0); });

  await startHealthServers();
  console.log(`[dev] Health servers ready on port ${PORT}. Starting Metro...`);
  startMetro();
}

main();
