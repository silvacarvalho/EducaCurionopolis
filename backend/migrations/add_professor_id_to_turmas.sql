-- Migration: Add professor_id column to turmas table
-- Date: 2025
-- Description: Adds a foreign key to professores table to associate a teacher with each class

-- Add professor_id column
ALTER TABLE turmas
ADD COLUMN professor_id INTEGER;

-- Add foreign key constraint
ALTER TABLE turmas
ADD CONSTRAINT fk_turmas_professor
FOREIGN KEY (professor_id)
REFERENCES professores (id);

-- Create index for performance
CREATE INDEX idx_turmas_professor_id ON turmas(professor_id);
