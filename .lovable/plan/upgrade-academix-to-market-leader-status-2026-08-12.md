# Upgrade Academix to Market-Leader Status

This plan executes a comprehensive feature upgrade and UI refinement sweep to position Academix as the superior alternative to legacy coaching ERPs.

## UI/UX Polish & Modernization
- **Global Theme & Layout**: Update `src/routes/app.tsx` and `src/components/app/sidebar.tsx` with a more aggressive, high-contrast professional look.
- **Dashboard Upgrade**: Transform `src/routes/app.index.tsx` into a mission-control command center with real-time "Pulse" indicators.
- **Micro-interactions**: Add subtle animations and loading states across primary action buttons.

## WhatsApp Automation (The "Killer Feature")
- **One-Click Broadcasts**: Implement bulk WhatsApp messaging from the Students and Batches pages.
- **Rich Templates**: Expand `src/lib/whatsapp.ts` with templates for homework reminders, test results, and holiday announcements.
- **Interactive Links**: Include "Click to Pay" or "Click to View Progress" links in automated messages.

## Advanced Academics & Learning
- **Homework Module 2.0**: Enhance the homework system with file attachments (URLs) and parent notification toggles.
- **Syllabus Forecasting**: Add "Estimated Completion Date" to `src/routes/app.syllabus.tsx` based on historical teaching logs.
- **Report Card Engine**: Build a professional PDF report card generator in `src/lib/exporters.ts` that aggregates attendance, marks, and syllabus coverage.

## Financial Intelligence
- **Expense Categorization**: Refine `src/routes/app.expenses.tsx` with smart categorization and P&L charts.
- **Fee Projection**: Add a "Expected Revenue" chart to the Reports page based on installment due dates.
- **Atomic Collections**: Hardener `collect_fee_payment` RPC logic to handle partial payments and adjustments without race conditions.

## Technical Details
- **Architecture**: Stick to TanStack Start v1 standards and Supabase RLS.
- **Security**: Maintain the "Zero Security Issue" database state achieved in previous hardening turns.
- **Performance**: Optimize data fetching with pre-fetching for high-traffic routes (Dashboard, Attendance).

## User Review Required
- **WhatsApp API**: We currently use `wa.me` (zero-cost). For *fully* automated (no-click) messages, a paid API provider (Twilio/Wati) would be needed later.
- **Branding**: Ensure your institute logo and primary color are set in Settings; the app will now consume them more prominently.
