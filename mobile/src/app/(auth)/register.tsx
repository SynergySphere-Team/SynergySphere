import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Notice } from '@/components/Screen';
import { Button, Field } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors, theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      await register({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create the account.');
    } finally {
      setSubmitting(false);
    }
  }

  const isLight = theme === 'light';
  const brandGreen = isLight ? '#1e6827' : colors.primary;

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brand, { color: colors.text }]}>SynergySphere</Text>
        <Text style={[styles.title, { color: colors.text }]}>Start your journey</Text>
      </View>
      <View style={styles.form}>
        {error ? <Notice>{error}</Notice> : null}
        <Field label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" placeholder="First name" />
        <Field label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" placeholder="Last name" />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <Button
          title={submitting ? 'Creating account…' : 'Create account'}
          disabled={submitting || !firstName || !lastName || !email || password.length < 8}
          onPress={submit}
        />
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={[styles.link, { color: brandGreen }]}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 24, alignItems: 'center', gap: 6 },
  mark: { width: 68, height: 68, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoImage: { width: '100%', height: '100%' },
  brand: { fontSize: 24, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  form: { marginTop: 24, gap: 14 },
  link: { textAlign: 'center', marginTop: 6, fontWeight: '700', fontSize: 14 },
});
