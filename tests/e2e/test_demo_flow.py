import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import json
import os

SCREENSHOTS = Path("/tmp/browser/demo_tests/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        
        # Injected session handle
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        page = await context.new_page()
        
        # Establish origin
        await page.goto("http://localhost:8080")
        
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            print("Session injected")
        
        # Explicitly wait for navigation and rendering
        await page.goto("http://localhost:8080/app", wait_until="networkidle")
        
        # Log roles from localStorage if they exist there (based on use-auth logic)
        # Actually roles are fetched via RPC in loadRoles.
        
        # Take screenshot of dashboard
        await page.screenshot(path=str(SCREENSHOTS / "dashboard.png"))
        print("Dashboard loaded")
        
        # Check if Demo button exists
        # It's in the actions prop of PageHeader
        btn = page.get_by_role("button", name="Fill Mock Data")
        if await btn.is_visible():
            print("Demo button found")
            await btn.click()
            # Wait for dialog
            await page.wait_for_selector("text=Demo Portal Accounts", timeout=20000)
            await page.screenshot(path=str(SCREENSHOTS / "after_seed.png"))
            print("Demo seeding and provisioning successful")
        else:
            print("Demo button not found - checking visibility factors")
            content = await page.content()
            with open("/tmp/browser/demo_tests/debug_dashboard.html", "w") as f:
                f.write(content)
            
            # Check for PageHeader title to confirm we are logged in
            title = await page.locator("h1").first.inner_text()
            print(f"Page Title: {title}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
