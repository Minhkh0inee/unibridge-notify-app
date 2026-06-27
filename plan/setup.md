Help me set up:

- Initialize an Expo project with expo-router (file-based routing)
- Install these packages: expo-av, expo-haptics, expo-camera, expo-image-picker,
  expo-notifications, @react-native-async-storage/async-storage
- Create folder structure: /screens, /components, /data, /utils
- A simple theme file (primary colors, spacing, font sizes) for shared use
  Explain how to run and test it using Expo Go on a real phone.

Create the data layer for a medication reminder app using AsyncStorage. I need these
TypeScript types and CRUD functions:

- Journey: { id, name (e.g. "HP"/"Asthma"), medications: Medication[], escalationConfig }
- Medication: { id, name, dosage, reminderTimes: string[] (e.g. ["08:00","20:00"]) }
- EscalationConfig: { startGentleSeconds, stepSeconds (default 180 = 3 minutes),
  requirePhotoToStop: boolean }
- DoseLog: { medicationId, scheduledTime, actionTakenAt, photoUri, status:
  "taken"|"ignored"|"pending" }

Write functions: saveJourney, getActiveJourney, logDose, getWeeklyLogs.
Create 2 sample journeys (HP and Asthma) for quick demos, seeded into AsyncStorage
on first app launch.r
