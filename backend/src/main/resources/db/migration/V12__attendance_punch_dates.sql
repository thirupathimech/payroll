ALTER TABLE attendance_records
    ADD COLUMN clock_in_date DATE NULL AFTER attendance_date,
    ADD COLUMN clock_out_date DATE NULL AFTER clock_in_date;

UPDATE attendance_records
SET clock_in_date = attendance_date
WHERE clock_in IS NOT NULL;

UPDATE attendance_records
SET clock_out_date = attendance_date
WHERE clock_out IS NOT NULL;
