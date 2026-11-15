import { test, expect } from "@playwright/test";

test("group overview allows owners and admins but not accountants or families", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const access = await page.evaluate(async () => {
    const { canAccess } = await new Function("return import('/src/lib/rbac.ts')")();
    return ["owner", "admin", "accountant", "student", "parent", "superadmin"].map(role => canAccess("group", [role]));
  });
  expect(access).toEqual([true, true, false, false, false, true]);
});

test("role assignment includes the active institute", async ({ page }) => {
  let insertedRow;
  await page.route("**/rest/v1/rpc/current_institute_id", r => r.fulfill({ json: "institute-a" }));
  await page.route("**/rest/v1/user_roles", async r => { insertedRow = r.request().postDataJSON(); await r.fulfill({ json: null }); });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const { userRolesApi } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    await userRolesApi.addRole("staff-a", "accountant");
  });
  expect(insertedRow).toEqual({ user_id: "staff-a", role: "accountant", institute_id: "institute-a" });
});

test("admission remains usable when scanning is disabled after loading", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const { React } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const { createRoot } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const { AdmissionForm } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const host = document.createElement("div"); document.body.replaceChildren(host);
    const root = createRoot(host);
    root.render(React.createElement(AdmissionForm, { aadhaarScan: true, onSubmit: () => {} }));
    await new Promise(resolve => setTimeout(resolve, 100));
    root.render(React.createElement(AdmissionForm, { aadhaarScan: false, onSubmit: () => {} }));
  });
  const inputs = page.locator("input");
  await expect(inputs).toHaveCount(4);
  await inputs.nth(0).fill("Regression student");
  await inputs.nth(1).fill("2012-03-15");
  await inputs.nth(2).fill("9876543210");
  await inputs.nth(3).fill("Regression address");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("combobox").first()).toBeVisible();
});

test("next walk-in clears prior identity and payment", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const { React } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const { createRoot } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const { QueryClient, QueryClientProvider } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const api = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    api.batchesApi.list = async () => [];
    api.studentsApi.create = async input => ({ id: "regression-student", full_name: input.full_name });
    api.feesApi.create = async () => ({ id: "regression-fee" });
    api.feesApi.collect = async () => {};
    const { WalkInDialog } = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    const host = document.createElement("div"); document.body.replaceChildren(host);
    createRoot(host).render(React.createElement(QueryClientProvider, { client: new QueryClient() }, React.createElement(WalkInDialog, { open: true, onOpenChange: () => {} })));
  });
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").nth(0).fill("Previous student");
  await dialog.locator("input").nth(1).fill("9876543210");
  await dialog.locator("input[type=number]").fill("6000");
  await page.getByRole("button", { name: "Admit student", exact: true }).click();
  await page.getByRole("button", { name: "Next walk-in", exact: true }).click();
  await expect(dialog.locator("input").nth(0)).toHaveValue("");
  await expect(dialog.locator("input").nth(1)).toHaveValue("");
  await expect(dialog.locator("input[type=number]")).toHaveValue("");
});

test("valid family invite returns to welcome before being claimed", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_student_invite", r => r.fulfill({ json: [{ valid: true, kind: "student" }] }));
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const result = await page.evaluate(async () => {
    const auth = await new Function("return import('/tests/e2e/monitoring-harness.tsx')")();
    auth.rememberInvite("regression-invite");
    return await auth.resolvePostAuthDestination();
  });
  expect(result).toEqual({ to: "/welcome/regression-invite" });
});