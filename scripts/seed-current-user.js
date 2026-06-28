#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(envVars.EXPO_PUBLIC_SUPABASE_URL, envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seedCurrentUser() {
  console.log('🌱 Seeding data for current user...\n');

  const { data: { session }, error: authError } = await supabase.auth.signInAnonymously();
  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    return;
  }

  const userId = session.user.id;
  console.log('✅ User ID:', userId);

  // Check if user already has data
  const { data: existingJourneys } = await supabase.from('journeys').select('*').eq('user_id', userId);
  if (existingJourneys && existingJourneys.length > 0) {
    console.log('⚠️  User already has journeys. Checking dose events...');
    const { data: events } = await supabase.from('dose_events').select('*').eq('user_id', userId);
    if (events && events.length > 0) {
      console.log(`✅ Found ${events.length} dose events. Data already seeded!`);
      return;
    }
    console.log('⚠️  No dose events found. Adding sample events...');
  }

  const today = new Date();
  const startDate = toDateKey(addDays(today, -7));

  console.log('\n📝 Creating journey...');
  const { data: journey, error: journeyError } = await supabase
    .from('journeys')
    .insert({
      user_id: userId,
      name: 'HP',
      status: 'active',
      start_date: startDate,
      preset: 'balanced',
    })
    .select()
    .single();

  if (journeyError) {
    console.error('❌ Journey creation failed:', journeyError.message);
    return;
  }
  console.log('✅ Journey created');

  console.log('📝 Creating medications...');
  const { data: medications, error: medError } = await supabase
    .from('medications')
    .insert([
      {
        journey_id: journey.id,
        user_id: userId,
        name: 'Lisinopril',
        dosage: '10mg',
        instructions: 'Sau ăn',
        start_date: startDate,
        status: 'active',
      },
      {
        journey_id: journey.id,
        user_id: userId,
        name: 'Atenolol',
        dosage: '25mg',
        instructions: 'Uống với nước',
        start_date: startDate,
        status: 'active',
      },
      {
        journey_id: journey.id,
        user_id: userId,
        name: 'Vitamin C',
        dosage: '1 viên',
        instructions: 'Sau ăn trưa',
        start_date: startDate,
        status: 'active',
      },
    ])
    .select();

  if (medError) {
    console.error('❌ Medication creation failed:', medError.message);
    return;
  }
  console.log('✅ Medications created');

  const lisinopril = medications.find(m => m.name === 'Lisinopril');
  const atenolol = medications.find(m => m.name === 'Atenolol');
  const vitaminC = medications.find(m => m.name === 'Vitamin C');

  console.log('📝 Creating schedules...');
  const { data: schedules, error: schedError } = await supabase
    .from('medication_schedules')
    .insert([
      {
        medication_id: lisinopril.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'morning',
        target_time: '08:00',
        window_start: '06:00',
        window_end: '10:00',
      },
      {
        medication_id: atenolol.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'morning',
        target_time: '08:00',
        window_start: '06:00',
        window_end: '10:00',
      },
      {
        medication_id: vitaminC.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'noon',
        target_time: '12:00',
        window_start: '11:00',
        window_end: '14:00',
      },
      {
        medication_id: atenolol.id,
        journey_id: journey.id,
        user_id: userId,
        period: 'evening',
        target_time: '20:00',
        window_start: '18:00',
        window_end: '21:30',
      },
    ])
    .select();

  if (schedError) {
    console.error('❌ Schedule creation failed:', schedError.message);
    return;
  }
  console.log('✅ Schedules created');

  const morningSchedule = schedules.find(s => s.medication_id === lisinopril.id && s.period === 'morning');
  const noonSchedule = schedules.find(s => s.period === 'noon');
  const eveningSchedule = schedules.find(s => s.period === 'evening');

  console.log('📝 Creating dose events...');
  const doseEvents = [
    {
      dateOffset: -4,
      medicationId: lisinopril.id,
      scheduleId: morningSchedule.id,
      time: '08:00',
      actionTime: '08:05',
      status: 'taken',
    },
    {
      dateOffset: -3,
      medicationId: vitaminC.id,
      scheduleId: noonSchedule.id,
      time: '12:00',
      actionTime: '12:45',
      status: 'late',
    },
    {
      dateOffset: -2,
      medicationId: atenolol.id,
      scheduleId: eveningSchedule.id,
      time: '20:00',
      actionTime: null,
      status: 'missed',
    },
    {
      dateOffset: -1,
      medicationId: lisinopril.id,
      scheduleId: morningSchedule.id,
      time: '08:00',
      actionTime: '08:03',
      status: 'taken',
    },
  ].map(event => {
    const date = toDateKey(addDays(today, event.dateOffset));
    return {
      user_id: userId,
      journey_id: journey.id,
      medication_id: event.medicationId,
      schedule_id: event.scheduleId,
      scheduled_for: `${date}T${event.time}:00`,
      action_taken_at: event.actionTime ? `${date}T${event.actionTime}:00` : null,
      status: event.status,
    };
  });

  const { error: eventError } = await supabase.from('dose_events').insert(doseEvents);

  if (eventError) {
    console.error('❌ Dose event creation failed:', eventError.message);
    return;
  }

  console.log('✅ Dose events created');
  console.log('\n🎉 Seed data created successfully!');
  console.log(`   ${doseEvents.length} dose events for dates: ${toDateKey(addDays(today, -4))} to ${toDateKey(addDays(today, -1))}`);
}

seedCurrentUser().catch(console.error);
