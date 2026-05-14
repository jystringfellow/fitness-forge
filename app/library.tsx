import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EXERCISES } from '@/data/exercises';

function formatLabel(value: string) {
  return value.replace(/-/g, ' ');
}

export default function LibraryScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{EXERCISES.length} movements</Text>
        <Text style={styles.title}>Exercise Library</Text>
      </View>
      {EXERCISES.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <View style={styles.cardTopline}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.attachment}>{formatLabel(exercise.attachment)}</Text>
          </View>
          <Text style={styles.cue}>{exercise.cue}</Text>
          <View style={styles.tagRow}>
            {exercise.tags.slice(0, 4).map((tag) => (
              <Text key={tag} style={styles.tag}>{formatLabel(tag)}</Text>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140B1F' },
  content: { padding: 18, gap: 12, paddingBottom: 36 },
  header: { gap: 4, marginBottom: 4 },
  kicker: { color: '#D872FF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#FBF7FF', fontSize: 30, fontWeight: '900' },
  card: {
    backgroundColor: '#1B1028',
    borderColor: '#3A2253',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 10
  },
  cardTopline: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  name: { color: '#FBF7FF', fontWeight: '900', fontSize: 16, flex: 1 },
  attachment: {
    color: '#170B22',
    backgroundColor: '#A6FF3D',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize'
  },
  cue: { color: '#CDBBDE', lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    color: '#E7DAF4',
    backgroundColor: '#261638',
    borderColor: '#432565',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize'
  }
});
