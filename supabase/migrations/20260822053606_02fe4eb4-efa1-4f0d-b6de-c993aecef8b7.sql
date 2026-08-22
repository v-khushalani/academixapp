DELETE FROM public.plan_features;

INSERT INTO public.plan_features (group_name, label, sort_order, values) VALUES
('Scale', 'Students included', 1, '{"free":"100","growth":"500","campus":"1,500","chain":"Unlimited"}'),
('Scale', 'Office / admin logins', 2, '{"free":"2","growth":"6","campus":"20","chain":"Unlimited"}'),
('Scale', 'Teacher logins', 3, '{"free":"5","growth":"25","campus":"Unlimited","chain":"Unlimited"}'),
('Scale', 'Branches', 4, '{"free":"1","growth":"1","campus":"1","chain":"Unlimited"}'),
('Everyday work', 'Admissions, students, batches, attendance, fees', 5, '{"free":true,"growth":true,"campus":true,"chain":true}'),
('Everyday work', 'Timetable, tests, syllabus tracker', 6, '{"free":true,"growth":true,"campus":true,"chain":true}'),
('Everyday work', 'Parent & student portals', 7, '{"free":true,"growth":true,"campus":true,"chain":true}'),
('Grow & automate', 'Automatic WhatsApp fee reminders & absentee alerts', 8, '{"free":false,"growth":true,"campus":true,"chain":true}'),
('Grow & automate', 'Reports, report cards & branded receipts', 9, '{"free":false,"growth":true,"campus":true,"chain":true}'),
('Grow & automate', 'Role permissions, audit log & API', 10, '{"free":false,"growth":false,"campus":true,"chain":true}'),
('Support', 'Support', 11, '{"free":"Help centre","growth":"Email in 24h","campus":"Priority WhatsApp","chain":"Dedicated manager"}');