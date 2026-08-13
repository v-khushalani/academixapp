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
        # Use a realistic User-Agent to avoid potential bot detection
        context = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
        
        # Scope cookies to localhost
        if cookies_json:
            cookies = json.loads(cookies_json)
            for c in cookies:
                c["url"] = "http://localhost:8080"
            await context.add_cookies(cookies)
            print("Cookies injected")

        page = await context.new_page()
        
        # Navigate to establish origin
        print("Opening localhost...")
        await page.goto("http://localhost:8080", wait_until="domcontentloaded")
        
        # Inject LocalStorage
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            print("LocalStorage session injected")
        
        # Navigate to Dashboard
        print("Navigating to /app...")
        # Use networkidle to ensure auth check/hydration finishes
        await page.goto("http://localhost:8080/app", wait_until="networkidle")
        
        # Debugging: check URL and content if redirected
        print(f"URL after navigation: {page.url}")
        await page.screenshot(path=str(SCREENSHOTS / "dashboard_initial.png"))
        
        # Handle potential redirections or auth delays
        if "/login" in page.url:
            print("Auth failed - redirecting back to /login. Attempting force reload...")
            await page.reload(wait_until="networkidle")
            print(f"URL after reload: {page.url}")

        # Final check for the button
        btn = page.get_by_role("button", name="Fill Mock Data")
        if await btn.is_visible():
            print("SUCCESS: Demo button found")
            await btn.click()
            
            # Look for the credentials dialog
            try:
                # Wait for Dialog Title or specific text
                await page.wait_for_selector("text=Demo Portal Accounts", timeout=10000)
                await page.screenshot(path=str(SCREENSHOTS / "success_dialog.png"))
                
                # Verify specific accounts exist in dialog
                content = await page.content()
                if "@academix.demo" in content:
                    print("SUCCESS: Demo accounts detected in dialog")
                else:
                    print("WARNING: Dialog opened but credentials not found in HTML")
            except Exception as e:
                print(f"Dialog failed to appear: {e}")
                await page.screenshot(path=str(SCREENSHOTS / "dialog_timeout.png"))
        else:
            print("FAILURE: Demo button not visible")
            # Dump button text for debugging
            btns = await page.get_by_role("button").all()
            for b in btns:
                t = await b.inner_text()
                if t: print(f"Found button: '{t}'")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
