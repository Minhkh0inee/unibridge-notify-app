#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// Load environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Use the SAME storage as the app (AsyncStorage backed by local files)
const supabase = createClient(envVars.EXPO_PUBLIC_SUPABASE_URL, envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

async function debugCalendarData() {
  console.log('🔍 Debugging calendar data with app\'s persisted session...\n');

  // Get the persisted session (same as app)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('❌ Session error:', sessionError.message);
    return;
  }

  if (!session) {
    console.log('⚠️  No persisted session found. Creating anonymous session...');
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('❌ Auth failed:', error.message);
      return;
    }
    console.log('✅ New session created:', data.user.id);
  } else {
    console.log('✅ Using persisted session:', session.user.id);
  }

  // Get journeys
  const { data: journeys, error: journeyError } = await supabase
    .from('journeys')
    .select('*')
    .eq('status', 'active');

  if (journeyError) {
    console.error('❌ Journey fetch error:', journeyError.message);
    return;
  }

  if (!journeys || journeys.length === 0) {
    console.log('\n⚠️  No journeys found for this user');
    console.log('   The app should create a demo journey on first load');
    return;
  }

  console.log(`\n📊 Found ${journeys.length} journey(s):`);
  journeys.forEach(j => console.log(`   - ${j.name} (${j.id})`));

  const journey = journeys[0];

  // Get medications
  const { data: medications } = await supabase
    .from('medications')
    .select('*')
    .eq('journey_id', journey.id);

  console.log(`\n💊 Medications: ${medications?.length || 0}`);
  medications?.forEach(m => console.log(`   - ${m.name} (${m.dosage})`));

  // Get schedules
  const { data: schedules } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('journey_id', journey.id);

  console.log(`\n📅 Schedules: ${schedules?.length || 0}`);
  schedules?.forEach(s => console.log(`   - ${s.period} at ${s.target_time}`));

  // Get dose events
  const { data: events } = await supabase
    .from('dose_events')
    .select('*')
    .eq('journey_id', journey.id)
    .order('scheduled_for', { ascending: true });

  console.log(`\n💉 Dose Events: ${events?.length || 0}`);
  if (events && events.length > 0) {
    events.forEach(e => {
      const date = e.scheduled_for.split('T')[0];
      const time = e.scheduled_for.split('T')[1]?.substring(0, 5);
      console.log(`   - ${date} ${time} → ${e.status}`);
    });
  } else {
    console.log('   ⚠️  NO DOSE EVENTS FOUND');
    console.log('   This is why the calendar shows no dots!');
  }

  // Get session configs
  const { data: configs } = await supabase
    .from('journey_session_configs')
    .select('*')
    .eq('journey_id', journey.id);

  console.log(`\n⚙️  Session Configs: ${configs?.length || 0}`);
}

debugCalendarData().catch(console.error);
