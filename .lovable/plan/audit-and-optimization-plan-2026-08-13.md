# Audit and Optimization Plan

Perform a complete audit of Academix to remove repetitive features, sync disconnected components, and upgrade the platform for market leadership.

## Proposed Changes

### 1. Audit & Cleanup (Repetitive Features)
- **Consolidate Subjects**: Remove the legacy `subjects` table and all related CRUD logic. Standardize on the `syllabus_chapters.subject` field as the single source of truth for subject names.
- **Unified API layer**: Audit `src/lib/api/index.ts` to ensure no duplicated logic between `dashboardApi.summary()` and `dashboardApi.overview()`. Prefer the consolidated RPC-based `overview`.
- **Remove Junk Data**: Update `resetDemoData` to ensure it completely purges all multi-tenant tables, including newer ones like `expenses`, `test_results`, and `syllabus_logs`.

### 2. Connect Disconnected Components (Sync)
- **Syllabus-Batch Sync**: Ensure that when a batch is deleted, its syllabus and chapters are also purged (cascading or explicit cleanup).
- **Teacher Attendance Logic**: Connect faculty attendance to their timetable slots. If a faculty hasn't updated syllabus progress or marked attendance for their scheduled slots, flag them as "unproductive/absent" in reports.
- **Dashboard Deep-links**: Ensure all dashboard stats (e.g., "Needs you now") correctly link to filtered views of the respective modules.

### 3. Upgrades & Market Winners
- **WhatsApp "One-Click" Pulse**: Add a feature to the Admin Dashboard to send a daily "Pulse" report to the owner via WhatsApp, summarizing today's attendance, revenue, and syllabus progress.
- **Syllabus Completion Forecasting**: Enhance the current forecasting in `src/lib/api/syllabus.ts` to be more visible in the main Batch view, showing a "Predicted Completion Date" based on current teaching speed.
- **Automated Installment Nudges**: Connect the installment engine to the WhatsApp alerting system to automatically suggest messaging parents when an installment date is approaching.

## Technical Details
- **Database**: Run a migration to drop the `subjects` table and any orphaned constraints.
- **RPCs**: Update `get_dashboard_overview` or equivalent to include staff productivity metrics.
- **Frontend**: Standardize all "WhatsApp" action buttons to use the `renderTemplate` and `openWhatsApp` helpers from `src/lib/whatsapp.ts`.
- **Demo Data**: Enhance `src/lib/demo-data.functions.ts` with more realistic and connected data (e.g., matching attendance dates with syllabus logs).
