import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brand, { color: colors.text }]}>SynergySphere</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>Learn. Build. Thrive.</Text>
        </View>
        <View style={styles.form}>
          <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>Continue your learning journey.</Text>
          {error ? <Notice>{error}</Notice> : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Your password"
          />
          <Button
            title={submitting ? 'Signing in…' : 'Sign in to SynergySphere'}
            disabled={submitting || !email || !password}
            onPress={submit}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/register')}
            style={[styles.register, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          >
            <Text style={[styles.link, { color: brandGreen }]}>Create an account</Text>
          </Pressable>
        </View>
        <Text style={[styles.terms, { color: colors.muted }]}>
          By signing in, you agree to use SynergySphere responsibly.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'space-between', minHeight: 640, paddingVertical: 30 },
  hero: { marginTop: 24, alignItems: 'center', gap: 6 },
  mark: { width: 72, height: 72, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '100%', height: '100%' },
  brand: { fontSize: 25, fontWeight: '800', marginTop: 8 },
  tagline: { fontSize: 14 },
  form: { gap: 15 },
  title: { fontSize: 29, fontWeight: '800', textAlign: 'center' },
  copy: { lineHeight: 21, textAlign: 'center', marginBottom: 7 },
  register: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  link: { textAlign: 'center', fontWeight: '800', fontSize: 14 },
  terms: { textAlign: 'center', fontSize: 12, lineHeight: 18, paddingHorizontal: 20 },
});
