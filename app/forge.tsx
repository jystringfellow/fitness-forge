import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EXERCISES } from '@/data/exercises';
import { buildTargetsMatchPlan, formatCircuitRoundPreview, generateWorkout } from '@/lib/generateWorkout';
import { brandIcon, theme } from '@/theme/brand';
import {
  ATTACHMENT_OPTIONS,
  ENERGY_OPTIONS,
  FOCUS_OPTIONS,
  TIME_OPTIONS,
  Attachment,
  Energy,
  Focus,
  TimeOption,
  FixedStation,
  WorkoutPlan
} from '@/types/workout';
import { loadBuildProfile } from '@/storage/appStorage';
import { loadFixedStations, saveFixedStations, setCurrentWorkout } from '@/storage/workoutStorage';

function Chip<T extends string | number>({
  label,
  active,
  onPress
}: {
  label: T;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{String(label)}</Text>
    </TouchableOpacity>
  );
}

function formatLabel(value: string | number) {
  return String(value).replace(/-/g, ' ');
}

export default function ForgeScreen() {
  const router = useRouter();
  const [time, setTime] = useState<TimeOption>(20);
  const [energy, setEnergy] = useState<Energy>('normal');
  const [focus, setFocus] = useState<Focus>('full body');
  const [attachment, setAttachment] = useState<Attachment>('recommended');
  const [generatedPlan, setGeneratedPlan] = useState<WorkoutPlan | null>(null);
  const [fixedStations, setFixedStations] = useState<FixedStation[]>([]);
  const [circuitRounds, setCircuitRounds] = useState<3 | 4 | 5>(4);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [generationError, setGenerationError] = useState('');

  useEffect(() => { loadFixedStations().then(setFixedStations).catch(() => {}); }, []);

  const updateStations = (stations: FixedStation[]) => {
    setFixedStations(stations);
    setGeneratedPlan(null);
    setGenerationError('');
    saveFixedStations(stations).catch(() => {});
  };

  const addStation = (exerciseId: string) => {
    if (fixedStations.some((item) => item.exerciseId === exerciseId)) return;
    updateStations([...fixedStations, {
      id: `${exerciseId}-${Date.now()}`, exerciseId,
      mode: exerciseId.startsWith('build-') ? 'build' : 'time', seconds: exerciseId.startsWith('build-') ? undefined : 30, reps: 10, frequency: 'every-round'
    }]);
    setShowExercisePicker(false);
    setExerciseSearch('');
  };

  const editStation = (id: string, update: Partial<FixedStation>) => updateStations(fixedStations.map((item) => item.id === id ? { ...item, ...update } : item));

  const clearGeneratedPlan = () => setGeneratedPlan(null);

  const onGenerate = async () => {
    try {
      const profile = await loadBuildProfile();
      setGeneratedPlan(generateWorkout({ time, energy, focus, attachment, circuitRounds, fixedStations }, true, profile ?? undefined));
      setGenerationError('');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Could not create this workout.');
    }
  };

  const onStartWorkout = async () => {
    if (!generatedPlan) {
      return;
    }

    if (generatedPlan.linkedExercises?.length) {
      const profile = await loadBuildProfile();
      if (!profile?.active) { setGenerationError('Your BUILD profile is no longer active. Regenerate to review this workout.'); return; }
      if (!buildTargetsMatchPlan(profile, generatedPlan.linkedExercises)) {
        setGeneratedPlan(generateWorkout({ time, energy, focus, attachment, circuitRounds, fixedStations }, true, profile));
        setGenerationError('Your BUILD targets changed. Review the refreshed workout before starting.');
        return;
      }
    }
    await setCurrentWorkout(generatedPlan);
    router.push('/workout');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopline}>
          <View style={styles.brandRow}>
            <Image source={brandIcon} style={styles.brandMark} />
            <Text style={styles.kicker}>Forge mode</Text>
          </View>
          <Text style={styles.heroBadge}>Varied training</Text>
        </View>
        <Text style={styles.title}>Forge a Workout</Text>
        <Text style={styles.subtitle}>
          Choose today’s constraints and turn them into a fun, varied session.
        </Text>
      </View>

      {!generatedPlan ? (
        <>
          <View style={styles.sectionPanel}>
            <Text style={styles.section}>Time available</Text>
            <View style={styles.row}>
              {TIME_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={`${option} min`}
                  active={time === option}
                  onPress={() => {
                    setTime(option);
                    clearGeneratedPlan();
                  }}
                />
              ))}
            </View>

            <Text style={styles.section}>Energy</Text>
            <View style={styles.row}>
              {ENERGY_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={formatLabel(option)}
                  active={energy === option}
                  onPress={() => {
                    setEnergy(option);
                    clearGeneratedPlan();
                  }}
                />
              ))}
            </View>

            <Text style={styles.section}>Focus</Text>
            <View style={styles.row}>
              {FOCUS_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={formatLabel(option)}
                  active={focus === option}
                  onPress={() => {
                    setFocus(option);
                    clearGeneratedPlan();
                  }}
                />
              ))}
            </View>

            <Text style={styles.section}>Attachment</Text>
            <View style={styles.row}>
              {ATTACHMENT_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={formatLabel(option)}
                  active={attachment === option}
                  onPress={() => {
                    setAttachment(option);
                    clearGeneratedPlan();
                  }}
                />
              ))}
            </View>

            {fixedStations.length ? <><Text style={styles.section}>Circuit rounds</Text><View style={styles.row}>{([3, 4, 5] as const).map((count) => <Chip key={count} label={count} active={circuitRounds === count} onPress={() => { setCircuitRounds(count); clearGeneratedPlan(); }} />)}</View></> : null}

            <Text style={styles.section}>Fixed stations</Text>
            <Text style={styles.helper}>Keep these in your circuit. FORGE fills the other stations.</Text>
            {fixedStations.map((station) => {
              const name = station.exerciseId === 'random-core' ? 'Random bodyweight core' : station.exerciseId === 'build-pull-up' ? 'BUILD pull-ups' : station.exerciseId === 'build-push-up' ? 'BUILD push-ups' : EXERCISES.find((item) => item.id === station.exerciseId)?.name ?? station.exerciseId;
              return <View key={station.id} style={styles.stationCard}>
                <View style={styles.stationTop}><Text style={styles.stationName}>{name}</Text><TouchableOpacity onPress={() => updateStations(fixedStations.filter((item) => item.id !== station.id))}><Text style={styles.remove}>Remove</Text></TouchableOpacity></View>
                {station.mode === 'build' ? <><Text style={styles.helper}>Uses your saved BUILD targets, actual reps, and assistance. Appears once per prescribed set.</Text><Text style={styles.helper}>Work window</Text><View style={styles.row}><Chip label="Rep paced" active={!station.seconds} onPress={() => editStation(station.id, { seconds: undefined })} />{[20, 25, 30].map((seconds) => <Chip key={seconds} label={`${seconds}s`} active={station.seconds === seconds} onPress={() => editStation(station.id, { seconds })} />)}</View></> : <>
                  <View style={styles.row}><Chip label="Time" active={station.mode === 'time'} onPress={() => editStation(station.id, { mode: 'time' })} /><Chip label="Reps" active={station.mode === 'reps'} onPress={() => editStation(station.id, { mode: 'reps' })} /></View>
                  <View style={styles.row}>{(station.mode === 'time' ? [20, 25, 30, 45] : [5, 10, 15, 20]).map((value) => <Chip key={value} label={station.mode === 'time' ? `${value}s` : `${value} reps`} active={station.mode === 'time' ? station.seconds === value : station.reps === value} onPress={() => editStation(station.id, station.mode === 'time' ? { seconds: value } : { reps: value })} />)}</View>
                  <Text style={styles.helper}>How often?</Text>
                  <View style={styles.row}><Chip label="Every round" active={station.frequency === 'every-round'} onPress={() => editStation(station.id, { frequency: 'every-round' })} />{Array.from({ length: circuitRounds }, (_, index) => index + 1).map((count) => <Chip key={count} label={`${count}×`} active={station.frequency === count} onPress={() => editStation(station.id, { frequency: count })} />)}</View>
                </>}
              </View>;
            })}
            <View style={styles.row}><Chip label="+ Exercise" active={showExercisePicker} onPress={() => setShowExercisePicker(!showExercisePicker)} /><Chip label="+ Random core" active={false} onPress={() => addStation('random-core')} /><Chip label="+ BUILD pull-ups" active={false} onPress={() => addStation('build-pull-up')} /><Chip label="+ BUILD push-ups" active={false} onPress={() => addStation('build-push-up')} /></View>
            {showExercisePicker ? <View style={styles.stationCard}><TextInput style={styles.search} placeholder="Search exercises" placeholderTextColor={theme.colors.textSubtle} value={exerciseSearch} onChangeText={setExerciseSearch} />{EXERCISES.filter((exercise) => exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase()) && !fixedStations.some((station) => station.exerciseId === exercise.id)).slice(0, 20).map((exercise) => <TouchableOpacity key={exercise.id} style={styles.searchItem} onPress={() => addStation(exercise.id)}><Text style={styles.stationName}>{exercise.name}</Text></TouchableOpacity>)}</View> : null}
          </View>

          {generationError ? <Text style={styles.error}>{generationError}</Text> : null}

          <TouchableOpacity style={styles.generateButton} onPress={onGenerate}>
            <Text style={styles.generateText}>Generate Workout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.reviewPanel}>
          {generationError ? <Text style={styles.error}>{generationError}</Text> : null}
          <View style={styles.reviewTopline}>
            <Text style={styles.section}>Generated workout</Text>
            <Text style={styles.reviewBadge}>{generatedPlan.mainBlock.rounds} rounds</Text>
          </View>
          <Text style={styles.reviewTitle}>{generatedPlan.title}</Text>
          {generatedPlan.estimatedDurationSecs ? <Text style={styles.helper}>Estimated session: {Math.ceil(generatedPlan.estimatedDurationSecs / 60)} min. BUILD set timing depends on your pace.</Text> : null}
          <View style={styles.choiceSummary}>
            <Text style={styles.choicePill}>{generatedPlan.input.time} min</Text>
            <Text style={styles.choicePill}>{formatLabel(generatedPlan.input.energy)}</Text>
            <Text style={styles.choicePill}>{formatLabel(generatedPlan.input.focus)}</Text>
            <Text style={styles.choicePill}>{formatLabel(generatedPlan.input.attachment)}</Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Cardio</Text>
            <Text style={styles.previewValue}>{generatedPlan.cardioBlock.slice(1).map((item) => item.text).join(' + ')}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Main</Text>
            <Text style={styles.previewValue}>
              {generatedPlan.input.fixedStations?.length
                ? `${generatedPlan.mainBlock.format} · Rest for ${generatedPlan.mainBlock.restSeconds}s`
                : generatedPlan.mainBlock.format ?? `${generatedPlan.mainBlock.workSeconds}s / ${generatedPlan.mainBlock.restSeconds}s`}
            </Text>
          </View>
          <View style={styles.moveList}>
            {generatedPlan.input.fixedStations?.length ? Array.from({ length: generatedPlan.mainBlock.rounds }, (_, index) => index + 1).map((round) => <View key={round}><Text style={styles.moveItem}>Round {round}</Text><Text style={styles.helper}>{formatCircuitRoundPreview(generatedPlan, round)}</Text></View>) : generatedPlan.mainBlock.exercises.map((exercise) => (
              <Text key={exercise.id} style={styles.moveItem}>{exercise.name}</Text>
            ))}
          </View>
          {generatedPlan.linkedExercises?.map((exercise) => <Text key={exercise.id} style={styles.note}>BUILD target · {exercise.name}: {exercise.sets.map((set) => `${set.targetReps}${set.targetType === 'minimum' ? '+' : ''}`).join(' / ')}{exercise.sets[0]?.targetAssistanceLb !== undefined ? ` · ${exercise.sets[0].targetAssistanceLb} lb assist` : ''}</Text>)}
          {generatedPlan.linkedExercises?.length ? <Text style={styles.helper}>BUILD equipment: {[...new Set(generatedPlan.linkedExercises.flatMap((exercise) => exercise.equipment))].join(', ').replace(/-/g, ' ')}. Have this setup available before starting.</Text> : null}
          {generatedPlan.note ? <Text style={styles.note}>{generatedPlan.note}</Text> : null}

          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setGeneratedPlan(null)}>
              <Text style={styles.secondaryText}>Adjust Inputs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onGenerate}>
              <Text style={styles.secondaryText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.generateButton} onPress={onStartWorkout}>
            <Text style={styles.generateText}>Start This Workout</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity style={styles.libraryLink} onPress={() => router.push('/library')}>
        <Text style={styles.libraryLinkText}>Browse the exercise library →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, gap: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    gap: 14,
    shadowColor: theme.colors.background,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  heroTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 52, height: 52 },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  heroBadge: {
    color: theme.colors.ink,
    backgroundColor: theme.colors.lime,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900'
  },
  title: { color: theme.colors.text, fontSize: 34, fontWeight: '900' },
  subtitle: { color: theme.colors.textMuted, fontSize: 16 },
  sectionPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10
  },
  section: { color: theme.colors.text, marginTop: 4, fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minHeight: 40,
    justifyContent: 'center'
  },
  chipActive: { backgroundColor: theme.colors.lime, borderColor: theme.colors.lime },
  chipText: { color: theme.colors.textSoft, textTransform: 'capitalize', fontWeight: '700' },
  chipTextActive: { color: theme.colors.ink, fontWeight: '900' },
  generateButton: {
    backgroundColor: theme.colors.lime,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: theme.colors.lime,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  generateText: { color: theme.colors.ink, fontWeight: '900', fontSize: 17 },
  reviewPanel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10
  },
  reviewTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  reviewBadge: {
    color: theme.colors.ink,
    backgroundColor: theme.colors.lime,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '900'
  },
  reviewTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 24, textTransform: 'capitalize' },
  choiceSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choicePill: {
    color: theme.colors.textSoft,
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  previewLabel: { color: theme.colors.textSubtle, fontWeight: '700' },
  previewValue: { color: theme.colors.textSoft, flex: 1, textAlign: 'right', fontWeight: '700' },
  moveList: { gap: 8, borderTopColor: theme.colors.borderMuted, borderTopWidth: 1, paddingTop: 10 },
  moveItem: { color: theme.colors.text, fontWeight: '800' },
  note: { color: theme.colors.lime, fontStyle: 'italic', fontWeight: '700' },
  reviewActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center'
  },
  secondaryText: { color: theme.colors.textSoft, fontWeight: '900' },
  libraryLink: { alignItems: 'center', paddingVertical: 10 },
  libraryLinkText: { color: theme.colors.purple, fontWeight: '800' },
  helper: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  stationCard: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 10, gap: 8 },
  stationTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  stationName: { color: theme.colors.text, fontWeight: '800', flex: 1 },
  remove: { color: theme.colors.purple, fontWeight: '800' },
  search: { color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 10 },
  searchItem: { borderBottomColor: theme.colors.borderMuted, borderBottomWidth: 1, paddingVertical: 6 },
  error: { color: theme.colors.purple, fontWeight: '800' }
});
