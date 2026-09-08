import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PUSHUP_VARIATIONS } from '@/data/buildProgram';
import { applyPushupAssessment } from '@/lib/pushupProgression';
import { loadBuildProfile, saveActiveBuildWorkout, saveBuildProfile } from '@/storage/appStorage';
import { theme } from '@/theme/brand';
import { BuildProfile, CompletedExercise } from '@/types/build';

export default function PushupAssessmentScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BuildProfile | null>(null);
  const [reps, setReps] = useState(0);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    loadBuildProfile().then(setProfile);
  }, []);

  if (!profile) return <View style={styles.center}><ActivityIndicator color={theme.colors.lime} /></View>;
  if (!profile.pushup.assessmentDue && !summary) return <View style={styles.center}><Text style={styles.title}>No push-up check-in is due.</Text><TouchableOpacity style={styles.primary} onPress={() => router.replace('/')}><Text style={styles.primaryText}>Return to Today</Text></TouchableOpacity></View>;
  if (summary) return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Text style={styles.kicker}>CHECK-IN RECORDED</Text><Text style={styles.title}>Your next prescription is ready.</Text><View style={styles.card}><Text style={styles.summary}>{summary}</Text></View><TouchableOpacity style={styles.primary} onPress={() => router.replace('/')}><Text style={styles.primaryText}>See Next Workout</Text></TouchableOpacity></ScrollView>;

  const variation = profile.pushup.assessmentVariation;
  const label = PUSHUP_VARIATIONS.find((item) => item.id === variation)?.label ?? variation;
  const save = async () => {
    if (saving) return;
    setSaving(true);
    const completedAt = new Date().toISOString();
    const set = { id: `assessment-set-${Date.parse(completedAt) || Date.now()}`, targetReps: 0, targetType: 'assessment' as const };
    const exercise: CompletedExercise = {
      prescriptionId: `assessment-${Date.parse(completedAt) || Date.now()}`,
      exerciseId: `${variation}-push-up`,
      name: `${label} Push-Up Assessment`,
      kind: 'assessment',
      variation,
      prescribedSets: [set],
      completedSets: [{ ...set, actualReps: reps, status: 'completed' }],
      skipped: false
    };
    const update = applyPushupAssessment(profile.pushup, exercise, completedAt);
    const next = { ...profile, updatedAt: completedAt, pushup: update.state };
    await Promise.all([saveBuildProfile(next), saveActiveBuildWorkout(null)]);
    setProfile(next);
    setSummary(update.summary);
    setSaving(false);
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>SEPARATE CHECK-IN</Text><Text style={styles.title}>{label} push-up assessment</Text>
    <Text style={styles.body}>After a comfortable warm-up, perform one maximum set of strict, good-form reps. Stop when your form changes.</Text>
    <View style={styles.card}><Text style={styles.context}>Previous {profile.pushup.currentVariation} max</Text><Text style={styles.previous}>{profile.pushup.baselineMax}</Text><Text style={styles.body}>This is context, not a target. Record whatever you can do today.</Text></View>
    <View style={styles.card}><Text style={styles.context}>GOOD-FORM REPS</Text><View style={styles.stepper}><TouchableOpacity accessibilityLabel="Decrease reps" style={styles.stepButton} onPress={() => setReps((value) => Math.max(0, value - 1))}><Text style={styles.stepText}>−</Text></TouchableOpacity><Text style={styles.reps}>{reps}</Text><TouchableOpacity accessibilityLabel="Increase reps" style={styles.stepButton} onPress={() => setReps((value) => value + 1)}><Text style={styles.stepText}>+</Text></TouchableOpacity></View></View>
    <TouchableOpacity disabled={saving || reps < 1} style={[styles.primary, (saving || reps < 1) && styles.disabled]} onPress={save}><Text style={styles.primaryText}>{saving ? 'SAVING…' : 'SAVE CHECK-IN'}</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, gap: 16, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, center: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: theme.colors.text, fontSize: 30, fontWeight: '900' }, body: { color: theme.colors.textMuted, lineHeight: 22 }, card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 18, gap: 10 }, context: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, previous: { color: theme.colors.purple, fontSize: 30, fontWeight: '900' }, summary: { color: theme.colors.lime, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, stepButton: { width: 56, height: 48, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, stepText: { color: theme.colors.text, fontSize: 28, fontWeight: '800' }, reps: { color: theme.colors.lime, fontSize: 42, fontWeight: '900' }, primary: { backgroundColor: theme.colors.lime, borderRadius: 8, padding: 16, alignItems: 'center' }, primaryText: { color: theme.colors.ink, fontWeight: '900', fontSize: 16 }, disabled: { opacity: 0.4 }
});
