-- Backfill doctor_id from legacy doctor_name
UPDATE appointments AS a
SET doctor_id = s.id
FROM staff AS s
WHERE a.doctor_id IS NULL
  AND a.doctor_name IS NOT NULL
  AND TRIM(a.doctor_name) <> ''
  AND TRIM(s.full_name) = TRIM(a.doctor_name)
  AND s.role = 'DOCTOR'
  AND s.is_active = true;

-- Backfill assistant_id from legacy assistant_name
UPDATE appointments AS a
SET assistant_id = s.id
FROM staff AS s
WHERE a.assistant_id IS NULL
  AND a.assistant_name IS NOT NULL
  AND TRIM(a.assistant_name) <> ''
  AND TRIM(s.full_name) = TRIM(a.assistant_name)
  AND s.role = 'ASSISTANT'
  AND s.is_active = true;
