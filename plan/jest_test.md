Set up Jest testing for a React Native + Expo (TypeScript) project,
then write unit tests for the core logic files.

STEP 1 — Install and configure Jest:

Install these packages:
npm install --save-dev jest @types/jest ts-jest \
 @testing-library/react-native @testing-library/jest-native \
 jest-expo

In package.json, add:
"scripts": {
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
},
"jest": {
"preset": "jest-expo",
"setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
"transformIgnorePatterns": [
"node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
],
"moduleNameMapper": {
"^@/(._)$": "<rootDir>/src/$1"
},
"testPathPattern": "._\\.test\\.(ts|tsx)$"
}

STEP 2 — Mock AsyncStorage globally:
Create file **mocks**/@react-native-async-storage/async-storage.ts:
const mockStorage: Record<string, string> = {};
export default {
getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
setItem: jest.fn((key: string, value: string) => {
mockStorage[key] = value;
return Promise.resolve();
}),
removeItem: jest.fn((key: string) => {
delete mockStorage[key];
return Promise.resolve();
}),
clear: jest.fn(() => {
Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
return Promise.resolve();
}),
};

STEP 3 — Write these test files:

--- FILE: src/utils/date.test.ts ---
Test src/utils/date.ts:

- sevenDaysAgo() returns a Date exactly 7 days before now (within 1 second tolerance)
- Today's date string (YYYY-MM-DD format) matches new Date().toISOString().split('T')[0]
- sevenDaysAgo() result is less than new Date()

--- FILE: src/data/storage.test.ts ---
Test src/data/storage.ts — mock AsyncStorage (already mocked globally):

beforeEach: clear AsyncStorage mock between tests

Test saveJourney + getActiveJourney:

- Save a sample Journey → getActiveJourney returns same object
- getActiveJourney returns null when nothing saved

Test logDose + getWeeklyLogs:

- Log a dose with status="taken", actionTakenAt = now ISO string
  → getWeeklyLogs returns array containing that log
- Log a dose with actionTakenAt = 8 days ago
  → getWeeklyLogs does NOT return it (outside 7-day window)
- Logging multiple doses → all appear in getWeeklyLogs (within window)
- DoseLog fields are preserved exactly: medicationId, scheduledTime,
  actionTakenAt, status, photoUri

Test saveCarryLog + getTodayCarryLog (if these functions exist in storage.ts):

- Save a CarryLog for today → getTodayCarryLog returns it
- getTodayCarryLog returns null when nothing saved for today

Sample data to use in tests:
const sampleMedication = {
id: 'med-1',
name: 'Amoxicillin',
dosage: '500mg',
reminderTimes: ['08:00', '13:00', '20:00'],
};
const sampleJourney = {
id: 'journey-1',
name: 'HP Treatment',
medications: [sampleMedication],
escalationConfig: {
startGentleSeconds: 60,
stepSeconds: 180,
requirePhotoToStop: true,
},
};

--- FILE: src/components/escalating-reminder/escalation-levels.test.ts ---
Test src/components/escalating-reminder/escalation-levels.ts:

- Import whatever is exported from escalation-levels.ts
  (inspect the file first to understand the export shape)
- Test that level 0 config exists and has the expected properties
  (gentle/soft values)
- Test that level 1 config has stronger values than level 0
- Test that level 2 config has the strongest values (max intensity)
- If there is a function that maps elapsed seconds to a level:
  - 0 seconds → level 0
  - 181 seconds (just past stepSeconds=180) → level 1
  - 361 seconds → level 2
- If levels are just exported constants, test their shape:
  - Each level has: a text/message field, a haptic intensity field or similar
  - Level 2 message contains urgency language

--- FILE: src/services/medication-verification.test.ts ---
Test src/services/medication-verification.ts:

- Mock global fetch
- Test success case: fetch returns { contains_medication: true, confidence: "high" }
  → verification function resolves to a truthy/success result
- Test rejection case: fetch returns { contains_medication: false, confidence: "high" }
  → verification function resolves to a falsy/failure result
- Test low confidence case: { contains_medication: true, confidence: "low" }
  → treated as failure (not verified)
- Test network error: fetch throws → function handles gracefully
  (resolves with fallback, does NOT throw uncaught)
- Test timeout: if the service has a timeout mechanism,
  AbortController fires after timeout → handled gracefully
- Do NOT test implementation details of the API call itself,
  only test the public interface of the verification service

STEP 4 — Verify setup works:
After writing all files, run:
npx jest --passWithNoTests
and fix any configuration errors that appear.

IMPORTANT NOTES:

- Read each source file before writing its test —
  match tests exactly to what is actually exported
- If a function does not exist in the source file, skip that test
- Do not mock the modules under test, only mock their dependencies
  (AsyncStorage, fetch, expo modules)
- Each test file must have: describe block → beforeEach clear mocks →
  individual it() blocks
- Tests should be independent — no test should depend on another test's state
