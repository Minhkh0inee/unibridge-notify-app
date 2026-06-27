-- medications table
CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  active_ingredient text,
  strength text,
  form text,
  dosage_amount numeric NOT NULL,
  dosage_unit text NOT NULL,
  food_instruction text,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  source_type text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed')),
  CONSTRAINT valid_source CHECK (source_type IN ('manual', 'ocr')),
  CONSTRAINT valid_food CHECK (food_instruction IS NULL OR food_instruction IN ('before', 'after', 'during')),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_status ON medications(status);

-- journey_configs table
CREATE TABLE journey_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  preset_type text,
  reminder_offset_minutes integer NOT NULL DEFAULT 0,
  escalation_intervals jsonb NOT NULL DEFAULT '[]',
  confirmation_method text NOT NULL DEFAULT 'button',
  snooze_duration_minutes integer NOT NULL DEFAULT 10,
  sound_mode text NOT NULL DEFAULT 'soft',
  max_reminders integer,
  is_preset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_preset CHECK (preset_type IS NULL OR preset_type IN ('gentle', 'balanced', 'decisive')),
  CONSTRAINT valid_confirmation CHECK (confirmation_method IN ('button', 'photo', 'photo_required')),
  CONSTRAINT valid_sound CHECK (sound_mode IN ('silent', 'vibrate', 'soft', 'escalating')),
  CONSTRAINT valid_offset CHECK (reminder_offset_minutes >= 0),
  CONSTRAINT valid_snooze CHECK (snooze_duration_minutes > 0)
);

CREATE INDEX idx_journey_configs_user_id ON journey_configs(user_id);
CREATE INDEX idx_journey_configs_preset ON journey_configs(is_preset);

-- medication_schedules table
CREATE TABLE medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  target_time time NOT NULL,
  valid_window_start time NOT NULL,
  valid_window_end time NOT NULL,
  days_of_week jsonb NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
  journey_config_id uuid NOT NULL REFERENCES journey_configs(id),
  active_from date NOT NULL,
  active_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_session CHECK (session_name IN ('morning', 'noon', 'afternoon', 'evening', 'bedtime')),
  CONSTRAINT valid_window CHECK (valid_window_end > valid_window_start),
  CONSTRAINT valid_active_dates CHECK (active_until IS NULL OR active_until >= active_from)
);

CREATE INDEX idx_schedules_medication_id ON medication_schedules(medication_id);
CREATE INDEX idx_schedules_journey_config_id ON medication_schedules(journey_config_id);
CREATE INDEX idx_schedules_session ON medication_schedules(session_name);
CREATE INDEX idx_schedules_dates ON medication_schedules(active_from, active_until);

-- Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medications
CREATE POLICY "Users can view their own medications"
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for journey_configs
CREATE POLICY "Users can view their own configs and presets"
  ON journey_configs FOR SELECT
  USING (auth.uid() = user_id OR is_preset = true);

CREATE POLICY "Users can insert their own configs"
  ON journey_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can update their own configs"
  ON journey_configs FOR UPDATE
  USING (auth.uid() = user_id AND is_preset = false);

CREATE POLICY "Users can delete their own configs"
  ON journey_configs FOR DELETE
  USING (auth.uid() = user_id AND is_preset = false);

-- RLS Policies for medication_schedules
CREATE POLICY "Users can view schedules for their medications"
  ON medication_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert schedules for their medications"
  ON medication_schedules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

CREATE POLICY "Users can update schedules for their medications"
  ON medication_schedules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete schedules for their medications"
  ON medication_schedules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM medications
    WHERE medications.id = medication_schedules.medication_id
    AND medications.user_id = auth.uid()
  ));

-- Seed journey presets
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
  );

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
  );

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
  );
