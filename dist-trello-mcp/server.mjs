// src/trello-mcp-runner.ts
import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import admin2 from "firebase-admin";

// env-static-public-ns:$env/static/public
var PUBLIC_FIREBASE_PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID || "eisg-fleet";
var PUBLIC_FIREBASE_REALTIME_URL = process.env.PUBLIC_FIREBASE_REALTIME_URL || "https://eisg-fleet-default-rtdb.europe-west1.firebasedatabase.app";
var PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || "eisg-fleet.firebasestorage.app";
var PUBLIC_FIREBASE_APIKEY = process.env.PUBLIC_FIREBASE_APIKEY || "AIzaSyCoevtJY26liekze23kH9ZiUhpFMTPsN1M";
var PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || "eisg-fleet.firebaseapp.com";

// src/lib/server/db/firebase/firebase.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

// minimal-logger-ns:$lib/utils/logger
var logger = {
  log: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  success: (...args) => console.log(...args),
  gray: (...args) => console.log(...args)
};

// env-dynamic-ns:$env/dynamic/private
var env = process.env;

// src/lib/utils/isDev.ts
var isDev = env.NODE_ENV === "development";

// src/lib/server/db/firebase/firebase.ts
var firebaseConfig = { projectId: PUBLIC_FIREBASE_PROJECT_ID, databaseURL: PUBLIC_FIREBASE_REALTIME_URL };
var app;
var initializedFirestore;
var initialize = () => {
  if (app) return app;
  const apps = getApps();
  if (apps.length) return app = apps[0];
  return initializeApp(firebaseConfig);
};
var db = () => {
  if (!initializedFirestore) {
    if (!app) app = initialize();
    initializedFirestore = getFirestore(app);
  }
  return initializedFirestore;
};
var getRef = (collectionName) => {
  const ref = db().collection(collectionName);
  return ref;
};
var setItem = async (id, data, collectionName, merge = false) => {
  delete data.id;
  try {
    const docRef = await getRef(collectionName).doc("" + id).set(data, { merge });
    return docRef;
  } catch (err) {
    logger.error("FIREBASE ERROR | SET ITEM | ", { id, data, collectionName, merge });
    throw err;
  }
};

// src/lib/server/mcp/trello/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z as z2 } from "zod";

// src/lib/server/mcp/trello/tools.ts
import { z } from "zod";

// src/lib/server/mcp/trello/client.ts
import axios from "axios";

// src/lib/server/mcp/trello/config.ts
var TRELLO_API_BASE = "https://api.trello.com/1";
var getTrelloApiKey = () => {
  const key = env.TRELLO_API_KEY || process.env.TRELLO_API_KEY || "7e39cd5519f2f33fda3c0a60f2531bb0";
  if (!key) {
    throw new Error("TRELLO_API_KEY is not configured in environment variables.");
  }
  return key;
};
var getTrelloToken = () => {
  const token = env.TRELLO_TOKEN || process.env.TRELLO_TOKEN || "ATTA76edc48f7524a1400f2971632e7b144fc385ed88dced1f056aafb34d8a44437123810376";
  if (!token) {
    throw new Error("TRELLO_TOKEN is not configured in environment variables.");
  }
  return token;
};
var getMcpSecretToken = () => {
  return env.TRELLO_MCP_SECRET_TOKEN || process.env.TRELLO_MCP_SECRET_TOKEN || env.MCP_SECRET_TOKEN || process.env.MCP_SECRET_TOKEN || "fefd98378da236c1990ba71f5612299e6e8083cb65e62a76c8cb15bbfa5c6891";
};
var getMcpOAuthClientId = () => {
  return env.TRELLO_MCP_OAUTH_CLIENT_ID || process.env.TRELLO_MCP_OAUTH_CLIENT_ID || "finner-trello-card-assignment-mcp";
};
var getMcpOAuthClientSecret = () => {
  return env.TRELLO_MCP_OAUTH_CLIENT_SECRET || process.env.TRELLO_MCP_OAUTH_CLIENT_SECRET || "497156171ee5ad92814a302bb0a3c89ff37b465584171a9f";
};

// src/lib/server/mcp/trello/client.ts
var TrelloClient = class {
  apiKey;
  token;
  constructor(apiKey, token) {
    this.apiKey = apiKey || getTrelloApiKey();
    this.token = token || getTrelloToken();
  }
  getAuthParams() {
    return {
      key: this.apiKey,
      token: this.token
    };
  }
  /**
   * Fetch card details (verifies card exists and inspects current members)
   */
  async getCard(cardId) {
    const cleanCardId = (cardId || "").trim();
    if (!cleanCardId) {
      throw new Error("Missing cardId / ticketId parameter.");
    }
    const url = `${TRELLO_API_BASE}/cards/${encodeURIComponent(cleanCardId)}`;
    try {
      const res = await axios.get(url, {
        params: this.getAuthParams()
      });
      return res.data;
    } catch (err) {
      this.handleAxiosError(`Failed to fetch card ${cleanCardId}`, err);
    }
  }
  /**
   * Resolve member ID from username or ID
   */
  async resolveMember(memberIdOrUsername) {
    let raw = (memberIdOrUsername || "").trim();
    if (!raw) {
      throw new Error("Missing memberId / username parameter.");
    }
    if (raw.startsWith("@")) {
      raw = raw.slice(1);
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(raw);
    const url = `${TRELLO_API_BASE}/members/${encodeURIComponent(raw)}`;
    try {
      const res = await axios.get(url, {
        params: this.getAuthParams()
      });
      return {
        id: res.data.id,
        username: res.data.username,
        fullName: res.data.fullName,
        avatarUrl: res.data.avatarUrl
      };
    } catch (err) {
      if (isObjectId) {
        return {
          id: raw,
          username: raw,
          fullName: raw
        };
      }
      this.handleAxiosError(`Failed to resolve member '${raw}'`, err);
    }
  }
  /**
   * Assign member to ticket/card with pre-verification and post-verification
   */
  async assignMemberToCard(cardId, memberIdOrUsername) {
    const card = await this.getCard(cardId);
    const member = await this.resolveMember(memberIdOrUsername);
    if (card.idMembers && card.idMembers.includes(member.id)) {
      return {
        success: true,
        alreadyAssigned: true,
        cardId: card.id,
        cardName: card.name,
        assignedMemberId: member.id,
        assignedMemberUsername: member.username,
        currentMembers: card.idMembers
      };
    }
    const assignUrl = `${TRELLO_API_BASE}/cards/${encodeURIComponent(card.id)}/idMembers`;
    try {
      const res = await axios.post(assignUrl, null, {
        params: {
          value: member.id,
          ...this.getAuthParams()
        }
      });
      const updatedMembers = res.data?.idMembers || [];
      const isAssigned = updatedMembers.includes(member.id);
      return {
        success: isAssigned,
        cardId: card.id,
        cardName: card.name,
        assignedMemberId: member.id,
        assignedMemberUsername: member.username,
        currentMembers: updatedMembers
      };
    } catch (err) {
      this.handleAxiosError(`Failed to assign member ${member.id} to card ${card.id}`, err);
    }
  }
  handleAxiosError(contextMessage, err) {
    if (err.response) {
      const status = err.response.status;
      const data = typeof err.response.data === "string" ? err.response.data : JSON.stringify(err.response.data);
      throw new Error(`[Trello API Error ${status}] ${contextMessage}: ${data}`);
    }
    throw new Error(`[Trello Network Error] ${contextMessage}: ${err.message}`);
  }
};
var defaultTrelloClient = new TrelloClient();

// src/lib/server/mcp/trello/tools.ts
function registerTrelloTools(server2) {
  const serverAny = server2;
  const zod = serverAny.z || z;
  serverAny.tool(
    "assign_member_to_card",
    "Assign a person/member to a Trello ticket (card). ticketId and memberId are dynamic. Resolves username (e.g. @username) automatically and verifies card assignment.",
    {
      ticketId: zod.string().min(1).describe("The Trello card/ticket ID or short link (e.g. z9NsKqCk)"),
      memberId: zod.string().min(1).describe("The Trello member ID or username (e.g. @daryavinahrad2 or daryavinahrad2)")
    },
    async (args) => {
      const result = await defaultTrelloClient.assignMemberToCard(args.ticketId, args.memberId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );
  serverAny.tool(
    "get_card_info",
    "Get Trello card information including name, description, board, list, and currently assigned member IDs.",
    {
      ticketId: zod.string().min(1).describe("The Trello card/ticket ID or short link (e.g. z9NsKqCk)")
    },
    async (args) => {
      const card = await defaultTrelloClient.getCard(args.ticketId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: card.id,
              name: card.name,
              desc: card.desc,
              idBoard: card.idBoard,
              idList: card.idList,
              idMembers: card.idMembers,
              url: card.url,
              shortUrl: card.shortUrl,
              closed: card.closed
            }, null, 2)
          }
        ]
      };
    }
  );
}

// src/lib/server/db/firebase/trelloMcpLog.fdb.ts
var mainCollectionName = "streamer";
var subCollectionName = "trelloMcpLogs";
var collectionRef = (accountId) => [mainCollectionName, accountId, subCollectionName].join("/");
var setTrelloMcpLog = async (accountId, id, data) => {
  return setItem(id, data, collectionRef(accountId), true);
};

// src/lib/server/mcp/trello/server.ts
var createTrelloMcpServer = (authContext) => {
  const server2 = new McpServer({
    name: "trello-card-assignment-mcp",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });
  const accountId = authContext?.accountId || "claude-mcp";
  const clientIp = authContext?.clientIp || "127.0.0.1";
  const userAgent = authContext?.userAgent || "mcp-client";
  server2.z = z2;
  const originalTool = server2.tool.bind(server2);
  server2.tool = (name, description, schema, handler) => {
    const wrappedHandler = async (args, extra) => {
      return executeWithAuditLogging(
        accountId,
        clientIp,
        userAgent,
        name,
        [name],
        args || {},
        () => handler(args, extra)
      );
    };
    return originalTool(name, description, schema, wrappedHandler);
  };
  registerTrelloTools(server2);
  return server2;
};
async function executeWithAuditLogging(accountId, clientIp, userAgent, toolName, trelloMethods, params, executor) {
  const startTime = Date.now();
  const logId = `trello_log_${startTime}_${Math.random().toString(36).substring(2, 8)}`;
  try {
    const result = await executor();
    const durationMs = Date.now() - startTime;
    try {
      await setTrelloMcpLog(accountId, logId, {
        accountId,
        clientIp,
        userAgent,
        toolName,
        trelloMethods,
        params,
        status: "SUCCESS",
        resultSummary: typeof result === "object" && result !== null ? result : void 0,
        durationMs,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (logErr) {
      console.error("[Trello MCP Audit Logger Warning]: Failed to write audit log to Firestore:", logErr);
    }
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    try {
      await setTrelloMcpLog(accountId, logId, {
        accountId,
        clientIp,
        userAgent,
        toolName,
        trelloMethods,
        params,
        status: "ERROR",
        errorMessage: err.message,
        durationMs,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (logErr) {
      console.error("[Trello MCP Audit Logger Warning]: Failed to log error to Firestore:", logErr);
    }
    throw err;
  }
}

// src/lib/server/mcp/trello/auth.ts
import crypto from "crypto";
var ALLOWED_DOMAINS = ["finnergroup.com"];
var isAllowedEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const domain = email.split("@").pop()?.toLowerCase();
  return Boolean(domain && ALLOWED_DOMAINS.includes(domain));
};
var safeCompare = (a, b) => {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};
var base64UrlEncode = (str) => {
  return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
};
var signHmac = (payloadStr, secret) => {
  return crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
};
var createSignedOAuthCode = (payload) => {
  const secret = getMcpSecretToken();
  const fullPayload = {
    ...payload,
    email: payload.email.toLowerCase().trim(),
    exp: payload.exp || Date.now() + 5 * 60 * 1e3
    // 5 minutes validity
  };
  const jsonStr = JSON.stringify(fullPayload);
  const encodedPayload = base64UrlEncode(jsonStr);
  const signature = signHmac(encodedPayload, secret);
  return `mcp_code_${encodedPayload}.${signature}`;
};
var verifySignedOAuthCode = (codeStr) => {
  if (!codeStr || !codeStr.startsWith("mcp_code_")) return null;
  const raw = codeStr.substring("mcp_code_".length);
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const secret = getMcpSecretToken();
  const expectedSig = signHmac(encodedPayload, secret);
  if (!safeCompare(signature, expectedSig)) {
    return null;
  }
  try {
    const jsonStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr);
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    if (!isAllowedEmail(payload.email)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
var createSignedMcpAccessToken = (payload) => {
  const secret = getMcpSecretToken();
  const now = Date.now();
  const tokenPayload = {
    uid: payload.uid,
    email: payload.email.toLowerCase().trim(),
    iat: now,
    exp: payload.exp || now + 30 * 24 * 60 * 60 * 1e3
    // 30 days
  };
  const jsonStr = JSON.stringify(tokenPayload);
  const encodedPayload = base64UrlEncode(jsonStr);
  const signature = signHmac(encodedPayload, secret);
  return `mcp_u_${encodedPayload}.${signature}`;
};
var verifySignedMcpAccessToken = (tokenStr) => {
  if (!tokenStr || !tokenStr.startsWith("mcp_u_")) return null;
  const raw = tokenStr.substring("mcp_u_".length);
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  const secret = getMcpSecretToken();
  const expectedSig = signHmac(encodedPayload, secret);
  if (!safeCompare(signature, expectedSig)) {
    return null;
  }
  try {
    const jsonStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr);
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    if (!isAllowedEmail(payload.email)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
var verifyPkce = (codeVerifier, codeChallenge, codeChallengeMethod) => {
  if (!codeChallenge) return true;
  if (!codeVerifier) return false;
  const method = (codeChallengeMethod || "plain").toUpperCase();
  if (method === "PLAIN") {
    return safeCompare(codeVerifier, codeChallenge);
  }
  if (method === "S256") {
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const computed = hash.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return safeCompare(computed, codeChallenge);
  }
  return false;
};
var verifyMcpRequest = (request) => {
  const authHeader = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const pathSegments = url.pathname.split("/");
  const pathToken = pathSegments[pathSegments.length - 1];
  const secretToken = getMcpSecretToken();
  let authenticated = false;
  let accountId = "anonymous";
  let verifiedEmail = void 0;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token.startsWith("mcp_u_")) {
      const userPayload = verifySignedMcpAccessToken(token);
      if (userPayload) {
        authenticated = true;
        accountId = userPayload.email;
        verifiedEmail = userPayload.email;
      }
    } else if (safeCompare(token, secretToken)) {
      authenticated = true;
      accountId = "static-bearer-client";
    }
  }
  if (!authenticated && queryToken) {
    if (queryToken.startsWith("mcp_u_")) {
      const userPayload = verifySignedMcpAccessToken(queryToken);
      if (userPayload) {
        authenticated = true;
        accountId = userPayload.email;
        verifiedEmail = userPayload.email;
      }
    } else if (safeCompare(queryToken, secretToken)) {
      authenticated = true;
      accountId = "static-query-client";
    }
  }
  if (!authenticated && pathToken && pathToken !== "mcp") {
    if (pathToken.startsWith("mcp_u_")) {
      const userPayload = verifySignedMcpAccessToken(pathToken);
      if (userPayload) {
        authenticated = true;
        accountId = userPayload.email;
        verifiedEmail = userPayload.email;
      }
    } else if (safeCompare(pathToken, secretToken)) {
      authenticated = true;
      accountId = "static-path-client";
    }
  }
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("cf-connecting-ip") || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return {
    authenticated,
    accountId,
    clientIp,
    userAgent,
    email: verifiedEmail
  };
};

// src/trello-mcp-runner.ts
var PORT = Number(process.env.PORT || 8080);
var FIREBASE_API_KEY = process.env.PUBLIC_FIREBASE_APIKEY || "AIzaSyCoevtJY26liekze23kH9ZiUhpFMTPsN1M";
var FIREBASE_AUTH_DOMAIN = process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || "eisg-fleet.firebaseapp.com";
var FIREBASE_PROJECT_ID = process.env.PUBLIC_FIREBASE_PROJECT_ID || "eisg-fleet";
initialize();
var setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, accept, mcp-session-id, mcp-protocol-version, x-user-email");
};
var readBody = (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
};
var server = http.createServer(async (req, res) => {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${host}`;
  const fullUrl = new URL(req.url || "/", origin);
  const pathname = fullUrl.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/health" || pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      service: "trello-card-assignment-mcp",
      domain: "trello-card-assignment.eisg.pl",
      mode: "minimal-standalone-runner",
      auth: "firebase-google-oauth2",
      status: "ok",
      region: process.env.CLOUD_RUN_REGION || "europe-west1",
      allowedDomains: ALLOWED_DOMAINS
    }));
    return;
  }
  if (pathname === "/.well-known/oauth-authorization-server" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "client_credentials"],
      code_challenge_methods_supported: ["S256", "plain"]
    }, null, 2));
    return;
  }
  if (pathname === "/oauth/authorize") {
    if (req.method === "GET") {
      const redirectUri = fullUrl.searchParams.get("redirect_uri") || "";
      const state = fullUrl.searchParams.get("state") || "";
      const codeChallenge = fullUrl.searchParams.get("code_challenge") || "";
      const codeChallengeMethod = fullUrl.searchParams.get("code_challenge_method") || "";
      if (!redirectUri) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing required redirect_uri parameter");
        return;
      }
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EISG Trello Card Assignment MCP \u2014 Secure Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            width: 100%;
            max-width: 420px;
            padding: 36px 32px;
        }
        .header { text-align: center; margin-bottom: 24px; }
        .logo-badge {
            display: inline-block;
            background: #0284c7;
            color: white;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        h2 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
        p.subtitle { font-size: 13px; color: #94a3b8; line-height: 1.5; }
        .badge-domains {
            background: rgba(14, 165, 233, 0.12);
            color: #38bdf8;
            padding: 2px 8px;
            border-radius: 6px;
            font-weight: 600;
        }
        .btn-google {
            width: 100%;
            background: #ffffff;
            color: #0f172a;
            border: none;
            padding: 12px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            font-family: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn-google:hover { background: #f1f5f9; transform: translateY(-1px); }
        .btn-google svg { width: 18px; height: 18px; }
        .divider {
            display: flex;
            align-items: center;
            margin: 20px 0;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
        }
        .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #334155;
        }
        .divider span { padding: 0 12px; text-transform: uppercase; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        input[type="email"], input[type="password"] {
            width: 100%;
            padding: 10px 14px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        input:focus { outline: none; border-color: #38bdf8; }
        .btn-submit {
            width: 100%;
            background: #0284c7;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-submit:hover { background: #0369a1; }
        .error-box {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 16px;
            display: none;
            line-height: 1.4;
        }
        .loading-spinner {
            display: none;
            text-align: center;
            color: #38bdf8;
            font-size: 13px;
            margin-top: 12px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <span class="logo-badge">TRELLO ASSIGNMENT MCP</span>
            <h2>Sign in to continue</h2>
            <p class="subtitle">Access restricted to verified accounts from <span class="badge-domains">@finnergroup.com</span></p>
        </div>

        <div id="error-box" class="error-box"></div>

        <!-- Google Sign-In -->
        <button id="btn-google" class="btn-google">
            <svg viewBox="0 0 48 48">
                <path fill="#ea4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C36.91 2.7 31.11 0 24 0 14.62 0 6.51 5.38 2.42 13.12l7.33 5.7C12.42 13.16 17.18 9.5 24 9.5z"/>
                <path fill="#4285f4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.13h12.94c-.58 2.96-2.27 5.48-4.78 7.18l7.34 5.7c4.29-3.97 7.15-9.83 7.15-16.72z"/>
                <path fill="#fbbc05" d="M10.53 28.59c-.48-1.45-.76-3-0-4.59l-7.33-5.7C.89 20.46 0 24.65 0 29.5c0 4.84 2.65 9.09 6.56 11.31l7.33-5.7c-2.09-2.04-3.47-4.93-3.47-8.31z"/>
                <path fill="#34a853" d="M24 48c13.07 0 24.02-4.33 32.08-11.79l-7.34-5.7c-2.58 2.19-5.88 3.49-9.74 3.49-7.82 0-14.58-5.19-16.99-12.34l-7.33 5.7c4.98 9.39 15.04 16.02 26.32 16.02z"/>
            </svg>
            Sign in with Google
        </button>

        <div class="divider"><span>or with password</span></div>

        <!-- Email & Password Form -->
        <form id="login-form">
            <div class="form-group">
                <label for="email">Corporate Email</label>
                <input type="email" id="email" required placeholder="name@eisg.pl" autocomplete="username">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" required placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="current-password">
            </div>
            <button type="submit" id="btn-submit" class="btn-submit">Sign In</button>
        </form>

        <div id="loading-spinner" class="loading-spinner">Verifying credentials with Firebase...</div>

        <!-- Hidden POST Form to finish OAuth redirect -->
        <form id="oauth-post-form" method="POST" action="/oauth/authorize" style="display:none;">
            <input type="hidden" name="id_token" id="form-id-token">
            <input type="hidden" name="redirect_uri" value="${redirectUri}">
            <input type="hidden" name="state" value="${state}">
            <input type="hidden" name="code_challenge" value="${codeChallenge}">
            <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
        </form>
    </div>

    <!-- Firebase JS SDK (v10 modular via gstatic) -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
        import {
            getAuth,
            GoogleAuthProvider,
            signInWithPopup,
            signInWithEmailAndPassword
        } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "${FIREBASE_API_KEY}",
            authDomain: "${FIREBASE_AUTH_DOMAIN}",
            projectId: "${FIREBASE_PROJECT_ID}"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });

        const errorBox = document.getElementById('error-box');
        const spinner = document.getElementById('loading-spinner');
        const postForm = document.getElementById('oauth-post-form');
        const idTokenInput = document.getElementById('form-id-token');

        function showError(msg) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
            spinner.style.display = 'none';
        }

        async function submitFirebaseToken(userCredential) {
            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const idToken = await userCredential.user.getIdToken();
                idTokenInput.value = idToken;
                postForm.submit();
            } catch (err) {
                showError(err.message || 'Failed to acquire Firebase ID token');
            }
        }

        // Google Sign-In Handler
        document.getElementById('btn-google').addEventListener('click', async () => {
            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const result = await signInWithPopup(auth, googleProvider);
                await submitFirebaseToken(result);
            } catch (err) {
                showError(err.message || 'Google sign-in was cancelled or failed');
            }
        });

        // Email & Password Handler
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                spinner.style.display = 'block';
                errorBox.style.display = 'none';
                const result = await signInWithEmailAndPassword(auth, email, password);
                await submitFirebaseToken(result);
            } catch (err) {
                showError(err.message || 'Invalid email or password');
            }
        });
    </script>
</body>
</html>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (req.method === "POST") {
      const bodyText = await readBody(req);
      const params = new URLSearchParams(bodyText);
      const idToken = params.get("id_token") || "";
      const redirectUri = params.get("redirect_uri") || "";
      const state = params.get("state") || "";
      const codeChallenge = params.get("code_challenge") || void 0;
      const codeChallengeMethod = params.get("code_challenge_method") || void 0;
      if (!redirectUri) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing redirect_uri");
        return;
      }
      if (!idToken) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end('<h3>Authentication Error</h3><p>Missing Firebase ID token.</p><a href="javascript:history.back()">Back</a>');
        return;
      }
      try {
        const decoded = await admin2.auth().verifyIdToken(idToken, true);
        const email = (decoded.email || "").toLowerCase().trim();
        if (!isAllowedEmail(email)) {
          res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h3>Access Denied</h3><p>Email <b>${email}</b> is not authorized. Access is strictly restricted to @finnergroup.com.</p><a href="javascript:history.back()">Back</a>`);
          return;
        }
        const authCode = createSignedOAuthCode({
          uid: decoded.uid,
          email,
          redirectUri,
          codeChallenge,
          codeChallengeMethod
        });
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set("code", authCode);
        if (state) redirectUrl.searchParams.set("state", state);
        res.writeHead(302, { Location: redirectUrl.toString() });
        res.end();
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Token verification failed";
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h3>Authentication Failed</h3><p>${message}</p><a href="javascript:history.back()">Try again</a>`);
        return;
      }
    }
  }
  if (pathname === "/oauth/token" && req.method === "POST") {
    const bodyText = await readBody(req);
    let grantType = "";
    let code = "";
    let codeVerifier = "";
    let clientId = "";
    let clientSecret = "";
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      try {
        const jsonBody = JSON.parse(bodyText);
        grantType = jsonBody.grant_type || "";
        code = jsonBody.code || "";
        codeVerifier = jsonBody.code_verifier || "";
        clientId = jsonBody.client_id || "";
        clientSecret = jsonBody.client_secret || "";
      } catch {
      }
    } else {
      const params = new URLSearchParams(bodyText);
      grantType = params.get("grant_type") || "";
      code = params.get("code") || "";
      codeVerifier = params.get("code_verifier") || "";
      clientId = params.get("client_id") || "";
      clientSecret = params.get("client_secret") || "";
    }
    if (grantType === "authorization_code") {
      const verifiedCode = verifySignedOAuthCode(code);
      if (!verifiedCode) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "invalid_grant",
          error_description: "Authorization code is invalid, expired, or tampered."
        }));
        return;
      }
      if (verifiedCode.codeChallenge) {
        const pkceValid = verifyPkce(codeVerifier, verifiedCode.codeChallenge, verifiedCode.codeChallengeMethod);
        if (!pkceValid) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            error: "invalid_grant",
            error_description: "PKCE code_verifier validation failed."
          }));
          return;
        }
      }
      const accessToken = createSignedMcpAccessToken({
        uid: verifiedCode.uid,
        email: verifiedCode.email
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 30 * 24 * 60 * 60,
        // 30 days
        email: verifiedCode.email
      }));
      return;
    }
    if (grantType === "client_credentials") {
      const expectedClientId = getMcpOAuthClientId();
      const expectedClientSecret = getMcpOAuthClientSecret();
      if (clientId === expectedClientId && safeCompare(clientSecret, expectedClientSecret)) {
        const secretToken = getMcpSecretToken();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          access_token: secretToken,
          token_type: "Bearer",
          expires_in: 365 * 24 * 60 * 60
        }));
        return;
      }
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_client" }));
      return;
    }
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unsupported_grant_type" }));
    return;
  }
  if (pathname === "/mcp" || pathname.startsWith("/mcp/")) {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers.set(k, v);
      else if (Array.isArray(v)) headers.set(k, v.join(", "));
    }
    const webReq = new Request(fullUrl.toString(), { method: req.method, headers });
    const auth = verifyMcpRequest(webReq);
    if (!auth.authenticated) {
      try {
        await setTrelloMcpLog("unauthorized", `unauth_${Date.now()}`, {
          accountId: "unauthorized",
          clientIp: auth.clientIp,
          userAgent: auth.userAgent,
          toolName: "http_connect",
          trelloMethods: [],
          params: { pathname },
          status: "UNAUTHORIZED",
          durationMs: 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch {
      }
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "Unauthorized. Access restricted to authorized users (@finnergroup.com) with valid Firebase OAuth credentials."
      }));
      return;
    }
    const mcpServer = createTrelloMcpServer(auth);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: void 0,
      enableJsonResponse: true
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Trello MCP Minimal Runner] Listening on http://0.0.0.0:${PORT}`);
});
