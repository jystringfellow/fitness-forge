import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createInitialBuildProfile, PUSHUP_VARIATIONS } from '@/data/buildProgram';
import { getPushupProgramPrescription } from '@/data/pushupProgram';
import { loadBuildProfile, resetBuildData, saveActiveBuildWorkout, saveBuildProfile } from '@/storage/appStorage';
import { theme } from '@/theme/brand';
import { BuildProfile, PushupVariation } from '@/types/build';
import { useAuth } from '@/auth/AuthProvider';

function NumberField({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))} keyboardType="number-pad" /><Text style={styles.suffix}>{suffix}</Text></View></View>;
}

function RestChoice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ label: string; value: T }>; onChange: (value: T) => void }) {
  return <View style={styles.restSetting}><Text style={styles.label}>{label}</Text><View style={styles.chipRow}>{options.map((option) => <TouchableOpacity key={String(option.value)} style={[styles.chip, value === option.value && styles.chipActive]} onPress={() => onChange(option.value)}><Text style={[styles.chipText, value === option.value && styles.chipTextActive]}>{option.label}</Text></TouchableOpacity>)}</View></View>;
}

export default function BuildScreen() {
  const router = useRouter();
  const { dataRevision } = useAuth();
  const [profile, setProfile] = useState<BuildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pullupEnabled, setPullupEnabled] = useState(true);
  const [assistance, setAssistance] = useState('40');
  const [pullupReps, setPullupReps] = useState('10');
  const [increment, setIncrement] = useState('5');
  const [pushupEnabled, setPushupEnabled] = useState(true);
  const [variation, setVariation] = useState<PushupVariation>('knee');
  const [pushupMax, setPushupMax] = useState('20');

  useFocusEffect(useCallback(() => {
    loadBuildProfile().then((saved) => { setProfile(saved); setLoading(false); }).catch(() => setLoading(false));
  }, [dataRevision]));

  const activate = async () => {
    const next = createInitialBuildProfile({
      pullupEnabled,
      pullupAssistanceLb: Number(assistance) || 0,
      pullupCurrentReps: Number(pullupReps) || 1,
      assistanceIncrementLb: Number(increment) || 5,
      pushupEnabled,
      pushupVariation: variation,
      pushupCurrentMax: Number(pushupMax) || 1
    });
    await saveBuildProfile(next);
    setProfile(next);
    router.replace('/');
  };

  const updateRest = async (update: Partial<BuildProfile['rest']>) => {
    if (!profile) return;
    const next = { ...profile, updatedAt: new Date().toISOString(), rest: { ...profile.rest, ...update } };
    await Promise.all([saveBuildProfile(next), saveActiveBuildWorkout(null)]);
    setProfile(next);
  };

  if (loading) return <View style={styles.center}><Text style={styles.body}>Loading BUILD…</Text></View>;

  if (profile?.active) {
    const pushupProgram = getPushupProgramPrescription(profile.pushup);
    return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>BUILD PROGRAM</Text><Text style={styles.title}>Capability, on purpose.</Text>
      <Text style={styles.body}>Your next workout is already prescribed. Progression remains submaximal and changes only from recorded performance.</Text>
      {profile.pullup.enabled ? <View style={styles.card}><Text style={styles.cardTitle}>First strict pull-up</Text><Text style={styles.metric}>{profile.pullup.currentAssistanceLb === 0 ? `${profile.pullup.bestUnassistedReps} best unassisted` : `${profile.pullup.currentAssistanceLb} lb assistance`}</Text><Text style={styles.body}>Next: {profile.pullup.targetReps.join(' / ')}</Text></View> : null}
      {profile.pushup.enabled ? <View style={styles.card}><Text style={styles.cardTitle}>50 strict push-ups</Text><Text style={styles.metric}>{profile.pushup.currentVariation} · max {profile.pushup.baselineMax}</Text><Text style={styles.body}>{profile.pushup.goalCompletedAt ? 'Goal complete' : profile.pushup.assessmentDue ? `${profile.pushup.assessmentVariation} assessment next` : `Week ${profile.pushup.programWeek} · Day ${profile.pushup.programDay} · ${pushupProgram.bracket.label}`}</Text></View> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rest settings</Text><Text style={styles.body}>Short defaults keep BUILD dense. Add time during a workout whenever form or breathing needs it.</Text>
        <RestChoice label="Pull-up sets" value={profile.rest.pullupSeconds} options={[45, 60, 90].map((value) => ({ label: `${value}s`, value }))} onChange={(pullupSeconds) => updateRest({ pullupSeconds })} />
        <RestChoice label="Push-up sets" value={profile.rest.pushupMode === 'program' ? 'program' : String(profile.rest.pushupSeconds)} options={[{ label: '45s', value: '45' }, { label: '60s', value: '60' }, { label: '90s', value: '90' }, { label: 'Program', value: 'program' }]} onChange={(value) => value === 'program' ? updateRest({ pushupMode: 'program' }) : updateRest({ pushupMode: 'custom', pushupSeconds: Number(value) })} />
        <RestChoice label="Strength accessories" value={profile.rest.strengthSeconds} options={[45, 60, 90].map((value) => ({ label: `${value}s`, value }))} onChange={(strengthSeconds) => updateRest({ strengthSeconds })} />
        <RestChoice label="Conditioning + core" value={profile.rest.conditioningSeconds} options={[30, 45, 60].map((value) => ({ label: `${value}s`, value }))} onChange={(conditioningSeconds) => updateRest({ conditioningSeconds })} />
        <Text style={styles.settingNote}>Changes apply to the next unstarted prescription.</Text>
      </View>
      <TouchableOpacity style={styles.primary} onPress={() => router.push('/')}><Text style={styles.primaryText}>View Today’s Workout</Text></TouchableOpacity>
      <TouchableOpacity style={styles.reset} onPress={async () => { await resetBuildData(); setProfile(null); }}><Text style={styles.resetText}>Restart BUILD setup</Text></TouchableOpacity>
    </ScrollView>;
  }

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.kicker}>QUICK SETUP</Text><Text style={styles.title}>Start easier. Build steadily.</Text>
    <Text style={styles.body}>Choose only the baselines needed to make your first prescription. You can deliberately start below your maximum variation.</Text>
    <View style={styles.card}>
      <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.cardTitle}>First strict pull-up</Text><Text style={styles.body}>Reduce assistance gradually, then build unassisted reps.</Text></View><Switch value={pullupEnabled} onValueChange={setPullupEnabled} trackColor={{ true: theme.colors.lime }} /></View>
      {pullupEnabled ? <><NumberField label="Current assistance" value={assistance} onChange={setAssistance} suffix="lb" /><NumberField label="Current good-form reps" value={pullupReps} onChange={setPullupReps} suffix="reps" /><NumberField label="Assistance step" value={increment} onChange={setIncrement} suffix="lb" /></> : null}
    </View>
    <View style={styles.card}>
      <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.cardTitle}>50 strict push-ups</Text><Text style={styles.body}>Build volume at one variation, assess, then recalibrate.</Text></View><Switch value={pushupEnabled} onValueChange={setPushupEnabled} trackColor={{ true: theme.colors.lime }} /></View>
      {pushupEnabled ? <><Text style={styles.label}>Starting variation</Text><View style={styles.chipRow}>{PUSHUP_VARIATIONS.map((item) => <TouchableOpacity key={item.id} style={[styles.chip, variation === item.id && styles.chipActive]} onPress={() => setVariation(item.id)}><Text style={[styles.chipText, variation === item.id && styles.chipTextActive]}>{item.label}</Text></TouchableOpacity>)}</View><NumberField label="Current max with good form" value={pushupMax} onChange={setPushupMax} suffix="reps" /></> : null}
    </View>
    <View style={styles.note}><Text style={styles.noteTitle}>Your default week</Text><Text style={styles.body}>Monday · Strength A{`\n`}Wednesday · Strength B{`\n`}Friday · Strength C (lighter lower body before soccer)</Text></View>
    <TouchableOpacity disabled={!pullupEnabled && !pushupEnabled} style={[styles.primary, !pullupEnabled && !pushupEnabled && styles.disabled]} onPress={activate}><Text style={styles.primaryText}>Activate BUILD</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, gap: 14, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 }, title: { color: theme.colors.text, fontSize: 31, fontWeight: '900' }, body: { color: theme.colors.textMuted, lineHeight: 21 },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 16, gap: 13 }, cardTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '900' }, metric: { color: theme.colors.lime, fontSize: 24, fontWeight: '900', textTransform: 'capitalize' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 }, toggleCopy: { flex: 1, gap: 4 }, field: { gap: 7 }, label: { color: theme.colors.textSoft, fontWeight: '800' }, inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, input: { flex: 1, color: theme.colors.text, backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 18, fontWeight: '800' }, suffix: { color: theme.colors.textMuted, width: 40 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: theme.colors.border, borderWidth: 1, backgroundColor: theme.colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 }, chipActive: { backgroundColor: theme.colors.lime, borderColor: theme.colors.lime }, chipText: { color: theme.colors.textSoft, fontWeight: '800' }, chipTextActive: { color: theme.colors.ink }, restSetting: { gap: 7, paddingTop: 4, borderTopColor: theme.colors.borderMuted, borderTopWidth: 1 }, settingNote: { color: theme.colors.textSubtle, fontSize: 12 },
  note: { borderLeftColor: theme.colors.purple, borderLeftWidth: 3, padding: 14, backgroundColor: theme.colors.surface, gap: 5 }, noteTitle: { color: theme.colors.text, fontWeight: '900' }, primary: { backgroundColor: theme.colors.lime, padding: 16, borderRadius: 8, alignItems: 'center' }, primaryText: { color: theme.colors.ink, fontSize: 16, fontWeight: '900' }, disabled: { opacity: 0.35 }, reset: { alignItems: 'center', padding: 13 }, resetText: { color: theme.colors.textSubtle, fontWeight: '700' }
});
