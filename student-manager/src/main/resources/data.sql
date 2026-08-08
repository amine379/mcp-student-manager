-- ===== COURSES (ids auto-générés: 1 à 5) =====
INSERT INTO courses (name, code, description, credits) VALUES ('Mathematics', 'MATH101', 'Algebra, calculus, and linear algebra fundamentals', 4);
INSERT INTO courses (name, code, description, credits) VALUES ('Physics', 'PHY101', 'Classical mechanics and thermodynamics', 3);
INSERT INTO courses (name, code, description, credits) VALUES ('Computer Science', 'CS101', 'Introduction to programming and algorithms', 4);
INSERT INTO courses (name, code, description, credits) VALUES ('English', 'ENG101', 'Academic writing and communication skills', 2);
INSERT INTO courses (name, code, description, credits) VALUES ('Database Systems', 'CS201', 'Relational databases, SQL, and data modeling', 3);

-- ===== STUDENTS (ids auto-générés: 1 à 10) =====
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Youssef', 'El Amrani', 'youssef.amrani@email.com', '2002-03-15', '2024-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Sara', 'Benali', 'sara.benali@email.com', '2003-07-22', '2024-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Omar', 'Tazi', 'omar.tazi@email.com', '2001-11-08', '2023-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Fatima', 'Zahra', 'fatima.zahra@email.com', '2002-05-30', '2024-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Karim', 'Idrissi', 'karim.idrissi@email.com', '2003-01-17', '2024-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Nadia', 'Bouazza', 'nadia.bouazza@email.com', '2001-09-04', '2023-09-01', 'GRADUATED');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Mehdi', 'Alaoui', 'mehdi.alaoui@email.com', '2002-12-20', '2024-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Imane', 'Chraibi', 'imane.chraibi@email.com', '2003-04-11', '2024-09-01', 'ACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Anas', 'Fassi', 'anas.fassi@email.com', '2002-08-25', '2023-09-01', 'INACTIVE');
INSERT INTO students (first_name, last_name, email, date_of_birth, enrollment_date, status) VALUES ('Hajar', 'Ouazzani', 'hajar.ouazzani@email.com', '2003-06-14', '2024-09-01', 'ACTIVE');

-- ===== GRADES =====
-- Youssef (student_id=1) — bon étudiant
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (1, 1, 16.5, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (1, 2, 14.0, '2025-S1', '2025-01-22');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (1, 3, 18.0, '2025-S1', '2025-01-25');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (1, 4, 15.0, '2025-S1', '2025-01-28');

-- Sara (student_id=2) — excellente
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (2, 1, 18.5, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (2, 2, 17.0, '2025-S1', '2025-01-22');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (2, 3, 19.0, '2025-S1', '2025-01-25');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (2, 5, 18.0, '2025-S1', '2025-01-28');

-- Omar (student_id=3) — moyen
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (3, 1, 11.0, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (3, 2, 12.5, '2025-S1', '2025-01-22');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (3, 3, 13.0, '2025-S1', '2025-01-25');

-- Fatima (student_id=4) — bonne
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (4, 1, 15.0, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (4, 3, 16.5, '2025-S1', '2025-01-25');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (4, 5, 17.0, '2025-S1', '2025-01-28');

-- Karim (student_id=5) — moyen
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (5, 1, 10.0, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (5, 2, 11.5, '2025-S1', '2025-01-22');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (5, 4, 13.0, '2025-S1', '2025-01-28');

-- Nadia (student_id=6) — graduée, excellente
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (6, 1, 17.0, '2024-S2', '2024-06-15');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (6, 2, 16.5, '2024-S2', '2024-06-18');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (6, 3, 18.5, '2024-S2', '2024-06-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (6, 4, 15.0, '2024-S2', '2024-06-22');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (6, 5, 17.5, '2024-S2', '2024-06-25');

-- Mehdi (student_id=7)
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (7, 1, 13.5, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (7, 3, 15.0, '2025-S1', '2025-01-25');

-- Imane (student_id=8)
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (8, 1, 14.0, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (8, 2, 15.5, '2025-S1', '2025-01-22');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (8, 3, 16.0, '2025-S1', '2025-01-25');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (8, 5, 14.5, '2025-S1', '2025-01-28');

-- Anas (student_id=9) — inactif, notes faibles
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (9, 1, 7.0, '2024-S2', '2024-06-15');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (9, 2, 8.5, '2024-S2', '2024-06-18');

-- Hajar (student_id=10)
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (10, 1, 15.5, '2025-S1', '2025-01-20');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (10, 3, 17.0, '2025-S1', '2025-01-25');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (10, 4, 14.0, '2025-S1', '2025-01-28');
INSERT INTO grades (student_id, course_id, score, semester, graded_date) VALUES (10, 5, 16.0, '2025-S1', '2025-01-30');
