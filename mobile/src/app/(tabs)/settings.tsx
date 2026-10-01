import { useEffect, useState } from 'react';



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

  Text,

  View,

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



export default function SettingsScreen() {

  const router = useRouter();



  const {

    logout,

    user,

    updateProfile,

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



  useEffect(() => {

    api

      .get<SettingsData>(

        '/auth/settings',

      )

      .then((data) => {

        if (data.user) {

          setFirstName(

            data.user

              .firstName || '',

          );



          setLastName(

            data.user

              .lastName || '',

          );



          setBio(

            data.user.bio ||

              data.profile

                ?.about ||

              '',

          );



          setEmailNotifications(

            data.user

              .emailNotifications ??

              true,

          );



          if (

            data.user.theme === 'dark' ||

            data.user.theme === 'light'

          ) {

            setTheme(data.user.theme);

          }

        }



        if (data.profile) {

          setTargetRole(

            data.profile

              .targetRole || '',

          );



          setLocation(

            data.profile

              .location || '',

          );



          setGithubUrl(

            data.profile

              .githubUrl || '',

          );



          setLinkedinUrl(

            data.profile

              .linkedinUrl ||

              '',

          );

        }

      })

      .catch(() => {});



    github

      .connection()

      .then(

        setGithubConnection,

      )

      .catch(() =>

        setGithubConnection(

          null,

        ),

      );

  }, []);



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



  function confirmDeleteAccount() {

    Alert.alert(

      'Delete Account (POPIA)',

      'This will permanently delete your account, project contributions, and all personal data. This action cannot be undone.',

      [

        {

          text: 'Cancel',

          style: 'cancel',

        },

        {

          text: 'Delete Forever',

          style:

            'destructive',

          onPress:

            async () => {

              try {

                await api.delete(

                  '/auth/me',

                );



                await logout();

              } catch (

                err: any

              ) {

                Alert.alert(

                  'Error',

                  err?.message ||

                    'Failed to delete account.',

                );

              }

            },

        },

      ],

    );

  }



  function confirmLogout() {

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

          style:

            'destructive',

          onPress: logout,

        },

      ],

    );

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

    <Screen>

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

              '_',

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

                {

                  color:

                    colors.text,

                },

              ]}

            >

              Profile visibility

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

              Your profile picture and developer information may appear in community projects and collaboration spaces where you participate.

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

            <Text

              style={[

                styles.description,

                {

                  color:

                    colors.muted,

                },

              ]}

            >

              Your authenticated session is stored securely on this device. Signing out removes the stored session credentials.

            </Text>



            <Button

              title="Sign Out"

              secondary

              onPress={

                confirmLogout

              }

            />

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

                styles.description,

                {

                  color:

                    colors.muted,

                },

              ]}

            >

              Photo-library permission is only requested when you choose a profile image. You can review device permissions at any time.

            </Text>



            <Button

              title="Manage Device Permissions"

              secondary

              onPress={() =>

                Linking.openSettings()

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



        {expanded ===

        'support' ? (

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

              If you experience an account, project or application issue, contact your SynergySphere administrator and include the screen and action that caused the problem.

            </Text>

          </View>

        ) : null}



        <SettingRow

          icon="information-circle-outline"

          title="About SynergySphere"

          subtitle="Platform information"

          expanded={

            expanded ===

            'about'

          }

          onPress={() =>

            toggleSection(

              'about',

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

        'about' ? (

          <View

            style={

              styles.lastExpandedPanel

            }

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

              SynergySphere

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

              A student-focused platform for learning support, productivity, wellness and community collaboration.

            </Text>

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
