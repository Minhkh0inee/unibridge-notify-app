import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, FontSizes, Primary, Spacing } from '@/constants/theme';
import { saveJourney } from '@/data/storage';
import type { Journey } from '@/data/types';
import {
  scheduleCarryReminders,
  scheduleJourneyNotificationsAsync,
} from '@/notifications/notifications';
import { useTheme } from '@/hooks/use-theme';

type IntervalOption = 1 | 3 | 5;

interface MedDraft {
  name: string;
  dosage: string;
  reminderTimes: string[];
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

const INTERVAL_OPTIONS: IntervalOption[] = [1, 3, 5];

export default function CreateJourneyScreen() {
  const colors = useTheme();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [journeyName, setJourneyName] = useState('');
  const [durationDays, setDurationDays] = useState('14');
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [intervalMin, setIntervalMin] = useState<IntervalOption>(3);
  const [nameError, setNameError] = useState('');

  // Step 2
  const [medications, setMedications] = useState<MedDraft[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDosage, setDraftDosage] = useState('');
  const [draftTimes, setDraftTimes] = useState<string[]>(['08:00']);
  const [draftNameError, setDraftNameError] = useState('');
  const [draftDosageError, setDraftDosageError] = useState('');
  const [draftTimesErrors, setDraftTimesErrors] = useState<string[]>([]);
  const [medsError, setMedsError] = useState('');

  // Intercept Android hardware back to step through steps
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        setStep((s) => s - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

  // ── Step 1 ──────────────────────────────────────────────────────────────────

  function nextFromStep1() {
    if (!journeyName.trim()) {
      setNameError('Journey name is required.');
      return;
    }
    setNameError('');
    setStep(2);
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  function resetAddForm() {
    setDraftName('');
    setDraftDosage('');
    setDraftTimes(['08:00']);
    setDraftNameError('');
    setDraftDosageError('');
    setDraftTimesErrors([]);
  }

  function saveDraftMedication() {
    let valid = true;

    if (!draftName.trim()) {
      setDraftNameError('Medication name is required.');
      valid = false;
    } else {
      setDraftNameError('');
    }

    if (!draftDosage.trim()) {
      setDraftDosageError('Dosage is required.');
      valid = false;
    } else {
      setDraftDosageError('');
    }

    if (!draftTimes.length) {
      setDraftTimesErrors(['Add at least one time.']);
      valid = false;
    } else {
      const timeErrs = draftTimes.map((t) => (isValidTime(t) ? '' : 'Use HH:MM (e.g. 08:00)'));
      setDraftTimesErrors(timeErrs);
      if (timeErrs.some((e) => e)) valid = false;
    }

    if (!valid) return;

    setMedications((prev) => [
      ...prev,
      { name: draftName.trim(), dosage: draftDosage.trim(), reminderTimes: [...draftTimes] },
    ]);
    setMedsError('');
    resetAddForm();
    setShowAddForm(false);
  }

  function nextFromStep2() {
    if (!medications.length) {
      setMedsError('Add at least one medication.');
      return;
    }
    setMedsError('');
    setStep(3);
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  async function startJourney() {
    setSaving(true);
    try {
      const secs = intervalMin * 60;
      const journey: Journey = {
        id: genId(),
        name: journeyName.trim(),
        medications: medications.map((m) => ({
          id: genId(),
          name: m.name,
          dosage: m.dosage,
          reminderTimes: m.reminderTimes,
        })),
        escalationConfig: {
          startGentleSeconds: secs,
          stepSeconds: secs,
          requirePhotoToStop: requirePhoto,
        },
      };
      await saveJourney(journey);
      await scheduleJourneyNotificationsAsync(journey);
      await scheduleCarryReminders();
      router.replace('/');
    } catch {
      setSaving(false);
    }
  }

  // ── Shared style helpers ─────────────────────────────────────────────────────

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.backgroundElement,
      color: colors.text,
      borderColor: colors.backgroundSelected,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: colors.backgroundElement }]}>
          <Pressable onPress={goBack} hitSlop={8} style={styles.topBarSide}>
            <ThemedText type="small" themeColor="textSecondary">
              {step > 1 ? '← Back' : 'Cancel'}
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">Step {step} of 3</ThemedText>
          <View style={styles.topBarSide} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <ScrollView
              contentContainerStyle={[
                styles.stepContent,
                { paddingBottom: BottomTabInset + Spacing.four },
              ]}>
              <ThemedText type="subtitle">Journey Info</ThemedText>

              <View style={styles.field}>
                <ThemedText type="small">Journey Name</ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. HP Treatment"
                  placeholderTextColor={colors.textSecondary}
                  value={journeyName}
                  onChangeText={(t) => {
                    setJourneyName(t);
                    if (nameError) setNameError('');
                  }}
                />
                {nameError ? (
                  <ThemedText style={styles.errorText}>{nameError}</ThemedText>
                ) : null}
              </View>

              <View style={styles.field}>
                <ThemedText type="small">Duration (days)</ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="14"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={durationDays}
                  onChangeText={setDurationDays}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.row}>
                  <ThemedText type="small" style={styles.flex}>
                    Require photo to stop reminder
                  </ThemedText>
                  <Switch
                    value={requirePhoto}
                    onValueChange={setRequirePhoto}
                    trackColor={{ true: Primary }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <ThemedText type="small">Escalation interval</ThemedText>
                <View style={styles.segmented}>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[
                        styles.segmentBtn,
                        { borderColor: colors.backgroundSelected },
                        intervalMin === opt && {
                          backgroundColor: Primary,
                          borderColor: Primary,
                        },
                      ]}
                      onPress={() => setIntervalMin(opt)}>
                      <ThemedText
                        type="small"
                        style={intervalMin === opt ? styles.whiteText : undefined}
                        themeColor={intervalMin === opt ? undefined : 'textSecondary'}>
                        {opt} min
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Pressable style={styles.primaryBtn} onPress={nextFromStep1}>
                <ThemedText type="smallBold" style={styles.whiteText}>
                  Next →
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <ScrollView
              contentContainerStyle={[
                styles.stepContent,
                { paddingBottom: BottomTabInset + Spacing.four },
              ]}>
              <ThemedText type="subtitle">Medications</ThemedText>

              {medications.map((med, idx) => (
                <View
                  key={idx}
                  style={[styles.medCard, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{med.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {med.dosage}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() =>
                        setMedications((prev) => prev.filter((_, i) => i !== idx))
                      }
                      hitSlop={8}>
                      <ThemedText style={styles.deleteText}>×</ThemedText>
                    </Pressable>
                  </View>
                  <View style={styles.timePills}>
                    {med.reminderTimes.map((t) => (
                      <View
                        key={t}
                        style={[styles.timePill, { backgroundColor: colors.backgroundSelected }]}>
                        <ThemedText type="small">{t}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {medsError ? (
                <ThemedText style={styles.errorText}>{medsError}</ThemedText>
              ) : null}

              {!showAddForm && (
                <Pressable
                  style={[styles.outlineBtn, { borderColor: Primary }]}
                  onPress={() => {
                    resetAddForm();
                    setShowAddForm(true);
                  }}>
                  <ThemedText type="smallBold" style={{ color: Primary }}>
                    + Add Medication
                  </ThemedText>
                </Pressable>
              )}

              {showAddForm && (
                <View style={[styles.addForm, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="smallBold">New Medication</ThemedText>

                  <View style={styles.field}>
                    <ThemedText type="small">Name</ThemedText>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Amoxicillin"
                      placeholderTextColor={colors.textSecondary}
                      value={draftName}
                      onChangeText={(t) => {
                        setDraftName(t);
                        if (draftNameError) setDraftNameError('');
                      }}
                    />
                    {draftNameError ? (
                      <ThemedText style={styles.errorText}>{draftNameError}</ThemedText>
                    ) : null}
                  </View>

                  <View style={styles.field}>
                    <ThemedText type="small">Dosage</ThemedText>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. 500mg, 1 tablet"
                      placeholderTextColor={colors.textSecondary}
                      value={draftDosage}
                      onChangeText={(t) => {
                        setDraftDosage(t);
                        if (draftDosageError) setDraftDosageError('');
                      }}
                    />
                    {draftDosageError ? (
                      <ThemedText style={styles.errorText}>{draftDosageError}</ThemedText>
                    ) : null}
                  </View>

                  <View style={styles.field}>
                    <View style={styles.row}>
                      <ThemedText type="small" style={styles.flex}>
                        Reminder Times
                      </ThemedText>
                      <Pressable
                        onPress={() => setDraftTimes((prev) => [...prev, '08:00'])}
                        style={styles.addTimeBtn}>
                        <ThemedText style={styles.addTimeBtnText}>+</ThemedText>
                      </Pressable>
                    </View>
                    {draftTimes.map((t, i) => (
                      <View key={i} style={styles.timeInputRow}>
                        <TextInput
                          style={[inputStyle, styles.flex]}
                          placeholder="HH:MM"
                          placeholderTextColor={colors.textSecondary}
                          value={t}
                          maxLength={5}
                          keyboardType="numbers-and-punctuation"
                          onChangeText={(text) => {
                            setDraftTimes((prev) =>
                              prev.map((v, idx) => (idx === i ? text : v))
                            );
                            setDraftTimesErrors((prev) =>
                              prev.map((e, idx) => (idx === i ? '' : e))
                            );
                          }}
                        />
                        {draftTimes.length > 1 && (
                          <Pressable
                            onPress={() =>
                              setDraftTimes((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            hitSlop={8}>
                            <ThemedText style={styles.deleteText}>×</ThemedText>
                          </Pressable>
                        )}
                      </View>
                    ))}
                    {draftTimesErrors.map((e, i) =>
                      e ? (
                        <ThemedText key={i} style={styles.errorText}>
                          {`Time ${i + 1}: ${e}`}
                        </ThemedText>
                      ) : null
                    )}
                  </View>

                  <View style={styles.formActions}>
                    <Pressable
                      style={[
                        styles.outlineBtn,
                        styles.flex,
                        { borderColor: colors.backgroundSelected },
                      ]}
                      onPress={() => {
                        resetAddForm();
                        setShowAddForm(false);
                      }}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Cancel
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryBtn, styles.flex]}
                      onPress={saveDraftMedication}>
                      <ThemedText type="smallBold" style={styles.whiteText}>
                        Save Medication
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}

              {!showAddForm && (
                <Pressable style={styles.primaryBtn} onPress={nextFromStep2}>
                  <ThemedText type="smallBold" style={styles.whiteText}>
                    Next →
                  </ThemedText>
                </Pressable>
              )}
            </ScrollView>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <ScrollView
              contentContainerStyle={[
                styles.stepContent,
                { paddingBottom: BottomTabInset + Spacing.four },
              ]}>
              <ThemedText type="subtitle">Review</ThemedText>

              <View style={[styles.reviewCard, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">Journey Details</ThemedText>
                <ThemedText type="small">{journeyName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Duration: {durationDays} days
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Photo required: {requirePhoto ? 'Yes' : 'No'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Escalation interval: every {intervalMin} min
                </ThemedText>
              </View>

              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Medications ({medications.length})
              </ThemedText>
              {medications.map((med, i) => (
                <View
                  key={i}
                  style={[styles.reviewCard, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="smallBold">{med.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {med.dosage}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Reminders: {med.reminderTimes.join(', ')}
                  </ThemedText>
                </View>
              ))}

              <Pressable
                style={[styles.primaryBtn, saving && styles.disabledBtn]}
                onPress={startJourney}
                disabled={saving}>
                <ThemedText type="smallBold" style={styles.whiteText}>
                  {saving ? 'Starting…' : '🚀 Start Journey'}
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarSide: { minWidth: 60 },
  stepContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  field: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.one,
    fontSize: FontSizes.md,
  },
  segmented: { flexDirection: 'row', gap: Spacing.two },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: Primary,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  outlineBtn: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
  },
  whiteText: { color: '#fff' },
  errorText: { color: '#EF4444', fontSize: FontSizes.xs },
  medCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  deleteText: { fontSize: FontSizes.xl, color: '#EF4444', paddingHorizontal: Spacing.one },
  timePills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  timePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  addForm: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  addTimeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeBtnText: { color: '#fff', fontSize: FontSizes.lg, lineHeight: 22 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  formActions: { flexDirection: 'row', gap: Spacing.two },
  reviewCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  sectionLabel: { paddingTop: Spacing.one },
});
