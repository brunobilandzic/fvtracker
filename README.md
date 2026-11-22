# FVTracker

FVTracker is a master's thesis application for managing cultivation, production, storage, procurement, employment and sales in a fruit and vegetable business.

## Local development

Use Node.js 24 and run `npm ci`. Copy `.env.example` to `.env.local`. Use a disposable development database and a fresh authentication secret, then run `npm run dev`. Registration and approved-role business writes are available in development with `DEMO_MODE=false`. Public checkout requires a session. If you want synthetic data for write testing, follow the seed procedure with a separate database and append `--development-admin` to the seed command. Use that database in the development URI. The generated administrator password is for local development.

## Environment variables

| Variable | Scope | Value |
| --- | --- | --- |
| `MONGODB_URI` | Server runtime | MongoDB connection string. On Vercel use a read-only database user scoped to the dedicated demo database. The runtime takes its database name explicitly from `DEMO_DB_NAME` in demo mode. |
| `AUTH_SECRET` | Server runtime | A random secret of at least 32 bytes. Generate separate values for Preview and Production. |
| `DEMO_MODE` | Server build and runtime | `true` for the deployed demo. Use `false` for local development. |
| `DEMO_DB_NAME` | Demo runtime and local seed | A new dedicated name such as `fvtracker_demo_portfolio`. The required prefix is `fvtracker_demo_`. |
| `DEMO_SEED_MONGODB_URI` | Local seed only | A separate initializer URI with write privileges scoped to the dedicated database. Set this in `.env.demo-seed`. |

Generate `AUTH_SECRET` privately with `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"` and store it directly in your secret manager or environment settings. `AUTH_URL` is optional. Set it for a fixed canonical origin or when testing a custom host. Keep every value above out of `NEXT_PUBLIC_*`, source control, and any public portfolio material.

## One-click demo sign-in

With `DEMO_MODE=true`, the homepage offers an existing manager account and an existing employed worker account for each of the four sectors. Copy their existing passwords from the ignored `.demo-credentials.json` file into the corresponding server environment variables. Set them privately in `.env.local` or in the applicable Vercel environment. A missing password makes that card return a safe unavailable message.

| Server variable | Seeded account |
| --- | --- |
| `DEMO_CULTIVATION_PASSWORD` | `cm` (Cultivation Manager) |
| `DEMO_PRODUCTION_PASSWORD` | `pm` (Production Manager) |
| `DEMO_WAREHOUSE_PASSWORD` | `wm` (Warehouse Manager) |
| `DEMO_FINANCIAL_PASSWORD` | `fm` (Financial Manager) |
| `DEMO_CULTIVATION_WORKER_PASSWORD` | `cwe` (employed Cultivation Worker) |
| `DEMO_PRODUCTION_WORKER_PASSWORD` | `pwe` (employed Production Worker) |
| `DEMO_WAREHOUSE_WORKER_PASSWORD` | `wwe` (employed Warehouse Worker) |
| `DEMO_FINANCIAL_WORKER_PASSWORD` | `fwe` (employed Financial Worker) |

Keep these variables server-only and keep the credentials file out of source control. Use the existing seeded database and its read-only runtime connection.

## MongoDB Atlas

1. Create an Atlas project and cluster for the demo. Choose an Atlas region close to the Vercel Function region. Use a fresh database name with the required prefix and keep the database empty until initialization.
2. Under **Database & Network Access → Database Users**, create separate database users. Grant the initializer database-scoped `readWrite` on the one demo database, including index creation and collection listing. Grant the runtime user database-scoped `read` or the `find` privilege on all collections in that database. Restrict both users to the demo cluster. Use long, independently generated passwords. Atlas exposes database-scoped access under **Specific Privileges** and **Custom Roles**. [Configure Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/) · [Atlas custom roles](https://www.mongodb.com/docs/atlas/security-add-mongodb-roles/)
3. Under **IP Access List**, temporarily allowlist your workstation IP for initialization. If your Vercel plan supports fixed egress, enable it and allowlist the Vercel egress IPs. If you must use dynamic egress and a broad Atlas allowlist, use the isolated demo-only cluster and the scoped runtime user. The automatic Atlas Vercel integration provisions a broader database role, so configure the two users manually. [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/) · [Atlas Vercel integration behavior](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
4. From **Connect → Drivers**, copy the SRV connection templates for the two users. URL-encode username and password components as needed. Keep Atlas's connection options and use the dedicated database in the URI path. When initialization is complete, revoke or remove the initializer credential and your temporary IP allowlist entry. [Atlas connection instructions](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/?interface=atlas-ui)

## Initialize synthetic data

1. Run `npm ci` with Node.js 24 from the repository root. Create the ignored file `.env.demo-seed` with the following keys and substitute the initializer URI privately.

   ```dotenv
   DEMO_DB_NAME=fvtracker_demo_portfolio
   DEMO_SEED_MONGODB_URI=
   ```

2. Run `npm run seed:demo -- fvtracker_demo_portfolio`. The command requires the database name to match the configuration. It refuses a database with existing collections, reserves the database with an initialization marker, and marks the database ready after the seed finishes. A failed run may leave a partial database. Use a new empty database and move the failed run's credential file to secure storage before retrying.
3. Move the generated `.demo-credentials.json` to a password manager or other private storage. On Windows, use a directory with restricted ACLs. Share individual credentials privately. Accounts include `gm`, `cm`, `pm`, `wm`, `fm` and workers in each department. The public demo has no administrator login. Use a worker account for a general portfolio review and share broader roles individually when needed.

## Deploy to Vercel

1. After reviewing and committing the changes, push the intended branch yourself. In Vercel, select **Add New → Project** and import the FVTracker GitHub repository. Select the repository root and the **Next.js** preset. Use Node.js **24.x**, install with `npm ci`, and build with `npm run build`. Leave Output Directory at the framework default. [Git deployment](https://vercel.com/docs/git) · [Next.js runtime](https://vercel.com/docs/frameworks/full-stack/nextjs) · [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
2. Before starting the build, add sensitive `MONGODB_URI` and `AUTH_SECRET` values and set `DEMO_MODE=true` and `DEMO_DB_NAME` under **Settings → Environment Variables** for Preview and Production. Use separate secrets for each environment. Use separate seeded databases and runtime credentials if Preview has different access requirements. Leave Vercel system environment variables enabled. [Vercel environment variables](https://vercel.com/docs/environment-variables)
3. Create a protected Preview deployment first. Sign in at `/prijava` with a low-privilege account, check that permitted data loads, and verify that unrelated records and every mutation remain inaccessible. Check the examples under Verification.
4. In **Firewall → Configure**, add a rate limit for `POST /api/auth/callback/credentials`. Start around 10 requests per minute per IP with a 429 response, adjust for shared networks, and review the traffic. Consider a shared-store per-account throttle if the site receives sustained distributed guessing. Configure the firewall before exposing a public Production URL. [Vercel WAF custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
5. Deploy the reviewed production branch or promote the preview when production variables are ready. Recheck the published HTTPS origin and verify that the session cookie is Secure, HttpOnly and SameSite=Lax. The selected Production environment should point to the ready synthetic database.

## Security audit

| Finding | Changes |
| --- | --- |
| Public seed and delete routes could overwrite data. An exported seed Server Action bypassed route checks. | The HTTP routes return 404, the Server Action was removed, and initialization moved to a local, empty-database-only command. |
| Several routes relied on UI roles or checked permissions after reading data. Other routes accepted arbitrary worker or record IDs. | Business endpoints now check the current server-side role or employment status. Sensitive paths also scope warehouse, worker, field, cultivation plan and procurement access to the caller. Two server-rendered routes now authorize before querying. |
| Authentication and error handlers logged credentials or exposed request and database details. Seed fixtures and the original README contained weak credentials. | Auth and request failures return generic errors. Password hashes are excluded from query results and serialization. The seed creates independent random passwords, and JWTs carry the account ID with role status resolved from the database. |
| Demo mode had no server-side mutation boundary. | Demo mode rejects business mutations before parsing bodies. Demo registration and checkout forms are unavailable. The only anonymous business endpoint is the shop catalog, which returns an explicit public field list. Auth.js endpoints retain their own CSRF and session handling. |
| The API client was tied to localhost, MongoDB connected during module loading, and the build relied on font downloads and empty pages. | Browser requests use the current origin, Mongoose opens and reuses a bounded pool on demand, Geist fonts are bundled, and two empty routes render 404. The Next.js server runtime remains enabled, with updated runtime dependencies. Two unused cultivation mutation handlers that called missing implementations were retired. |

### Remaining risks

- Apply the login rate limit on Vercel. Shared demonstration accounts should remain limited to synthetic data. Rotate credentials if a shared account circulates beyond the intended audience.
- Treat account and database credentials from any prior installation as exposed if they were reused, logged, or checked into history. Replace them before reuse and rotate the authentication secret to invalidate old sessions. Existing databases and prior logs require a separate review.
- This deployment is for a read-only portfolio demo. Mutable business workflows still use multi-document writes without transactions in some paths. A real-data deployment needs workflow-specific validation and concurrency review, identity lifecycle controls, and operational monitoring.
- The existing UI has React effect and memoization lint warnings. The two compiler migration rules report warnings while hook-order and immutability errors identified during preparation were corrected.
- Validate Atlas network access, Preview and Production configuration, WAF rules, and HTTPS cookies in the actual Vercel environment before making the deployment public.

### Modified files

- Authentication and authorization in `auth.js`, `lib/auth/`, `models/user/AppUser.js` and the route handlers under `app/api/`.
- Demo configuration, connection, and initialization in `lib/demoMode.js`, `lib/db/`, `seed/`, `scripts/`, `.env.example` and `.gitignore`.
- Scope and response changes in `lib/cultivation/`, `lib/warehouses/`, `lib/webstore/`, `lib/workers/`, the affected server pages, and login, navigation and checkout components.
- Build, dependencies, and tests in `app/layout.js`, `app/globals.css`, `next.config.mjs`, `eslint.config.mjs`, `package.json`, `package-lock.json` and `tests/demo-security.test.mjs`. Run `git status --short` for the complete change list.

## Verification

Run `npm run lint`, `npm run build`, and `npm audit`. To run the integration suite, point `FVTRACKER_TEST_ORIGIN` at a running, seeded local demo and run `npm run test:demo`. The suite reads `.demo-credentials.json` by default. You can override the path with `FVTRACKER_TEST_CREDENTIALS` and set `FVTRACKER_TEST_LOG` to a captured server log to check for credential exposure. The tests cover session cookies, login and logout, unauthenticated access, role boundaries, worker record scope, read-only behavior, blocked registration and maintenance, and redacted responses.

### Automated demo checks

1. Build with `DEMO_MODE=true` and run `npm run lint`. Install a Chromium browser for Playwright. The test runner tries Chrome, Edge, then Playwright Chromium. You can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to select a local executable.
2. Save `DEMO_MODE=true`, the dedicated `DEMO_DB_NAME`, and the read-only runtime `MONGODB_URI` in the ignored file `.env.demo-test`. Keep the seeded account credentials in the ignored `.demo-credentials.json`.
3. Run `npm run test:demo:e2e`. The runner checks the database marker and effective read-only permissions before starting a loopback-only Next.js server. It checks role access, discovers business write routes, runs browser toast tests, and compares a document fingerprint across demo collections before and after the run. The database user must be able to list and read those collections. To prevent unrelated demo traffic from affecting the comparison, use a dedicated seeded demo database.
4. Run `npm run test:demo:ui` for a local Playwright check with fixtures. This command uses an unreachable database target and skips checks that need real accounts or stored data.
