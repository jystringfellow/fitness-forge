import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { generateWorkout } from '@/lib/generateWorkout';
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
  WorkoutPlan
} from '@/types/workout';
import { setCurrentWorkout } from '@/storage/workoutStorage';

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

  const clearGeneratedPlan = () => setGeneratedPlan(null);

  const onGenerate = () => {
    setGeneratedPlan(generateWorkout({ time, energy, focus, attachment }, true));
  };

  const onStartWorkout = async () => {
    if (!generatedPlan) {
      return;
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
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={onGenerate}>
            <Text style={styles.generateText}>Generate Workout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.reviewPanel}>
          <View style={styles.reviewTopline}>
            <Text style={styles.section}>Generated workout</Text>
            <Text style={styles.reviewBadge}>{generatedPlan.mainBlock.rounds} rounds</Text>
          </View>
          <Text style={styles.reviewTitle}>{generatedPlan.title}</Text>
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
              {generatedPlan.mainBlock.format ?? `${generatedPlan.mainBlock.workSeconds}s / ${generatedPlan.mainBlock.restSeconds}s`}
            </Text>
          </View>
          <View style={styles.moveList}>
            {generatedPlan.mainBlock.exercises.map((exercise) => (
              <Text key={exercise.id} style={styles.moveItem}>{exercise.name}</Text>
            ))}
          </View>
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
  libraryLinkText: { color: theme.colors.purple, fontWeight: '800' }
});
