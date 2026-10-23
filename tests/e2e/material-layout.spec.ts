import { test, expect } from "@playwright/test";

test("explicit revision front/back breaks produce exactly two pages without losing content", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // Load the same browser-safe renderer used by the materials screen.
    const load = new Function("return import('/src/lib/material-render.ts')");
    const renderer = await load();
    const frame = document.createElement("iframe");
    frame.width = "850";
    document.body.append(frame);
    frame.srcdoc = renderer.materialPrintHtml({ name: "Test Institute", logo: "", color: "#197352", address: "", phone: "", email: "", title: "Revision" }, "First side\n\n<!-- pagebreak -->\n\nSecond side", "", false);
    await new Promise<void>((resolve, reject) => {
      const timer = setInterval(() => {
        if (frame.contentDocument?.documentElement.dataset.materialReady === "true") {
          clearInterval(timer);
          clearTimeout(timeout);
          resolve();
        }
      }, 50);
      const timeout = setTimeout(() => { clearInterval(timer); reject(new Error("Pagination not ready")); }, 30000);
    });
    const pages = Array.from(frame.contentDocument?.querySelectorAll(".mx-content") ?? []);
    return { count: pages.length, text: pages.map(p => p.textContent?.trim()) };
  });
  expect(result.count).toBe(2);
  // Content preservation, not a copy/markup assertion.
  expect(result.text.join(" ")).toBe("First side Second side");
});