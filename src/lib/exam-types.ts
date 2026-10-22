/** School-style exam structure. Order = report card order. */
export const EXAM_TYPES = [
  { value: "ut1", label: "Unit Test 1", term: "Term 1", max: 40 },
  { value: "term1", label: "Term 1 (Half Yearly)", term: "Term 1", max: 80 },
  { value: "ut2", label: "Unit Test 2", term: "Term 2", max: 40 },
  { value: "term2", label: "Term 2 (Annual)", term: "Term 2", max: 80 },
  { value: "weekly", label: "Weekly / Chapter test", term: "Continuous", max: 25 },
  { value: "mock", label: "Mock (CET / JEE / NEET)", term: "Entrance", max: 100 },
  { value: "practice", label: "Practice", term: "Continuous", max: 20 },
] as const;

const LEGACY: Record<string, string> = {
  quiz: "Quiz",
  unit: "Unit test",
  midterm: "Mid-term",
  final: "Final",
};

export function examLabel(v: string | null | undefined) {
  if (!v) return "—";
  return EXAM_TYPES.find((t) => t.value === v)?.label ?? LEGACY[v] ?? v;
}
