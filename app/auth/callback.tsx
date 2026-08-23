import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { theme } from '@/theme/brand';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session, cloudError } = useAuth();

  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => router.replace('/settings'), 700);
    return () => clearTimeout(timeout);
  }, [router, session]);

  return <View style={styles.container}>
    {cloudError ? <>
      <Text style={styles.title}>Confirmation needs attention.</Text>
      <Text style={styles.body}>{cloudError}</Text>
      <TouchableOpacity style={styles.primary} onPress={() => router.replace('/settings')}><Text style={styles.primaryText}>Return to Settings</Text></TouchableOpacity>
    </> : <>
      <ActivityIndicator color={theme.colors.lime} />
      <Text style={styles.title}>{session ? 'Email confirmed.' : 'Finishing sign-in…'}</Text>
      <Text style={styles.body}>Fitness Forge is securing your session and preparing cloud backup.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  body: { color: theme.colors.textMuted, lineHeight: 21, textAlign: 'center' },
  primary: { backgroundColor: theme.colors.lime, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 8 },
  primaryText: { color: theme.colors.ink, fontWeight: '900' }
});
