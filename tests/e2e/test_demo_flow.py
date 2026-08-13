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
        context = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
        
        if cookies_json:
            cookies = json.loads(cookies_json)
            for c in cookies:
                c["url"] = "http://localhost:8080"
            await context.add_cookies(cookies)

        page = await context.new_page()
        await page.goto("http://localhost:8080", wait_until="domcontentloaded")
        
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            # Pre-set active branch to avoid the branch selection gate
            await page.evaluate("window.localStorage.setItem('acx_active_branch', 'all')")
        
        print("Navigating to /app...")
        await page.goto("http://localhost:8080/app", wait_until="networkidle")
        
        # Check for branch selection gate if still redirected/blocked
        gate_h1 = page.locator("h1:has-text('Select a branch')")
        if await gate_h1.is_visible():
            print("Branch gate visible, selecting 'Continue to Combined View'...")
            await page.get_by_role("button", name="Continue to Combined View").click()
            await page.wait_for_load_state("networkidle")

        print(f"Final URL: {page.url}")
        await page.screenshot(path=str(SCREENSHOTS / "final_check.png"))
        
        btn = page.get_by_role("button", name="Fill Mock Data")
        if await btn.is_visible():
            print("SUCCESS: Demo button found")
            await btn.click()
            try:
                # The button calls createDemoData then provisionDemoAccounts
                # We wait for the "Demo Portal Accounts" dialog
                await page.wait_for_selector("text=Demo Portal Accounts", timeout=30000)
                await page.screenshot(path=str(SCREENSHOTS / "demo_success.png"))
                
                # Check for account details
                content = await page.content()
                if "@academix.demo" in content:
                    print("SUCCESS: Demo flow complete and verified")
                else:
                    print("WARNING: Success dialog shown but no demo emails found")
            except Exception as e:
                print(f"Failed to complete demo seeding: {e}")
        else:
            print("FAILURE: Demo button not found")
            # Log auth state from browser console
            auth_state = await page.evaluate("() => JSON.parse(window.localStorage.getItem('sb-yymwngozkaxvixovsflw-auth-token') || '{}')")
            print(f"LocalStorage Session User: {auth_state.get('user', {}).get('email', 'None')}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
