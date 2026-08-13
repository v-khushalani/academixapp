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
        
        # Establish origin first
        await page.goto("http://localhost:8080")
        
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            print("Session injected")
        
        # Navigate to dashboard and wait for data
        print("Navigating to /app...")
        await page.goto("http://localhost:8080/app", wait_until="networkidle")
        
        # Check if we are redirected to login
        if "/login" in page.url:
            print(f"Redirected to {page.url} - Auth session failed or insufficient roles")
            await page.screenshot(path=str(SCREENSHOTS / "login_redirect.png"))
            
            # Try to see if we can force a reload of the auth state
            await page.evaluate("window.location.reload()")
            await page.wait_for_load_state("networkidle")
            print(f"URL after reload: {page.url}")
        
        # Take screenshot of whatever is there
        await page.screenshot(path=str(SCREENSHOTS / "final_state.png"))
        print(f"Current URL: {page.url}")
        
        # Check for button
        btn = page.get_by_role("button", name="Fill Mock Data")
        if await btn.is_visible():
            print("SUCCESS: Demo button found")
            await btn.click()
            # Wait for dialog
            try:
                await page.wait_for_selector("text=Demo Portal Accounts", timeout=15000)
                await page.screenshot(path=str(SCREENSHOTS / "success_dialog.png"))
                print("SUCCESS: Demo accounts provisioned and dialog shown")
            except Exception as e:
                print(f"Timeout waiting for success dialog: {e}")
        else:
            print("FAILURE: Demo button NOT found")
            # Log specific elements for debugging
            buttons = await page.get_by_role("button").all()
            print(f"Found {len(buttons)} buttons on page")
            for i, b in enumerate(buttons[:10]):
                try:
                    text = await b.inner_text()
                    print(f"Button {i}: {text}")
                except:
                    pass

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
