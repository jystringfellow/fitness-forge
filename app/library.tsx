import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EXERCISES } from '@/data/exercises';

export default function LibraryScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Exercise Library</Text>
      {EXERCISES.map((exercise) => (
        <View key={exercise.id} style={styles.card}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.detail}>Attachment: {exercise.attachment}</Text>
          <Text style={styles.detail}>Tags: {exercise.tags.join(', ')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, gap: 10 },
  title: { color: 'white', fontSize: 22, fontWeight: '700' },
  card: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12 },
  name: { color: '#F8FAFC', fontWeight: '700' },
  detail: { color: '#CBD5E1', marginTop: 2 }
});
