-- ==========================================================================
-- ISKOLARIS RELATIONAL DATABASE SCHEMA 
-- De La Salle University Undergraduate Scholars Management System
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS `iskolaris_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `iskolaris_db`;

-- Drop existing tables if re-running script (ordered by dependency)
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `vault`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `stipends`;
DROP TABLE IF EXISTS `appeals`;
DROP TABLE IF EXISTS `scholar_terms`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `scholarships`;
DROP TABLE IF EXISTS `degree_programs`;

-- 1. Degree Programs Table
CREATE TABLE `degree_programs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `college` VARCHAR(50) NOT NULL DEFAULT 'CCS',
  `total_terms` INT NOT NULL DEFAULT 12
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed CCS Degree Programs
INSERT INTO `degree_programs` (`code`, `name`, `college`, `total_terms`) VALUES
('BSCS-CSE', 'Bachelor of Science in Computer Science Major in Computer Systems Engineering', 'CCS', 12),
('BSCS-NIS', 'Bachelor of Science in Computer Science Major in Network and Information Security', 'CCS', 12),
('BSCS-ST', 'Bachelor of Science in Computer Science Major in Software Technology', 'CCS', 12),
('BSCS-MSCS', 'Bachelor of Science (Honors) in Computer Science and Master of Science in Computer Science', 'CCS', 12),
('BSDS', 'Bachelor of Science in Data Science', 'CCS', 12),
('BSISec', 'Bachelor of Science in Information Security', 'CCS', 12),
('BSIS', 'Bachelor of Science in Information Systems', 'CCS', 12),
('BSIT', 'Bachelor of Science in Information Technology (BSIT)', 'CCS', 12),
('BSEMC-GAD', 'Bachelor of Science in Interactive Entertainment Major in Game Art and Design', 'CCS', 12),
('BSEMC-GD', 'Bachelor of Science in Interactive Entertainment Major in Game Development', 'CCS', 12);

-- 2. Scholarships Table
CREATE TABLE `scholarships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `min_cgpa_req` DECIMAL(3,2) NOT NULL DEFAULT 2.00,
  `default_monthly_stipend` DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Scholarship Programs
INSERT INTO `scholarships` (`name`, `min_cgpa_req`, `default_monthly_stipend`) VALUES
('Star Scholars Program', 3.00, 8000.00),
('Archer Achiever Scholarship', 2.50, 7000.00),
('Animo Grants Scholarship Program', 2.00, 5000.00),
('St. La Salle Financial Assistance Grant', 2.00, 4000.00),
('DOST-SEI Undergraduate Scholarship', 2.50, 7000.00);

-- 3. Users Table (Students & Administrators)
CREATE TABLE `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  `admin_type` ENUM('AdSO', 'FAO', 'DOST') DEFAULT NULL,
  `college` VARCHAR(50) DEFAULT 'CCS',
  `degree_program_id` INT DEFAULT NULL,
  `scholarship_id` INT DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `award_letter` VARCHAR(255) DEFAULT '',
  `batch_year` INT DEFAULT 124,
  `current_term_index` INT DEFAULT 6,
  `units_completed` INT DEFAULT 0,
  `units_remaining` INT DEFAULT 150,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`degree_program_id`) REFERENCES `degree_programs`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Administrator Accounts
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `admin_type`, `status`) VALUES
('adso_admin', 'AdSO Administrator', 'adso@dlsu.edu.ph', 'adminpassword', 'admin', 'AdSO', 'approved'),
('fao_admin', 'FAO Administrator', 'fao@dlsu.edu.ph', 'adminpassword', 'admin', 'FAO', 'approved'),
('dost_admin', 'DOST Core Group Admin', 'dost@dlsu.edu.ph', 'adminpassword', 'admin', 'DOST', 'approved');

-- Seed Sample Scholar Accounts
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `college`, `degree_program_id`, `scholarship_id`, `status`, `award_letter`, `batch_year`, `current_term_index`, `units_completed`, `units_remaining`) VALUES
('12414638', 'Kien Patrick Ong', 'kien_ong@dlsu.edu.ph', 'password123', 'student', 'CCS', 8, 1, 'approved', 'uploads/mock-award-star.pdf', 124, 6, 75, 75),
('12345678', 'Samantha Sanchez', 'samantha_sanchez@dlsu.edu.ph', 'password123', 'student', 'CCS', 8, 5, 'approved', 'uploads/mock-award-dost.pdf', 123, 9, 100, 50),
('12501002', 'Juan Carlos Benito', 'juan_benito@dlsu.edu.ph', 'password123', 'student', 'CCS', 10, 4, 'pending', 'uploads/temp-award.jpg', 125, 3, 25, 125);

-- 4. Scholar Academic Terms Table (12-Term Staying Progression per Scholar)
CREATE TABLE `scholar_terms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `term_index` INT NOT NULL, -- 1 to 12
  `academic_year` VARCHAR(50) NOT NULL, -- e.g. "A.Y. 2024 - 2025"
  `term_number` INT NOT NULL, -- 1, 2, or 3
  `term_label` VARCHAR(100) NOT NULL, -- e.g. "A.Y. 2024 - 2025 Term 1"
  `status` ENUM('Not Scheduled', 'No Submission', 'Processing', 'Invalid Submission', 'Renewed', 'In Probation', 'Reconsidered', 'Terminated') NOT NULL DEFAULT 'Not Scheduled',
  `tgpa` DECIMAL(3,2) DEFAULT 0.00,
  `cgpa` DECIMAL(3,2) DEFAULT 0.00,
  `eaf_file` VARCHAR(255) DEFAULT '',
  `grades_file` VARCHAR(255) DEFAULT '',
  `evaluated_at` DATETIME DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_student_term` (`student_id`, `term_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample 12-Term Records for ID 12414638 (Kien - Started AY 2024-2025 Term 1)
INSERT INTO `scholar_terms` (`student_id`, `term_index`, `academic_year`, `term_number`, `term_label`, `status`, `tgpa`, `cgpa`) VALUES
('12414638', 1, 'A.Y. 2024 - 2025', 1, 'A.Y. 2024 - 2025 Term 1', 'Renewed', 3.75, 3.75),
('12414638', 2, 'A.Y. 2024 - 2025', 2, 'A.Y. 2024 - 2025 Term 2', 'Renewed', 3.80, 3.78),
('12414638', 3, 'A.Y. 2024 - 2025', 3, 'A.Y. 2024 - 2025 Term 3', 'Renewed', 3.85, 3.80),
('12414638', 4, 'A.Y. 2025 - 2026', 1, 'A.Y. 2025 - 2026 Term 1', 'Renewed', 3.70, 3.77),
('12414638', 5, 'A.Y. 2025 - 2026', 2, 'A.Y. 2025 - 2026 Term 2', 'Renewed', 3.90, 3.80),
('12414638', 6, 'A.Y. 2025 - 2026', 3, 'A.Y. 2025 - 2026 Term 3', 'No Submission', 0.00, 3.80),
('12414638', 7, 'A.Y. 2026 - 2027', 1, 'A.Y. 2026 - 2027 Term 1', 'Not Scheduled', 0.00, 0.00),
('12414638', 8, 'A.Y. 2026 - 2027', 2, 'A.Y. 2026 - 2027 Term 2', 'Not Scheduled', 0.00, 0.00),
('12414638', 9, 'A.Y. 2026 - 2027', 3, 'A.Y. 2026 - 2027 Term 3', 'Not Scheduled', 0.00, 0.00),
('12414638', 10, 'A.Y. 2027 - 2028', 1, 'A.Y. 2027 - 2028 Term 1', 'Not Scheduled', 0.00, 0.00),
('12414638', 11, 'A.Y. 2027 - 2028', 2, 'A.Y. 2027 - 2028 Term 2', 'Not Scheduled', 0.00, 0.00),
('12414638', 12, 'A.Y. 2027 - 2028', 3, 'A.Y. 2027 - 2028 Term 3', 'Not Scheduled', 0.00, 0.00);

-- 5. Appeals Table
CREATE TABLE `appeals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `term_label` VARCHAR(100) NOT NULL,
  `letter_file` VARCHAR(255) DEFAULT '',
  `supporting_files` VARCHAR(255) DEFAULT '',
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Stipends Table
CREATE TABLE `stipends` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `term_label` VARCHAR(100) NOT NULL,
  `month_index` INT NOT NULL, -- 1 to 4 for monthly, or 1 for termly
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending', 'Disbursed') NOT NULL DEFAULT 'Pending',
  `date_disbursed` DATE DEFAULT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Sample Disbursed Stipends for Kien
INSERT INTO `stipends` (`student_id`, `term_label`, `month_index`, `amount`, `status`, `date_disbursed`) VALUES
('12414638', 'A.Y. 2025 - 2026 Term 3', 1, 8000.00, 'Disbursed', '2026-06-01'),
('12414638', 'A.Y. 2025 - 2026 Term 3', 2, 8000.00, 'Pending', NULL),
('12414638', 'A.Y. 2025 - 2026 Term 3', 3, 8000.00, 'Pending', NULL),
('12414638', 'A.Y. 2025 - 2026 Term 3', 4, 8000.00, 'Pending', NULL);

-- 7. Expenses Table (Financial Ledger)
CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `date` DATE NOT NULL,
  `description` VARCHAR(255) DEFAULT '',
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Initial Income Entry for Kien
INSERT INTO `expenses` (`student_id`, `type`, `category`, `amount`, `date`, `description`) VALUES
('12414638', 'income', 'stipend', 8000.00, '2026-06-01', 'Iskolaris Stipend: Month 1 Disbursement');

-- 8. Vault Certificates Table
CREATE TABLE `vault` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size` VARCHAR(50) NOT NULL,
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `term` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Notifications Table
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Welcome Notification
INSERT INTO `notifications` (`student_id`, `title`, `message`, `is_read`) VALUES
('12414638', 'Welcome to Iskolaris', 'Your account is active. Submit your renewal documents for A.Y. 2025 - 2026 Term 3.', FALSE);
