-- ========================================================================
-- SkillBridge PostgreSQL Scalable Seed Data
-- ========================================================================

-- 1. Master Skills Dictionary
INSERT INTO skills (id, name, normalized_name, category) VALUES
('sk_react', 'React', 'react', 'Frontend'),
('sk_ts', 'TypeScript', 'typescript', 'Programming Language'),
('sk_php', 'PHP', 'php', 'Backend'),
('sk_mysql', 'MySQL', 'mysql', 'Database'),
('sk_css', 'CSS', 'css', 'Styling'),
('sk_python', 'Python', 'python', 'Programming Language'),
('sk_java', 'Java', 'java', 'Backend'),
('sk_ai', 'AI', 'ai', 'Data & Machine Learning'),
('sk_cloud', 'Cloud', 'cloud', 'DevOps & Infra'),
('sk_aws', 'AWS', 'aws', 'Cloud Platform'),
('sk_sql', 'SQL', 'sql', 'Database'),
('sk_powerbi', 'Power BI', 'power bi', 'Analytics'),
('sk_figma', 'Figma', 'figma', 'Design')
ON CONFLICT (id) DO NOTHING;

-- 2. Users (Bcrypt hashed password: 'password123')
INSERT INTO users (id, email, password_hash, role) VALUES
('u_admin_1', 'admin@skillbridge.dev', '$2y$10$FzjK.W.6VnHXv0ziSve6qOC0MD6GXBzBPOec0s/84ssjNEXtgEy7K', 'admin'),
('u_recruiter_1', 'recruiter@northwind.dev', '$2y$10$FzjK.W.6VnHXv0ziSve6qOC0MD6GXBzBPOec0s/84ssjNEXtgEy7K', 'recruiter'),
('u_recruiter_2', 'recruiter@vector.dev', '$2y$10$FzjK.W.6VnHXv0ziSve6qOC0MD6GXBzBPOec0s/84ssjNEXtgEy7K', 'recruiter'),
('u_student_1', 'student@skillbridge.dev', '$2y$10$FzjK.W.6VnHXv0ziSve6qOC0MD6GXBzBPOec0s/84ssjNEXtgEy7K', 'student'),
('u_student_2', 's.iyer@example.com', '$2y$10$FzjK.W.6VnHXv0ziSve6qOC0MD6GXBzBPOec0s/84ssjNEXtgEy7K', 'student'),
('u_student_3', 'r.fernandes@example.com', '$2y$10$FzjK.W.6VnHXv0ziSve6qOC0MD6GXBzBPOec0s/84ssjNEXtgEy7K', 'student')
ON CONFLICT (id) DO NOTHING;

-- 3. Companies (Geocoded with geocoding_status = 'success')
INSERT INTO companies (id, user_id, name, logo_url, industry, website, verified, about, address, city, state, pincode, country, latitude, longitude, geocoding_status) VALUES
('c1', 'u_recruiter_1', 'Northwind Labs', NULL, 'Product Engineering', 'https://northwind.example.com', TRUE, 
 'Northwind Labs builds developer tooling and distributed systems. We hire early-career engineers and pair them with senior mentors from day one.',
 '4th Floor, Tidel Park, Rajiv Gandhi Salai, Taramani', 'Chennai', 'Tamil Nadu', '600113', 'India', 12.9897000, 80.2478000, 'success'),

('c2', 'u_recruiter_2', 'Vector Studio', NULL, 'Design Systems & UI Engineering', 'https://vectorstudio.example.com', TRUE, 
 'Vector Studio crafts high-performance UI systems, design toolkits, and modern web applications for global scale.',
 'Indiranagar 100ft Road, HAL 2nd Stage', 'Bengaluru', 'Karnataka', '560038', 'India', 12.9716000, 77.6412000, 'success'),

('c3', NULL, 'Meridian Analytics', NULL, 'Data Intelligence', 'https://meridian.example.com', FALSE, 
 'Meridian helps enterprise businesses make data-driven hiring and product funnels decisions.',
 'Koramangala 4th Block, 80 Feet Road', 'Bengaluru', 'Karnataka', '560034', 'India', 12.9345000, 77.6265000, 'success'),

('c4', NULL, 'Kaveri Systems', NULL, 'Enterprise Cloud Infrastructure', 'https://kaveri.example.com', TRUE, 
 'Designing resilient high-volume matching engines and cloud services across South Asia.',
 'HITEC City, Madhapur', 'Hyderabad', 'Telangana', '500081', 'India', 17.4474000, 78.3762000, 'success'),

('c5', NULL, 'Loop Intelligence', NULL, 'Artificial Intelligence', 'https://loopai.example.com', TRUE, 
 'Prototype and deploy neural ranking models for talent intelligence.',
 'Viman Nagar, Pune', 'Pune', 'Maharashtra', '411014', 'India', 18.5679000, 73.9143000, 'success')
ON CONFLICT (id) DO NOTHING;

-- 4. Students
INSERT INTO students (id, user_id, name, avatar_url, college, program, experience, resume_storage_key) VALUES
('s1', 'u_student_1', 'Arjun Kumar', NULL, 'Anna University · Computer Science', 'MCA', '2 internships', 'resumes/resume_arjun.pdf'),
('s2', 'u_student_2', 'Sneha Iyer', NULL, 'PSG College of Technology', 'B.Tech · IT', '1 internship', 'resumes/resume_sneha.pdf'),
('s3', 'u_student_3', 'Rahul Fernandes', NULL, 'NIT Trichy', 'B.E · CSE', 'Fresher', 'resumes/resume_rahul.pdf')
ON CONFLICT (id) DO NOTHING;

-- 5. Student Skills
INSERT INTO student_skills (student_id, skill_id, proficiency) VALUES
('s1', 'sk_react', 'advanced'),
('s1', 'sk_ts', 'advanced'),
('s1', 'sk_php', 'intermediate'),
('s1', 'sk_mysql', 'advanced'),
('s1', 'sk_css', 'advanced'),
('s1', 'sk_python', 'intermediate'),
('s2', 'sk_python', 'advanced'),
('s2', 'sk_sql', 'advanced'),
('s2', 'sk_ai', 'intermediate'),
('s3', 'sk_java', 'advanced'),
('s3', 'sk_mysql', 'intermediate'),
('s3', 'sk_php', 'beginner')
ON CONFLICT (student_id, skill_id) DO NOTHING;

-- 6. Jobs
INSERT INTO jobs (id, company_id, title, summary, description, location, type, salary_range, status) VALUES
('job-1', 'c1', 'Full Stack Developer', 'Ship product surfaces end to end across a modern React, TypeScript and PHP stack.', 
 'We are looking for a proactive Full Stack Engineer to join Northwind Labs. You will design, develop, and deploy scalable APIs and rich interactive user experiences with high visual polish.', 
 'Chennai', 'Full Time', '₹6–9 LPA', 'active'),

('job-2', 'c2', 'Frontend Engineering Intern', 'Build design-system components, micro-animations, and interactive dashboards.', 
 'Join Vector Studio as a frontend intern. Work with React, TypeScript, Tailwind CSS, and Framer Motion to craft next-generation interfaces.', 
 'Remote', 'Internship', '₹25k / month', 'active'),

('job-3', 'c3', 'Data Analyst', 'Turn product funnels and metrics into actionable strategic insights.', 
 'Analyze platform user journeys, candidate matches, and funnel conversions using SQL, Python, and BI dashboards.', 
 'Bengaluru', 'Full Time', '₹7–10 LPA', 'active'),

('job-4', 'c4', 'Software Engineer — Backend', 'Design high-throughput APIs and data models for matching algorithms.', 
 'Engineer robust backend services using Java/PHP, MySQL, and cloud services for our enterprise platforms.', 
 'Hyderabad', 'Full Time', '₹8–12 LPA', 'active'),

('job-5', 'c5', 'AI Engineering Intern', 'Prototype recommendation models and skill-to-opportunity graphs.', 
 'Collaborate with senior researchers to train and evaluate candidate ranking pipelines.', 
 'Pune', 'Internship', '₹30k / month', 'active')
ON CONFLICT (id) DO NOTHING;

-- 7. Job Required Skills
INSERT INTO job_skills (job_id, skill_id, is_mandatory) VALUES
('job-1', 'sk_react', TRUE),
('job-1', 'sk_ts', TRUE),
('job-1', 'sk_php', TRUE),
('job-1', 'sk_mysql', TRUE),
('job-1', 'sk_aws', FALSE),
('job-2', 'sk_react', TRUE),
('job-2', 'sk_ts', TRUE),
('job-2', 'sk_css', TRUE),
('job-3', 'sk_python', TRUE),
('job-3', 'sk_sql', TRUE),
('job-3', 'sk_powerbi', FALSE),
('job-4', 'sk_java', TRUE),
('job-4', 'sk_mysql', TRUE),
('job-4', 'sk_cloud', FALSE),
('job-5', 'sk_python', TRUE),
('job-5', 'sk_ai', TRUE),
('job-5', 'sk_cloud', FALSE)
ON CONFLICT (job_id, skill_id) DO NOTHING;

-- 8. Applications
INSERT INTO applications (id, job_id, student_id, stage, notes) VALUES
('a1', 'job-1', 's1', 'interview', 'Shortlisted after stellar assignment review.'),
('a2', 'job-2', 's1', 'shortlisted', 'Portfolio approved by design lead.'),
('a3', 'job-4', 's1', 'applied', 'Profile sent to backend hiring manager.'),
('a4', 'job-1', 's2', 'applied', 'Under initial review.'),
('a5', 'job-3', 's2', 'interview', 'Technical assessment scheduled.'),
('a6', 'job-4', 's3', 'shortlisted', 'Scheduled for interview round 1.')
ON CONFLICT (id) DO NOTHING;

-- 9. Notifications
INSERT INTO notifications (id, user_id, title, message, link) VALUES
('n1', 'u_student_1', 'Interview Scheduled', 'Northwind Labs scheduled your technical interview for Friday at 3:00 PM.', '/dashboard'),
('n2', 'u_student_1', 'New Skill Match', 'Your skills have a 92% match with Full Stack Developer at Northwind Labs.', '/jobs'),
('n3', 'u_recruiter_1', 'New Applicant', 'Arjun Kumar applied for Full Stack Developer position.', '/recruiter')
ON CONFLICT (id) DO NOTHING;
