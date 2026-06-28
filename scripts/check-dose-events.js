#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

async function checkDoseEvents() {
  console.log('🔍 Checking dose events in database...\n');

  // Get anonymous session
  const { data: { session }, error: authError } = await supabase.auth.signInAnonymously();
  if (authError) {
    console.error('❌ Auth error:', authError.message);
    return;
  }
  console.log('✅ Authenticated as:', session.user.id);

  // Get all dose events
  const { data: events, error } = await supabase
    .from('dose_events')
    .select('*')
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('❌ Error fetching dose events:', error.message);
    return;
  }

  if (!events || events.length === 0) {
    console.log('\n⚠️  No dose events found in database');
    console.log('   This means either:');
    console.log('   1. The seed migration (20260628000009) has not been run yet, OR');
    console.log('   2. RLS policies are blocking access (check user_id matches)');
    return;
  }

  console.log(`\n📊 Found ${events.length} dose events:\n`);
  events.forEach(e => {
    const date = e.scheduled_for.split('T')[0];
    const time = e.scheduled_for.split('T')[1]?.substring(0, 5) || '??:??';
    const medId = e.medication_id.substring(0, 8);
    console.log(`  ${date} ${time} - Status: ${e.status.padEnd(7)} - Med: ${medId}...`);
  });
}

checkDoseEvents().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
