import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { generateWorkout } from '@/lib/generateWorkout';
import { Attachment, Energy, Focus, TimeOption } from '@/types/workout';
import { addHistory } from '@/storage/workoutStorage';

const TIMES: TimeOption[] = [15, 20, 25, 30];
const ENERGIES: Energy[] = ['low', 'normal', 'high'];
const FOCUSES: Focus[] = ['full body', 'sprint', 'endurance', 'core + back', 'legs + power', 'recovery'];
const ATTACHMENTS: Attachment[] = ['auto', 'rope', 'strap', 'handles', 'bar'];

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
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function GenerateScreen() {
  const router = useRouter();
  const [time, setTime] = useState<TimeOption>(20);
  const [energy, setEnergy] = useState<Energy>('normal');
  const [focus, setFocus] = useState<Focus>('full body');
  const [attachment, setAttachment] = useState<Attachment>('auto');

  const preview = useMemo(() => generateWorkout({ time, energy, focus, attachment }), [time, energy, focus, attachment]);

  const onGenerate = async () => {
    const plan = generateWorkout({ time, energy, focus, attachment });
    await addHistory(plan);
    router.push({ pathname: '/workout', params: { plan: JSON.stringify(plan) } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fitness Forge</Text>
      <Text style={styles.subtitle}>Forge your daily workout in under 10 seconds.</Text>

      <Text style={styles.section}>Time available</Text>
      <View style={styles.row}>{TIMES.map((option) => <Chip key={option} label={option} active={time === option} onPress={() => setTime(option)} />)}</View>

      <Text style={styles.section}>Energy</Text>
      <View style={styles.row}>{ENERGIES.map((option) => <Chip key={option} label={option} active={energy === option} onPress={() => setEnergy(option)} />)}</View>

      <Text style={styles.section}>Focus</Text>
      <View style={styles.row}>{FOCUSES.map((option) => <Chip key={option} label={option} active={focus === option} onPress={() => setFocus(option)} />)}</View>

      <Text style={styles.section}>Attachment</Text>
      <View style={styles.row}>{ATTACHMENTS.map((option) => <Chip key={option} label={option} active={attachment === option} onPress={() => setAttachment(option)} />)}</View>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Preview</Text>
        <Text style={styles.previewText}>{preview.title}</Text>
        <Text style={styles.previewText}>Cardio: {preview.cardioBlock[0]}</Text>
        <Text style={styles.previewText}>Main rounds: {preview.mainBlock.rounds}</Text>
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={onGenerate}>
        <Text style={styles.generateText}>Generate Workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1020' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { color: 'white', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#C7D2FE', fontSize: 15 },
  section: { color: '#F3F4F6', marginTop: 8, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText: { color: '#E5E7EB', textTransform: 'capitalize' },
  chipTextActive: { color: 'white', fontWeight: '700' },
  preview: { backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 4, marginTop: 6 },
  previewTitle: { color: '#93C5FD', fontWeight: '700' },
  previewText: { color: '#D1D5DB' },
  generateButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  generateText: { color: '#052E16', fontWeight: '800', fontSize: 16 }
});
