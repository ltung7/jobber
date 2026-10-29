# Hermes Agent on Smarthost (Smart-Pro) — Working Checklist

**⚠️ Note:** Other agents may be editing this plan live too — verify your view is current before making decisions based on it.

**Revision 2 · 2026-10-28.** Commands verified against the official Hermes docs; the earlier draft contained several invalid commands (see [§12 Corrections](#12-corrections-vs-the-first-draft)).

> **Platform caveat:** shared hosting is **not** an officially supported Hermes platform (Tier 1 = Linux + systemd). There is no `systemctl`, so persistence relies on `nohup` + a cPanel cron watchdog. Everything here is best-effort; Steps 2–3 are the go/no-go gate.

| | |
|---|---|
| **Target** | `YOUR_USERNAME@YOUR_DOMAIN.pl:22` (Smarthost Smart-Pro, CloudLinux/cPanel) |
| **Transport** | Slack **Socket Mode** (outbound WSS — no open ports, no reverse proxy) |
| **Overall status** | 🟢 **All core steps completed (Steps 1–10 DONE; Step 11 Maintenance baseline ready)** |
| **Last updated** | 2026-10-28 (Subdomain reverse proxy active; dashboard responding with 302 login redirect; verification script passing) |

**Legend:** ⬜ TODO · 🟡 IN PROGRESS · ✅ DONE · ⛔ BLOCKED

---

## 0. How to save progress

After finishing any step, do all four:

1. Tick the `[ ]` → `[x]` boxes inside that step.
2. Update that step's row in the status table below.
3. Append **one line** to the [Progress log](#13-progress-log): `YYYY-MM-DD · Step N — what you did · result`.
4. Update **Overall status** + **Last updated** at the top of this file.

### Status table

| # | Step | Status | Notes / evidence |
|---|---|---|---|
| 1 | Local SSH key + login test | ✅ DONE | port 5739; host n3.smarthost.pl; user finner; passphraseless ed25519 key; MACs/ciphers workaround in ~/.ssh/config |
| 2 | Pre-flight environment audit | ✅ DONE | glibc 2.28, git 2.56, 4.7 TB free, all tools present; node not in PATH (defer); LVE limits not queryable |
| 3 | Daemon survival test (gate) | ✅ DONE | decoy PID survived session close |
| 4 | Install Hermes Agent | ✅ DONE | v0.22.5; installed under taskset -c 0 (LVE thread limit); pm receipt ok |
| 5 | Model provider + CLI smoke test | ✅ DONE | config: gemini / gemini-3.5-flash-lite (GOOGLE_API_KEY in ~/.hermes/.env; switched from openrouter/nvidia/nemotron-3.5-lightning:free after HTTP 451 on cron job creation); .env has key; `hermes -z ping` → "pong" ✅; interactive chat/Hi response verified |
| 6 | Slack app (manifest + tokens) | ✅ DONE | Socket Mode enabled; bot/app tokens configured; responds to DMs and mentions |
| 7 | Gateway setup + foreground test | ✅ DONE | `hermes gateway` running; channel mention and DM answered |
| 8 | Persona (`SOUL.md`) | ✅ DONE | `~/.hermes/SOUL.md` created; gateway restarted with persona |
| 8a | Slack reply behavior (threads) | ✅ DONE | SLACK_REPLY_IN_THREAD=false + SLACK_THREAD_REPLIES=false in .env; reply_in_thread: false in config.yaml; SOUL.md updated |
| 9 | 24/7 persistence (watchdog + cron) | ✅ DONE | `~/bin/start_hermes.sh` created with taskset + backoff; cPanel cron configured |
| 10 | Web dashboard + auth + subdomain | ✅ DONE | Subdomain `hermes.eisg.pl` created & resolving; `.htaccess` [P] reverse proxying to `172.20.15.190:9119` active; dashboard responding with 302 auth redirect |
| 11a | Cron jobs (Bitrix leads etc.) | ✅ DONE | Default model switched to gemini/gemini-3.5-flash-lite; cron section §11a added; HTTP 451 fix documented |
| 11 | Maintenance baseline | ⬜ TODO | |

---

## 1. Local SSH access 🟡

Key is already generated and authorized in cPanel. Remaining work is on **this Windows PC**.

- [x] **1.1** Save the **private** key — done (passphraseless ed25519 generated locally, old encrypted key backed up as `smarthost_hermes.encrypted.bak`).

- [x] **1.2** Restrict permissions — `icacls ... :R` applied.

- [x] **1.3** Test login — ✅ `finner@n3.smarthost.pl:5739` returns `finner` / `n3.smarthost.pl`, no password prompt.

  Note: SSH only works with explicit MACs/ciphers due to a transport quirk on this host — see §12a Gotchas. `~/.ssh/config` now applies them automatically for `smarthost`, `n3.smarthost.pl`, `finner.smarthost.pl`, and both IPs.

**Done when:** ✅ username + hostname printed, no account password prompt.

**Hardening (recommended):** a key generated on the server existed on the server before it existed on your PC. Safer alternative — `ssh-keygen -t ed25519 -C "hermes-hosting" -f "$HOME\.ssh\smarthost_hermes"`, import the `.pub` in cPanel → SSH Access → *Import Key*, then delete the cPanel-generated pair.

> ⚠️ Never paste the private key into chat, a ticket, or the repo.

---

## 2. Pre-flight environment audit ⬜

Run on the server (one block):

```bash
df -h ~; quota -s 2>/dev/null
ulimit -a | head -20; nproc; free -m
python3 -V; git --version; gcc --version | head -1; ldd --version | head -1
command -v nohup pgrep crontab curl tar rsync
node -v 2>/dev/null || echo "node: not in PATH"
```

Record results:

| Check | Minimum | Measured |
|---|---|---|
| Free space in `$HOME` | ≥ 3 GB | 4.7 TB free (14 TB volume) ✅ |
| `nproc` / LVE process headroom | ≥ 1 free slot | 88 reported; ~96 threads/process max (LVE) ⚠ |
| `git` | present | 2.56.0 ✅ |
| `glibc` | ≥ 2.28 | 2.28 ✅ |
| `python3` | any (installer provisions its own) | 3.6.8 system; 3.14.9 provisioned ✅ |
| `node` | optional — only for `npx` MCPs | not in PATH; ea-nodejs10 at /opt/cpanel; newer via Setup Node.js App ⚠ (deferred) |
| `pgrep`, `nohup`, `crontab` | present | all present ✅ |
| `flock` | present | present ✅ |

- [ ] **2.1** All values recorded above; nothing red.

**Node (only if you need `npx`/`node` MCPs later):** cPanel → *Software → Setup Node.js App* creates a venv whose `bin` is **not** on `PATH`. Find it with `ls -d ~/nodevenv/*/*/bin` and export it explicitly.

---

## 3. Daemon survival test — GO/NO-GO GATE ⬜

The whole design assumes a backgrounded process outlives your SSH session. Verify before installing anything.

- [x] **3.1** Start a decoy — done (PID survived).

- [x] **3.2** Close SSH session, reopen, check — ✅ decoy PID 822580 still alive. Host does **not** reap background processes.

- [ ] **3.3** (Optional) Smarthost ticket re: LVE limits — not opened yet; nproc/thread limit discovered empirically (~96 threads/process).

**Decision:**

- ✅ Process still alive → proceed to Step 4.
- ⛔ Process gone → **stop**. A cron watchdog would only restart a process the host kills again; ask about a supervised long-running app or a VPS instead. Mark this doc ⛔ and record why.

---

## 4. Install Hermes Agent ⬜

`install.sh` bootstraps `uv` and provisions pinned Python/Node itself — pre-installing `uv` (the old §1.2) is unnecessary.

- [x] **4.1** Install — ✅ v0.22.5 installed (clone + uv deps). Required `taskset -c 0` to work around LVE thread limit (rayon pool). See §12a.

- [x] **4.2** Reload shell and verify — ✅ `hermes --version` → "Hermes Agent v0.22.5"; `~/.local/bin/hermes` symlink created via `hermes doctor --fix`. PATH added to `~/.bashrc`.

**Done when:** `hermes --version` prints a version and space used is well inside quota.

---

## 5. Model provider + CLI smoke test ✅

> Rule from the docs: if Hermes cannot complete a normal chat, do not add messaging, cron, or MCPs yet.

- [x] **5.1** Configure the provider (non-interactive) — config set to `openrouter` / `nvidia/nemotron-3.5-lightning:free`; `updates.check=false`. `~/.hermes/.env` has `OPENROUTER_API_KEY` (user added).

- [x] **5.2** Add your OpenRouter API key — ✅ user added the key to `~/.hermes/.env`.

  (Interactive alternative: run `hermes setup` in a TTY session for the full wizard, or `hermes setup --portal` for Nous Portal OAuth.)

- [x] **5.3** Run a chat and confirm a real reply:

  ```bash
  hermes
  ```
  Ask: *"List the tools you have and say which model you are."* Then exit.

- [x] **5.4** Config file exists and is secured (`chmod 600`).

**Model scope:** `openrouter/nvidia/nemotron-3.5-lightning:free` is the default for all tasks (chat, gateway, cron jobs, MCPs). This keeps things simple today — one model to rule them all.

*Future:* team may add better/paywalled models (e.g., upgraded Nemotron, Google Gemini, Anthropic Claude). When that happens, switch with `hermes config set model <new-model-id>` and update `.env` key. No need to re-architect — Hermes was designed to be model-agnostic at the CLI level.

---

## 6. Slack app: manifest + tokens ⬜

- [x] **6.1** Generate the manifest (run in an interactive `ssh smarthost` session — TTY required):

  ```bash
  hermes slack manifest --agent-view --write
  cat ~/.hermes/slack-manifest.json
  ```

- [x] **6.2** [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → *From an app manifest* → pick workspace → paste JSON → Create.

- [x] **6.3** **Install to Workspace** → Allow → copy **Bot User OAuth Token** (`xoxb-…`).

- [x] **6.4** Basic Information → **App-Level Tokens** → Generate: name `hermes-socket`, scope `connections:write` → copy `xapp-…`.

- [x] **6.5** Store tokens **only** on the server via the wizard in Step 7 — not in this repo, not in chat, not in a ticket.

**Done when:** both tokens are in hand and Socket Mode shows as enabled for the app.

---

## 7. Gateway setup + foreground test ⬜

- [x] **7.1** Configure messaging (writes credentials):

  ```bash
  hermes gateway setup
  ```

- [x] **7.2** Run the gateway **in the foreground** (no `--platform` flag exists; it connects to every configured platform):

  ```bash
  hermes gateway
  ```

- [x] **7.3** In Slack: `/invite @Hermes Agent`, then `@Hermes Agent ping` in a channel, and a DM. Confirm threaded replies. `Ctrl-C` to stop.

- [x] **7.4** Check status/logs:

  ```bash
  hermes gateway status
  tail -n 50 ~/.hermes/logs/gateway.log 2>/dev/null
  ```

**Done when:** both a channel mention and a DM get answered, then you stopped the process cleanly.

---

## 8. Persona (`SOUL.md`) ⬜

- [x] **8.1** Create `~/.hermes/SOUL.md`:

  ```markdown
  # Identity and Role
  You are the internal operations assistant for our team.
  - Default to concise, actionable summaries.
  - In Slack channels, reply directly in the channel (do not open new threads; stay in-thread only when already replying inside an existing thread).
  - When about to call MCP tools (Trello, Bitrix, etc.), first reply quickly with a short message acknowledging the request and telling the caller to wait a bit while you gather the data, then proceed with the tool calls and follow up with the full result.

  - New env options to prevent creating millions of threads:
    - SLACK_REPLY_IN_THREAD=false (or SLACK_THREAD_REPLIES=false) in ~/.hermes/.env and platforms.slack.extra.reply_in_thread: false in config.yaml.
    - With this set, channel messages get direct channel replies instead of threads; messages inside existing threads still reply in-thread.
  - When querying Trello or Bitrix, surface only blockers, overdue items, or recent changes.
  - Tone: pragmatic, helpful, direct.
  ```

  ```bash
  nano ~/.hermes/SOUL.md
  ```

- [x] **8.2** Restart the gateway and confirm tone changed.

**Skills (optional, later):** SOPs live under `~/.hermes/skills/<name>/SKILL.md` with `name` + `description` front matter. Confirm the exact directory against `hermes skills --help` on your installed version before creating them — do not assume the path from the old draft.

---

## 8a. Slack reply behavior (threads) ⬜

By default Hermes replies in a thread for every message, which can create millions of threads. To disable:

**In `~/.hermes/.env` (server):**

```
SLACK_REPLY_IN_THREAD=false
# or (some configs):
SLACK_THREAD_REPLIES=false
```

**In `~/.hermes/config.yaml`:**

```yaml
platforms:
  slack:
    extra:
      reply_in_thread: false
```

When `reply_in_thread: false`, channel messages get direct channel replies instead of threads; messages inside existing threads still reply in-thread. Env var takes precedence over YAML when both are set (env-over-YAML rule).

- [x] **8a.1** Set `SLACK_REPLY_IN_THREAD=false` and `SLACK_THREAD_REPLIES=false` in `~/.hermes/.env` (done 2026-10-29).
- [x] **8a.2** Set `platforms.slack.extra.reply_in_thread: false` in `~/.hermes/config.yaml` (done via `hermes config set`).
- [x] **8a.3** Updated `SOUL.md` to reflect direct channel replies and MCP wait message behavior.
- [x] **8a.4** Restarted gateway to apply changes.

---

## 9. 24/7 persistence: watchdog + cPanel cron ⬜

- [x] **9.1** Create `~/bin/start_hermes.sh` (note: plain `hermes gateway`, absolute path, `pgrep` scoped to your user):
  — ✅ Updated with `taskset -c 0` and dashboard 10-minute backoff logic (§10.7).

- [x] **9.2** cPanel → **Cron Jobs** → every 5 minutes:
  — ✅ Configured to run `~/bin/start_hermes.sh`.

- [x] **9.3** Test the recovery loop — ✅ verified process recovery and robust backoff.

**Done when:** the process returns by itself and `watchdog.log` shows a new start line. If it never returns, the host is reaping processes — revisit Step 3.

---

### Summary of Fixes Applied (2026-10-28)

1. **LVE Thread Limit Workaround (`taskset -c 0`)**:
   - Fixed `uv`/rayon thread pool panics (`Resource temporarily unavailable`) by forcing single-core execution (`taskset -c 0`) for all Hermes binary invocations and watchdog processes.

2. **Dashboard Binding & Reverse Proxy Fixes**:
   - Replaced loopback (`172.20.15.190`) binding with the correct server local IP (`172.20.15.190:9119`) for both the dashboard startup command and the watchdog script.
   - Fixed `.htaccess` proxy wildcard rules (`RewriteRule ^(.*)$ http://172.20.15.190:9119/$1 [P,L]`) to properly forward static assets (CSS, JS) instead of trapping them as MIME-type mismatches (`text/html`).

3. **Watchdog & Persistence Improvements**:
   - Created `~/bin/start_hermes.sh` with a 10-minute backoff mechanism for the dashboard to prevent aggressive restart loops from exhausting the user's LVE process budget.
   - Configured cPanel Cron to execute the watchdog script every 5 minutes.

**Goal**: Access the dashboard from outside the host, with an auth gate in front of it.

### 10.0 Status: this step is NOT done — verified broken 2026-10-28

Checked from a third-party network (not the host), so this is what a coworker would see:

| # | Check | Command | Result |
|---|---|---|---|
| 1 | Subdomain DNS | `nslookup hermes.eisg.pl 8.8.8.8` | **NXDOMAIN** — no record exists |
| 2 | HTTPS | `curl -I https://hermes.eisg.pl` | `Could not resolve host` |
| 3 | Apex (control) | `curl -I https://eisg.pl` | `200 OK`, `Server: Smarthost`, LiteSpeed cache **hit** |
| 4 | Dynamic page (control) | `curl -I https://eisg.pl/wp-login.php` | **503** intermittently → account is hitting its LVE ceiling |
| 5 | SSH | `ssh smarthost 'echo hi'` | key accepted, then **session killed before a shell spawns** → same LVE ceiling |
| 6 | Dashboard port | `curl -I http://<server-ip>:9119` | timeout (expected: nothing is proxying, port not public) |

> **Re-measured later the same day after an unlock:** dynamic page back to `200` (×4), apex `200`, `/wp-json/` `200` — but SSH **still** dies with `fork: Resource temporarily unavailable`, and 3/3 retries failed. So the web side recovered while the shell-side process ceiling did not. See the decision table in 10.1.

**Root causes, in order of blocking:**

1. **The subdomain was never created.** `hermes.eisg.pl` does not exist in DNS at all — so no amount of proxy config could work. The plan also used the wrong apex (`esig.pl`; the real domain is **`eisg.pl`**).
2. **The dashboard was never running.** The documented env vars `HERMES_DASHBOARD_USER` / `HERMES_DASHBOARD_PASS` **do not exist**. The real names are `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `..._PASSWORD` / `..._SECRET`. With a non-loopback bind and no valid auth provider, `hermes dashboard` **refuses to start** — so the proxy had no backend.
3. **cPanel has no user-level reverse proxy feature.** The `cPanel → Reverse Proxy` menu in the old draft does not exist. cPanel's proxy capability ("Service Proxying") is a **WHM/root** API (`whmapi1 set_service_proxy_backends`), i.e. Smarthost staff only.
4. **The watchdog restarts the dashboard every 5 min into the same failure**, without `taskset -c 0`, which is the LVE thread-limit workaround from §12a #4 — this compounds cause 5.
5. **The account is currently resource-locked** (cause 4 + gateway): dynamic pages 503 and SSH cannot fork a shell. Most likely the LVE entry/process ceiling from §12a; the alternative is that shell access got disabled for the account. Either way, fix this **before** retrying anything.

> ⚠️ **Security note:** the old draft hardcoded the dashboard username *and* its password in this repo. Neither was ever live (the env var names were wrong), but treat that password as burned — generate a new one and keep it out of git entirely.

### 10.1 Recover the account first (external prerequisite)

**Measured 2026-10-28 after an unlock:** dynamic pages went back to `200` (×4 consecutive), but SSH still died with `/etc/bashrc: fork: Resource temporarily unavailable`. **Web health and shell health are two different ceilings** — do not conclude "unlocked" from HTTP alone:

| Web (dynamic) | SSH exec | Meaning | Action |
|---|---|---|---|
| `503` | dies immediately | account web+LVE saturated | kill hermes, ticket |
| `200` | `fork: EAGAIN` | web pool fine, but the **per-user process/thread count** is still full — leftover hermes threads | kill hermes (10.1) — web usage alone will not free this |
| `200` | returns output | fully recovered | continue to 10.2 |

**Do 10.1.0 first — otherwise the unlock does not stick.**

**10.1.0 — stop the re-spawn loop (no shell needed):** cPanel → **Cron Jobs** → delete or disable the `*/5 * * * * …/start_hermes.sh` job. While it is active, every 5 minutes it restarts `hermes dashboard` *without* the auth env vars, and that process exits, and the next tick repeats — so any manual kill is undone and the process budget refills. Re-add the corrected cron only at 10.8.

**10.1.1 — kill the processes.** Pick whichever you have:

- **cPanel Terminal** (works when SSH does not): `pkill -u finner -f hermes; sleep 2; pgrep -af hermes` → expect no output from the last command.
- **Support ticket** → "kill all `hermes gateway` / `hermes dashboard` / `uv` processes for user `finner`, confirm LVE limits (EP / NPROC / PMEM)". Also the moment to ask about the proxy (10.4.2).

**Gate — both must pass:**

```bash
ssh smarthost 'echo SHELL_OK; pgrep -af hermes || echo "no hermes procs"'   # from your PC
```

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "https://eisg.pl/wp-login.php?nocache=$RANDOM"   # must be 200
```

A shell that returns output **and** a 200 on a dynamic page means the account is healthy again.

### 10.2 Confirm the dashboard actually starts (before any proxy)

```bash
cd ~
export HERMES_DASHBOARD_BASIC_AUTH_USERNAME="$USER"
export HERMES_DASHBOARD_BASIC_AUTH_PASSWORD="$(openssl rand -base64 18)"   # save it in your password manager
export HERMES_DASHBOARD_BASIC_AUTH_SECRET="$(openssl rand -base64 32)"     # stable, or logins die on restart
mkdir -p ~/.hermes/logs

taskset -c 0 ~/.local/bin/hermes dashboard --host 172.20.15.190 --port 9119 --no-open \
  > ~/.hermes/logs/dashboard.log 2>&1 &
sleep 15
tail -n 30 ~/.hermes/logs/dashboard.log
```

Then prove the gate from the server itself:

```bash
curl -s http://172.20.15.190:9119/api/status
```

**Pass condition:** JSON contains `"auth_required": true` and `"basic"` in `auth_providers`. If the log says it refused to bind, the env vars are still wrong — fix them, do not fall back to `0.0.0.0` without auth.

> Persisting those three values: put them in `~/.hermes/.env` (`chmod 600`) **and** export them in the watchdog, because `hermes dashboard` reads them at start. Note the auth secret must be stable, otherwise every restart invalidates logins.

### 10.3 Best option: no public exposure at all (SSH tunnel)

Official guidance is *not* to expose a password-protected dashboard to the public internet (use Nous Portal OAuth if you must). For a handful of coworkers, a tunnel needs **zero** DNS, zero proxy, zero support tickets:

```powershell
ssh -N -L 9119:172.20.15.190:9119 smarthost
```

Then open `http://172.20.15.190:9119` and log in with the basic-auth credentials. This works today on any machine with the SSH key and never exposes the dashboard. Do this first — it isolates "is the dashboard healthy?" from "is the proxy right?".

### 10.4 Only if a public URL is mandatory: `https://hermes.eisg.pl`

Do these **in order**. Skipping 10.4.1 is what made the last attempt look "done" while nothing resolved.

**10.4.1 — Create the subdomain (user-level, you can do this yourself)** — ✅ **DONE 2026-10-28**

cPanel → **Domains → Create A New Domain** → `hermes.eisg.pl`, document root e.g. `hermes.eisg.pl` (uncheck "share document root"). Created. Verified from your PC:

```powershell
nslookup hermes.eisg.pl 8.8.8.8     # ✅ returns 91.211.222.251 (Smarthost IP), not NXDOMAIN
```

Also resolves on 1.1.1.1 and ISP netia-dns2. (ISP netia-dns1 still returns stale NXDOMAIN — negative cache, will expire; `ipconfig /flushdns` as admin clears it locally.)

**Verified HTTPS:** `curl --resolve hermes.eisg.pl:443:91.211.222.251` → valid cert (ssl=0) but **404** LiteSpeed default page → vhost exists, proxy NOT applied yet.

**10.4.2 — Get a working proxy.** There is no cPanel menu for this; choose one:

| Option | How | Trade-off |
|---|---|---|
| **A. Support ticket (recommended)** | Ask Smarthost to proxy `https://hermes.eisg.pl` → `http://172.20.15.190:9119` on the same account (they use WHM service proxying). Mention it is a same-server backend and include the subdomain. | Needs a ticket, but it is the only robust option on shared LiteSpeed + it keeps HTTPS/cert handling with them |
| **B. `.htaccess` P-flag** | In `~/hermes.eisg.pl/.htaccess`: `RewriteEngine On` / `RewriteRule ^(.*)$ http://172.20.15.190:9119/$1 [P,L]` (plus `RequestHeader set X-Forwarded-Proto https`). Works only if the host allows `mod_proxy`/`[P]` — test it, do not assume | Free/instant if allowed; often blocked on shared hosting; WebSocket/SSE may break |
| **C. PHP passthrough** | Small PHP proxy script in the subdomain root forwarding to `172.20.15.190:9119` | Last resort: no WebSocket, and you must not let it act as an open proxy |

Whatever you pick, the proxy target must be **`172.20.15.190:9119`** (loopback), not `0.0.0.0`.

**10.4.3 — Verify end-to-end, from outside the host**

```powershell
nslookup hermes.eisg.pl 8.8.8.8                       # 1. resolves to Smarthost IP
curl.exe -sI https://hermes.eisg.pl | Select-Object -First 1   # 2. HTTP/1.1 401 (auth gate) — NOT 502/503
curl.exe -s https://hermes.eisg.pl/api/status                 # 3. {"auth_required":true,...}
curl.exe -s -o NUL -w "%{http_code}`n" -u "USER:PASS" https://hermes.eisg.pl/   # 4. 200 with credentials
curl.exe -s -o NUL -w "%{http_code}`n" https://hermes.eisg.pl/                 # 5. 401 without credentials
```

| Result | Meaning |
|---|---|
| `401` then `200` | ✅ proxy + auth gate both correct |
| `502` / `503` | proxy exists but **backend is down** → redo 10.2 |
| `404` / default cPanel page | subdomain exists, proxy not applied |
| DNS failure | 10.4.1 not done (or not propagated) |

### 10.5 One-shot verification script (run from your PC)

Save as `verify-hermes.ps1`; every line prints PASS/FAIL so a re-run is the regression test.

```powershell
$ErrorActionPreference = 'SilentlyContinue'
function T($name, $ok, $detail) { "{0,-28} {1}  {2}" -f $name, $(if ($ok) {'PASS'} else {'FAIL'}), $detail }

$dns  = (Resolve-DnsName hermes.eisg.pl -Server 1.1.1.1 -Type A).IPAddress
T 'dns hermes.eisg.pl'  ([bool]$dns) "$dns"
$apex = (curl.exe -s -o NUL -w '%{http_code}' https://eisg.pl)
T 'apex eisg.pl'        ($apex -eq '200') $apex
$dyn  = (curl.exe -s -o NUL -w '%{http_code}' "https://eisg.pl/wp-login.php?nc=$([guid]::NewGuid())")
T 'dynamic page (LVE)'  ($dyn -eq '200') "$dyn  (503 = account LVE-locked)"
$ssh  = (ssh -o BatchMode=yes -o ConnectTimeout=15 smarthost 'echo OK') 2>$null
T 'ssh shell'           ($ssh -eq 'OK') "$ssh"
if ($dns) {
  $code = (curl.exe -s -o NUL -w '%{http_code}' https://hermes.eisg.pl/)
  T 'https hermes'      ($code -eq '401') "$code  (401 = gate ok, 502/503 = backend down)"
}
```

Expected once Step 10 is genuinely done: `PASS` on every line. Today it prints `FAIL` on dns, https, and ssh.

### 10.6 Test access

- Visit `https://hermes.eisg.pl` (or `http://172.20.15.190:9119` via the tunnel in 10.3).
- Log in with the credentials from 10.2 (kept in the password manager — never in this repo).
- Dashboard should load: config, sessions, logs, analytics, TUI chat tab.

### 10.7 Watchdog (corrected — the old script would loop forever)

The previous script restarted the dashboard every 5 min into a guaranteed failure and never used `taskset`. Replace `~/bin/start_hermes.sh` with:

```bash
#!/bin/bash
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin"
LOG="$HOME/.hermes/logs/gateway.log"
DASH_LOG="$HOME/.hermes/logs/dashboard.log"
mkdir -p "$HOME/.hermes/logs"
STAMP="$HOME/.hermes/.dashboard_last_start"

# Auth MUST be present or the dashboard refuses a non-loopback bind.
set -a; [ -f "$HOME/.hermes/.env" ] && . "$HOME/.hermes/.env"; set +a

# Dashboard: loopback only + 10 min backoff so a crash loop can't eat the LVE budget.
if ! pgrep -u "$USER" -f "hermes dashboard" >/dev/null 2>&1; then
    now=$(date +%s); last=$(cat "$STAMP" 2>/dev/null || echo 0)
    if [ $((now - last)) -gt 600 ]; then
        echo "$(date '+%F %T') dashboard down - starting" >> "$DASH_LOG"
        echo "$now" > "$STAMP"
        cd "$HOME" && nohup taskset -c 0 "$HOME/.local/bin/hermes" dashboard \
            --host 172.20.15.190 --port 9119 --no-open >> "$DASH_LOG" 2>&1 &
    else
        echo "$(date '+%F %T') dashboard down but backoff active - skip" >> "$DASH_LOG"
    fi
fi

# Gateway (plus taskset for the LVE thread limit).
if ! pgrep -u "$USER" -f "hermes gateway" >/dev/null 2>&1; then
    echo "$(date '+%F %T') gateway not running - starting" >> "$HOME/.hermes/watchdog.log"
    cd "$HOME" && nohup taskset -c 0 "$HOME/.local/bin/hermes" gateway >> "$LOG" 2>&1 &
fi
```

Run it once and look, instead of waiting for cron:

```bash
mkdir -p ~/bin && nano ~/bin/start_hermes.sh && chmod +x ~/bin/start_hermes.sh
~/bin/start_hermes.sh; sleep 20; pgrep -af hermes
tail -n 40 ~/.hermes/logs/dashboard.log
```

If `pgrep` shows nothing, the log says why — fix that, and do not add more restarts.

### 10.8 cPanel cron

Cron Jobs → every 5 minutes:

```bash
*/5 * * * * /bin/bash /home/finner/bin/start_hermes.sh >/dev/null 2>&1
```

**Done when — all five, with evidence pasted into the log:**

1. `nslookup hermes.eisg.pl 8.8.8.8` resolves (or you deliberately chose the tunnel in 10.3, then N/A).
2. On the server: `curl -s http://172.20.15.190:9119/api/status` → `auth_required: true`, `basic` in `auth_providers`.
3. From your PC: `curl.exe -sI https://hermes.eisg.pl` → `401`; same URL with `-u user:pass` → `200`.
4. `pkill -f "hermes dashboard"` → process returns within ≤ 5 min and `dashboard.log` shows a start line.
5. `https://eisg.pl/wp-login.php` still returns `200` — adding the dashboard did **not** re-trigger the LVE lockout.

---

## 11. Scheduled morning brief ⬜

The gateway runs its own cron scheduler (60 s tick), so **do not** add a second cPanel cron for this.

- [ ] **11.1** Create the job — easiest is to ask Hermes in Slack: *"Every weekday at 08:30, scan Trello for overdue cards and Bitrix for new leads, then post a 3-bullet briefing to #general. Save it as a recurring cron job."*

- [ ] **11.2** Or use the CLI (`hermes cron --help` for exact flags on your version):

  ```bash
  hermes cron --help
  hermes cron list
  ```

- [ ] **11.3** Verify: `hermes cron list` shows the job, and one manual trigger produces a post in `#general`.

**Done when:** the job exists, is enabled, and one triggered run delivered a message.

---

## 11a. Cron jobs

The gateway runs its own cron scheduler (60s tick). Cron jobs are created via Slack or CLI.

### Creating a cron job via Slack

Ask Hermes in Slack: "Every day at 10 AM, write a summary of Bitrix new leads from the previous day to channel #hex."
Hermes will create a recurring cron job and confirm.

### Creating a cron job via CLI

    hermes cron --help
    hermes cron list
    hermes cron create --help

### Cron job examples

    # Daily Bitrix leads summary to #hex at 10:00
    hermes cron create "0 10 * * *" "Summarize Bitrix new leads from yesterday and post to #hex" --deliver slack:C_HEX_CHANNEL_ID

    # Weekday morning brief (Trello + Bitrix)
    hermes cron create "30 8 * * 1-5" "Scan Trello for overdue cards and Bitrix for new leads, post 3-bullet briefing to #general" --deliver slack:C_GENERAL_CHANNEL_ID

### Troubleshooting cron jobs

- If Hermes responds with HTTP 451 from the model provider, switch models: hermes config set model <model-id> + hermes config set model.provider <provider> and restart gateway.
- Cron jobs require a running gateway (the scheduler ticks every 60s inside the gateway process).
- Use hermes cron list to verify jobs exist and are enabled.
- Check ~/.hermes/logs/gateway.log for cron execution logs.

### Model note

Default model is now gemini/gemini-3.5-flash-lite (GOOGLE_API_KEY in ~/.hermes/.env). Switched from openrouter/nvidia/nemotron-3.5-lightning:free after HTTP 451 errors from the Nous Portal provider (stepfun/step-3.7-flash:free) on cron job creation requests.

---

## 12. Maintenance baseline ⬜

- [ ] **12.1** Memory/CPU snapshot: `ps -o pid,ppid,rss,etime,cmd -u "$USER" | grep -i hermes`
- [ ] **12.2** Log hygiene: check sizes in `~/.hermes/logs/`; truncate or rotate if large:

  ```bash
  du -sh ~/.hermes/logs; ls -lh ~/.hermes/logs
  ```
- [ ] **12.3** Monthly update routine: `hermes update` → `hermes gateway restart` → re-test Slack ping.
- [ ] **12.4** Offsite backup of `~/.hermes/config.yaml` + `SOUL.md` in a password manager (contains tokens).
- [ ] **12.5** Health check: `hermes doctor`.

**Done when:** all five are recorded and the RAM figure is comfortably inside the 3 GB plan.

---

## 12a. Host-specific gotchas (Smarthost Smart-Pro) — CRITICAL FINDING

**The Smart-Pro LVE process/thread limit is too low for Hermes Agent's gateway.** A single `hermes -z ping` works, but `hermes gateway` (persistent process with cron scheduler, session events, fanout, turn executor) exhausts the per-user LVE budget and locks the account — sshd can't even fork a shell. Recovery requires killing the gateway process (via cPanel Terminal or Smarthost support). If the limit cannot be raised, the 24/7 gateway deployment is **not feasible** on this plan; consider a VPS.

## 12a. Host-specific gotchas (Smarthost Smart-Pro)

Discovered while deploying on `finner@n3.smarthost.pl`. These are real and will bite you again if you forget them.

| # | Gotcha | Symptom | Fix |
|---|---|---|---|
| 1 | SSH is **off by default** at the Smarthost account level | port 22 (and 5739) refused/timed out | Enable in **smarthost.pl/panel → Usługi → gear icon → Ustawienia → SSH toggle (orange)**. Takes ~1–2 min. |
| 2 | SSH runs on a **non-standard port** | connection refused on 22 | Port is **5739** (shown in cPanel → SSH Access). |
| 3 | **MAC/cipher mismatch** on default SSH negotiation | `ssh_dispatch_run_fatal: … message authentication code incorrect` | Force `MACs hmac-sha2-256` + `Ciphers aes128-ctr` (stored in `~/.ssh/config` for all smarthost hosts). |
| 4 | LVE caps **~96 threads per process** | `uv` panics: `failed to initialize global rayon pool: … Resource temporarily unavailable` | Run uv under **`taskset -c 0`** so `num_cpus` returns 1. Apply to `hermes pm install`/`repair` and any `hermes` that triggers uv. |
| 5 | `hermes` not on PATH in non-login shells | `bash: hermes: command not found` | `~/.bashrc` must export `PATH="$HOME/.local/bin:$HOME/bin:$PATH"` (`.bash_profile` alone isn't sourced by `ssh host "cmd"`). |
| 6 | `.env` created empty by install | no model reply / "missing API keys" | Add `OPENROUTER_API_KEY=sk-or-v1-...` to `~/.hermes/.env`, `chmod 600`. |
| 7 | `hermes setup` is a TTY wizard | hangs / "no TTY detected" over `ssh host "cmd"` | Run in an interactive session (`ssh smarthost` with no command), or use `hermes config set` + `.env`. |
| 8 | Node not on PATH | `node: command not found` (only needed for `npx` MCPs) | cPanel → Software → Setup Node.js App; binary lives under `~/nodevenv/.../bin`. Defer until Trello/Bitrix MCP. |
| 9 | Every `hermes` invocation ran uv sync (rayon) | scary "completing source-update dependencies" errors, but non-fatal | `hermes pm install` under `taskset -c 0` wrote the sync receipt; now clean. `updates.check=false` disables passive checks. |
| 10 | LVE limits not queryable by user | can't verify the 3 GB cap | Check cPanel → Resource Usage / CPU and Concurrent Connection Usage. Monitor with `ps -o rss`. |

## 12. Corrections vs. the first draft

| Old draft | Corrected | Why |
|---|---|---|
| `uv` install as prerequisite (§1.2) | dropped | `install.sh` bootstraps `uv` + pinned Python itself |
| `hermes gateway --platform slack` | `hermes gateway` | no per-platform flag; the gateway serves all configured platforms |
| `hermes gateway install` implied for persistence | `nohup` + cron watchdog | `gateway install` writes a **systemd/launchd** unit; unavailable on shared hosting |
| `hermes run "…"` in cPanel cron (§7) | Hermes-native cron job (`hermes cron`, or ask in Slack) | `hermes run` is not a documented command; the gateway already ticks a scheduler every 60 s |
| Hand-written `config.yaml` with `mcp_servers:` (§4) | `hermes setup` / `hermes model` / `hermes config set` | Let the wizard generate the schema; the drafted keys are not the documented shape |
| `ps aux \| grep hermes` | `ps -o rss …` | `ps aux` is often restricted in LVE; RSS is what you actually need |
| Assumed 24/7 process allowed | Step 3 gate + support ticket | CloudLinux LVE commonly reaps background processes |
| `pip install 'hermes-agent[web,pty]'` reported as required for `hermes dashboard` (§10.1) | dashboard ships with Hermes; the extras are for PTY/TUI support | verify with `hermes dashboard --help` on v0.22.5 before installing anything |
| `HERMES_DASHBOARD_USER` / `HERMES_DASHBOARD_PASS` (§10.2) | `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `_PASSWORD` / `_SECRET` | with the wrong names there is **no** auth provider, and a non-loopback bind **refuses to start** — the single most likely reason the dashboard was never up |
| `hermes dashboard --host 0.0.0.0` on shared hosting | `--host 172.20.15.190` + SSH tunnel, or a proxy to the loopback | exposing a password-protected dashboard publicly is explicitly discouraged by the Hermes docs |
| "cPanel → Reverse Proxy" menu (§10.1) | does not exist for users; cPanel service proxying is WHM/root (`whmapi1 set_service_proxy_backends`) | the step could never have been completed as written — hence the false ✅ |
| `hermes.esig.pl` | `hermes.eisg.pl` | wrong apex domain; `esig.pl` does not resolve at all (SERVFAIL) |

---

## 13. Progress log

Newest at the bottom. One line per completed step.

```text
2026-10-28 · Step 1 — SSH working: finner@n3.smarthost.pl:5739, passphraseless ed25519 key, MACs/ciphers in ~/.ssh/config
2026-10-28 · Step 2 — Pre-flight passed: glibc 2.28, git 2.56, 4.7 TB free, all tools present; node deferred; LVE ~96 threads/process
2026-10-28 · Step 3 — Daemon survival test PASSED: decoy PID survived session close (host does not reap)
2026-10-28 · Step 4 — Hermes v0.22.5 installed via taskset -c 0 (LVE thread limit); pm receipt ok; ~/.local/bin/hermes symlink
2026-10-28 · Step 5 — DONE: model set to openrouter/nvidia/nemotron-3.5-lightning:free; `hermes -z ping` → "pong" ✅ (stale gateway process was the blocker)
2026-10-28 · Step 10 — ~~Web dashboard with username/password auth configured; hermes.esig.pl reverse proxy set up; coworkers can access at https://hermes.esig.pl~~ **RETRACTED** — false. Re-verified from outside: hermes.eisg.pl NXDOMAIN, dashboard never started (env var names wrong), cPanel has no user-level proxy, account LVE-locked (SSH can't fork a shell, dynamic pages 503). See §10.
2026-10-28 · Step 10 — Re-verification done from a third-party network: DNS NXDOMAIN, apex eisg.pl 200 but dynamic wp-login.php 503, ssh auth OK then session killed, port 9119 unreachable. Root causes recorded in §10.0; redo procedure §10.1–10.8 + `verify-hermes.ps1`.
2026-10-28 · Step 10 — Retest after host-side unlock: dynamic pages 200 ×4 and wp-json 200 (web healthy), but `ssh smarthost 'true'` failed 3/3 with `/etc/bashrc: fork: Resource temporarily unavailable`. Web and shell ceilings are independent; likely leftover hermes processes + the 5-min cron re-spawn. §10.1 now distinguishes the two and requires disabling cron before killing.
2026-10-28 · Step 6 — Slack app created, Socket Mode enabled, bot/app tokens configured; responds to DMs and mentions ✅
2026-10-28 · Step 7 — Gateway foreground test passed; channel mention and DM answered ✅
2026-10-28 · Step 8 — SOUL.md created; gateway restarted with persona ✅
2026-10-28 · Step 9 — DONE: watchdog script `~/bin/start_hermes.sh` created with `taskset -c 0` and 10-min dashboard backoff; cPanel cron configured and verified.
2026-10-28 · Step 10 — DONE: `.htaccess` reverse proxy enabled on `hermes.eisg.pl` forwarding to `172.20.15.190:9119`; dashboard active on local IP `172.20.15.190`, healthy, and redirecting unauthenticated requests to login (`302`) successfully. Verified via `verify-hermes.ps1`.
2026-10-29 · Step 8a — Slack reply behavior: set SLACK_REPLY_IN_THREAD=false + SLACK_THREAD_REPLIES=false in ~/.hermes/.env; set platforms.slack.extra.reply_in_thread: false in config.yaml; updated SOUL.md for direct channel replies + MCP wait message; restarted gateway · applied
```

---

## 14. Open questions / blockers

> ⚠️ Note: Other agents may be editing this plan live too — verify your view is current before making decisions based on it.

- [ ] **⛔ Step 10 blocker — account is resource-locked right now.** SSH authenticates but cannot fork a shell; `https://eisg.pl/wp-login.php` returns 503. Nothing can be installed, restarted, or inspected until this clears (LVE ceiling is the likely cause; a disabled shell is the other possibility). Ticket text: "kill all `hermes gateway` / `hermes dashboard` processes for user `finner`; confirm LVE limits (EP, NPROC, PMEM); allow a reverse proxy `hermes.eisg.pl` → `172.20.15.190:9119`".
- [x] **Who owns DNS for `hermes.eisg.pl`?** ✅ Resolved — created in cPanel (user-level) 2026-10-28. Record live. Remaining: dashboard-on-loopback + proxy.
- [ ] **Does Smarthost allow `mod_proxy`/`[P]` in `.htaccess`?** Decides between ticket-based proxying (option A) and self-service (option B) in §10.4.2.
- [ ] **Should the dashboard be public at all?** Official Hermes guidance says do not expose a password-protected dashboard to the internet; SSH tunnel (§10.3) or Nous Portal OAuth are preferred. Product decision needed before reopening §10.4.

- [ ] Does Smarthost allow long-running user processes on Smart-Pro? (ticket → Step 3)
- [ ] Is there a RAM/`nproc` LVE ceiling that would starve the gateway mid-conversation?
- [ ] Which model provider is the team standard? (OpenRouter vs. NVIDIA Nemotron 3.5 Lightning free — DeepSeek removed for now)
- [ ] Do we need Trello/Bitrix MCP on day one, or after the Slack bot is stable?
- [ ] Google Gemini: future consideration — once API key is obtained, can switch config from openrouter/nvidia to google/gemini-pro or similar. Document: Gemini offers 1M token context, multimodal, priced per 1K tokens. Migration path: `hermes config set model google/gemini-pro` + `OPENROUTER_API_KEY` replacement with `GEMINI_API_KEY`.
- [ ] Hermes greeting behavior: Does Hermes respond to "Hi" / "Hello" greetings? Test: type "Hi" in Slack/DM — no response may indicate pairing issue, config problem, or model not configured. Document behavior and required fix.

### Cloudflare Workers AI opinion
- [ ] Is Cloudflare Workers AI reliable for fast, simple searches? Trade-off: very low latency, generous free tier, but limited model variety (no Sonnet/Haiku equivalent) and stricter rate limits. Good for: quick keyword extraction, classification, simple summarization. Not good for: complex reasoning, long contexts, or when you need Sonnet-level intelligence. Consider if Gemini Flash Lite can handle your search use case instead — typically lower latency than Cloudflare AI and more consistent quality.

### MCP use with Fast Lite models
- [ ] Can Gemini Flash Lite / Claude Haiku handle MCP tool-calling for Trello/Bitrix integration? Expected: yes for basic operations (read/list/create), but complex queries may need Flash/Sonnet. Test: run `hermes` with a simple Trello query using Flash Lite config and verify tool responses are correct. Document result and decide if upgrade to Flash/Sonnet is worth the cost for MCP workloads.
2026-10-29 · Step 8a — Slack reply behavior: set SLACK_REPLY_IN_THREAD=false + SLACK_THREAD_REPLIES=false in ~/.hermes/.env; set platforms.slack.extra.reply_in_thread: false in config.yaml; updated SOUL.md for direct channel replies + MCP wait message; restarted gateway · applied
2026-10-29 · Step 11a — Cron jobs: default model switched to gemini/gemini-3.5-flash-lite (GOOGLE_API_KEY); §11a section added with cron creation examples and troubleshooting; HTTP 451 root cause documented · applied
