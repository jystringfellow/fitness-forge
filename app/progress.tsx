import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { loadBuildProfile, loadWorkoutHistory } from '@/storage/appStorage';
import { getPushupProgramPrescription } from '@/data/pushupProgram';
import { theme } from '@/theme/brand';
import { BuildProfile, BuildWorkoutResult } from '@/types/build';

export default function ProgressScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<BuildProfile | null>(null);
  const [results, setResults] = useState<BuildWorkoutResult[]>([]);
  useFocusEffect(useCallback(() => {
    Promise.all([loadBuildProfile(), loadWorkoutHistory()]).then(([saved, history]) => {
      setProfile(saved); setResults(history.filter((item): item is BuildWorkoutResult => item.source === 'BUILD'));
    });
  }, []));

  if (!profile?.active) return <View style={styles.center}><Text style={styles.title}>Progress starts with BUILD.</Text><Text style={styles.body}>Set a capability goal, then every result keeps its variation, assistance, targets, and actual performance.</Text><TouchableOpacity style={styles.primary} onPress={() => router.push('/build')}><Text style={styles.primaryText}>Set Up BUILD</Text></TouchableOpacity></View>;

  const pushupProgram = getPushupProgramPrescription(profile.pushup);
  const pullupHistory = results.flatMap((result) => result.exercises.filter((exercise) => exercise.kind === 'pull-up').map((exercise) => ({ date: result.completedAt, exercise })));
  const pushupHistory = results.flatMap((result) => result.exercises.filter((exercise) => exercise.kind === 'push-up' || exercise.kind === 'assessment').map((exercise) => ({ date: result.completedAt, exercise })));
  const assistancePath = [...new Set(pullupHistory.map(({ exercise }) => exercise.completedSets.find((set) => set.status === 'completed')?.actualAssistanceLb).filter((value): value is number => value !== undefined))];

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>PHYSICAL CAPABILITY</Text><Text style={styles.title}>Progress you can feel.</Text><Text style={styles.body}>No points or guilt. Just a clear record of what your body can do now.</Text>
    {profile.pullup.enabled ? <View style={styles.card}>
      <Text style={styles.cardKicker}>PULL-UP</Text><Text style={styles.cardTitle}>First strict pull-up</Text>
      <Text style={styles.metric}>{profile.pullup.currentAssistanceLb === 0 ? `${profile.pullup.bestUnassistedReps} strict` : `${profile.pullup.currentAssistanceLb} lb assistance`}</Text>
      <Text style={styles.body}>Next prescription · {profile.pullup.targetReps.join(' / ')}</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, Math.min(100, profile.pullup.currentAssistanceLb === 0 ? 100 : 100 - profile.pullup.currentAssistanceLb))}%` }]} /></View>
      <Text style={styles.path}>{assistancePath.length ? `${assistancePath.join(' → ')}${profile.pullup.currentAssistanceLb === 0 ? ' → unassisted' : ''}` : 'Complete a session to begin the assistance history.'}</Text>
      <View style={styles.stats}><View><Text style={styles.statValue}>{profile.pullup.sessionsCompleted}</Text><Text style={styles.statLabel}>sessions</Text></View><View><Text style={styles.statValue}>{profile.pullup.bestUnassistedReps}</Text><Text style={styles.statLabel}>best strict reps</Text></View></View>
      {Object.entries(profile.pullup.milestoneDates).map(([milestone, date]) => <Text key={milestone} style={styles.milestone}>✓ {milestone.replace(/-/g, ' ')} · {new Date(date).toLocaleDateString()}</Text>)}
    </View> : null}
    {profile.pushup.enabled ? <View style={styles.card}>
      <Text style={styles.cardKicker}>PUSH-UP</Text><Text style={styles.cardTitle}>50 consecutive standard</Text>
      <Text style={styles.metric}>{profile.pushup.goalCompletedAt ? '50 · complete' : `${profile.pushup.currentVariation} · ${profile.pushup.baselineMax} max`}</Text>
      <Text style={styles.body}>{profile.pushup.assessmentDue ? `${profile.pushup.assessmentVariation} assessment next` : `Week ${profile.pushup.programWeek} · Day ${profile.pushup.programDay} · ${pushupProgram.bracket.label}`}</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (profile.pushup.bestStandardReps / 50) * 100)}%` }]} /></View>
      <Text style={styles.path}>Standard max · {profile.pushup.bestStandardReps} / 50</Text>
      <View style={styles.stats}><View><Text style={styles.statValue}>{profile.pushup.sessionsCompleted}</Text><Text style={styles.statLabel}>sessions</Text></View><View><Text style={styles.statValue}>{profile.pushup.assessments.length}</Text><Text style={styles.statLabel}>assessments</Text></View></View>
      {profile.pushup.assessments.slice().reverse().map((assessment) => <Text key={assessment.id} style={styles.assessment}>{assessment.variation} · {assessment.reps} consecutive · {new Date(assessment.completedAt).toLocaleDateString()}</Text>)}
    </View> : null}
    {(pullupHistory.length || pushupHistory.length) ? <Text style={styles.footer}>{results.length} BUILD session{results.length === 1 ? '' : 's'} recorded with full movement context.</Text> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, gap: 14, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, center: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: theme.colors.text, fontSize: 31, fontWeight: '900', textAlign: 'left' }, body: { color: theme.colors.textMuted, lineHeight: 21 },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 17, gap: 9 }, cardKicker: { color: theme.colors.purple, fontSize: 11, fontWeight: '900' }, cardTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900' }, metric: { color: theme.colors.lime, fontSize: 27, fontWeight: '900', textTransform: 'capitalize' },
  track: { height: 7, borderRadius: 99, overflow: 'hidden', backgroundColor: theme.colors.surfaceMuted, marginTop: 5 }, fill: { height: '100%', backgroundColor: theme.colors.lime }, path: { color: theme.colors.textSoft, fontSize: 13 }, stats: { flexDirection: 'row', gap: 36, paddingVertical: 8 }, statValue: { color: theme.colors.text, fontSize: 22, fontWeight: '900' }, statLabel: { color: theme.colors.textSubtle, fontSize: 12 }, milestone: { color: theme.colors.lime, textTransform: 'capitalize', fontWeight: '700' }, assessment: { color: theme.colors.textSoft, textTransform: 'capitalize', paddingTop: 7, borderTopColor: theme.colors.borderMuted, borderTopWidth: 1 }, footer: { color: theme.colors.textSubtle, textAlign: 'center' },
  primary: { backgroundColor: theme.colors.lime, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 8 }, primaryText: { color: theme.colors.ink, fontWeight: '900' }
});
