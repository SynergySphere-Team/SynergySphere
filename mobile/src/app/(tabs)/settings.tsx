import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';

import * as ImagePicker from 'expo-image-picker';

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

import type { GithubConnection } from '@/types/api';

interface SettingsData {

  user: {

    firstName: string;

    lastName: string;

    email: string;

    role: string;

    bio: string | null;

    theme: string;

    emailNotifications: boolean;

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

          if (data.value.user.theme === 'dark' || data.value.user.theme === 'light') {

            setTheme(data.value.user.theme);

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

    const permission =

      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {

      setMessage({

        type: 'error',

        text: 'Photo-library access is needed to choose a profile photo.',

      });

      return;

    }

    const result =

      await ImagePicker.launchImageLibraryAsync(

        {

          mediaTypes: [

            'images',

          ],

          allowsEditing: true,

          aspect: [1, 1],

          quality: 0.55,

          base64: true,

        },

      );

    if (

      !result.canceled &&

      result.assets[0]

        ?.base64

    ) {

      setPhoto(

        `data:image/jpeg;base64,${result.assets[0].base64}`,

      );

    }

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

  return (

    <Screen refreshing={refreshing} onRefresh={handleRefresh}>

      <Heading subtitle="Manage your account, preferences, privacy and security.">

        Settings

      </Heading>

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

            backgroundColor:

              colors.surface,

            borderColor:

              colors.border,

          },

        ]}

      >

        <Pressable

          accessibilityRole="button"

          accessibilityLabel="Change profile photo"

          onPress={

            choosePhoto

          }

          style={[

            styles.summaryAvatar,

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

              size={30}

              color={

                primaryAccent

              }

            />

          )}

        </Pressable>

        <View

          style={

            styles.summaryCopy

          }

        >

          <Text

            style={[

              styles.summaryName,

              {

                color:

                  colors.text,

              },

            ]}

          >

            {fullName}

          </Text>

          <Text

            style={[

              styles.summaryEmail,

              {

                color:

                  colors.muted,

              },

            ]}

          >

            {user?.email ||

              'No email available'}

          </Text>

          <Text

            style={[

              styles.summaryRole,

              {

                color:

                  primaryAccent,

              },

            ]}

          >

            {String(

              user?.role ||

                'USER',

            ).replaceAll(

              '\_',

              ' ',

            )}

          </Text>

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

                  ? disconnectGithub

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

                  setTheme(nextTheme);

                  if (Platform.OS === 'web') {

                    window.localStorage.setItem(

                      'synergysphere-theme',

                      nextTheme,

                    );

                  }

                  try {

                    await api.patch(

                      '/auth/settings',

                      {

                        theme: nextTheme,

                      },

                    );

                    setMessage({

                      type: 'success',

                      text:

                        nextTheme === 'dark'

                          ? 'Dark mode saved.'

                          : 'Light mode saved.',

                    });

                  } catch (error) {

                    setMessage({

                      type: 'error',

                      text:

                        error instanceof Error

                          ? error.message

                          : 'Could not save appearance preference.',

                    });

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
              Find help for common SynergySphere questions, technical problems and accessibility features.
            </Text>

            <View style={[styles.supportInfoBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[styles.supportInfoTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
              <Text style={[styles.description, { color: colors.muted }]}>• Account: Use Account Information to update your profile details.</Text>
              <Text style={[styles.description, { color: colors.muted }]}>• Password: Use Change Password to request a secure reset token.</Text>
              <Text style={[styles.description, { color: colors.muted }]}>• Accessibility: Larger Text, High Contrast and Reduce Motion can be managed from Accessibility Settings.</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report a problem"
              onPress={() => { void openSupportEmail('problem'); }}
              style={({ pressed }) => [styles.supportAction, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.supportActionLeft}>
                <Ionicons name="bug-outline" size={20} color={primaryAccent} />
                <View style={styles.supportActionCopy}>
                  <Text style={[styles.supportActionTitle, { color: colors.text }]}>Report a Problem</Text>
                  <Text style={[styles.description, { color: colors.muted }]}>Tell us about a bug or technical issue.</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Accessibility support"
              onPress={() => router.push('/accessibility-settings' as never)}
              style={({ pressed }) => [styles.supportAction, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Contact support"
              onPress={() => { void openSupportEmail('support'); }}
              style={({ pressed }) => [styles.supportAction, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.supportActionLeft}>
                <Ionicons name="mail-outline" size={20} color={primaryAccent} />
                <View style={styles.supportActionCopy}>
                  <Text style={[styles.supportActionTitle, { color: colors.text }]}>Contact Support</Text>
                  <Text style={[styles.description, { color: colors.muted }]}>Open your email app to prepare a support request.</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.muted} />
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

    profileSummary: {

      borderWidth: 1,

      borderRadius: 20,

      padding: 14,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 12,

    },

    summaryAvatar: {

      width: 62,

      height: 62,

      borderRadius: 31,

      borderWidth: 1,

      alignItems: 'center',

      justifyContent: 'center',

      overflow: 'hidden',

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

    summaryRole: {

      marginTop: 2,

      fontSize: 11,

      fontWeight: '800',

      textTransform: 'capitalize',

    },

    sectionLabel: {

      marginTop: 10,

      marginBottom: -4,

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
