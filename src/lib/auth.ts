import { supabase } from './supabase';

/**
 * Test Supabase connection and auth setup.
 * For MVP, we use anonymous auth to minimize friction.
 * Can be upgraded to email auth when user accounts are required.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Test 1: Check if we can reach Supabase
    const { error: healthError } = await supabase
      .from('_health_check')
      .select('*')
      .limit(1);

    // It's OK if the table doesn't exist - we just want to verify connectivity
    if (
      healthError &&
      !healthError.message.includes('does not exist') &&
      !healthError.message.includes('Could not find the table')
    ) {
      return {
        success: false,
        error: `Supabase connection failed: ${healthError.message}`,
      };
    }

    // Test 2: Check current session
    const { error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        success: false,
        error: `Auth session check failed: ${sessionError.message}`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sign in anonymously for MVP testing.
 * Anonymous users can use the app without providing email/password.
 */
export async function signInAnonymously(): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ensure the app has an authenticated identity before querying user-owned data.
 * The MVP uses Supabase anonymous auth, so this creates a real auth.users row
 * without showing a login screen.
 */
export async function ensureAnonymousSession(): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return {
        success: false,
        error: `Auth session check failed: ${error.message}`,
      };
    }

    if (session?.user) {
      return {
        success: true,
        userId: session.user.id,
      };
    }

    return signInAnonymously();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get current user ID if authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
