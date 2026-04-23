// Playwright verification of the Panel — checks numbers cuadran and components render.
import { chromium } from "playwright";

const URL = process.env.URL || "http://localhost:3000/dashboard/funnel";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"}  ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
const page = await ctx.newPage();

// Capture console errors
const consoleErrors = [];
page.on("pageerror", (err) => consoleErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

// Capture API responses to read stats directly
let apiStats = null;
let apiCloserPerf = null;
page.on("response", async (resp) => {
  const u = resp.url();
  if (u.includes("/api/funnel?")) {
    try {
      const json = await resp.json();
      apiStats = json.stats;
      apiCloserPerf = json.closerPerformance;
    } catch {}
  }
});

console.log(`→ Opening ${URL}`);
const resp = await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
check("Page loads (HTTP 200)", resp && resp.status() === 200, `status=${resp?.status()}`);

// Wait for the closers table to render
await page.waitForSelector("text=/Rendimiento closers/", { timeout: 30000 });
check("Closers section rendered", true);

// Wait a bit for data to fully populate
await page.waitForTimeout(3000);

// Check KPI card "Cierre llamada" exists
const cierreLlamadaText = await page.locator("text=/Cierre llamada/").first().innerText().catch(() => null);
check("KPI 'Cierre llamada' visible", !!cierreLlamadaText, cierreLlamadaText ?? "");

// Check "Cuadre de métricas" block exists
const cuadreVisible = await page.locator("text=/Cuadre de métricas/").count();
check("Reconciliation block rendered", cuadreVisible > 0, `count=${cuadreVisible}`);

// Read the reconciliation rows: Llamadas, Celebradas, Ventas (en celebradas), Ventas netas
const reconRows = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll("table tbody tr"));
  const results = [];
  for (const r of rows) {
    const tds = Array.from(r.querySelectorAll("td")).map((t) => t.textContent?.trim() ?? "");
    if (tds.length === 5 && (tds[4] === "✓" || tds[4].startsWith("✗"))) {
      results.push({ label: tds[0], sum: tds[1], sinAsignar: tds[2], total: tds[3], cuadra: tds[4] });
    }
  }
  return results;
});
console.log("Reconciliation rows:", JSON.stringify(reconRows, null, 2));
const allCuadran = reconRows.length > 0 && reconRows.every((r) => r.cuadra === "✓");
check("Todas las filas de reconciliación cuadran (✓)", allCuadran, reconRows.filter((r) => r.cuadra !== "✓").map((r) => r.label).join(", ") || "OK");

// Verify API stats against computed per-closer sums
if (apiStats && apiCloserPerf) {
  const sumLl = apiCloserPerf.reduce((s, c) => s + c.llamadas, 0);
  const sumCe = apiCloserPerf.reduce((s, c) => s + c.celebradas, 0);
  const sumVe = apiCloserPerf.reduce((s, c) => s + c.ventas, 0);
  const sumVn = apiCloserPerf.reduce((s, c) => s + c.ventasNetas, 0);

  check("Σ llamadas + sinAsignar === totalLlamadas",
    sumLl + (apiStats.sinAsignarLlamadas ?? 0) === apiStats.totalLlamadas,
    `${sumLl} + ${apiStats.sinAsignarLlamadas} = ${sumLl + (apiStats.sinAsignarLlamadas ?? 0)}, expected ${apiStats.totalLlamadas}`);
  check("Σ celebradas + sinAsignar === totalCelebradas",
    sumCe + (apiStats.sinAsignarCelebradas ?? 0) === apiStats.totalCelebradas,
    `${sumCe} + ${apiStats.sinAsignarCelebradas} = ${sumCe + (apiStats.sinAsignarCelebradas ?? 0)}, expected ${apiStats.totalCelebradas}`);
  check("Σ ventas(celebradas) + sinAsignar === totalVentasEnCelebradas",
    sumVe + (apiStats.sinAsignarVentasCelebradas ?? 0) === apiStats.totalVentasEnCelebradas,
    `${sumVe} + ${apiStats.sinAsignarVentasCelebradas} = ${sumVe + (apiStats.sinAsignarVentasCelebradas ?? 0)}, expected ${apiStats.totalVentasEnCelebradas}`);
  check("Σ ventas netas(celebradas) + sinAsignar === totalVentasEnCelebradasNetas",
    sumVn + (apiStats.sinAsignarVentasCelebradasNetas ?? 0) === apiStats.totalVentasEnCelebradasNetas,
    `${sumVn} + ${apiStats.sinAsignarVentasCelebradasNetas} = ${sumVn + (apiStats.sinAsignarVentasCelebradasNetas ?? 0)}, expected ${apiStats.totalVentasEnCelebradasNetas}`);

  // Verify cierre llamada global = ventas/celebradas
  const expectedCierre = apiStats.totalCelebradas > 0 ? ((apiStats.totalVentasEnCelebradas / apiStats.totalCelebradas) * 100).toFixed(1) : "0";
  check("stats.cierreLlamada === ventas/celebradas", apiStats.cierreLlamada === expectedCierre,
    `got=${apiStats.cierreLlamada} expected=${expectedCierre}`);

  // Verify per-closer cierre = ventas/celebradas
  let allCierreOk = true;
  for (const c of apiCloserPerf) {
    const expected = c.celebradas > 0 ? ((c.ventas / c.celebradas) * 100).toFixed(1) : "0";
    if (c.cierre !== expected) {
      allCierreOk = false;
      console.log(`  closer ${c.closer}: cierre=${c.cierre} expected=${expected}`);
    }
  }
  check("Cada closer.cierre === ventas/celebradas", allCierreOk);

  console.log("\nAPI stats snapshot:");
  console.log(`  totalLlamadas=${apiStats.totalLlamadas}, totalCelebradas=${apiStats.totalCelebradas}, totalNoShows=${apiStats.totalNoShows}`);
  console.log(`  totalVentasEnCelebradas=${apiStats.totalVentasEnCelebradas}, netas=${apiStats.totalVentasEnCelebradasNetas}`);
  console.log(`  cierreLlamada=${apiStats.cierreLlamada}%, showRate=${apiStats.showRate}%`);
  console.log(`  totalVentas=${apiStats.totalVentas}, totalVentasNetas=${apiStats.totalVentasNetas}, agendasUnicas=${apiStats.agendasUnicas}, totalAgendas=${apiStats.totalAgendas}`);
  console.log("\ncloserPerformance:");
  for (const c of apiCloserPerf) {
    console.log(`  ${c.closer.padEnd(10)} ll=${c.llamadas} ns=${c.noShows} cel=${c.celebradas} v=${c.ventas} vn=${c.ventasNetas} cierre=${c.cierre}% show=${c.showRate}%`);
  }
} else {
  check("API response captured", false, "apiStats or closerPerf missing");
}

// Test source filters
const filters = ["Paid", "Organico", "Afiliados", "Todos"];
for (const f of filters) {
  await page.locator(`button:has-text("${f}")`).first().click();
  await page.waitForTimeout(1500);
  const hasError = await page.locator("text=/No hay datos|TypeError|ReferenceError/i").count();
  check(`Filter '${f}' renders sin errores`, hasError === 0, hasError > 0 ? "error visible" : "ok");
}

// Check no console errors during navigation
check("Sin errores en consola", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | ") || "OK");

// Screenshot
await page.screenshot({ path: "/tmp/dashboard-verification.png", fullPage: true });
console.log("\n→ Screenshot: /tmp/dashboard-verification.png");

await browser.close();

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
