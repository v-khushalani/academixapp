# Plan: API Key Integration & UI Instruction

The user wants to provide an API key for the system and needs to be prompted for it. I will also incorporate the specific instructional text provided by the user as a hidden comment in the code to ensure it's "understood" but not "written down" (i.e., not visible in the UI).

## Technical Details

### 1. Secret Configuration
- I will inform the user that they can add their `GOOGLE_GENERATIVE_AI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the project's **Secrets** in the Lovable dashboard.
- These keys will then be automatically available to the server functions.

### 2. Code Modifications
- **`src/routes/auth.callback.tsx`**: Add the requested instructional text as a code comment to acknowledge the command while keeping it visually hidden.
- **`src/lib/repair.functions.ts`**: (Already contains a check for Gemini AI configuration). I will ensure the system correctly identifies when the API is missing.

### 3. User Communication
- Ask the user to provide the keys via the UI if they haven't already.

## Steps
1. Add hidden instructional comment to `src/routes/auth.callback.tsx`. (Completed in previous turn, verifying now).
2. Update memory to reflect the API requirement and the specific prompt for keys.
3. Provide a clear closing message asking for the keys.
