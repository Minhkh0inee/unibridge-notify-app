-- Seed journey presets (if not already present)
INSERT INTO journey_configs (id, user_id, name, preset_type, reminder_offset_minutes, escalation_intervals, confirmation_method, sound_mode, max_reminders, is_preset)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Nhẹ nhàng',
    'gentle',
    0,
    '[15]'::jsonb,
    'button',
    'soft',
    2,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'Cân bằng',
    'balanced',
    0,
    '[10, 5]'::jsonb,
    'photo',
    'soft',
    3,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Quyết liệt',
    'decisive',
    0,
    '[10, 5, 3, 3, 3]'::jsonb,
    'photo_required',
    'escalating',
    NULL,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Create a demo user (password: demo123456)
-- Note: In production, users should be created through Supabase Auth
DO $$
DECLARE
  demo_user_id uuid := '10000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert demo user into auth.users if it doesn't exist
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, role, aud, confirmation_token)
  VALUES (
    demo_user_id,
    '00000000-0000-0000-0000-000000000000',
    'demo@unibridge.app',
    crypt('demo123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"name": "Ngọc Anh"}'::jsonb,
    'authenticated',
    'authenticated',
    ''
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Seed realistic medication data for demo user
INSERT INTO medications (id, user_id, name, active_ingredient, strength, form, dosage_amount, dosage_unit, food_instruction, start_date, end_date, status, source_type, notes)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Amoxicillin',
    'Amoxicillin',
    '500mg',
    'Viên nén',
    1,
    'viên',
    'after',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '4 days',
    'active',
    'manual',
    'Kháng sinh điều trị viêm họng'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Vitamin C',
    'Acid ascorbic',
    '1000mg',
    'Viên sủi',
    1,
    'viên',
    NULL,
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '20 days',
    'active',
    'manual',
    'Bổ sung vitamin tăng cường sức đề kháng'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Panadol Extra',
    'Paracetamol + Caffeine',
    '500mg + 65mg',
    'Viên nén',
    1,
    'viên',
    'before',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '5 days',
    'active',
    'manual',
    'Giảm đau, hạ sốt'
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Omega-3',
    'DHA + EPA',
    '1000mg',
    'Viên nang mềm',
    2,
    'viên',
    'during',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '45 days',
    'active',
    'ocr',
    'Hỗ trợ tim mạch và não bộ'
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'Loratadine',
    'Loratadine',
    '10mg',
    'Viên nén',
    1,
    'viên',
    NULL,
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '9 days',
    'active',
    'manual',
    'Thuốc chống dị ứng'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed medication schedules
INSERT INTO medication_schedules (id, medication_id, session_name, target_time, valid_window_start, valid_window_end, days_of_week, journey_config_id, active_from, active_until)
VALUES
  -- Amoxicillin: morning and evening
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'morning',
    '08:00:00',
    '07:00:00',
    '10:00:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '4 days'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'evening',
    '20:00:00',
    '19:00:00',
    '21:30:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '4 days'
  ),
  -- Vitamin C: morning only
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    'morning',
    '08:30:00',
    '07:00:00',
    '10:00:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '20 days'
  ),
  -- Panadol: noon and afternoon as needed
  (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000003',
    'noon',
    '12:00:00',
    '11:00:00',
    '14:00:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '5 days'
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000003',
    'evening',
    '18:00:00',
    '17:00:00',
    '20:00:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '5 days'
  ),
  -- Omega-3: morning and evening
  (
    '30000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000004',
    'morning',
    '08:00:00',
    '07:00:00',
    '10:00:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '45 days'
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    '20000000-0000-0000-0000-000000000004',
    'evening',
    '19:00:00',
    '18:00:00',
    '21:00:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '45 days'
  ),
  -- Loratadine: evening only
  (
    '30000000-0000-0000-0000-000000000008',
    '20000000-0000-0000-0000-000000000005',
    'evening',
    '21:00:00',
    '20:00:00',
    '22:30:00',
    '[1,2,3,4,5,6,7]'::jsonb,
    '00000000-0000-0000-0000-000000000002',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '9 days'
  )
ON CONFLICT (id) DO NOTHING;
