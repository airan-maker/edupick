ALTER TABLE "Enrollment"
ADD COLUMN "memo" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "lastReminderAt" TIMESTAMP(3);
