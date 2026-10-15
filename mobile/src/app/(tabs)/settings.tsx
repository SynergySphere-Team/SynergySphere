import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';

import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

import {

  Alert,

  Image,

  Linking,

  Platform,

  Pressable,

  StyleSheet,

  Switch,

  Text as RNText,

  View,

  type TextProps,

} from 'react-native';

import { Screen, Notice } from '@/components/Screen';

import {

  Button,

  Card,

  Field,

  Heading,

} from '@/components/ui';

import { useAuth } from '@/context/AuthContext';

import { useTheme } from '@/context/ThemeContext';

import { useAccessibility } from '@/context/AccessibilityContext';

import { api } from '@/services/api';

import { github } from '@/services/github';

import type { GithubConnection, UserTicket } from '@/types/api';

interface SettingsData {

  user: {

    firstName: string;

    lastName: string;

    email: string;

    role: string;

    bio: string | null;

    theme: string;

    emailNotifications: boolean;

    profilePicture?: string | null;

  };

  profile: {

    githubUrl: string | null;

    linkedinUrl: string | null;

    targetRole: string | null;

    location: string | null;

    about: string | null;

  };

}

type SettingKey =

  | 'account'

  | 'password'

  | 'linked'

  | 'notifications'

  | 'appearance'

  | 'privacy'

  | 'security'

  | 'data'

  | 'support'

  | 'about'

  | null;

type SettingRowProps = {

  icon: keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle?: string;

  expanded?: boolean;

  onPress: () => void;

  colors: {

    text: string;

    muted: string;

    border: string;

    surfaceElevated: string;

  };

  accentColor: string;

  danger?: boolean;

};

function SettingRow({

  icon,

  title,

  subtitle,

  expanded,

  onPress,

  colors,

  accentColor,

  danger,

}: SettingRowProps) {

  const rowColor = danger ? '#D92D20' : colors.text;

  const iconColor = danger ? '#D92D20' : accentColor;

  return (

    <Pressable

      accessibilityRole="button"

      accessibilityLabel={title}

      onPress={onPress}

      style={({ pressed }) => [

        styles.settingRow,

        {

          borderBottomColor: colors.border,

          opacity: pressed ? 0.68 : 1,

        },

      ]}

    >

      <View

        style={[

          styles.settingIcon,

          {

            backgroundColor: colors.surfaceElevated,

          },

        ]}

      >

        <Ionicons

          name={icon}

          size={19}

          color={iconColor}

        />

      </View>

      <View style={styles.settingCopy}>

        <Text

          style={[

            styles.settingTitle,

            {

              color: rowColor,

            },

          ]}

        >

          {title}

        </Text>

        {subtitle ? (

          <Text

            style={[

              styles.settingSubtitle,

              {

                color: colors.muted,

              },

            ]}

          >

            {subtitle}

          </Text>

        ) : null}

      </View>

      <Ionicons

        name={

          expanded

            ? 'chevron-up'

            : 'chevron-forward'

        }

        size={18}

        color={colors.muted}

      />

    </Pressable>

  );

}

function Text({

  style,

  ...props

}: TextProps) {

  const { largerText, fontSize } = useAccessibility();

  const flattenedStyle = StyleSheet.flatten(style);

  const baseFontSize =

    typeof flattenedStyle?.fontSize === 'number'

      ? flattenedStyle.fontSize

      : 14;

  const baseLineHeight =

    typeof flattenedStyle?.lineHeight === 'number'

      ? flattenedStyle.lineHeight

      : undefined;

  return (

    <RNText

      {...props}

      allowFontScaling

      style={[

        style,

        largerText && {

          fontSize: fontSize(baseFontSize),

          lineHeight:

            baseLineHeight !== undefined

              ? fontSize(baseLineHeight)

              : undefined,

        },

      ]}

    />

  );

}

export default function SettingsScreen() {

  const router = useRouter();

  const {

    logout,

    user,

    updateProfile,

    refresh: refreshAuth,

  } = useAuth();

  const {

    theme,

    setTheme,

    colors,

  } = useTheme();

  const {

    eyeComfort,

    setEyeComfort,

    largerText,

    fontSize,

  } = useAccessibility();

  const [

    expanded,

    setExpanded,

  ] =

    useState<SettingKey>(

      null,

    );

  const [

    firstName,

    setFirstName,

  ] = useState(

    user?.firstName || '',

  );

  const [

    lastName,

    setLastName,

  ] = useState(

    user?.lastName || '',

  );

  const [bio, setBio] =

    useState('');

  const [

    targetRole,

    setTargetRole,

  ] = useState('');

  const [

    location,

    setLocation,

  ] = useState('');

  const [

    githubUrl,

    setGithubUrl,

  ] = useState('');

  const [

    linkedinUrl,

    setLinkedinUrl,

  ] = useState('');

  const [

    emailNotifications,

    setEmailNotifications,

  ] = useState(true);

  const [showCommunityProfile, setShowCommunityProfile] = useState(true);

  const [showDeveloperInfo, setShowDeveloperInfo] = useState(true);

  const [showActivityStatus, setShowActivityStatus] = useState(false);

  const [

    photo,

    setPhoto,

  ] =

    useState<

      | string

      | null

      | undefined

    >(

      user?.profilePicture,

    );

  const [

    saving,

    setSaving,

  ] = useState(false);

  const [

    message,

    setMessage,

  ] =

    useState<{

      type:

        | 'success'

        | 'error';

      text: string;

    } | null>(null);

  const [

    githubConnection,

    setGithubConnection,

  ] =

    useState<GithubConnection | null>(

      null,

    );

  const [

    resetSending,
    setResetSending,
  ] = useState(false);

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync('synergysphere_biometrics_enabled').then((val: string | null) => {
      if (val === 'true') setBiometricsEnabled(true);
    });
  }, []);

  // Help & Support ticketing state
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<string>('Bug / Technical Issue');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketMessage, setTicketMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const loadUserTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      const list = await api.get<UserTicket[]>('/settings/tickets');
      setUserTickets(Array.isArray(list) ? list : []);
    } catch {
      // background fetch error
    } finally {
      setLoadingTickets(false);
      setTicketsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (expanded === 'support' && !ticketsLoaded) {
      void loadUserTickets();
    }
  }, [expanded, ticketsLoaded, loadUserTickets]);

  const handleSubmitTicket = async () => {
    if (user?.role === 'ADMIN') {
      setTicketMessage({ type: 'error', text: 'Administrators cannot report support issues.' });
      return;
    }
    const trimmedSubj = ticketSubject.trim();
    const trimmedDesc = ticketDescription.trim();
    if (!trimmedSubj) {
      setTicketMessage({ type: 'error', text: 'Please enter an issue subject.' });
      return;
    }
    if (trimmedSubj.length < 3) {
      setTicketMessage({ type: 'error', text: 'Subject must be at least 3 characters long.' });
      return;
    }
    if (!trimmedDesc || trimmedDesc.length < 10) {
      setTicketMessage({ type: 'error', text: 'Please describe the problem in at least 10 characters.' });
      return;
    }
    setTicketSubmitting(true);
    setTicketMessage(null);
    try {
      const created = await api.post<UserTicket>('/settings/tickets', {
        category: ticketCategory,
        title: trimmedSubj,
        description: trimmedDesc,
      });
      setTicketMessage({
        type: 'success',
        text: `Support request submitted successfully! Your Ticket #${created?.ticketNumber || 'created'} has been received by our support team.`,
      });
      setTicketSubject('');
      setTicketDescription('');
      setShowReportForm(false);
      await loadUserTickets();
    } catch (e: any) {
      setTicketMessage({
        type: 'error',
        text: e?.message || 'Failed to submit support request. Please check your network and try again.',
      });
    } finally {
      setTicketSubmitting(false);
    }
  };

  useEffect(() => {

    setFirstName(

      user?.firstName || '',

    );

    setLastName(

      user?.lastName || '',

    );

    setPhoto(

      user?.profilePicture,

    );

  }, [user]);

  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {

    try {

      const [data, conn] = await Promise.allSettled([

        api.get<SettingsData>('/auth/settings'),

        github.connection(),

      ]);

      if (data.status === 'fulfilled' && data.value) {

        if (data.value.user) {

          setFirstName(data.value.user.firstName || '');

          setLastName(data.value.user.lastName || '');

          setBio(data.value.user.bio || data.value.profile?.about || '');

          setEmailNotifications(data.value.user.emailNotifications ?? true);

          if ((data.value.user as any).profilePicture) {
            setPhoto((data.value.user as any).profilePicture);
          }
        }

        if (data.value.profile) {

          setTargetRole(data.value.profile.targetRole || '');

          setLocation(data.value.profile.location || '');

          setGithubUrl(data.value.profile.githubUrl || '');

          setLinkedinUrl(data.value.profile.linkedinUrl || '');

        }

      }

      if (conn.status === 'fulfilled') {

        setGithubConnection(conn.value);

      }

    } catch {

      // Ignore background refresh errors

    }

  }, [setTheme]);

  const handleRefresh = useCallback(async () => {

    setRefreshing(true);

    await Promise.allSettled([loadSettings(), refreshAuth()]);

    setRefreshing(false);

  }, [loadSettings, refreshAuth]);

  useEffect(() => {

    void loadSettings();

  }, [loadSettings]);

  async function choosePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage({
          type: 'error',
          text: 'Photo-library access is needed to choose a profile photo.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Data = asset.base64;
        if (!base64Data && asset.uri) {
          try {
            const FileSystem = await import('expo-file-system/legacy');
            base64Data = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (e) {
            console.warn('Fallback base64 read failed:', e);
          }
        }

        if (base64Data) {
          const dataUri = `data:image/jpeg;base64,${base64Data}`;
          setPhoto(dataUri);
          setMessage({
            type: 'success',
            text: 'Profile photo selected. Updating profile...',
          });

          // Save immediately to backend so it persists across sessions
          try {
            setSaving(true);
            await updateProfile({
              firstName: firstName.trim() || user?.firstName || 'User',
              lastName: lastName.trim() || user?.lastName || '',
              profilePicture: dataUri,
            });
            await api.patch('/auth/settings', {
              profilePicture: dataUri,
            });
            setMessage({
              type: 'success',
              text: 'Profile picture updated successfully!',
            });
          } catch (err: any) {
            setMessage({
              type: 'error',
              text: err?.message || 'Picture selected locally, but failed to save to server.',
            });
          } finally {
            setSaving(false);
          }
        } else {
          setMessage({
            type: 'error',
            text: 'Could not process selected image. Please try a different photo.',
          });
        }
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Error opening photo library.',
      });
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setMessage({
          type: 'error',
          text: 'Camera access is needed to capture a profile photo.',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Data = asset.base64;
        if (!base64Data && asset.uri) {
          try {
            const FileSystem = await import('expo-file-system/legacy');
            base64Data = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (e) {
            console.warn('Fallback base64 read failed:', e);
          }
        }

        if (base64Data) {
          const dataUri = `data:image/jpeg;base64,${base64Data}`;
          setPhoto(dataUri);
          setMessage({
            type: 'success',
            text: 'Profile photo captured. Updating profile...',
          });

          try {
            setSaving(true);
            await updateProfile({
              firstName: firstName.trim() || user?.firstName || 'User',
              lastName: lastName.trim() || user?.lastName || '',
              profilePicture: dataUri,
            });
            await api.patch('/auth/settings', {
              profilePicture: dataUri,
            });
            setMessage({
              type: 'success',
              text: 'Profile picture updated successfully!',
            });
          } catch (err: any) {
            setMessage({
              type: 'error',
              text: err?.message || 'Picture captured, but failed to save to server.',
            });
          } finally {
            setSaving(false);
          }
        } else {
          setMessage({
            type: 'error',
            text: 'Could not process captured image. Please try again.',
          });
        }
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Error opening camera.',
      });
    }
  }

  async function removePhoto() {
    try {
      setSaving(true);
      setPhoto(null);
      await updateProfile({
        firstName: firstName.trim() || user?.firstName || 'User',
        lastName: lastName.trim() || user?.lastName || '',
        profilePicture: null,
      });
      await api.patch('/auth/settings', {
        profilePicture: null,
      });
      setMessage({
        type: 'success',
        text: 'Profile photo removed. Restored default initials placeholder.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Could not remove profile picture.',
      });
    } finally {
      setSaving(false);
    }
  }

  function promptPhotoOptions() {
    if (Platform.OS === 'web') {
      void choosePhoto();
      return;
    }

    const options: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[] = [
      {
        text: 'Take Photo',
        onPress: () => void takePhoto(),
      },
      {
        text: 'Choose from Library',
        onPress: () => void choosePhoto(),
      },
    ];

    if (photo) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => void removePhoto(),
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert('Profile Picture', 'Select an option to update your avatar:', options);
  }

  async function saveSettings() {

    if (

      !firstName.trim() ||

      !lastName.trim()

    ) {

      setMessage({

        type: 'error',

        text: 'First and last name are required.',

      });

      return;

    }

    setSaving(true);

    setMessage(null);

    try {

      await api.patch(

        '/auth/settings',

        {

          firstName:

            firstName.trim(),

          lastName:

            lastName.trim(),

          bio: bio.trim(),

          targetRole:

            targetRole.trim(),

          location:

            location.trim(),

          githubUrl:

            githubUrl.trim(),

          linkedinUrl:

            linkedinUrl.trim(),

          theme,

          emailNotifications,

          profilePicture: photo || undefined,

        },

      );

      if (

        photo !==

        user?.profilePicture

      ) {

        await updateProfile({

          firstName:

            firstName.trim(),

          lastName:

            lastName.trim(),

          profilePicture:

            photo,

        });

      }

      setMessage({

        type: 'success',

        text: 'Settings saved successfully.',

      });

    } catch (error) {

      setMessage({

        type: 'error',

        text:

          error instanceof Error

            ? error.message

            : 'Could not save settings.',

      });

    } finally {

      setSaving(false);

    }

  }

  async function handleRequestPasswordReset() {

    if (!user?.email) {

      setMessage({

        type: 'error',

        text: 'Your account email could not be found.',

      });

      return;

    }

    setResetSending(true);

    setMessage(null);

    try {

      const res =

        await api.post<{

          message: string;

          resetToken?: string;

        }>(

          '/auth/forgot-password',

          {

            email:

              user.email,

          },

        );

      if (res.resetToken) {

        router.push({

          pathname:

            '/change-password',

          params: {

            token:

              res.resetToken,

          },

        } as never);

        return;

      }

      setMessage({

        type: 'success',

        text:

          res.message ||

          'A password reset link has been sent to your email.',

      });

    } catch (err: any) {

      setMessage({

        type: 'error',

        text:

          err?.message ||

          'Could not request password reset.',

      });

    } finally {

      setResetSending(

        false,

      );

    }

  }

  async function performDeleteAccount() {
  try {
    // Permanently delete the authenticated user
    await api.delete('/auth/me');

    // Clear the local authentication session
    try {
      await logout();
    } catch (logoutError) {
      console.warn(
        'Account deleted, but logout request failed:',
        logoutError
      );
    }

    // Return to login
    router.replace('/(auth)/login');
  } catch (err: any) {
    const message =
      err?.message ||
      'Failed to delete account. Please try again.';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } else {
      Alert.alert(
        'Unable to Delete Account',
        message
      );
    }
  }
}

function confirmDeleteAccount() {
  const message =
    'This will permanently delete your account, project contributions, and all personal data. This action cannot be undone.';

  // WEB / LOCALHOST
  if (Platform.OS === 'web') {
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            `Delete Account (POPIA)\n\n${message}`
          )
        : false;

    if (confirmed) {
      void performDeleteAccount();
    }

    return;
  }

  // ANDROID / IOS
  Alert.alert(
    'Delete Account (POPIA)',
    message,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () => {
          void performDeleteAccount();
        },
      },
    ]
  );
}

  async function performLogout() {
    try {
      await logout();
    } catch (error) {
      // AuthContext clears the local session in its finally block,
      // so continue to the login screen even if the server call fails.
      console.warn('Server logout request failed:', error);
    } finally {
      router.replace('/(auth)/login');
    }
  }

  function confirmLogout() {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm(
              'Are you sure you want to sign out of SynergySphere?'
            )
          : false;

      if (confirmed) {
        void performLogout();
      }

      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of SynergySphere?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void performLogout();
          },
        },
      ],
    );
  }

  async function openDevicePermissions() {

    if (Platform.OS === 'web') {

      if (typeof window !== 'undefined') {

        window.alert(

          'On web, manage SynergySphere permissions from your browser site settings. Look for the lock or site-controls icon next to the address bar.',

        );

      }

      return;

    }

    try {

      await Linking.openSettings();

    } catch {

      Alert.alert(

        'Unable to Open Settings',

        'Please open your device Settings and select SynergySphere to manage permissions.',

      );

    }

  }


  async function openSupportEmail(kind: 'problem' | 'support') {
    const subject = kind === 'problem'
      ? 'SynergySphere Problem Report'
      : 'SynergySphere Support Request';
    const body = kind === 'problem'
      ? 'Please describe the problem, the screen you were using, what you expected to happen, and what happened instead.'
      : 'Please describe how the SynergySphere team can assist you.';
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Email App Unavailable', 'No email application is available on this device. Please contact your SynergySphere administrator for assistance.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to Open Email', 'Please contact your SynergySphere administrator for assistance.');
    }
  }

  async function disconnectGithub() {

    try {

      await github.disconnect();

      setGithubConnection({

        connected: false,

        username: null,

        avatarUrl: null,

      });

      setMessage({

        type: 'success',

        text: 'GitHub disconnected from SynergySphere.',

      });

    } catch (error) {

      setMessage({

        type: 'error',

        text:

          error instanceof Error

            ? error.message

            : 'Could not disconnect GitHub.',

      });

    }

  }

  function toggleSection(

    key: Exclude<

      SettingKey,

      null

    >,

  ) {

    setExpanded(

      (

        current,

      ) =>

        current === key

          ? null

          : key,

    );

  }

  const isLight =

    theme === 'light';

  const primaryAccent =

    isLight

      ? '#1e6827'

      : colors.primary;

  const fullName =

    [

      firstName,

      lastName,

    ]

      .filter(Boolean)

      .join(' ')

      .trim() ||

    'SynergySphere User';

  const userInitials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName && user.firstName.length >= 2
      ? user.firstName.slice(0, 2).toUpperCase()
      : user?.firstName
      ? user.firstName[0].toUpperCase()
      : 'SS';

  return (

    <Screen refreshing={refreshing} onRefresh={handleRefresh}>

      {/* SETTINGS HEADER */}
      <View
        style={[
          styles.headerRow,
          largerText && styles.headerRowLarge,
        ]}
      >
        <View
          style={[
            styles.settingsLogoWrapper,
            largerText && styles.settingsLogoWrapperLarge,
            {
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(16, 33, 40, 0.7)'
                  : 'rgba(237, 243, 239, 0.85)',
              borderColor:
                theme === 'dark'
                  ? 'rgba(145, 219, 94, 0.28)'
                  : 'rgba(145, 219, 94, 0.45)',
              shadowColor: theme === 'dark' ? '#91db5e' : '#10231D',
            },
          ]}
        >
          <Image
            source={require('../../../assets/images/settings-logo.png')}
            style={[
              styles.settingsLogo,
              largerText && styles.settingsLogoLarge,
            ]}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <View style={styles.headerText}>
          <RNText
            allowFontScaling
            style={[
              styles.headerTitle,
              {
                color: colors.text,
                fontSize: fontSize(24),
              },
            ]}
          >
            Settings
          </RNText>

          <RNText
            allowFontScaling
            numberOfLines={2}
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
                fontSize: fontSize(13),
                lineHeight: fontSize(18),
              },
            ]}
          >
            Manage your account, preferences, privacy and security.
          </RNText>
        </View>

        <View style={[styles.headerStatusBadge, { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.15)' }]}>
          <Ionicons name="shield-checkmark" size={12} color={primaryAccent} />
          <Text style={[styles.headerStatusBadgeText, { color: primaryAccent }]}>Synced</Text>
        </View>
      </View>

      {message ? (

        <Notice

          tone={

            message.type ===

            'success'

              ? 'success'

              : 'error'

          }

        >

          {message.text}

        </Notice>

      ) : null}

      <View
        style={[
          styles.profileSummary,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.avatarWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={promptPhotoOptions}
            style={[
              styles.summaryAvatar,
              {
                backgroundColor: isLight ? '#0B2314' : '#0F3D24',
                borderColor: isLight ? '#1e6827' : colors.primary,
              },
            ]}
          >
            {photo ? (
              <Image
                source={{
                  uri: photo,
                }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitialsText}>
                {userInitials}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit photo"
            onPress={promptPhotoOptions}
            style={[
              styles.cameraBadge,
              {
                backgroundColor: primaryAccent,
                borderColor: colors.surface,
              },
            ]}
          >
            <Ionicons name="camera" size={11} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.summaryCopy}>
          <Text
            style={[
              styles.summaryName,
              {
                color: colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {fullName}
          </Text>

          <Text
            style={[
              styles.summaryEmail,
              {
                color: colors.muted,
              },
            ]}
            numberOfLines={1}
          >
            {user?.email || 'No email available'}
          </Text>

          <View style={styles.summaryBadgeRow}>
            <View style={[styles.rolePill, { backgroundColor: isLight ? '#e6f4ea' : 'rgba(145,219,94,0.15)' }]}>
              <Text style={[styles.rolePillText, { color: primaryAccent }]}>
                {String(user?.role || 'USER').replaceAll('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Explicit Photo Controls */}
          <View style={styles.photoActionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={promptPhotoOptions}
              style={[
                styles.photoActionButton,
                {
                  borderColor: isLight ? '#CBD5E1' : colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons name="camera-outline" size={12} color={primaryAccent} />
              <Text style={[styles.photoActionText, { color: colors.text }]}>
                {photo ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </Pressable>

            {photo ? (
              <Pressable
                accessibilityRole="button"
                onPress={removePhoto}
                style={[
                  styles.photoActionButton,
                  styles.removePhotoButton,
                  {
                    borderColor: 'rgba(239,68,68,0.25)',
                    backgroundColor: isLight ? '#fef2f2' : 'rgba(239,68,68,0.1)',
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={12} color="#ef4444" />
                <Text style={[styles.photoActionText, { color: '#ef4444' }]}>
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Text

        style={[

          styles.sectionLabel,

          {

            color:

              colors.muted,

          },

        ]}

      >

        ACCOUNT

      </Text>

      <Card>

        <SettingRow

          icon="person-outline"

          title="Account Information"

          subtitle="Profile, role and developer details"

          expanded={

            expanded ===

            'account'

          }

          onPress={() =>

            toggleSection(

              'account',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'account' ? (

          <View

            style={[

              styles.expandedPanel,

              {

                borderBottomColor:

                  colors.border,

              },

            ]}

          >

            <View

              style={

                styles.profileTop

              }

            >

              <Pressable

                onPress={

                  choosePhoto

                }

                accessibilityRole="button"

                accessibilityLabel="Choose profile photo"

                style={[

                  styles.avatar,

                  {

                    backgroundColor:

                      colors.surfaceElevated,

                    borderColor:

                      colors.border,

                  },

                ]}

              >

                {photo ? (

                  <Image

                    source={{

                      uri: photo,

                    }}

                    style={

                      styles.avatarImage

                    }

                  />

                ) : (

                  <Ionicons

                    name="person"

                    size={34}

                    color={

                      primaryAccent

                    }

                  />

                )}

              </Pressable>

              <View

                style={

                  styles.profileCopy

                }

              >

                <Text

                  style={[

                    styles.description,

                    {

                      color:

                        colors.muted,

                    },

                  ]}

                >

                  Your profile appears across community projects and team spaces.

                </Text>

                <Button

                  title="Upload Photo"

                  secondary

                  onPress={

                    choosePhoto

                  }

                />

              </View>

            </View>

            <Field

              label="First Name"

              value={

                firstName

              }

              onChangeText={

                setFirstName

              }

            />

            <Field

              label="Last Name"

              value={

                lastName

              }

              onChangeText={

                setLastName

              }

            />

            <Field

              label="Target Role (e.g. Backend Intern)"

              value={

                targetRole

              }

              onChangeText={

                setTargetRole

              }

            />

            <Field

              label="Location"

              value={

                location

              }

              onChangeText={

                setLocation

              }

            />

            <Field

              label="Bio / Engineering Focus"

              value={bio}

              onChangeText={

                setBio

              }

              multiline

              numberOfLines={

                3

              }

            />

            <Button

              title={

                saving

                  ? 'Saving…'

                  : 'Save Account Information'

              }

              onPress={

                saveSettings

              }

              disabled={

                saving

              }

            />

          </View>

        ) : null}

        <SettingRow

          icon="key-outline"

          title="Change Password"

          subtitle="Request a secure reset token"

          expanded={

            expanded ===

            'password'

          }

          onPress={() =>

            toggleSection(

              'password',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'password' ? (

          <View

            style={[

              styles.expandedPanel,

              {

                borderBottomColor:

                  colors.border,

              },

            ]}

          >

            <Text

              style={[

                styles.description,

                {

                  color:

                    colors.muted,

                },

              ]}

            >

              A secure password reset will be requested for {user?.email || 'your account email'}.

            </Text>

            <Button

              title={

                resetSending

                  ? 'Sending Token…'

                  : 'Request Password Reset Token'

              }

              secondary

              onPress={

                handleRequestPasswordReset

              }

              disabled={

                resetSending

              }

            />

          </View>

        ) : null}

        <SettingRow

          icon="link-outline"

          title="Linked Accounts"

          subtitle="GitHub and professional profile links"

          expanded={

            expanded ===

            'linked'

          }

          onPress={() =>

            toggleSection(

              'linked',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'linked' ? (

          <View

            style={

              styles.lastExpandedPanel

            }

          >

            <View

              style={

                styles.linkedHeading

              }

            >

              <Ionicons

                name="logo-github"

                size={21}

                color={

                  colors.text

                }

              />

              <View

                style={{

                  flex: 1,

                }}

              >

                <Text

                  style={[

                    styles.panelTitle,

                    {

                      color:

                        colors.text,

                    },

                  ]}

                >

                  GitHub Collaboration

                </Text>

                <Text

                  style={[

                    styles.description,

                    {

                      color:

                        colors.muted,

                    },

                  ]}

                >

                  {githubConnection?.connected

                    ? `Connected as @${githubConnection.username}.`

                    : 'Connect GitHub to collaborate on community projects and sync repositories.'}

                </Text>

              </View>

            </View>

            <Button

              title={

                githubConnection?.connected

                  ? 'Disconnect GitHub'

                  : 'Connect GitHub'

              }

              secondary

              onPress={

                githubConnection?.connected

                  ?() =>
                    Alert.alert(
                      'Disconnect GitHub?',
                      'Are you sure you want to disconnect your GitHub account from SynergySphere?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Disconnect',
                          style: 'destructive',
                          onPress: disconnectGithub,
                        },
                      ]
                    )
                : () =>

                      router.push(

                        '/github-connect?returnTo=/settings' as never,

                      )

              }

            />

            <Field

              label="LinkedIn Profile URL"

              value={

                linkedinUrl

              }

              onChangeText={

                setLinkedinUrl

              }

            />

            <Field

              label="GitHub Profile URL"

              value={

                githubUrl

              }

              onChangeText={

                setGithubUrl

              }

            />

            <Button

              title={

                saving

                  ? 'Saving…'

                  : 'Save Linked Account URLs'

              }

              onPress={

                saveSettings

              }

              disabled={

                saving

              }

            />

          </View>

        ) : null}

      </Card>

      <Text

        style={[

          styles.sectionLabel,

          {

            color:

              colors.muted,

          },

        ]}

      >

        PREFERENCES

      </Text>

      <Card>

        <SettingRow

          icon="notifications-outline"

          title="Notifications"

          subtitle="Manage notification preferences"

          onPress={() =>

            router.push(

              '/notification-settings' as never,

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        <SettingRow

          icon="color-palette-outline"

          title="Appearance"

          subtitle="Light and dark mode"

          expanded={

            expanded ===

            'appearance'

          }

          onPress={() =>

            toggleSection(

              'appearance',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'appearance' ? (

          <View

            style={[

              styles.expandedPanel,

              {

                borderBottomColor:

                  colors.border,

              },

            ]}

          >

            <View

              style={

                styles.switchRow

              }

            >

              <View

                style={{

                  flex: 1,

                }}

              >

                <Text

                  style={[

                    styles.switchLabel,

                    {

                      color:

                        colors.text,

                    },

                  ]}

                >

                  Dark Mode

                </Text>

                <Text

                  style={[

                    styles.description,

                    {

                      color:

                        colors.muted,

                    },

                  ]}

                >

                  Switch between dark and light themes.

                </Text>

              </View>

              <Switch

                value={

                  theme ===

                  'dark'

                }

                onValueChange={async (val) => {

                  const nextTheme =

                    val ? 'dark' : 'light';

                  await setTheme(nextTheme);

                  try {

                    await api.patch(

                      '/auth/settings',

                      {

                        theme: nextTheme,

                      },

                    );

                  } catch {

                    // silent backend sync

                  }

                }}

                trackColor={{

                  false:

                    colors.border,

                  true:

                    primaryAccent,

                }}

                thumbColor={

                  theme ===

                  'dark'

                    ? '#ffffff'

                    : colors.surface

                }

              />

            </View>

            <View
              style={[
                styles.switchRow,
                {
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="eye-outline" size={16} color={primaryAccent} />
                  <Text
                    style={[
                      styles.switchLabel,
                      {
                        color: colors.text,
                      },
                    ]}
                  >
                    Eye Comfort
                  </Text>
                </View>
                <Text
                  style={[
                    styles.description,
                    {
                      color: colors.muted,
                      marginTop: 2,
                    },
                  ]}
                >
                  Warm-tinted, reduced-strain palette designed for prolonged coding sessions.
                </Text>
              </View>

              <Switch
                value={eyeComfort}
                onValueChange={setEyeComfort}
                style={{ flexShrink: 0 }}
                trackColor={{
                  false: colors.border,
                  true: primaryAccent,
                }}
                thumbColor={
                  eyeComfort
                    ? '#ffffff'
                    : colors.surface
                }
              />
            </View>

          </View>

        ) : null}

        <SettingRow

          icon="accessibility-outline"

          title="Accessibility"

          subtitle="Text, contrast and motion preferences"

          onPress={() =>

            router.push(

              '/accessibility-settings' as never,

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

      </Card>

      <Text

        style={[

          styles.sectionLabel,

          {

            color:

              colors.muted,

          },

        ]}

      >

        PRIVACY & SECURITY

      </Text>

      <Card>

        <SettingRow

          icon="shield-checkmark-outline"

          title="Privacy"

          subtitle="Understand how your profile is displayed"

          expanded={

            expanded ===

            'privacy'

          }

          onPress={() =>

            toggleSection(

              'privacy',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'privacy' ? (

          <View

            style={[

              styles.expandedPanel,

              {

                borderBottomColor:

                  colors.border,

              },

            ]}

          >

            <Text

              style={[

                styles.panelTitle,

                { color: colors.text },

              ]}

            >

              Profile Visibility

            </Text>

            <Text

              style={[

                styles.description,

                { color: colors.muted },

              ]}

            >

              Choose how your profile is presented within SynergySphere community and collaboration areas.

            </Text>

            <View style={styles.privacyOption}>

              <View style={styles.privacyCopy}>

                <Text style={[styles.switchLabel, { color: colors.text }]}>

                  Show profile in Community

                </Text>

                <Text style={[styles.description, { color: colors.muted }]}>

                  Allow your profile information to be shown when participating in community spaces.

                </Text>

              </View>

              <Switch

                value={showCommunityProfile}

                onValueChange={setShowCommunityProfile}

                trackColor={{ false: colors.border, true: primaryAccent }}

                thumbColor={showCommunityProfile ? colors.surface : colors.surfaceElevated}

                accessibilityLabel="Show profile in Community"

              />

            </View>

            <View style={styles.privacyOption}>

              <View style={styles.privacyCopy}>

                <Text style={[styles.switchLabel, { color: colors.text }]}>

                  Show developer information

                </Text>

                <Text style={[styles.description, { color: colors.muted }]}>

                  Allow your developer profile and career information to appear in collaboration areas.

                </Text>

              </View>

              <Switch

                value={showDeveloperInfo}

                onValueChange={setShowDeveloperInfo}

                trackColor={{ false: colors.border, true: primaryAccent }}

                thumbColor={showDeveloperInfo ? colors.surface : colors.surfaceElevated}

                accessibilityLabel="Show developer information"

              />

            </View>

            <View style={styles.privacyOption}>

              <View style={styles.privacyCopy}>

                <Text style={[styles.switchLabel, { color: colors.text }]}>

                  Show activity status

                </Text>

                <Text style={[styles.description, { color: colors.muted }]}>

                  Control whether your active status may be displayed in collaborative areas.

                </Text>

              </View>

              <Switch

                value={showActivityStatus}

                onValueChange={setShowActivityStatus}

                trackColor={{ false: colors.border, true: primaryAccent }}

                thumbColor={showActivityStatus ? colors.surface : colors.surfaceElevated}

                accessibilityLabel="Show activity status"

              />

            </View>

            <Text

              style={[

                styles.privacyNote,

                {

                  color: colors.muted,

                  backgroundColor: colors.surfaceElevated,

                },

              ]}

            >

              These preferences are currently stored in the app. Server-side privacy enforcement can be connected when the corresponding privacy API is available.

            </Text>

          </View>

        ) : null}

        <SettingRow

          icon="lock-closed-outline"

          title="Security"

          subtitle="Account and session protection"

          expanded={

            expanded ===

            'security'

          }

          onPress={() =>

            toggleSection(

              'security',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'security' ? (

          <View

            style={[

              styles.expandedPanel,

              {

                borderBottomColor:

                  colors.border,

              },

            ]}

          >

            <Text style={[styles.panelTitle, { color: colors.text }]}>

              Password

            </Text>

            <Text style={[styles.description, { color: colors.muted }]}>

              Keep your SynergySphere account protected by maintaining a secure password.

            </Text>

            <Pressable

              accessibilityRole="button"

              accessibilityLabel="Change password"

              disabled={resetSending}

              onPress={handleRequestPasswordReset}

              style={({ pressed }) => [

                styles.securityAction,

                {

                  borderColor: colors.border,

                  backgroundColor: colors.surfaceElevated,

                  opacity: pressed || resetSending ? 0.7 : 1,

                },

              ]}

            >

              <View style={styles.securityActionLeft}>

                <Ionicons

                  name="key-outline"

                  size={20}

                  color={primaryAccent}

                />

                <View style={styles.securityActionCopy}>

                  <Text style={[styles.securityActionTitle, { color: colors.text }]}>

                    {resetSending ? 'Requesting Reset…' : 'Change Password'}

                  </Text>

                  <Text style={[styles.description, { color: colors.muted }]}>

                    Request a secure password reset token for {user?.email || 'your account'}.

                  </Text>

                </View>

              </View>

              <Ionicons

                name="chevron-forward"

                size={18}

                color={colors.muted}

              />

            </Pressable>

            <View style={[styles.securityDivider, { backgroundColor: colors.border }]} />

            <Text style={[styles.panelTitle, { color: colors.text }]}>

              Account Session

            </Text>

            <Text style={[styles.description, { color: colors.muted }]}>
              Your authenticated session is stored securely on this device. Use the dedicated Logout option in Settings when you want to end your session.
            </Text>

            <View style={[styles.securityDivider, { backgroundColor: colors.border }]} />

            <Text style={[styles.panelTitle, { color: colors.text }]}>
              Biometric Security
            </Text>

            <Text style={[styles.description, { color: colors.muted }]}>
              Enable biometric authentication (Face ID / Fingerprint) to quickly and securely authenticate on this device without re-entering your password.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>Biometric Unlock</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>Protect application launch with device biometrics</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={(val) => {
                  setBiometricsEnabled(val);
                  void SecureStore.setItemAsync('synergysphere_biometrics_enabled', val ? 'true' : 'false');
                }}
                trackColor={{ false: colors.border, true: primaryAccent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

        ) : null}

        <SettingRow

          icon="document-lock-outline"

          title="Data & Permissions"

          subtitle="Device permissions and POPIA controls"

          expanded={

            expanded ===

            'data'

          }

          onPress={() =>

            toggleSection(

              'data',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />

        {expanded ===

        'data' ? (

          <View

            style={

              styles.lastExpandedPanel

            }

          >

            <Text

              style={[

                styles.panelTitle,

                { color: colors.text },

              ]}

            >

              Device Permissions

            </Text>

            <Text

              style={[

                styles.description,

                { color: colors.muted },

              ]}

            >

              Review permissions used by SynergySphere for supported features such as profile photos and notifications.

            </Text>

            <Pressable

              accessibilityRole="button"

              accessibilityLabel="Manage device permissions"

              accessibilityHint={

                Platform.OS === 'web'

                  ? 'Explains how to manage browser site permissions'

                  : 'Opens your device settings for SynergySphere'

              }

              onPress={() => {

                void openDevicePermissions();

              }}

              style={({ pressed }) => [

                styles.dataAction,

                {

                  backgroundColor: colors.surfaceElevated,

                  borderColor: colors.border,

                  opacity: pressed ? 0.72 : 1,

                },

              ]}

            >

              <View style={styles.dataActionLeft}>

                <View

                  style={[

                    styles.dataIcon,

                    { backgroundColor: colors.surface },

                  ]}

                >

                  <Ionicons

                    name="phone-portrait-outline"

                    size={20}

                    color={primaryAccent}

                  />

                </View>

                <View style={styles.dataActionCopy}>

                  <Text

                    style={[

                      styles.dataActionTitle,

                      { color: colors.text },

                    ]}

                  >

                    Manage Device Permissions

                  </Text>

                  <Text

                    style={[

                      styles.description,

                      { color: colors.muted },

                    ]}

                  >

                    {Platform.OS === 'web'

                      ? 'Manage permissions from your browser site settings.'

                      : 'Open your device settings to review app permissions.'}

                  </Text>

                </View>

              </View>

              <Ionicons

                name={Platform.OS === 'web' ? 'information-circle-outline' : 'open-outline'}

                size={18}

                color={colors.muted}

              />

            </Pressable>

            <View

              style={[

                styles.dataDivider,

                { backgroundColor: colors.border },

              ]}

            />

            <Text

              style={[

                styles.panelTitle,

                { color: colors.text },

              ]}

            >

              Your Data

            </Text>

            <Text

              style={[

                styles.description,

                { color: colors.muted },

              ]}

            >

              SynergySphere uses account and application data to provide learning, productivity, wellness and community features.

            </Text>

            <View

              style={[

                styles.dataInfoBox,

                {

                  backgroundColor: colors.surfaceElevated,

                  borderColor: colors.border,

                },

              ]}

            >

              <View style={styles.dataInfoRow}>

                <Ionicons

                  name="person-outline"

                  size={19}

                  color={primaryAccent}

                />

                <View style={styles.dataActionCopy}>

                  <Text

                    style={[

                      styles.dataActionTitle,

                      { color: colors.text },

                    ]}

                  >

                    Account Information

                  </Text>

                  <Text

                    style={[

                      styles.description,

                      { color: colors.muted },

                    ]}

                  >

                    Profile and account information used to provide and personalize your SynergySphere account.

                  </Text>

                </View>

              </View>

              <View

                style={[

                  styles.dataInfoSeparator,

                  { backgroundColor: colors.border },

                ]}

              />

              <View style={styles.dataInfoRow}>

                <Ionicons

                  name="apps-outline"

                  size={19}

                  color={primaryAccent}

                />

                <View style={styles.dataActionCopy}>

                  <Text

                    style={[

                      styles.dataActionTitle,

                      { color: colors.text },

                    ]}

                  >

                    Application Data

                  </Text>

                  <Text

                    style={[

                      styles.description,

                      { color: colors.muted },

                    ]}

                  >

                    Information created while you use SynergySphere features and workspaces.

                  </Text>

                </View>

              </View>

              <View

                style={[

                  styles.dataInfoSeparator,

                  { backgroundColor: colors.border },

                ]}

              />

              <View style={styles.dataInfoRow}>

                <Ionicons

                  name="shield-checkmark-outline"

                  size={19}

                  color={primaryAccent}

                />

                <View style={styles.dataActionCopy}>

                  <Text

                    style={[

                      styles.dataActionTitle,

                      { color: colors.text },

                    ]}

                  >

                    Privacy Controls

                  </Text>

                  <Text

                    style={[

                      styles.description,

                      { color: colors.muted },

                    ]}

                  >

                    Review profile visibility and activity preferences from the Privacy section above.

                  </Text>

                </View>

              </View>

            </View>

            <View

              style={[

                styles.dataDivider,

                { backgroundColor: colors.border },

              ]}

            />

            <Text

              style={[

                styles.panelTitle,

                { color: colors.text },

              ]}

            >

              POPIA & Account Data

            </Text>

            <Text

              style={[

                styles.description,

                { color: colors.muted },

              ]}

            >

              Account deletion is available in the Danger Zone below. It permanently removes your account and personal data using the existing POPIA account-deletion control.

            </Text>

          </View>

        ) : null}

      </Card>

      <Text

        style={[

          styles.sectionLabel,

          {

            color:

              colors.muted,

          },

        ]}

      >

        SUPPORT

      </Text>

      <Card>

        <SettingRow

          icon="help-circle-outline"

          title="Help & Support"

          subtitle="Get help using SynergySphere"

          expanded={

            expanded ===

            'support'

          }

          onPress={() =>

            toggleSection(

              'support',

            )

          }

          colors={

            colors

          }

          accentColor={

            primaryAccent

          }

        />
        {expanded === 'support' ? (
          <View style={[styles.expandedPanel, { borderBottomColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Help & Support</Text>
            <Text style={[styles.description, { color: colors.muted }]}>
              Submit support tickets directly from your student account, track your logged issues, or read FAQs.
            </Text>

            {/* Report an Issue Button / Form */}
            {user?.role === 'ADMIN' ? (
              <View style={[styles.authNoticeBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginVertical: 8 }]}>
                <Ionicons name="shield-checkmark" size={18} color={primaryAccent} />
                <Text style={[styles.description, { color: colors.muted, flex: 1 }]}>
                  You are signed in as an Administrator. Support ticket management, complaints, and issue resolution are handled directly in the Admin Portal.
                </Text>
              </View>
            ) : !showReportForm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Report an issue"
                onPress={() => {
                  setShowReportForm(true);
                  setTicketMessage(null);
                }}
                style={({ pressed }) => [
                  styles.reportIssueBtn,
                  { backgroundColor: primaryAccent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.reportIssueBtnText}>Report an Issue</Text>
              </Pressable>
            ) : (
              <Card style={{ padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.supportInfoTitle, { color: colors.text, fontSize: 16 }]}>
                    Report an Issue
                  </Text>
                  <Pressable onPress={() => setShowReportForm(false)}>
                    <Ionicons name="close-circle" size={22} color={colors.muted} />
                  </Pressable>
                </View>

                <View style={[styles.authNoticeBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Ionicons name="shield-checkmark" size={18} color={primaryAccent} />
                  <Text style={[styles.description, { color: colors.muted, flex: 1 }]}>
                    Logged in as {user?.firstName} {user?.lastName} ({user?.email}). Your session is automatically linked — no email input required.
                  </Text>
                </View>

                {/* Category Selection */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(
                    [
                      'Bug / Technical Issue',
                      'Account & Login',
                      'Feature Request',
                      'Community Issue',
                      'Event Issue',
                      'Other',
                    ] as const
                  ).map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setTicketCategory(cat)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: ticketCategory === cat ? primaryAccent : colors.surfaceElevated,
                          borderColor: ticketCategory === cat ? primaryAccent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          { color: ticketCategory === cat ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Field
                  label="Subject / Title"
                  value={ticketSubject}
                  onChangeText={setTicketSubject}
                  placeholder="e.g. Cannot submit challenge solution"
                  maxLength={100}
                />

                <Field
                  label="Description"
                  value={ticketDescription}
                  onChangeText={setTicketDescription}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 88, textAlignVertical: 'top' }}
                  placeholder="Please describe what happened, what you expected, and steps to reproduce..."
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Button
                    title={ticketSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
                    disabled={ticketSubmitting}
                    onPress={handleSubmitTicket}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Cancel"
                    secondary
                    onPress={() => setShowReportForm(false)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            )}

            {/* Notification Banner */}
            {ticketMessage ? (
              <View
                style={[
                  styles.ticketNoticeBox,
                  {
                    backgroundColor:
                      ticketMessage.type === 'success' ? '#ECFDF3' : '#FEF3F2',
                    borderColor:
                      ticketMessage.type === 'success' ? '#12B76A' : '#F04438',
                  },
                ]}
              >
                <Ionicons
                  name={ticketMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={ticketMessage.type === 'success' ? '#12B76A' : '#F04438'}
                />
                <Text
                  style={{
                    color: ticketMessage.type === 'success' ? '#027A48' : '#B42318',
                    fontSize: 13,
                    fontWeight: '600',
                    flex: 1,
                  }}
                >
                  {ticketMessage.text}
                </Text>
              </View>
            ) : null}

            {/* My Submitted Issues */}
            <View style={{ gap: 8, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.supportInfoTitle, { color: colors.text }]}>
                  My Submitted Issues ({userTickets.length})
                </Text>
                <Pressable
                  onPress={() => void loadUserTickets()}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                >
                  <Ionicons name="refresh" size={18} color={primaryAccent} />
                </Pressable>
              </View>

              {loadingTickets && userTickets.length === 0 ? (
                <Text style={[styles.description, { color: colors.muted }]}>Loading tickets...</Text>
              ) : userTickets.length === 0 ? (
                <View
                  style={[
                    styles.supportInfoBox,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.description, { color: colors.muted }]}>
                    No support issues logged yet. If you run into a bug or need assistance, tap "Report an Issue" above.
                  </Text>
                </View>
              ) : (
                userTickets.map((t) => {
                  const isExpanded = expandedTicketId === t.id;
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    open: { bg: '#FEF08A', text: '#854D0E' },
                    in_progress: { bg: '#BAE6FD', text: '#0369A1' },
                    resolved: { bg: '#BBF7D0', text: '#15803D' },
                    closed: { bg: '#E2E8F0', text: '#475569' },
                  };
                  const sc = statusColors[t.status] || { bg: '#E2E8F0', text: '#475569' };
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setExpandedTicketId(isExpanded ? null : t.id)}
                      style={[
                        styles.ticketCard,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', fontSize: 13, color: primaryAccent }}>
                          #{t.ticketNumber}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: sc.text }]}>
                              {t.status.replace('_', ' ').toUpperCase()}
                            </Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.muted}
                          />
                        </View>
                      </View>

                      <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text, marginTop: 4 }}>
                        {t.title}
                      </Text>
                      <Text style={[styles.description, { color: colors.muted, fontSize: 11 }]}>
                        {t.category} · {new Date(t.createdAt).toLocaleDateString()}
                      </Text>

                      {isExpanded ? (
                        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 }}>
                          <Text style={[styles.description, { color: colors.text }]}>
                            {t.description}
                          </Text>
                          {t.adminNotes ? (
                            <View style={[styles.adminNoteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: primaryAccent }}>
                                Admin Response:
                              </Text>
                              <Text style={[styles.description, { color: colors.text }]}>
                                {t.adminNotes}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* FAQs Accordion */}
            <View style={{ gap: 8, marginTop: 10 }}>
              <Text style={[styles.supportInfoTitle, { color: colors.text }]}>
                Frequently Asked Questions
              </Text>
              {[
                {
                  id: 'faq-1',
                  q: 'How do I log a support ticket?',
                  a: 'Tap "Report an Issue" above, select a category, write a quick description, and tap Submit. A ticket number (#SS-xxxx) is created automatically and linked to your signed-in account with no email entry needed.',
                },
                {
                  id: 'faq-2',
                  q: 'How are student account approvals handled?',
                  a: 'Student profiles are verified by platform administrators. Once approved, you gain full access to verified community features, mentorship pairing, and code repositories.',
                },
                {
                  id: 'faq-3',
                  q: 'How does issue triage work?',
                  a: 'Administrators review tickets in the Admin Portal, assign priorities (Low, Medium, High, Critical), investigate technical issues, and provide resolutions visible in your ticket list.',
                },
                {
                  id: 'faq-4',
                  q: 'How are student data and code protected?',
                  a: 'SynergySphere complies with POPIA standards. Your code exercises, project repositories, and wellness logs remain strictly confidential.',
                },
              ].map((faq) => {
                const isOpen = expandedFaq === faq.id;
                return (
                  <Pressable
                    key={faq.id}
                    onPress={() => setExpandedFaq(isOpen ? null : faq.id)}
                    style={[
                      styles.faqItem,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text, flex: 1, paddingRight: 8 }}>
                        {faq.q}
                      </Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.muted}
                      />
                    </View>
                    {isOpen ? (
                      <Text style={[styles.description, { color: colors.muted, marginTop: 6, lineHeight: 18 }]}>
                        {faq.a}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Accessibility Support */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Accessibility support"
              onPress={() => router.push('/accessibility-settings' as never)}
              style={({ pressed }) => [
                styles.supportAction,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1, marginTop: 10 },
              ]}
            >
              <View style={styles.supportActionLeft}>
                <Ionicons name="accessibility-outline" size={20} color={primaryAccent} />
                <View style={styles.supportActionCopy}>
                  <Text style={[styles.supportActionTitle, { color: colors.text }]}>Accessibility Support</Text>
                  <Text style={[styles.description, { color: colors.muted }]}>Manage Larger Text, High Contrast and Reduce Motion.</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}

        <SettingRow
          icon="information-circle-outline"
          title="About SynergySphere"
          subtitle="Platform information"
          expanded={expanded === 'about'}
          onPress={() => toggleSection('about')}
          colors={colors}
          accentColor={primaryAccent}
        />

        {expanded === 'about' ? (
          <View style={styles.lastExpandedPanel}>
            <View style={styles.aboutHeader}>
              <View style={[styles.aboutIcon, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="sparkles-outline" size={24} color={primaryAccent} />
              </View>
              <View style={styles.aboutHeaderCopy}>
                <Text style={[styles.aboutTitle, { color: colors.text }]}>SynergySphere</Text>
                <Text style={[styles.description, { color: colors.muted }]}>Learn. Build. Thrive.</Text>
              </View>
            </View>

            <Text style={[styles.description, { color: colors.muted }]}>
              SynergySphere is a student-focused platform that brings learning support, productivity, wellness and community collaboration into one workspace.
            </Text>

            <View style={[styles.aboutInfoBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.aboutInfoRow}>
                <Text style={[styles.aboutInfoLabel, { color: colors.muted }]}>Version</Text>
                <Text style={[styles.aboutInfoValue, { color: colors.text }]}>1.0.0</Text>
              </View>
              <View style={[styles.aboutSeparator, { backgroundColor: colors.border }]} />
              <View style={styles.aboutInfoRow}>
                <Text style={[styles.aboutInfoLabel, { color: colors.muted }]}>Platform</Text>
                <Text style={[styles.aboutInfoValue, { color: colors.text }]}>
                  {Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'}
                </Text>
              </View>
            </View>

            <Text style={[styles.panelTitle, { color: colors.text }]}>Core Workspaces</Text>
            <View style={styles.workspaceList}>
              {['Learning Hub', 'AI Workspace', 'Interview Coach', 'Community & GitHub', 'Portfolio Evidence', 'Tasks & Productivity', 'Wellness'].map((workspace) => (
                <View key={workspace} style={styles.workspaceItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={primaryAccent} />
                  <Text style={[styles.description, { color: colors.text }]}>{workspace}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.aboutPrivacyBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={primaryAccent} />
              <View style={styles.supportActionCopy}>
                <Text style={[styles.supportActionTitle, { color: colors.text }]}>Privacy & Account Controls</Text>
                <Text style={[styles.description, { color: colors.muted }]}>Privacy preferences, device permissions and POPIA account controls are available in Settings.</Text>
              </View>
            </View>

            <Text style={[styles.aboutCopyright, { color: colors.muted }]}>© 2026 SynergySphere</Text>
          </View>
        ) : null}
</Card>

      <Pressable

        accessibilityRole="button"

        accessibilityLabel="Log out"

        onPress={

          confirmLogout

        }

        style={({ pressed }) => [

          styles.logoutButton,

          {

            borderColor:

              colors.border,

            backgroundColor:

              colors.surface,

            opacity: pressed

              ? 0.68

              : 1,

          },

        ]}

      >

        <Ionicons

          name="log-out-outline"

          size={19}

          color="#D92D20"

        />

        <Text

          style={

            styles.logoutText

          }

        >

          Log Out

        </Text>

      </Pressable>

      <View

        style={[

          styles.dangerCard,

          {

            backgroundColor:

              colors.surface,

            borderColor:

              '#D92D20',

          },

        ]}

      >

        <View

          style={

            styles.dangerHeading

          }

        >

          <Ionicons

            name="warning-outline"

            size={21}

            color="#D92D20"

          />

          <Text

            style={

              styles.dangerTitle

            }

          >

            Danger Zone

          </Text>

        </View>

        <Text

          style={[

            styles.description,

            {

              color:

                colors.muted,

            },

          ]}

        >

          Permanently delete your account and personal data pursuant to POPIA privacy rights.

        </Text>

        <Button

          title="Delete Account"

          danger

          onPress={

            confirmDeleteAccount

          }

        />

      </View>

    </Screen>

  );

}

const styles =

  StyleSheet.create({

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 12,
      minHeight: 88,
      width: '100%',
    },
    headerRowLarge: {
      alignItems: 'flex-start',
    },
    settingsLogoWrapper: {
      width: 58,
      height: 58,
      borderRadius: 29,
      padding: 2,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 3,
      flexShrink: 0,
    },
    settingsLogoWrapperLarge: {
      width: 66,
      height: 66,
      borderRadius: 33,
    },
    settingsLogo: {
      width: '100%',
      height: '100%',
      borderRadius: 27,
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    settingsLogoLarge: {
      borderRadius: 31,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: 3,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -0.3,
      lineHeight: 28,
    },
    headerSubtitle: {
      fontSize: 13,
      lineHeight: 18,
    },

    headerStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 4,
    },

    headerStatusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },

    profileSummary: {

      borderWidth: 1,

      borderRadius: 20,

      padding: 14,

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 14,

    },

    avatarWrapper: {
      position: 'relative',
      alignSelf: 'flex-start',
    },

    summaryAvatar: {

      width: 64,

      height: 64,

      borderRadius: 32,

      borderWidth: 1.5,

      alignItems: 'center',

      justifyContent: 'center',

      overflow: 'hidden',

    },

    avatarInitialsText: {
      fontSize: 20,
      fontWeight: '800',
      color: '#ffffff',
    },

    cameraBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatarImage: {

      width: '100%',

      height: '100%',

    },

    summaryCopy: {

      flex: 1,

      gap: 2,

    },

    summaryName: {

      fontSize: 17,

      fontWeight: '900',

    },

    summaryEmail: {

      fontSize: 12,

      lineHeight: 17,

    },

    summaryBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },

    rolePill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },

    rolePillText: {
      fontSize: 10.5,
      fontWeight: '800',
      textTransform: 'capitalize',
    },

    photoActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap',
    },

    photoActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
    },

    photoActionText: {
      fontSize: 11,
      fontWeight: '700',
    },

    removePhotoButton: {
      paddingHorizontal: 8,
    },

    summaryRole: {

      marginTop: 2,

      fontSize: 11,

      fontWeight: '800',

      textTransform: 'capitalize',

    },

    sectionLabel: {

      marginTop: 18,

      marginBottom: 8,

      marginLeft: 4,

      fontSize: 11,

      fontWeight: '900',

      letterSpacing: 1,

    },

    settingRow: {

      minHeight: 64,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 11,

      borderBottomWidth: 1,

      paddingVertical: 10,

    },

    settingIcon: {

      width: 38,

      height: 38,

      borderRadius: 12,

      alignItems: 'center',

      justifyContent: 'center',

    },

    settingCopy: {

      flex: 1,

      minWidth: 0,

      gap: 2,

    },

    settingTitle: {

      fontSize: 14,

      fontWeight: '800',

    },

    settingSubtitle: {

      fontSize: 11,

      lineHeight: 15,

    },

    expandedPanel: {

      gap: 12,

      paddingTop: 6,

      paddingBottom: 16,

      borderBottomWidth: 1,

    },

    lastExpandedPanel: {

      gap: 12,

      paddingTop: 6,

      paddingBottom: 4,

    },

    profileTop: {

      flexDirection: 'row',

      gap: 12,

      alignItems: 'center',

      marginBottom: 4,

    },

    avatar: {

      width: 72,

      height: 72,

      borderRadius: 36,

      overflow: 'hidden',

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

    },

    profileCopy: {

      flex: 1,

      gap: 8,

    },

    panelTitle: {

      fontSize: 14,

      fontWeight: '800',

    },

    description: {

      fontSize: 12,

      lineHeight: 18,

    },

    switchRow: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      gap: 12,

    },

    switchLabel: {

      fontSize: 14,

      fontWeight: '800',

    },

    linkedHeading: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 10,

    },

    logoutButton: {

      minHeight: 50,

      borderWidth: 1,

      borderRadius: 15,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 8,

      marginTop: 4,

    },

    logoutText: {

      color: '#D92D20',

      fontSize: 14,

      fontWeight: '900',

    },

    privacyOption: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      gap: 16,

      paddingVertical: 8,

    },

    privacyCopy: {

      flex: 1,

      gap: 3,

    },

    privacyNote: {

      fontSize: 11,

      lineHeight: 16,

      padding: 12,

      borderRadius: 12,

    },

    securityAction: {

      minHeight: 64,

      borderWidth: 1,

      borderRadius: 14,

      paddingHorizontal: 13,

      paddingVertical: 10,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      gap: 12,

    },

    securityActionLeft: {

      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 11,

    },

    securityActionCopy: {

      flex: 1,

      gap: 2,

    },

    securityActionTitle: {

      fontSize: 14,

      fontWeight: '800',

    },

    securityDivider: {

      height: 1,

      width: '100%',

      marginVertical: 2,

    },

    dataAction: {

      minHeight: 70,

      borderWidth: 1,

      borderRadius: 14,

      padding: 12,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      gap: 12,

    },

    dataActionLeft: {

      flex: 1,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

    },

    dataActionCopy: {

      flex: 1,

      gap: 3,

    },

    dataActionTitle: {

      fontSize: 14,

      fontWeight: '800',

    },

    dataIcon: {

      width: 40,

      height: 40,

      borderRadius: 12,

      alignItems: 'center',

      justifyContent: 'center',

    },

    dataDivider: {

      height: 1,

      width: '100%',

      marginVertical: 4,

    },

    dataInfoBox: {

      borderWidth: 1,

      borderRadius: 14,

      padding: 12,

      gap: 12,

    },

    dataInfoRow: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 12,

    },

    dataInfoSeparator: {

      height: 1,

      width: '100%',

    },


    reportIssueBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
      marginTop: 4,
    },
    reportIssueBtnText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    authNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    catChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    catChipText: {
      fontSize: 12,
      fontWeight: '700',
    },
    ticketNoticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4,
    },
    ticketCard: {
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      gap: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '900',
    },
    adminNoteBox: {
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      gap: 3,
    },
    faqItem: {
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    supportInfoBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
    supportInfoTitle: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
    supportAction: { minHeight: 66, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    supportActionLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    supportActionCopy: { flex: 1, gap: 3 },
    supportActionTitle: { fontSize: 14, fontWeight: '800' },
    aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    aboutIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    aboutHeaderCopy: { flex: 1, gap: 2 },
    aboutTitle: { fontSize: 18, fontWeight: '900' },
    aboutInfoBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
    aboutInfoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    aboutInfoLabel: { fontSize: 13, fontWeight: '700' },
    aboutInfoValue: { fontSize: 13, fontWeight: '900', textAlign: 'right' },
    aboutSeparator: { height: 1, width: '100%' },
    workspaceList: { gap: 8 },
    workspaceItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    aboutPrivacyBox: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    aboutCopyright: { fontSize: 11, textAlign: 'center', marginTop: 2 },

    dangerCard: {

      borderWidth: 1,

      borderRadius: 18,

      padding: 16,

      gap: 11,

      marginTop: 14,

    },

    dangerHeading: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 8,

    },

    dangerTitle: {

      color: '#D92D20',

      fontSize: 16,

      fontWeight: '900',

    },

  });
