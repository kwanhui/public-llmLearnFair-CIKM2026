import { test, expect } from "@playwright/test";

test("landing page loads with four entry-point cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SAGE", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Try the public demo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tutor sign in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Student chat/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Standalone fairness audit/i })).toBeVisible();
});

test("demo page loads with side-by-side columns and scenario picker", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Public demo mode.")).toBeVisible();
  await expect(page.getByText("Unrestricted GPT", { exact: true })).toBeVisible();
  await expect(page.getByText("No scaffolds, no audit", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Select scenario")).toBeVisible();
  await expect(page.getByRole("button", { name: /Reviewer mode/i })).toBeVisible();
});

test("chat page loads and shows a tutor heading", async ({ page }) => {
  await page.goto("/chat");
  await expect(page.getByRole("heading", { name: "SAGE" })).toBeVisible();
  await expect(page.getByPlaceholder(/Ask the tutor/)).toBeVisible();
});

test("audit page loads and lets the user submit a prompt", async ({ page }) => {
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: /Standalone fairness audit/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Run audit/i })).toBeVisible();
});

test("admin login page loads", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /Tutor sign in/i })).toBeVisible();
  await expect(page.getByLabel(/Email/i)).toBeVisible();
  await expect(page.getByLabel(/Password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
});

test("admin redirect to login when unauthenticated", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
