// `pnpm dev`: next dev, behind a small stand-in for the production nginx
// (nginx/forms.trondheimdc.no.conf). It forwards the same Nextcloud paths
// with the same rules, so loading, submitting and logging in all work in
// development the way they do in production.
//
//   http://localhost:3000   this proxy (open this one)
//   http://localhost:3001   next dev
//
// NEXTCLOUD_URL overrides "nextcloudUrl" in forms.config.json.
// FORMS_OAUTH_CLIENT_SECRET is the secret of the OAuth client in
// forms.config.json; without it, logging in fails and public forms still work.
// Both go in .env.local (see .env.example).
// Nextcloud only sends people back to the client's registered redirect URL,
// so logging in locally needs a client registered for
// http://localhost:3000/auth/callback (docs/deploy.md).

import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import http from "node:http"
import net from "node:net"

// Secrets for development come from .env.local (git-ignored, see
// .env.example), not the command line, so they don't end up in shell
// history or a committed script. Variables already set win.
try {
  process.loadEnvFile(new URL("../.env.local", import.meta.url))
} catch {
  // No .env.local: public forms still work, logging in doesn't.
}

const config = JSON.parse(
  readFileSync(new URL("../forms.config.json", import.meta.url), "utf8"),
)
const PORT = Number(process.env.PORT ?? 3000)
const NEXT_PORT = PORT + 1
const NEXTCLOUD = new URL(process.env.NEXTCLOUD_URL || config.nextcloudUrl)
const CLIENT_SECRET = process.env.FORMS_OAUTH_CLIENT_SECRET ?? ""

const next = spawn(
  "pnpm",
  ["exec", "next", "dev", "--port", String(NEXT_PORT)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(NEXT_PORT),
      NEXT_PUBLIC_NEXTCLOUD_URL: NEXTCLOUD.origin,
    },
  },
)
process.on("exit", () => next.kill())
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => process.exit())
}

const basic = `Basic ${Buffer.from(`${config.oauthClientId}:${CLIENT_SECRET}`).toString("base64")}`

// The Nextcloud locations of the nginx config. `auth`: what happens to the
// Authorization header ("pass" the browser's, "drop" it, or "client" for
// the OAuth client's own). `login`: only with the login on, as
// nginx/forms-login.conf.
const allRoutes = [
  {
    path: /^\/oauth\/token$/,
    method: "POST",
    to: () => "/index.php/apps/oauth2/api/v1/token",
    auth: "client",
    login: true,
  },
  {
    path: /^\/ocs\/v2\.php\/cloud\/user$/,
    method: "GET",
    auth: "pass",
    login: true,
  },
  {
    path: /^\/ocs\/v2\.php\/core\/apppassword$/,
    method: "DELETE",
    auth: "pass",
    login: true,
  },
  {
    path: /^\/apps\/forms\/s\/[A-Za-z0-9]+$/,
    method: "GET",
    to: (p) => `/index.php${p}`,
    auth: "drop",
  },
  {
    path: /^\/apps\/forms\/[A-Za-z0-9]{16,}$/,
    method: "GET",
    to: (p) => `/index.php${p}`,
    auth: "pass",
    login: true,
  },
  {
    path: /^\/ocs\/v2\.php\/apps\/forms\/api\/v3\/forms(\/[0-9]+)?$/,
    method: "GET",
    auth: "pass",
    login: true,
  },
  {
    path: /^\/ocs\/v2\.php\/apps\/forms\/api\/v3\/forms\/[0-9]+\/submissions$/,
    method: "POST",
    auth: "pass",
  },
]

const routes = allRoutes.filter((r) => !r.login || config.login)

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => resolve(Buffer.concat(chunks)))
  })

const authorization = (route, req) => {
  if (route.auth === "client") return { Authorization: basic }
  if (route.auth === "pass" && req.headers.authorization) {
    return { Authorization: req.headers.authorization }
  }
  return {}
}

// forms-nextcloud-proxy.conf, as far as development needs it.
const forward = async (route, req, res, url) => {
  const path = route.to ? route.to(url.pathname) : url.pathname
  const upstream = await fetch(new URL(`${path}${url.search}`, NEXTCLOUD), {
    method: req.method,
    headers: {
      "OCS-APIRequest": "true",
      Accept: req.headers.accept ?? "*/*",
      ...(req.headers["content-type"]
        ? { "Content-Type": req.headers["content-type"] }
        : {}),
      ...authorization(route, req),
    },
    body: ["GET", "HEAD", "DELETE"].includes(req.method)
      ? undefined
      : await readBody(req),
    redirect: "manual",
  })
  const headers = {
    "content-type": upstream.headers.get("content-type") ?? "text/plain",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; sandbox",
    "x-content-type-options": "nosniff",
  }
  const location = upstream.headers.get("location")
  if (location) headers.location = location
  res.writeHead(upstream.status, headers)
  res.end(Buffer.from(await upstream.arrayBuffer()))
}

const proxyToNext = (req, res) => {
  const upstream = http.request(
    {
      host: "127.0.0.1",
      port: NEXT_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (reply) => {
      res.writeHead(reply.statusCode ?? 502, reply.headers)
      reply.pipe(res)
    },
  )
  upstream.on("error", () => {
    res.writeHead(502)
    res.end("next dev is not up yet")
  })
  req.pipe(upstream)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost")
  const route = routes.find((r) => r.path.test(url.pathname))
  if (!route) return proxyToNext(req, res)

  if (req.method !== route.method || req.headers["ocs-apirequest"] !== "true") {
    res.writeHead(403)
    return res.end()
  }
  try {
    await forward(route, req, res, url)
  } catch (error) {
    console.error(`[dev] ${req.method} ${url.pathname}:`, error)
    res.writeHead(502)
    res.end()
  }
})

// Hot reload runs over a websocket; pass it straight through.
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(NEXT_PORT, "127.0.0.1", () => {
    upstream.write(
      `${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n")}\r\n\r\n`,
    )
    upstream.write(head)
    socket.pipe(upstream).pipe(socket)
  })
  upstream.on("error", () => socket.destroy())
  socket.on("error", () => upstream.destroy())
})

server.listen(PORT, () => {
  console.log(
    `\n  Forms dev: http://localhost:${PORT}  (Nextcloud: ${NEXTCLOUD.origin})\n`,
  )
})
