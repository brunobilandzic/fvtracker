import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { signIn } from "./demo-session.mjs";
import api, { interceptDemoWrites, isDemoWriteBlocked } from "../lib/api.js";

const origin = process.env.FVTRACKER_TEST_ORIGIN;
assert(origin && new URL(origin).hostname === "127.0.0.1", "Use the local demo test runner");
const mocked = process.env.FVTRACKER_TEST_MOCK === "true";
const title = "Demonstracijski na\u010din rada";
const message = "Izmjene podataka nisu dopu\u0161tene u demo verziji.";
const readMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const fixture = {
  "/api/products": { products: [] },
  "/api/workers": { workers: [] },
  "/api/procurments": { procurments: [] },
  "/api/harvesting-batches": { harvestingBatches: [] },
  "/api/facilities": { facilities: [{
    _id: "sample-facility", name: "Sample facility", slug: "sample-facility",
    description: "Demo fixture", volume: 10, stocks: [],
  }] },
  "/api/cultivation/plant": { mainTypes: [], generalTypes: [], types: [], varieties: [] },
};
let browser;

before(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const options = executablePath ? [{ executablePath }] : [{ channel: "chrome" }, { channel: "msedge" }, {}];
  for (const option of options) {
    try {
      browser = await chromium.launch(option);
      return;
    } catch {
      // Try the next installed Chromium browser.
    }
  }
  throw new Error("Install Chrome, Edge or Playwright Chromium, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE");
});

after(async () => {
  await browser?.close();
});

async function checkPage({ account, mobile = false } = {}, run) {
  const context = await browser.newContext({
    baseURL: origin,
    viewport: mobile ? { width: 320, height: 700 } : { width: 1280, height: 800 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const writes = [];
  let pageErrors = 0;
  let dialogs = 0;
  try {
    if (account && !mocked) await signIn(context.request, account);
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on("pageerror", () => pageErrors++);
    page.on("dialog", async dialog => {
      dialogs++;
      await dialog.dismiss();
    });
    await page.route("**/api/**", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (!readMethods.has(request.method()) && !path.startsWith("/api/auth/")) {
        writes.push(request.method());
        await route.abort();
      } else if (mocked) {
        await route.fulfill({ json: fixture[path] ?? null });
      } else {
        await route.continue();
      }
    });
    await run(page);
    assert.deepEqual(writes, [], "UI must stop before sending a business write request");
    assert.equal(pageErrors, 0, "Browser reported a page error");
    assert.equal(dialogs, 0, "Demo actions must use the toast without opening native dialogs");
  } finally {
    await context.close();
  }
}

function status(page) {
  return page.locator('[role="status"][aria-atomic="true"]');
}

async function seeToast(page) {
  const toast = status(page);
  await toast.getByText(message, { exact: true }).waitFor({ state: "visible" });
  assert.equal(await toast.getByText(title, { exact: true }).count(), 1);
  assert.equal(await toast.getAttribute("aria-live"), "polite");
}

test("mobile create produces one viewport-safe toast for four seconds", async () => {
  await checkPage({ account: "pm", mobile: true }, async (page) => {
    await page.goto("/postrojenja");
    await page.getByRole("button", { name: "Dodaj postrojenje", exact: true }).tap();
    const started = Date.now();
    await seeToast(page);
    const box = await status(page).boundingBox();
    assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 320 && box.y + box.height <= 700,
      "Toast must fit the 320px viewport. Bounds: " + JSON.stringify(box));
    await page.getByRole("button", { name: "Dodaj postrojenje", exact: true }).tap();
    await seeToast(page);
    assert.equal(await page.getByText("Novo postrojenje", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Uredi postrojenje", { exact: true }).count(), 0);
    await status(page).getByText(title, { exact: true }).waitFor({ state: "hidden", timeout: 5000 });
    const elapsed = Date.now() - started;
    assert(elapsed >= 3500 && elapsed <= 4800, "Expected one four-second toast");
  });
});

for (const label of ["Uredi", "Obri\u0161i"]) {
  test("Facility action " + label + " shows a fresh toast", async () => {
    await checkPage({ account: "pm", mobile: true }, async (page) => {
      await page.goto("/postrojenja");
      assert.equal(await status(page).getByText(title, { exact: true }).count(), 0);
      await page.getByRole("button", { name: label, exact: true }).first().tap();
      await seeToast(page);
      assert.equal(new URL(page.url()).pathname, "/postrojenja");
      assert.equal(await page.getByText("Uredi postrojenje", { exact: true }).count(), 0);
    });
  });
}

test("anonymous checkout shows the toast on keyboard activation and preserves focus", async () => {
  await checkPage({}, async (page) => {
    await page.goto("/kosarica");
    const button = page.getByRole("button", { name: "Naru\u010di", exact: true });
    await button.press("Enter");
    await seeToast(page);
    assert.equal(await button.evaluate(element => document.activeElement === element), true);
    assert.equal(new URL(page.url()).pathname, "/kosarica");
  });
});

const forms = [
  ["/kulture/dodavanje", "Izradi", "cm"],
  ["/upravljanje-poljima/dodavanje", "Kreiraj polje", "cm"],
  ["/proizvodi/izradi", "Izradi proizvod", "pm"],
  ["/nabava/izradi", "Spremi nabavku", "fm"],
];
for (const [path, label, account] of forms) {
  test(`Form ${path} shows read-only feedback`, { skip: mocked && path === "/upravljanje-poljima/dodavanje" ? "requires a server-validated session" : false }, async () => {
    await checkPage({ account }, async (page) => {
      await page.goto(path);
      await page.getByRole("button", { name: label, exact: true }).click();
      await seeToast(page);
      assert.equal(new URL(page.url()).pathname, path);
    });
  });
}

test("saving a planting plan shows read-only feedback", { skip: mocked ? "requires a server-validated session" : false }, async () => {
  await checkPage({ account: "cm" }, async (page) => {
    await page.goto("/plan-sadnje/izradi");
    const { fields } = await (await page.request.get("/api/cultivation/fields")).json();
    assert(typeof fields?.[0]?.name === "string", "The demo requires a seeded field");
    await page.getByText(fields[0].name, { exact: true }).first().click();
    await page.getByRole("button", { name: "Spremi plan sadnje", exact: true }).click();
    await seeToast(page);
  });
});

const rolePages = [
  ["/skladisne-jedinice", "wm", ["Dodaj skladi\u0161te", "Uredi", "Obri\u0161i", "Obri\u0161i skladi\u0161ta"]],
  ["/proizvodi", "pm", ["Izradi proizvod", "Uredi", "Obri\u0161i", "Izradi zalihe", "Po\u0161alji u skladi\u0161te"]],
  ["/upravljanje-poljima/pregled", "cm", ["Dodaj", "Obri\u0161i", "Obri\u0161i sve"]],
  ["/plan-sadnje", "cm", ["Dodaj", "Obri\u0161i", "Obri\u0161i sve"]],
  ["/plan-berbe", "cm", ["Dodaj", "Obri\u0161i", "Obri\u0161i sve"]],
  ["/radnici", "fm", ["Dodaj radnika", "Isplati", "Otkaz"]],
  ["/narudzbe", "fm", ["Zahtjev skladi\u0161tu"]],
  ["/radnici/zaposljavanje", "fm", ["Odobri", "Odbij"]],
];
for (const [path, account, labels] of rolePages) {
  test(`Role controls at ${path}`, { skip: mocked ? "requires an authenticated read-only demo" : false }, async () => {
    await checkPage({ account }, async (page) => {
      for (const label of labels) {
        await page.goto(path);
        try {
          await page.getByRole("button", { name: label, exact: true }).first().click();
        } catch {
          const pathname = new URL(page.url()).pathname;
          assert.fail("Could not activate " + label + " at " + pathname);
        }
        await seeToast(page);
        assert.equal(new URL(page.url()).pathname, path);
      }
    });
  });
}

test("Order deletion shows read-only feedback when a pending order exists",
  { skip: mocked ? "requires an authenticated read-only demo" : false }, async (t) => {
    await checkPage({ account: "fm" }, async (page) => {
      const response = await page.request.get("/api/orders");
      assert.equal(response.status(), 200);
      const { orders } = await response.json();
      if (!orders.some(order => order.state === "pending")) {
        t.skip("seeded demo contains no pending orders");
        return;
      }
      await page.goto("/narudzbe");
      await page.getByRole("button", { name: "Izbri\u0161i", exact: true }).first().click();
      await seeToast(page);
    });
  });

const realDemo = { skip: mocked ? "requires a server-validated session" : false };

test("One-click demo cards fit mobile and reject an unavailable selection", async () => {
  await checkPage({ mobile: true }, async page => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Odaberite ulogu za pregled" });
    await section.waitFor();
    assert.equal(await section.getByRole("button", { name: /^Isprobaj/ }).count(), 4);
    assert((await section.getByRole("article").first().boundingBox()).y < 700);
    await section.getByRole("tab", { name: "Radnici" }).tap();
    const workerPanel = section.getByRole("tabpanel", { name: "Radnici" });
    await workerPanel.waitFor();
    assert.equal(await workerPanel.getByRole("button", { name: /^Isprobaj/ }).count(), 4);
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();
    await footer.getByText("FVTracker · Diplomski rad · Bruno Bilandžić · OSS Split", { exact: true }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    const button = workerPanel.getByRole("button", { name: /^Isprobaj/ }).first();
    if (!mocked) await button.evaluate(element => { element.value = "admin"; });
    await button.click();
    await section.getByRole("alert").getByText("Prijava za ovu demo ulogu trenuta\u010dno nije dostupna.").waitFor();
    assert.equal(new URL(page.url()).pathname, "/");
    const session = await (await page.request.get("/api/auth/session")).json();
    assert(!session?.user);
  });
});

test("Homepage demo tabs support keyboard selection and expose only the active roles", async () => {
  await checkPage({}, async page => {
    await page.goto("/");
    const managers = page.getByRole("tab", { name: "Menadžeri" });
    const workers = page.getByRole("tab", { name: "Radnici" });
    const managerPanel = page.getByRole("tabpanel", { name: "Menadžeri" });
    assert.equal(await managers.getAttribute("aria-selected"), "true");
    assert.equal(await managerPanel.getByRole("article").count(), 4);
    assert(await managerPanel.evaluate(panel => {
      const cards = [...panel.querySelectorAll("article")];
      return cards.every(card => card.getBoundingClientRect().top === cards[0].getBoundingClientRect().top);
    }));

    await managers.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await workers.getAttribute("aria-selected"), "true");
    assert.equal(await workers.evaluate(tab => document.activeElement === tab), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.value), "worker");
    assert.equal(await managerPanel.count(), 0);
    await workers.focus();
    await page.keyboard.press("Home");
    assert.equal(await managers.getAttribute("aria-selected"), "true");
    assert.equal(await managers.evaluate(tab => document.activeElement === tab), true);
  });
});

for (const [role, account, dashboard, identityKey, identityValue] of [
  ["cultivation", "cm", "/upravljanje-poljima/pregled", "managerModelName", "CultivationManager"],
  ["production", "pm", "/proizvodi", "managerModelName", "ProductionManager"],
  ["warehouse", "wm", "/skladisne-jedinice", "managerModelName", "WarehouseManager"],
  ["financial", "fm", "/narudzbe", "managerModelName", "FinancialManager"],
  ["worker", "cwe", "/upravljanje-poljima/pregled", "workerType", "CultivationWorker"],
  ["production-worker", "pwe", "/proizvodi", "workerType", "ProductionWorker"],
  ["warehouse-worker", "wwe", "/skladiste-zahtjevi", "workerType", "WarehouseWorker"],
  ["financial-worker", "fwe", "/narudzbe", "workerType", "FinancialWorker"],
]) {
  test(`One-click demo signs in the ${role} account`, realDemo, async () => {
    const file = process.env.FVTRACKER_TEST_CREDENTIALS ?? ".demo-credentials.json";
    const credentials = JSON.parse(await readFile(file, "utf8"));
    const password = credentials.find(record => record.username === account)?.password;
    assert(Boolean(password), "Expected a seeded password");
    await checkPage({}, async page => {
      const homepage = await page.goto("/");
      assert.equal((await homepage.text()).includes(password), false, "Password in homepage response");
      if (identityKey === "workerType") await page.getByRole("tab", { name: "Radnici" }).click();
      let release;
      const submit = new Promise(resolve => { release = resolve; });
      let submittedRole = false;
      let submittedPassword = false;
      await page.route(url => url.pathname === "/", async route => {
        if (route.request().method() === "POST") {
          const data = route.request().postData() ?? "";
          submittedRole = data.includes(role);
          submittedPassword = data.includes(password);
          await submit;
        }
        await route.continue();
      });

      const button = page.locator(`button[name="role"][value="${role}"]`);
      const actionResponse = page.waitForResponse(response =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/");
      try {
        await button.click();
        await page.locator('form[aria-busy="true"]').waitFor();
        assert(await button.isDisabled());
      } finally {
        release();
      }
      await page.waitForURL(url => url.pathname === dashboard);
      assert(submittedRole);
      assert.equal(submittedPassword, false, "Password in browser submission");
      assert.equal((await (await actionResponse).text()).includes(password), false, "Password in sign-in response");
      const session = await (await page.request.get("/api/auth/session")).text();
      assert.equal(session.includes(password), false, "Password in session response");
      const { user } = JSON.parse(session);
      assert.equal(user?.username, account);
      assert.equal(user[identityKey], identityValue);
      if (identityKey === "workerType") assert.equal(user.employed, true);
      assert.equal(user.isAdmin, false);
      await page.getByRole("button", { name: "Odjava" }).first().waitFor();
    });
  });
}

function fullScreenLoader(page) {
  return page.getByRole("status", { name: "U\u010ditavanje sadr\u017eaja" });
}

function sessionRequests(page) {
  let count = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/auth/session") count++;
  });
  return () => count;
}

async function withSlowScripts(page, run) {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async route => {
    await pending;
    await route.continue();
  });
  try {
    await run();
  } finally {
    release();
  }
  await page.waitForLoadState("load");
}

test("Homepage for visitors renders before JavaScript and refreshes without requesting a session", async () => {
  await checkPage({}, async page => {
    const requests = sessionRequests(page);
    let catalogRequests = 0;
    page.on("request", request => {
      if (new URL(request.url()).pathname === "/api/products") catalogRequests++;
    });
    await withSlowScripts(page, async () => {
      await page.goto("/", { waitUntil: "commit" });
      await page.getByRole("heading", { name: "FVTracker", exact: true }).waitFor();
      await page.getByRole("link", { name: "Proizvodi", exact: true }).waitFor();
      await page.getByText("Demo način rada · Promjene nisu dopuštene", { exact: true }).waitFor();
      assert.equal(await page.getByRole("link", { name: "Ručna prijava", exact: true }).getAttribute("href"), "/autorizacija");
      assert.equal(await fullScreenLoader(page).count(), 0);
      assert.equal(await page.getByText(/Korisni\u010dko ime:/).count(), 0);
    });
    await page.reload();
    await page.getByRole("heading", { name: "FVTracker", exact: true }).waitFor();
    assert.equal(requests(), 0);
    assert.equal(catalogRequests, 0, "The homepage only needs the catalog link");

    const catalog = page.waitForResponse(response => new URL(response.url()).pathname === "/api/products");
    await page.getByRole("link", { name: "Proizvodi", exact: true }).click();
    assert.equal((await catalog).status(), 200);
  });
});

test("Homepage for signed-in users renders a private profile before JavaScript and after refresh", realDemo, async () => {
  await checkPage({ account: "wm" }, async page => {
    const requests = sessionRequests(page);
    const profile = page.getByText("Korisni\u010dko ime: wm", { exact: true });
    await withSlowScripts(page, async () => {
      await page.goto("/", { waitUntil: "commit" });
      await profile.waitFor();
      assert.equal(await page.getByRole("heading", { name: "Odaberite ulogu za pregled" }).count(), 0);
      assert.equal(await fullScreenLoader(page).count(), 0);
    });

    await page.reload();
    await profile.waitFor();
    await page.waitForLoadState("networkidle");
    assert.equal(new URL(page.url()).pathname, "/");
    assert.equal(await fullScreenLoader(page).count(), 0);
    assert.equal(requests(), 0);
  });
});

test("Homepage keeps the worker profile visible while work details load", realDemo, async () => {
  await checkPage({ account: "cwe" }, async page => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await page.route("**/api/worker?*", async route => {
      await pending;
      await route.fallback();
    });
    try {
      await page.goto("/");
      await page.getByText("Korisni\u010dko ime: cwe", { exact: true }).waitFor();
      await page.getByText("U\u010ditavanje podataka o radu", { exact: true }).waitFor({ state: "attached" });
      assert.equal(await fullScreenLoader(page).count(), 0);
    } finally {
      release();
    }
    await page.getByText("Podaci o radu", { exact: true }).waitFor();
    assert.equal(await page.getByText("U\u010ditavanje podataka o radu", { exact: true }).count(), 0);
  });
});

test("Login and logout update the homepage without a fullscreen loader or redirect loop", realDemo, async () => {
  const file = process.env.FVTRACKER_TEST_CREDENTIALS ?? ".demo-credentials.json";
  const accounts = JSON.parse(await readFile(file, "utf8"));
  const password = accounts.find(account => account.username === "pm")?.password;
  assert(password, "The demo needs a production manager account");

  await checkPage({}, async page => {
    const requests = sessionRequests(page);
    await page.goto("/prijava");
    assert.equal(requests(), 0);
    await page.locator('input[name="login"]').fill("pm");
    try {
      await page.locator('input[name="password"]').fill(password);
    } catch {
      throw new Error("Could not enter the demo credential");
    }
    await page.getByRole("button", { name: "Prijava", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/");
    await page.getByText("Korisni\u010dko ime: pm", { exact: true }).waitFor();
    assert.equal(requests(), 1, "Only the login session refresh is expected");
    assert.equal(await fullScreenLoader(page).count(), 0);

    await page.getByRole("button", { name: "Odjava" }).click();
    await page.waitForURL(url => url.pathname === "/autorizacija");
    await page.goto("/");
    await page.getByRole("heading", { name: "FVTracker", exact: true }).waitFor();
    assert.equal(await page.getByText("Korisni\u010dko ime: pm", { exact: true }).count(), 0);
    assert.equal(await fullScreenLoader(page).count(), 0);
  });
});

test("Warehouse requests load with scoped shipment data and without loading all orders", realDemo, async () => {
  await checkPage({ account: "wm" }, async page => {
    let orderRequests = 0;
    page.on("request", request => {
      if (new URL(request.url()).pathname === "/api/orders") orderRequests++;
    });
    await page.goto("/skladiste-zahtjevi");
    await page.getByRole("heading", { name: /Zahtjev za narud\u017ebom/ }).first().waitFor();
    assert.equal(new URL(page.url()).pathname, "/skladiste-zahtjevi");
    assert.equal(orderRequests, 0);
  });
});

test("Axios intercepts JSON and multipart writes before transport and leaves reads working", async () => {
  const attempted = [];
  const adapter = async config => {
    attempted.push(config.method);
    return { config, data: {}, status: 200, statusText: "OK", headers: {} };
  };
  let notifications = 0;
  const remove = interceptDemoWrites(() => notifications++);
  try {
    const upload = new FormData();
    upload.append("file", new Blob(["sample data"]), "fixture.txt");
    await api.get("/fixture", { adapter });
    await assert.rejects(api.post("/fixture", upload, { adapter }), isDemoWriteBlocked);
    for (const method of ["post", "put", "patch", "delete"]) {
      await assert.rejects(api.request({ method, url: "/fixture", data: {}, adapter }), isDemoWriteBlocked);
    }
    assert.deepEqual(attempted, ["get"]);
    assert.equal(notifications, 5);
  } finally {
    remove();
  }
  await api.post("/fixture", {}, { adapter });
  assert.deepEqual(attempted, ["get", "post"]);
});
