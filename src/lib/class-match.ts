/** Normalises "Class 11", "XI ", "11th" and "Nursery" to a single comparable token. */
export function normClass(v?: string | null): string {
  const s = (v ?? "").trim().toLowerCase();
  const num = s.match(/\d+/);
  if (num) return num[0];
  const word = s.match(/nursery|lkg|ukg/);
  return word ? word[0] : s;
}

type BatchLike = { class_level?: string | null };

/**
 * Batches a student of `cls` may join. A batch with no class set is open to all;
 * everything else must match the student's class exactly.
 */
export function batchesForClass<T extends BatchLike>(batches: T[], cls?: string | null): T[] {
  const target = normClass(cls);
  if (!target) return batches;
  return batches.filter((b) => !b.class_level || normClass(b.class_level) === target);
}
