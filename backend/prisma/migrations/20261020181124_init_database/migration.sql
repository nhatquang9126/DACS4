/*
  Warnings:

  - A unique constraint covering the columns `[user_id,course_id,semester]` on the table `Enrollment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `prediction` ADD COLUMN `features_used` TEXT NULL;

-- AlterTable
ALTER TABLE `recommendation` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `studysession` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ONGOING';

-- AlterTable
ALTER TABLE `task` ADD COLUMN `completed_at` DATETIME(3) NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Enrollment_user_id_course_id_semester_key` ON `Enrollment`(`user_id`, `course_id`, `semester`);
