// Deterministic mock data for VK Academy ERP.
// Swap this file for a real API layer later without touching UI.

export type Student = {
  id: string;
  admissionNo: string;
  name: string;
  class: string;
  batch: string;
  subjects: string[];
  school: string;
  parentName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  admissionDate: string;
  status: "active" | "inactive";
  photo?: string;
  attendancePct: number;
  pendingFees: number;
  avgScore: number;
};

export type Batch = {
  id: string;
  name: string;
  faculty: string;
  subjects: string[];
  timing: string;
  classroom: string;
  capacity: number;
  strength: number;
  attendancePct: number;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  class: string;
  source: string;
  stage: "new" | "counselling" | "demo" | "followup" | "admission" | "lost";
  createdAt: string;
  note?: string;
};

export type FeeRecord = {
  id: string;
  studentId: string;
  studentName: string;
  batch: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: "paid" | "partial" | "pending" | "overdue";
  mode?: "cash" | "upi" | "card" | "bank";
};

export type Test = {
  id: string;
  title: string;
  type: "chapter" | "unit" | "mock" | "full";
  subject: string;
  batch: string;
  date: string;
  maxMarks: number;
  avgScore: number;
  topScore: number;
  status: "scheduled" | "completed";
};

const classes = ["IX", "X", "XI-PCM", "XI-PCB", "XII-PCM", "XII-PCB"];
const batches = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
const subjects = ["Physics", "Chemistry", "Mathematics", "Biology"];
const faculties = [
  "Dr. Rajesh Sharma",
  "Prof. Meera Iyer",
  "Ankit Verma",
  "Dr. Nisha Rao",
  "Suresh Nair",
];
const schools = [
  "DPS RK Puram",
  "St. Xavier's",
  "Modern School",
  "Ryan International",
  "Bal Bharati",
];
const firstNames = ["Aarav", "Vivaan", "Ishaan", "Diya", "Ananya", "Aditya", "Kavya", "Rohan", "Sara", "Krish", "Meera", "Arjun", "Riya", "Kabir", "Anaya", "Vihaan", "Aisha", "Reyansh", "Myra", "Yash"];
const lastNames = ["Sharma", "Verma", "Gupta", "Iyer", "Rao", "Menon", "Kapoor", "Malhotra", "Jain", "Bansal"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export const students: Student[] = Array.from({ length: 84 }, (_, i) => {
  const first = pick(firstNames, i);
  const last = pick(lastNames, i * 3);
  const cls = pick(classes, i);
  const batch = pick(batches, i * 2);
  return {
    id: `stu_${1000 + i}`,
    admissionNo: `VK${2024}${String(1000 + i).padStart(4, "0")}`,
    name: `${first} ${last}`,
    class: cls,
    batch: `${cls}-${batch}`,
    subjects: cls.includes("PCB") ? ["Physics", "Chemistry", "Biology"] : ["Physics", "Chemistry", "Mathematics"],
    school: pick(schools, i),
    parentName: `${pick(lastNames, i)} ${last}`,
    phone: `+91 9${String(800000000 + i * 137).slice(0, 9)}`,
    whatsapp: `+91 9${String(800000000 + i * 137).slice(0, 9)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    address: `${100 + i}, Sector ${i % 40}, New Delhi`,
    admissionDate: new Date(2024, i % 12, (i % 27) + 1).toISOString().slice(0, 10),
    status: i % 17 === 0 ? "inactive" : "active",
    attendancePct: 70 + ((i * 7) % 30),
    pendingFees: i % 5 === 0 ? 0 : ((i * 1234) % 45000),
    avgScore: 45 + ((i * 3) % 50),
  };
});

export const batchList: Batch[] = classes.flatMap((cls, ci) =>
  batches.slice(0, 3).map((b, bi) => {
    const strength = 18 + ((ci * 5 + bi * 7) % 22);
    return {
      id: `batch_${ci}_${bi}`,
      name: `${cls}-${b}`,
      faculty: pick(faculties, ci + bi),
      subjects: cls.includes("PCB") ? ["Physics", "Chemistry", "Biology"] : ["Physics", "Chemistry", "Mathematics"],
      timing: pick(["07:00 - 09:00 AM", "10:00 - 12:00 PM", "04:00 - 06:00 PM", "06:00 - 08:00 PM"], ci + bi),
      classroom: `Room ${101 + ci * 3 + bi}`,
      capacity: 40,
      strength,
      attendancePct: 78 + ((ci + bi) * 3) % 20,
    };
  }),
);

export const leads: Lead[] = Array.from({ length: 28 }, (_, i) => {
  const stages: Lead["stage"][] = ["new", "counselling", "demo", "followup", "admission", "lost"];
  return {
    id: `lead_${i}`,
    name: `${pick(firstNames, i * 2)} ${pick(lastNames, i)}`,
    phone: `+91 9${String(700000000 + i * 271).slice(0, 9)}`,
    class: pick(classes, i),
    source: pick(["Walk-in", "Referral", "Website", "Instagram", "Google Ads"], i),
    stage: stages[i % stages.length],
    createdAt: new Date(2025, 10, (i % 28) + 1).toISOString().slice(0, 10),
    note: i % 3 === 0 ? "Interested in JEE crash course" : undefined,
  };
});

export const fees: FeeRecord[] = students.slice(0, 60).map((s, i) => {
  const amount = 45000 + ((i * 1111) % 30000);
  const paid = i % 4 === 0 ? amount : i % 3 === 0 ? Math.floor(amount / 2) : i % 5 === 0 ? 0 : amount;
  const remain = amount - paid;
  const status: FeeRecord["status"] =
    paid === 0 ? "pending" : paid === amount ? "paid" : remain > 20000 ? "overdue" : "partial";
  return {
    id: `fee_${i}`,
    studentId: s.id,
    studentName: s.name,
    batch: s.batch,
    amount,
    paid,
    dueDate: new Date(2025, (i % 12), ((i * 3) % 27) + 1).toISOString().slice(0, 10),
    status,
    mode: paid > 0 ? pick(["cash", "upi", "card", "bank"] as const, i) : undefined,
  };
});

export const tests: Test[] = Array.from({ length: 14 }, (_, i) => ({
  id: `test_${i}`,
  title: `${pick(subjects, i)} ${pick(["Chapter", "Unit", "Mock", "Full Syllabus"], i)} Test ${i + 1}`,
  type: (["chapter", "unit", "mock", "full"] as const)[i % 4],
  subject: pick(subjects, i),
  batch: pick(batchList, i).name,
  date: new Date(2025, 10, (i % 28) + 1).toISOString().slice(0, 10),
  maxMarks: pick([50, 100, 180, 300], i),
  avgScore: 40 + ((i * 5) % 40),
  topScore: 80 + ((i * 3) % 20),
  status: i < 8 ? "completed" : "scheduled",
}));

// Dashboard aggregates
export const dashboardKpis = {
  totalStudents: students.filter((s) => s.status === "active").length,
  todayAttendance: 87,
  todayRevenue: 148500,
  pendingFees: fees.filter((f) => f.status !== "paid").reduce((a, b) => a + (b.amount - b.paid), 0),
  todayLectures: 12,
  activeBatches: batchList.length,
  upcomingTests: tests.filter((t) => t.status === "scheduled").length,
  recentAdmissions: 9,
};

export const revenueTrend = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  revenue: 320000 + Math.round(Math.sin(i / 2) * 60000) + i * 8000,
}));

export const attendanceTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  pct: 78 + Math.round(Math.sin(i / 2.5) * 8) + (i % 3),
}));

export const admissionsTrend = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  count: 12 + Math.round(Math.cos(i / 2) * 6) + i,
}));

export const activities = [
  { id: 1, text: "Aarav Sharma paid ₹22,500 fee installment", time: "5 min ago" },
  { id: 2, text: "New lead: Diya Menon (XII-PCM) added by Priya", time: "18 min ago" },
  { id: 3, text: "Physics Mock Test 4 results published", time: "1 hour ago" },
  { id: 4, text: "Batch XI-PCM-Alpha attendance marked (28/30)", time: "2 hours ago" },
  { id: 5, text: "Dr. Rajesh uploaded Homework: Kinematics Set 3", time: "3 hours ago" },
];

export const tasks = [
  { id: 1, text: "Send fee reminders to 12 overdue students", due: "Today" },
  { id: 2, text: "Publish Chemistry Unit Test 5 results", due: "Today" },
  { id: 3, text: "Follow up with 4 demo leads", due: "Tomorrow" },
  { id: 4, text: "Faculty review meeting", due: "Fri" },
];