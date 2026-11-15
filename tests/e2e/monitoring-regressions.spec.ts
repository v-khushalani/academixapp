import { test, expect } from "@playwright/test";

test("group overview allows owners and admins but not accountants or families", async ({ page }) => {
  await page.goto("/");
  const access = await page.evaluate(async () => {
    const { canAccess } = await new Function("return import('/src/lib/rbac.ts')")();
    return ["owner", "admin", "accountant", "student", "parent", "superadmin"].map(role => canAccess("group", [role]));
  });
  expect(access).toEqual([true, true, false, false, false, true]);
});

test("role assignment includes the active institute", async ({ page }) => {
  await page.goto("/");
  const inserted = await page.evaluate(async () => {
    const { supabase } = await new Function("return import('/src/integrations/supabase/client.ts')")();
    const { userRolesApi } = await new Function("return import('/src/lib/api/index.ts')")();
    let row;
    supabase.rpc = async () => ({ data: "institute-a", error: null });
    supabase.from = () => ({ insert: async value => { row = value; return { error: null }; } });
    await userRolesApi.addRole("staff-a", "accountant");
    return row;
  });
  expect(inserted).toEqual({ user_id: "staff-a", role: "accountant", institute_id: "institute-a" });
});

test("admission remains usable when scanning is disabled after loading", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const React = await new Function("return import('/node_modules/.vite/deps/react.js')")();
    const { createRoot } = await new Function("return import('/node_modules/.vite/deps/react-dom_client.js')")();
    const { AdmissionForm } = await new Function("return import('/src/components/app/admission-form.tsx')")();
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
  await page.goto("/");
  await page.evaluate(async () => {
    const React = await new Function("return import('/node_modules/.vite/deps/react.js')")();
    const { createRoot } = await new Function("return import('/node_modules/.vite/deps/react-dom_client.js')")();
    const { QueryClient, QueryClientProvider } = await new Function("return import('/node_modules/.vite/deps/@tanstack_react-query.js')")();
    const api = await new Function("return import('/src/lib/api/index.ts')")();
    api.batchesApi.list = async () => [];
    api.studentsApi.create = async input => ({ id: "regression-student", full_name: input.full_name });
    api.feesApi.create = async () => ({ id: "regression-fee" });
    api.feesApi.collect = async () => {};
    const { WalkInDialog } = await new Function("return import('/src/components/app/walk-in-dialog.tsx')")();
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
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { supabase } = await new Function("return import('/src/integrations/supabase/client.ts')")();
    const auth = await new Function("return import('/src/lib/post-auth.ts')")();
    const calls: string[] = [];
    supabase.rpc = async name => { calls.push(name); return { data: [{ valid: true, kind: "student" }], error: null }; };
    auth.rememberInvite("regression-invite");
    return { destination: await auth.resolvePostAuthDestination(), calls };
  });
  expect(result).toEqual({ destination: { to: "/welcome/regression-invite" }, calls: ["get_student_invite"] });
});