import { expect, test, type Page } from "@playwright/test";

function watchRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function expectHealthyPage(page: Page, runtimeErrors: string[]) {
  await expect(page.locator("body")).not.toHaveText("");
  await expect(
    page.locator(".vite-error-overlay, #webpack-dev-server-client-overlay"),
  ).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
}

test("homepage loads the anonymous participant and moderator entry points", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.goto("/");

  await expect(page).toHaveTitle(/Moderate Questions Panel/i);
  await expect(
    page.getByRole("heading", { name: "Interactive Q&A Panel System" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" }).first()).toBeVisible();
  await expect(page.getByText("Anonymous Participation")).toBeVisible();
  await expectHealthyPage(page, runtimeErrors);
});

test("unknown routes render the in-app not-found page", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText("Page not found")).toBeVisible();
  await expectHealthyPage(page, runtimeErrors);
});
