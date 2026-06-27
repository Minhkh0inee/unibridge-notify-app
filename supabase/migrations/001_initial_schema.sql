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
