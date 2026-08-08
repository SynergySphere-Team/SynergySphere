import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter(); const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  async function submit() { setError(''); setSubmitting(true); try { await login(email.trim(), password); router.replace('/(tabs)'); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); } finally { setSubmitting(false); } }
  return <Screen><View style={styles.hero}><Text style={styles.brand}>✦ SynergySphere</Text><Text style={styles.tagline}>Learn. Build. Thrive.</Text></View><View style={styles.form}><Text style={styles.title}>Welcome back</Text><Text style={styles.copy}>Sign in to keep growing your skills and impact.</Text>{error ? <Notice>{error}</Notice> : null}<Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="Your password" /><Button title={submitting ? 'Signing in…' : 'Sign in'} disabled={submitting || !email || !password} onPress={submit} /><Pressable onPress={() => router.push('/(auth)/register')}><Text style={styles.link}>New to SynergySphere? Create an account</Text></Pressable></View></Screen>;
}
const styles = StyleSheet.create({ hero: { marginTop: 48, gap: 6 }, brand: { color: colors.primary, fontSize: 24, fontWeight: '800' }, tagline: { color: colors.muted, fontSize: 14 }, form: { marginTop: 44, gap: 16 }, title: { color: colors.text, fontSize: 31, fontWeight: '800' }, copy: { color: colors.muted, lineHeight: 21, marginBottom: 5 }, link: { color: colors.primary, textAlign: 'center', marginTop: 6 } });
