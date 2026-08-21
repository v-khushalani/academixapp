TRUNCATE TABLE
  public.attendance, public.attendance_devices, public.student_device_ids,
  public.fee_adjustments, public.fees, public.expenses,
  public.test_results, public.tests, public.homework,
  public.syllabus_logs, public.syllabus_chapters,
  public.timetable_day_plan, public.timetable_slots, public.rooms,
  public.notification_logs, public.leads,
  public.parent_students, public.student_invites, public.students,
  public.faculty_invites, public.faculty, public.batches,
  public.user_roles, public.profiles, public.institutes
RESTART IDENTITY CASCADE;