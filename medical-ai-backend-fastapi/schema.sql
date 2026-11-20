-- ==============================================================
-- MedIntel AI - Database Schema (MySQL)
-- ==============================================================

CREATE DATABASE IF NOT EXISTS medical_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medical_ai;

-- --------------------------------------------------------------
-- 1. Table: users
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient' NOT NULL,
    is_active TINYINT(1) DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------
-- 2. Table: patient_records
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    date_of_birth VARCHAR(50) DEFAULT NULL,
    blood_group VARCHAR(10) DEFAULT NULL,
    gender VARCHAR(20) DEFAULT NULL,
    allergies TEXT DEFAULT NULL,
    chronic_conditions TEXT DEFAULT NULL,
    current_medications TEXT DEFAULT NULL,
    emergency_contact_name VARCHAR(255) DEFAULT NULL,
    emergency_contact_phone VARCHAR(50) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------
-- 3. Table: diagnoses
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnoses (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    doctor_id VARCHAR(36) DEFAULT NULL,
    symptoms_input TEXT DEFAULT NULL,
    ai_report JSON DEFAULT NULL,
    confidence_score DECIMAL(5, 2) DEFAULT NULL,
    doctor_notes TEXT DEFAULT NULL,
    status ENUM('pending', 'reviewed', 'flagged') DEFAULT 'pending' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_diagnoses_patient (patient_id),
    INDEX idx_diagnoses_doctor (doctor_id),
    INDEX idx_diagnoses_status (status),
    INDEX idx_diagnoses_created (created_at),
    CONSTRAINT fk_diagnosis_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_diagnosis_doctor FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
