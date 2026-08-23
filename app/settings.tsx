import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { theme } from '@/theme/brand';

export default function SettingsScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (mode: 'sign-in' | 'sign-up') => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'sign-in') {
        await auth.signIn(email, password);
      } else {
        const result = await auth.signUp(email, password);
        if (result === 'confirmation-required') setMessage('Check your email to confirm the account, then sign in here.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await auth.signOut();
      setMessage('Signed out. This device keeps its local copy.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.kicker}>ACCOUNT + BACKUP</Text>
    <Text style={styles.title}>Keep your work.</Text>
    <Text style={styles.body}>Workouts always save to this device first. Signing in adds a private Supabase backup and restores your data on another device.</Text>

    {!auth.configured ? <View style={styles.notice}>
      <Text style={styles.cardTitle}>Supabase setup required</Text>
      <Text style={styles.body}>Create a local .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart Expo.</Text>
      <Text style={styles.code}>Copy values from .env.example</Text>
    </View> : auth.initializing ? <View style={styles.loading}><ActivityIndicator color={theme.colors.lime} /><Text style={styles.body}>Checking your account…</Text></View> : auth.session ? <View style={styles.card}>
      <Text style={styles.cardTitle}>Cloud backup active</Text>
      <Text style={styles.email}>{auth.session.user.email}</Text>
      <View style={styles.statusRow}><View style={[styles.dot, auth.cloudStatus === 'error' && styles.dotError]} /><Text style={styles.status}>{auth.cloudStatus === 'syncing' ? 'Backing up…' : auth.cloudStatus === 'error' ? 'Backup needs attention' : 'Backed up'}</Text></View>
      {auth.lastSyncedAt ? <Text style={styles.meta}>Last backup · {new Date(auth.lastSyncedAt).toLocaleString()}</Text> : null}
      {auth.workoutCount !== null ? <Text style={styles.meta}>{auth.workoutCount} recent workout{auth.workoutCount === 1 ? '' : 's'} available across devices</Text> : null}
      {auth.cloudError ? <Text style={styles.error}>{auth.cloudError}</Text> : null}
      <TouchableOpacity disabled={busy || auth.cloudStatus === 'syncing'} style={[styles.primary, (busy || auth.cloudStatus === 'syncing') && styles.disabled]} onPress={() => { void auth.syncNow(); }}><Text style={styles.primaryText}>BACK UP NOW</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} style={styles.secondary} onPress={signOut}><Text style={styles.secondaryText}>Sign Out</Text></TouchableOpacity>
    </View> : <View style={styles.card}>
      <Text style={styles.cardTitle}>Sign in to back up</Text>
      <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor={theme.colors.textSubtle} value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput autoCapitalize="none" autoComplete="password" secureTextEntry placeholder="Password" placeholderTextColor={theme.colors.textSubtle} value={password} onChangeText={setPassword} style={styles.input} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <TouchableOpacity disabled={busy || !email || password.length < 6} style={[styles.primary, (busy || !email || password.length < 6) && styles.disabled]} onPress={() => submit('sign-in')}><Text style={styles.primaryText}>{busy ? 'PLEASE WAIT…' : 'SIGN IN'}</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy || !email || password.length < 6} style={styles.secondary} onPress={() => submit('sign-up')}><Text style={styles.secondaryText}>Create Account</Text></TouchableOpacity>
      <Text style={styles.meta}>New accounts may require email confirmation, depending on your Supabase Auth settings.</Text>
    </View>}

    <View style={styles.note}><Text style={styles.noteTitle}>Local-first by design</Text><Text style={styles.body}>No connection? Keep training. The next successful sync uploads changes using stable workout IDs, so retrying will not duplicate a session.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, gap: 14, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  kicker: { color: theme.colors.purple, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: theme.colors.text, fontSize: 31, fontWeight: '900' }, body: { color: theme.colors.textMuted, lineHeight: 21 },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderMuted, borderWidth: 1, borderRadius: 10, padding: 17, gap: 12 }, notice: { backgroundColor: theme.colors.surface, borderColor: theme.colors.purple, borderWidth: 1, borderRadius: 10, padding: 17, gap: 9 }, cardTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900' }, email: { color: theme.colors.lime, fontSize: 17, fontWeight: '800' },
  input: { color: theme.colors.text, backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 13, fontSize: 16 }, primary: { backgroundColor: theme.colors.lime, borderRadius: 8, padding: 15, alignItems: 'center' }, primaryText: { color: theme.colors.ink, fontWeight: '900' }, secondary: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 14, alignItems: 'center' }, secondaryText: { color: theme.colors.text, fontWeight: '900' }, disabled: { opacity: 0.45 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: theme.colors.lime }, dotError: { backgroundColor: theme.colors.danger }, status: { color: theme.colors.textSoft, fontWeight: '800' }, meta: { color: theme.colors.textSubtle, fontSize: 12, lineHeight: 17 }, error: { color: theme.colors.danger, lineHeight: 19 }, message: { color: theme.colors.purple, fontWeight: '700' }, code: { color: theme.colors.lime, fontFamily: 'monospace' }, loading: { alignItems: 'center', padding: 25, gap: 10 },
  note: { borderLeftColor: theme.colors.purple, borderLeftWidth: 3, padding: 14, backgroundColor: theme.colors.surface, gap: 5 }, noteTitle: { color: theme.colors.text, fontWeight: '900' }
});
