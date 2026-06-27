Create an EscalatingReminder component — this is the core feature, a full-screen modal
that reminds the user to take medication using an escalation mechanism. Requirements:

ESCALATION STATES (changing every 3 minutes, using setInterval/useEffect):

- Level 0 (0-3 min): HAPPY mascot, soft background color, quiet sound, gentle text
  "Time to take your medicine!"
- Level 1 (3-6 min): SLIGHTLY SAD/FROWNING mascot, warning-yellow background, louder
  sound + light vibration (expo-haptics), more urgent text
- Level 2 (6+ min): ANGRY mascot, red background, loud sound + strong continuous
  vibration, harsh text "You're skipping your dose! The bacteria are becoming
  resistant!"

MASCOT: use 3 PNG images (happy/frowning/angry) — I'll swap the images later, for now
use placeholders or large emoji (😊/😟/😠).

TWO BUTTONS:

- "Ignore": logs status="ignored", closes the modal (but if requirePhotoToStop is on,
  this button is dimmed/disabled)
- "Photo confirm dose taken": opens expo-camera, after capture → logs status="taken"
  - photoUri + actionTakenAt = current timestamp → CLOSES modal + stops sound/vibration

Use expo-av for sound, expo-haptics for vibration. Must clean up the interval/sound on
unmount. Give me a test button to manually trigger this modal for the demo.
