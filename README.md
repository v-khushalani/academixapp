# academix

VK Academy ERP — Master Prompt for Lovable

Build a modern, premium, lightning-fast ERP for VK Academy, an educational institute. This should NOT look like a typical school ERP. It should feel like a clean SaaS product similar to Notion, Linear and Stripe Dashboard—minimal, elegant, extremely fast and easy to use.

This is Version 1 (MVP), but the architecture MUST be scalable so that in the future it can support multiple coaching institutes without major code changes (multi-tenant ready). For now, only VK Academy branding should be visible.

Product Goals

The ERP should help manage the complete coaching institute from a single dashboard.

The software must focus on:

Speed

Simplicity

Productivity

Clean UI

Mobile responsiveness

Excellent UX

Never add unnecessary features just to increase feature count.

Every feature should solve a real problem.

Brand Identity

Institute Name:
VK Academy

Design Style:
Modern
Premium
Minimal
Professional

Avoid:
❌ Colorful dashboards
❌ School ERP look
❌ Heavy gradients
❌ Cartoon icons
❌ Large unnecessary cards
❌ Clutter

Use plenty of white space.

Rounded corners should be subtle.

Animations should be smooth and minimal.

Color Palette

Primary:
#013062

Primary Hover:
#02418A

Background:
#F8FAFC

Card Background:
#FFFFFF

Border:
#E5E7EB

Text Primary:
#111827

Text Secondary:
#6B7280

Success:
#16A34A

Warning:
#F59E0B

Danger:
#DC2626

Never use random colors.

Maintain a consistent brand throughout.

Typography

Use Inter.

Bold headings.

Comfortable spacing.

Excellent readability.

Sidebar

Collapsible sidebar.

Icons + Text.

Modules:

Dashboard

Students

Admissions

Batches

Attendance

Fees

Tests

Homework

Study Material

Timetable

Faculty

Reports

Notifications

Settings

Bottom:

Profile

Logout

Top Navigation

Global Search

Notifications

Today's Date

User Profile

Quick Add Button

Dashboard

Create a beautiful executive dashboard.

Cards:

Total Students

Today's Attendance

Today's Revenue

Pending Fees

Today's Lectures

Active Batches

Upcoming Tests

Recent Admissions

Charts:

Monthly Revenue

Attendance Trend

Admissions Trend

Latest Activities

Upcoming Tasks

Everything should be glanceable within 5 seconds.

Student Module

Student Profile should include:

Photo

Name

Admission Number

Class

Batch

Subjects

School

Parent Details

Phone

WhatsApp

Email

Address

Documents

Admission Date

Status

Performance Summary

Attendance Summary

Fee Summary

Buttons:

Call Parent

WhatsApp Parent

Fee Reminder

Shift Batch

Promote

Deactivate

Admissions CRM

Pipeline:

New Lead

↓

Counselling

↓

Demo

↓

Follow Up

↓

Admission

↓

Lost

Store every follow-up.

Support reminders.

Search leads instantly.

Batch Management

Batch Name

Faculty

Subjects

Timing

Classroom

Capacity

Students

Attendance

Quick Actions

Shift Students

Merge Batch

Archive Batch

Attendance

Fast attendance screen.

Keyboard shortcuts.

Bulk marking.

Monthly calendar.

Statistics.

Late arrivals.

Parent notification ready.

Fees

Fee Structure

Installments

Scholarships

Discounts

Receipts

Payment History

Pending Fees

Collection Reports

Payment Modes:

Cash

UPI

Card

Bank

Outstanding Dashboard

Fee Reminder Button

Test Module

Create Tests

Chapter Tests

Unit Tests

Mock Tests

Full Syllabus Tests

Results

Ranks

Percentile

Graphs

Weak Topic Analysis

Student Comparison

Homework

Faculty Upload

PDF

Images

Assignments

Due Date

Submission Status

Study Material

Organize by:

Class

Subject

Chapter

Support:

PDF

Notes

Worksheets

Question Banks

Previous Papers

Timetable

Weekly View

Faculty View

Classroom Allocation

Holiday Management

Rescheduling

Faculty Module

Faculty Profile

Today's Classes

Attendance

Homework Upload

Marks Upload

Announcements

Reports

Revenue Report

Attendance Report

Admission Report

Fee Report

Batch Report

Student Performance Report

Monthly Comparison

Notifications

Ready architecture for:

WhatsApp

SMS

Email

Push Notifications

Use reusable templates.

Settings

Institute Details

Academic Year

Courses

Subjects

Fee Structures

Users

Permissions

Role Management

User Roles

Owner

Admin

Faculty

Receptionist

Counsellor

Accountant

Student

Parent

Each role must only see relevant modules.

UX Rules

Every page should have:

Search

Filter

Sort

Pagination

Export

Quick Actions

No page should feel empty.

Use skeleton loaders.

Responsive on desktop, tablet and mobile.

Future Architecture

Keep database and architecture ready for:

Multiple Institutes

Multiple Branches

Online Learning

JEEnie Integration

AI Analytics

AI Reports

AI Attendance Prediction

AI Fee Defaulter Prediction

Do NOT build these features now.

Only keep architecture scalable.

Code Quality

Use reusable components.

Avoid duplicate code.

Keep folder structure clean.

Write scalable architecture.

Create reusable tables, forms, dialogs and cards.

Final Objective

The finished product should look like a premium SaaS dashboard rather than a traditional ERP.

Someone seeing it for the first time should immediately feel:

"This is a modern educational operating system, not just another coaching ERP."

Prioritize polish, usability and speed over feature count.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://academixapp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/16835a18-300a-469b-8bf2-6c7cc98982e8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
