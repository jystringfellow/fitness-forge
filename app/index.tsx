import { useMemo, useState } from 'react';
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
  TimeOption
} from '@/types/workout';
import { addHistory } from '@/storage/workoutStorage';

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

export default function GenerateScreen() {
  const router = useRouter();
  const [time, setTime] = useState<TimeOption>(20);
  const [energy, setEnergy] = useState<Energy>('normal');
  const [focus, setFocus] = useState<Focus>('full body');
  const [attachment, setAttachment] = useState<Attachment>('recommended');
  const [workoutVersion, setWorkoutVersion] = useState(0);

  const preview = useMemo(
    () => generateWorkout({ time, energy, focus, attachment }, true),
    [time, energy, focus, attachment, workoutVersion]
  );

  const onGenerate = async () => {
    const plan = preview;
    await addHistory(plan);
    setWorkoutVersion((version) => version + 1);
    router.push({ pathname: '/workout', params: { plan: JSON.stringify(plan) } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopline}>
          <View style={styles.brandRow}>
            <Image source={brandIcon} style={styles.brandMark} />
            <Text style={styles.kicker}>Daily session</Text>
          </View>
          <Text style={styles.heroBadge}>{preview.intervalSteps.length} steps</Text>
        </View>
        <Text style={styles.title}>Fitness Forge</Text>
        <Text style={styles.subtitle}>{preview.title}</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{time}</Text>
            <Text style={styles.metricLabel}>minutes</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{preview.mainBlock.rounds}</Text>
            <Text style={styles.metricLabel}>rounds</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{preview.mainBlock.exercises.length}</Text>
            <Text style={styles.metricLabel}>moves</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionPanel}>
        <Text style={styles.section}>Time available</Text>
        <View style={styles.row}>{TIME_OPTIONS.map((option) => <Chip key={option} label={`${option} min`} active={time === option} onPress={() => setTime(option)} />)}</View>

        <Text style={styles.section}>Energy</Text>
        <View style={styles.row}>{ENERGY_OPTIONS.map((option) => <Chip key={option} label={formatLabel(option)} active={energy === option} onPress={() => setEnergy(option)} />)}</View>

        <Text style={styles.section}>Focus</Text>
        <View style={styles.row}>{FOCUS_OPTIONS.map((option) => <Chip key={option} label={formatLabel(option)} active={focus === option} onPress={() => setFocus(option)} />)}</View>

        <Text style={styles.section}>Attachment</Text>
        <View style={styles.row}>{ATTACHMENT_OPTIONS.map((option) => <Chip key={option} label={formatLabel(option)} active={attachment === option} onPress={() => setAttachment(option)} />)}</View>
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={onGenerate}>
        <Text style={styles.generateText}>Start Workout</Text>
      </TouchableOpacity>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Workout Preview</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Attachment</Text>
          <Text style={styles.previewValue}>{formatLabel(preview.input.attachment)}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Cardio</Text>
          <Text style={styles.previewValue}>{preview.cardioBlock[0].text}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Main</Text>
          <Text style={styles.previewValue}>
            {preview.mainBlock.rounds} rounds · {preview.mainBlock.format ?? `${preview.mainBlock.workSeconds}s / ${preview.mainBlock.restSeconds}s`}
          </Text>
        </View>
      </View>
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
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: theme.colors.backgroundRaised,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12
  },
  metricValue: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  metricLabel: { color: theme.colors.textSubtle, marginTop: 2, fontSize: 12, fontWeight: '700' },
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
  preview: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10
  },
  previewTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  previewLabel: { color: theme.colors.textSubtle, fontWeight: '700' },
  previewValue: { color: theme.colors.textSoft, flex: 1, textAlign: 'right', fontWeight: '700' }
});
