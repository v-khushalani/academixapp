/**
 * The Academix operating guide. Plain data so the copy can be edited without
 * touching layout code. Every instruction names the real screen in the app.
 */

export type GuideBlock =
  | { heading?: string; items: string[] }
  | { table: { head: string[]; rows: string[][] } };

export type GuideSection = {
  id: string;
  title: string;
  intro?: string;
  blocks: GuideBlock[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "super-admin",
    title: "Super Admin overview",
    intro: "Team Academix runs the platform. Institutes run their own coaching.",
    blocks: [
      {
        heading: "What Super Admin controls",
        items: [
          "Every institute on the network — plan, status and limits.",
          "Plans and pricing shown on the public pricing page.",
          "Room, student and staff limits per institute.",
          "Cross-institute support lookup (find a student by name or phone).",
        ],
      },
      {
        heading: "What Super Admin is responsible for",
        items: [
          "Approving a new institute and setting its plan before handover.",
          "Training the institute owner on first login.",
          "Never entering an institute's day-to-day data — owners own their data.",
          "Escalation support when an institute is stuck.",
        ],
      },
      {
        heading: "What Super Admin does NOT do",
        items: [
          "Mark attendance, collect fees or add students for an institute.",
          "Change an institute's academic settings without being asked.",
        ],
      },
    ],
  },
  {
    id: "platform-setup",
    title: "Platform setup (Super Admin)",
    blocks: [
      {
        heading: "Step 1 — Sign in",
        items: [
          "Open /login and sign in with your Academix Google account.",
          "You land on the Platform console. Institute staff cannot see this page.",
        ],
      },
      {
        heading: "Step 2 — Set plans and pricing",
        items: [
          "Open the Plans & pricing tab in the Platform console.",
          "Edit plan names, limits and the tick/cross feature table.",
          "Prices are hidden in the app on purpose — quote them on a call.",
          "Changes go live on the public pricing page immediately.",
        ],
      },
      {
        heading: "Step 3 — Review institutes",
        items: [
          "The Institutes tab lists every institute with plan, rooms, students and fees collected.",
          "Use it as your weekly health check of the network.",
        ],
      },
      {
        heading: "Step 4 — Set limits",
        items: [
          "Limits (rooms, students, staff logins) follow the plan assigned to the institute.",
          "Owners cannot raise their own limits — only Super Admin can.",
          "Raise a limit only after the upgrade is agreed.",
        ],
      },
    ],
  },
  {
    id: "institute-onboarding",
    title: "Institute onboarding",
    intro: "Target: the institute takes its first attendance or first fee within 10 minutes.",
    blocks: [
      {
        heading: "Step 1 — Create the institute",
        items: [
          "The owner signs up at /signup with Google and names their institute.",
          "The institute is created instantly with the owner as admin.",
          "Confirm the new institute appears in the Platform console.",
        ],
      },
      {
        heading: "Step 2 — Set the plan",
        items: [
          "Assign the agreed plan and limits from the Platform console.",
          "Do this before the owner starts adding students.",
        ],
      },
      {
        heading: "Step 3 — Hand over access",
        items: [
          "There are no passwords to share — the owner signs in with Google at /login.",
          "Send them the sign-in link plus this guide link.",
        ],
      },
      {
        heading: "Step 4 — Walk them through first login",
        items: [
          "Dashboard opens with a 4-step setup guide at the top.",
          "Tell them: finish those 4 steps first, ignore everything else.",
          "The guide disappears by itself once the institute has done real work.",
        ],
      },
    ],
  },
  {
    id: "owner-checklist",
    title: "What to tell the institute owner",
    intro: "Give this checklist in order. Do not let them jump ahead.",
    blocks: [
      {
        items: [
          "1. Settings → add institute name, logo and academic year.",
          "2. Batches → create each batch with its class/grade and fee.",
          "3. Syllabus → add subjects and chapters per batch (subjects come from here).",
          "4. Faculty → add teachers and send invite links.",
          "5. Timetable → drag batches onto the room × time grid to assign teachers and rooms.",
          "6. Students → add students, or share the admission QR and approve applications.",
          "7. Students → assign every student to a batch (fees auto-assign from the batch).",
          "8. Students → fill father/mother name and WhatsApp number for every student.",
          "9. Attendance → mark today's attendance. This is the moment the system starts working.",
        ],
      },
      {
        heading: "Rules to repeat",
        items: [
          "A student with no batch gets no fees, no timetable and no attendance.",
          "A student with no parent number gets no WhatsApp updates.",
          "Set batch fee before adding students so fees assign automatically.",
        ],
      },
    ],
  },
  {
    id: "faculty",
    title: "Faculty setup",
    blocks: [
      {
        heading: "Institute does this",
        items: [
          "Faculty → Add teacher: name, phone, subject, base salary.",
          "Send the invite link over WhatsApp — the teacher joins with Google, no password.",
          "Timetable → assign the teacher to batches and periods.",
          "Syllabus → the teacher's subject decides which chapters they see.",
        ],
      },
      {
        heading: "What a teacher can do",
        items: [
          "Mark attendance for their batches (Teacher portal → Attendance).",
          "Enter test marks (Teacher portal → Marks).",
          "Update syllabus progress: In progress → Done (Teacher portal → Syllabus).",
          "See their own day timetable.",
        ],
      },
      {
        heading: "What a teacher cannot do",
        items: [
          "See or collect fees, salaries or any money data.",
          "See students from other batches or other institutes.",
          "Change plans, limits or institute settings.",
        ],
      },
    ],
  },
  {
    id: "students-parents",
    title: "Student & parent setup",
    blocks: [
      {
        heading: "Adding students — two ways",
        items: [
          "Direct: Students → Add student, fill details, pick batch. Fastest for existing students.",
          "QR: Admissions → share the admission QR. Parents fill the form on their phone.",
          "Enquiry QR is the short 5-field version for walk-ins who are not ready to admit.",
        ],
      },
      {
        heading: "Approving and assigning",
        items: [
          "Admissions → review each application, then Approve.",
          "On approval, assign the batch. Fees are created from the batch fee automatically.",
          "Add a scholarship or discount on the student if needed — it adjusts the due amount.",
        ],
      },
      {
        heading: "Linking parents",
        items: [
          "Fill father/mother name and WhatsApp number on the student record.",
          "Send the family invite link from the student page — parents sign in with Google.",
        ],
      },
      {
        heading: "What parents see in their portal",
        items: [
          "Attendance — day by day, plus monthly percentage.",
          "Fees — what is paid, what is pending, and receipts.",
          "Results — test marks as soon as the teacher enters them.",
          "Timetable and homework for their child's batch.",
        ],
      },
    ],
  },
  {
    id: "fees",
    title: "Fees & finance flow",
    blocks: [
      {
        heading: "Step 1 — Fee structure",
        items: [
          "Batch fee is the master figure — set it once per batch.",
          "Settings → bulk edit all batch fees in one screen.",
          "Set the installment plan (e.g. 1st due 7 days after admission, next 90 days from batch start).",
        ],
      },
      {
        heading: "Step 2 — Assignment",
        items: [
          "Assigning a student to a batch creates their fee automatically.",
          "Only exceptions (scholarship, discount) are entered per student.",
        ],
      },
      {
        heading: "Step 3 — Collect a payment",
        items: [
          "Fees → find the student → Collect payment.",
          "Pending amount is pre-filled; edit it for a part payment.",
          "Pick the mode (cash, UPI, bank) and save.",
          "The receipt appears only after the payment is recorded.",
          "Send the receipt on WhatsApp; send the UPI QR when asking for money.",
        ],
      },
      {
        heading: "Step 4 — Mistakes",
        items: [
          "Never delete a payment. Use Cancel / Reverse payment so the audit trail stays.",
        ],
      },
      {
        heading: "Routine",
        items: [
          "Daily: record every payment the same day it is received.",
          "Weekly: open Fees → pending list and send reminders.",
        ],
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance flow",
    blocks: [
      {
        heading: "Who does it",
        items: [
          "Teacher marks their own batch from the Teacher portal — this is the default.",
          "Admin or front desk can mark any batch from Attendance.",
        ],
      },
      {
        heading: "Daily flow",
        items: [
          "Open Attendance → pick the batch → mark Present / Absent → Save.",
          "Dashboard shows how many batches are still unmarked today.",
          "Absent students appear as an alert for the admin with a one-tap WhatsApp message to parents.",
        ],
      },
      {
        heading: "Reports",
        items: [
          "Reports → attendance by batch and by student for any date range.",
          "Export to share with management or parents in a meeting.",
        ],
      },
    ],
  },
  {
    id: "exams",
    title: "Exams & results",
    blocks: [
      {
        items: [
          "1. Tests → Create test: name, batch, subject, date, max marks.",
          "2. Teacher opens the test and enters marks for each student.",
          "3. Results appear in the parent portal automatically.",
          "4. Send the result on WhatsApp from the test page when you want to push it.",
          "5. Reports → compare batch performance across tests.",
        ],
      },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp & communication",
    blocks: [
      {
        heading: "How it works",
        items: [
          "Academix opens WhatsApp with the message already written — you press send.",
          "Every send is recorded in Messages so nothing is sent twice or forgotten.",
          "Messages → filter by date, batch, type or status.",
          "Messages → Send message for a manual message to a batch or a single student.",
        ],
      },
      {
        heading: "When to send what",
        table: {
          head: ["Message", "When"],
          rows: [
            ["Fee reminder", "3 days before due date, and again 3 days after"],
            ["Fee receipt", "Immediately after every payment"],
            ["Attendance alert", "Same day, within an hour of the class"],
            ["Result", "Same day marks are entered"],
            ["Manual / notice", "Holidays, exam schedule, PTM"],
          ],
        },
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard usage",
    blocks: [
      {
        heading: "Check every morning",
        items: [
          "Attendance today — batches marked vs scheduled.",
          "Absent today — send parent alerts before lunch.",
          "Outstanding fees — the number that pays your salaries.",
          "Needs you — applications waiting for approval.",
        ],
      },
      {
        heading: "Three daily actions",
        items: [
          "Take attendance.",
          "Collect fees.",
          "Send a message.",
        ],
      },
    ],
  },
  {
    id: "routine",
    title: "Daily / weekly routine",
    blocks: [
      {
        table: {
          head: ["When", "Do this"],
          rows: [
            ["Every morning", "Check dashboard, approve pending admissions"],
            ["During classes", "Teachers mark attendance and syllabus progress"],
            ["Every afternoon", "Send absent alerts to parents"],
            ["Every evening", "Record the day's fee payments, send receipts"],
            ["Weekly", "Send fee reminders to pending parents"],
            ["Weekly", "Reports — attendance %, collection vs billed"],
            ["Weekly", "Syllabus — is every subject on track for the exam?"],
            ["Monthly", "Salaries — mark teacher payments paid"],
          ],
        },
      },
    ],
  },
  {
    id: "mistakes",
    title: "Common mistakes to avoid",
    blocks: [
      {
        items: [
          "Adding students before setting the batch fee — fees then have to be fixed by hand.",
          "Leaving students unassigned to a batch — they vanish from attendance and fees.",
          "Missing parent WhatsApp numbers — no reminders, no alerts, no receipts.",
          "Marking attendance days later — the data becomes useless for parents.",
          "Deleting a wrong payment instead of reversing it — breaks the audit trail.",
          "Letting pending fees pile up for a month before the first reminder.",
          "Sharing one login across the whole staff — invite each person properly.",
        ],
      },
    ],
  },
  {
    id: "best-practices",
    title: "Best practices",
    blocks: [
      {
        items: [
          "Start simple — batches, students, attendance. Add tests and syllabus in week two.",
          "Train one staff member as the in-house owner of Academix.",
          "Update data the same day, never in a weekly catch-up.",
          "Communicate weekly — parents who hear from you pay faster.",
          "Use the admission QR at the front desk instead of paper forms.",
          "Review reports every Monday for 10 minutes with your team.",
        ],
      },
    ],
  },
];
