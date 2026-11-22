import assert from "node:assert/strict";
import test, { after, before } from "node:test";
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
  "/api/cultivation/fields": { fields: [{
    _id: "sample-field", name: "Demo test field", slug: "demo-test-field",
    dimensions: { width: 5, length: 5 }, cultivationAreas: [],
    plantingPlans: [{ _id: "sample-planting", name: "Sample planting plan", items: [] }],
    harvestingPlans: [{ _id: "sample-harvest", name: "Sample harvesting plan", items: [] }],
  }] },
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
      if (!readMethods.has(request.method())) {
        writes.push(request.method());
        await route.abort();
      } else if (mocked) {
        const path = new URL(request.url()).pathname;
        const session = account === "cm" ? {
          user: { username: "cm", managerModelName: "CultivationManager", roleStatus: "ODOBRENO" },
        } : null;
        await route.fulfill({ json: path === "/api/auth/session" ? session : fixture[path] ?? null });
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
  test(`Form ${path} shows read-only feedback`, async () => {
    await checkPage({ account }, async (page) => {
      await page.goto(path);
      await page.getByRole("button", { name: label, exact: true }).click();
      await seeToast(page);
      assert.equal(new URL(page.url()).pathname, path);
    });
  });
}

test("saving a planting plan shows read-only feedback", async () => {
  await checkPage({ account: "cm" }, async (page) => {
    await page.goto("/plan-sadnje/izradi");
    if (mocked) {
      await page.getByText("Demo test field", { exact: true }).click();
    } else {
      const fields = await (await page.request.get("/api/cultivation/fields")).json();
      assert(typeof fields.fields?.[0]?.name === "string", "The demo requires a seeded field");
      await page.getByText(fields.fields[0].name, { exact: true }).first().click();
    }
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
  test(`Role controls at ${path}`, { skip: mocked && account !== "cm" ? "requires an authenticated read-only demo" : false }, async () => {
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
