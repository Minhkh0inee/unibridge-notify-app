require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    transport: ws
  }
});

async function testMigration() {
  console.log('Testing database migration...\n');

  try {
    // Test 1: Check journey_configs table and presets
    console.log('1. Checking journey presets...');
    const { data: presets, error: presetsError } = await supabase
      .from('journey_configs')
      .select('*')
      .eq('is_preset', true);

    if (presetsError) throw presetsError;

    console.log(`   ✓ Found ${presets.length} presets:`);
    presets.forEach(p => console.log(`     - ${p.name} (${p.preset_type})`));

    // Test 2: Check medications table exists
    console.log('\n2. Checking medications table...');
    const { error: medsError } = await supabase
      .from('medications')
      .select('count')
      .limit(1);

    if (medsError) throw medsError;
    console.log('   ✓ Medications table accessible');

    // Test 3: Check medication_schedules table exists
    console.log('\n3. Checking medication_schedules table...');
    const { error: schedulesError } = await supabase
      .from('medication_schedules')
      .select('count')
      .limit(1);

    if (schedulesError) throw schedulesError;
    console.log('   ✓ Medication schedules table accessible');

    console.log('\n✅ Migration verified successfully!');
    console.log('\nYour database is ready for the Custom Journey and Calendar feature.');

  } catch (error) {
    console.error('\n❌ Migration test failed:', error.message);
    process.exit(1);
  }
}

testMigration();
