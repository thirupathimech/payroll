ALTER TABLE shifts
    ADD COLUMN segments_json JSON NULL AFTER duration_minutes;

UPDATE shifts
SET segments_json = JSON_ARRAY(
        JSON_OBJECT(
            'type', 'WORK',
            'hours', duration_hours,
            'minutes', duration_minutes,
            'graceMinutes', 0
        )
    )
WHERE segments_json IS NULL;
