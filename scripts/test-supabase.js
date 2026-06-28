#!/usr/bin/env node

/**
 * Test script to validate Supabase connection and auth.
 * Run with: node scripts/test-supabase.js
 */

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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Don't persist in Node.js test
    detectSessionInUrl: false,
  },
});

async function testConnection() {
  try {
    // Test basic connectivity
    const { error: healthError } = await supabase
      .from('_health_check')
      .select('*')
      .limit(1);

    // It's OK if table doesn't exist - we just want to verify connectivity
    if (
      healthError &&
      !healthError.message.includes('does not exist') &&
      !healthError.message.includes('Could not find the table')
    ) {
      return {
        success: false,
        error: `Connection failed: ${healthError.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function signInAnonymously() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      return {
        success: false,
        error: `Anonymous sign in failed: ${error.message}`,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Anonymous sign in succeeded but no user returned',
      };
    }

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Supabase connection...\n');

  // Test 1: Connection
  console.log('Test 1: Connection test');
  const connectionResult = await testConnection();
  if (connectionResult.success) {
    console.log('✅ Connection successful\n');
  } else {
    console.log('❌ Connection failed:', connectionResult.error, '\n');
    process.exit(1);
  }

  // Test 2: Anonymous auth
  console.log('Test 2: Anonymous authentication');
  const authResult = await signInAnonymously();
  if (authResult.success) {
    console.log('✅ Anonymous auth successful');
    console.log('   User ID:', authResult.userId, '\n');
    console.log('✅ Phase 1 environment validation complete!');
    console.log('\n📋 Next step: Apply migration 9 (seed data) in Supabase SQL Editor');
    console.log('   The session is now active and auth.uid() will return:', authResult.userId);
  } else {
    console.log('❌ Anonymous auth failed:', authResult.error, '\n');
    console.log('Note: Anonymous auth requires provider configuration in Supabase.');
    console.log('\n🔧 To enable anonymous auth:');
    console.log('   1. Go to Supabase Dashboard → Authentication → Providers');
    console.log('   2. Find "Anonymous" provider');
    console.log('   3. Toggle "Enabled"');
    console.log('   4. Save and retry this test\n');
    console.log('For now, Phase 2 migrations 1-8 are ready to apply.');
  }
}

runTests().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
