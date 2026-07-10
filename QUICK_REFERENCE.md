# 🚀 Quick Reference Guide - New Features

**After the Code Audit - Everything You Need to Know**

---

## 📍 Quick Links to Key Files

### New Utility Files
| File | Purpose | Import |
|------|---------|--------|
| `src/lib/constants/index.ts` | All enums & statuses | `import { CLASSES, PROGRAMS, ... } from "@/lib/constants"` |
| `src/lib/validation/student.ts` | Form validation | `import { StudentFormSchema, validateStudentForm } from "@/lib/validation/student"` |
| `src/lib/logger.ts` | Structured logging | `import { logger } from "@/lib/logger"` |
| `src/lib/error-handler.ts` | Error parsing | `import { parseSupabaseError, AppError } from "@/lib/error-handler"` |
| `src/lib/utils/data-table.ts` | Table helpers | `import { filterRows, sortRows, paginateRows } from "@/lib/utils/data-table"` |
| `src/api/students.ts` | Students API | `import { listStudents, getStudent, ... } from "@/api/students"` |

### Documentation Files
| File | Read If... |
|------|-----------|
| `CODE_AUDIT_REPORT.md` | You want complete audit details |
| `FIXES_IMPLEMENTED.md` | You want implementation details |
| `AUDIT_COMPLETE_SUMMARY.md` | You want executive summary |
| This file | You want quick reference |

---

## 💾 Code Examples

### 1️⃣ Using Constants (No More Magic Strings)

**Before**:
```typescript
if (status === "active") { ... }
if (approval === "pending") { ... }
```

**After**:
```typescript
import { STUDENT_STATUSES, APPROVAL_STATUSES } from "@/lib/constants";

// Type-safe
type Status = typeof STUDENT_STATUSES[number]; // "active" | "inactive" | "suspended"

// In forms
{CLASSES.map(cls => <option key={cls}>{cls}</option>)}
```

### 2️⃣ Form Validation (Before API Call)

**Before**:
```typescript
const handleSubmit = async () => {
  await api.createStudent(formData); // ❌ No validation
};
```

**After**:
```typescript
import { validateStudentForm } from "@/lib/validation/student";

const handleSubmit = async () => {
  const result = validateStudentForm(formData);
  if (!result.success) {
    // Show field errors
    console.log(result.error.flatten()); 
    return;
  }
  // ✅ Safe to submit
  await createStudent(result.data);
};
```

### 3️⃣ Structured Logging (For Production)

**Before**:
```typescript
console.log("API call", { studentId: "123" }); // Only in dev console
```

**After**:
```typescript
import { logger } from "@/lib/logger";

logger.info("Student created", { studentId: "123", name: "John" });
logger.error("Failed to save", error, { formId: "student-form" });
logger.logApiRequest("POST", "/students", { payload: {...} });

// Dev: Pretty-printed to console
// Prod: Structured JSON for centralized logging
```

### 4️⃣ Error Handling (User-Friendly Messages)

**Before**:
```typescript
try {
  await api.createStudent(data);
} catch (error) {
  toast.error(error.message); // ❌ "UNIQUE_VIOLATION: duplicate key..."
}
```

**After**:
```typescript
import { parseSupabaseError, getErrorMessage } from "@/lib/error-handler";

try {
  await createStudent(data);
} catch (error) {
  const appError = parseSupabaseError(error);
  toast.error(appError.message); // ✅ "This email already exists"
}
```

### 5️⃣ Using New Modular API

**Before**:
```typescript
import { studentsApi } from "@/lib/api";
const students = await studentsApi.list();
const student = await studentsApi.get(id);
```

**After**:
```typescript
import { listStudents, getStudent, createStudent } from "@/api/students";

const students = await listStudents();
const student = await getStudent(id);
const newStudent = await createStudent(data);
```

### 6️⃣ Data Table Utils (Reusable Logic)

**Before**:
```typescript
// Complex sorting/filtering logic in component
const sorted = useMemo(() => {
  if (!sort) return filtered;
  // 30 lines of sorting code...
}, [filtered, sort]);
```

**After**:
```typescript
import { filterRows, sortRows, paginateRows } from "@/lib/utils/data-table";

const filtered = filterRows(rows, query, searchKeys, columns);
const sorted = sortRows(filtered, sortState, columns);
const { rows: pageRows, pageCount } = paginateRows(sorted, page, pageSize);
```

---

## 🔍 When to Use Each Feature

| Situation | Use |
|-----------|-----|
| Need status values in form | `import { CLASSES, PROGRAMS } from "@/lib/constants"` |
| Validate form before submit | `import { validateStudentForm } from "@/lib/validation/student"` |
| Log API call success/error | `import { logger } from "@/lib/logger"` |
| Handle error from API | `import { parseSupabaseError } from "@/lib/error-handler"` |
| Create/fetch students | `import { ... } from "@/api/students"` |
| Sort/filter/paginate table | `import { filterRows, sortRows } from "@/lib/utils/data-table"` |

---

## ⚡ Performance Tips

### 1. Use Constants (No Allocation)
```typescript
// ❌ BAD - Creates new array every render
const CLASSES = ["8", "9", "10"];

// ✅ GOOD - Defined once
import { CLASSES } from "@/lib/constants";
```

### 2. Validate Client-Side First
```typescript
// ❌ BAD - Server rejects, 500ms round trip
const student = await createStudent(data);

// ✅ GOOD - Instant feedback
const result = validateStudentForm(data);
if (!result.success) return; // No API call
const student = await createStudent(result.data);
```

### 3. Use Table Utils (No Re-renders)
```typescript
// ❌ BAD - Re-computes on every change
const sorted = rows.sort(...)
const filtered = sorted.filter(...)
const paginated = filtered.slice(...)

// ✅ GOOD - Memoized separately
const filtered = useMemo(() => filterRows(...), [rows, query]);
const sorted = useMemo(() => sortRows(...), [filtered, sort]);
const { rows: paged } = useMemo(() => paginateRows(...), [sorted, page]);
```

---

## 🐛 Debugging

### See structured logs
```typescript
import { logger } from "@/lib/logger";

// Shows in dev console with color coding
logger.debug("Debug info", { context: "value" });
logger.info("Info message");
logger.warn("Warning");
logger.error("Error", error, { extra: "data" });
```

### Get user-friendly error message
```typescript
import { getErrorMessage } from "@/lib/error-handler";

try {
  // ...
} catch (error) {
  console.error(getErrorMessage(error)); // Clean message for user
}
```

### Check if error is retryable
```typescript
import { isRecoverableError } from "@/lib/error-handler";

try {
  // ...
} catch (error) {
  if (isRecoverableError(error)) {
    // Retry after delay
    setTimeout(() => retry(), 1000);
  }
}
```

---

## 📚 Integration Checklist

### For Each New Feature Page

- [ ] Import status constants from `@/lib/constants`
- [ ] Create Zod validation schema in `src/lib/validation/[feature].ts`
- [ ] Use validation in form submission
- [ ] Import API functions from `@/api/[feature]`
- [ ] Use logger for important events
- [ ] Parse errors with `parseSupabaseError()`
- [ ] Handle loading/error states properly

### Example Pattern
```typescript
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { parseSupabaseError, getErrorMessage } from "@/lib/error-handler";
import { validateStudentForm } from "@/lib/validation/student";
import { createStudent } from "@/api/students";

export function StudentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => {
      logger.logApiRequest("POST", "/students", data);
      return createStudent(data);
    },
    onSuccess: () => {
      logger.info("Student created successfully");
      toast.success("Student created!");
      // Navigate or reset form
    },
    onError: (error) => {
      const appError = parseSupabaseError(error);
      logger.error("Failed to create student", error, { form: "student" });
      toast.error(appError.message);
    },
  });

  const handleSubmit = (formData) => {
    const result = validateStudentForm(formData);
    if (!result.success) {
      toast.error("Please check the form");
      return;
    }
    createMutation.mutate(result.data);
  };

  return (
    // Form JSX
  );
}
```

---

## 🎯 Migration Guide

### Step 1: Use Constants
```typescript
// Replace all hardcoded status strings
if (s.status === "active") // ❌ REMOVE
if (STUDENT_STATUSES.includes(s.status)) // ✅ GOOD
```

### Step 2: Add Validation
```typescript
// Create validation schemas for your forms
export const YourFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});
```

### Step 3: Use Logger
```typescript
// Replace console.log with logger
console.log(...) // ❌ REMOVE
logger.info(...) // ✅ USE
```

### Step 4: Handle Errors Consistently
```typescript
// Always parse errors
throw error // ❌ AVOID
throw parseSupabaseError(error) // ✅ GOOD
```

### Step 5: Use New APIs
```typescript
// Import from modular APIs
import { studentsApi } from "@/lib/api" // ❌ OLD
import { listStudents } from "@/api/students" // ✅ NEW
```

---

## 📱 Common Tasks

### Show list of classes in dropdown
```typescript
import { CLASSES } from "@/lib/constants";

<select>
  {CLASSES.map(c => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>
```

### Validate form and submit
```typescript
import { validateStudentForm } from "@/lib/validation/student";

const result = validateStudentForm(formData);
if (result.success) {
  await createStudent(result.data);
}
```

### Log a successful action
```typescript
import { logger } from "@/lib/logger";

logger.info("Student enrolled in batch", {
  studentId: "123",
  batchId: "456",
  date: new Date().toISOString(),
});
```

### Show error to user
```typescript
import { parseSupabaseError } from "@/lib/error-handler";

try {
  await deleteStudent(id);
} catch (error) {
  const appError = parseSupabaseError(error);
  alert(appError.message); // "Cannot delete: referenced elsewhere"
}
```

---

## 🆘 Troubleshooting

### "Cannot find module '@/lib/constants'"
→ Make sure import path matches exactly: `src/lib/constants/index.ts`

### Validation always fails
→ Check field types match schema, look at `result.error.flatten()`

### Logger not showing
→ Check browser DevTools console, should see colored logs in dev mode

### Still getting old error messages
→ Make sure you're using `parseSupabaseError()` before throwing

### IDE not autocompleting
→ Missing JSDoc? Add parameter types and return types to functions

---

## ✅ Launch Checklist

Before deploying to production:

- [ ] All forms use validation schemas
- [ ] All errors parsed with `parseSupabaseError()`
- [ ] All APIs use modular structure (`/api/feature`)
- [ ] All status strings use constants
- [ ] No `console.log()` - use `logger` instead
- [ ] Error boundaries on all routes
- [ ] Loading states on all mutations
- [ ] Tests written for critical flows

---

## 🎓 Learning Resources

Within this project:
- `src/api/students.ts` - Example of proper API structure
- `src/lib/validation/student.ts` - Zod validation patterns
- `src/lib/error-handler.ts` - Error handling patterns
- `src/lib/logger.ts` - Logging utility implementation

In documentation:
- `CODE_AUDIT_REPORT.md` - Detailed explanations
- `FIXES_IMPLEMENTED.md` - Implementation guide
- `AUDIT_COMPLETE_SUMMARY.md` - Executive summary

---

## 🚀 You're Ready!

Everything is in place. Start using the new utilities in your code and watch the codebase improve! 🎉

**Questions?** Check the relevant file or documentation mentioned above.

