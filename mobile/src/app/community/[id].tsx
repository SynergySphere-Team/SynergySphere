import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Screen,
  Loading,
  Notice,
} from '@/components/Screen';

import {
  Button,
  Card,
  Heading,
} from '@/components/ui';

import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

type ApplicationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED';

type ProjectApplication = {
  id: string;
  status: ApplicationStatus;
  userId: string;
  createdAt: string;
};

type ProjectDetails = {
  id: string;
  creatorId?: string | null;

  title: string;
  category: string;
  location: string | null;
  organization: string;
  description: string;
  requirements: string | null;

  xpReward: number;
  isActive?: boolean;

  applications: ProjectApplication[];
};

export default function OpportunityDetailsScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const router = useRouter();

  const { colors, theme } =
    useTheme();

  const { user } = useAuth();

  const [project, setProject] =
    useState<ProjectDetails | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [applying, setApplying] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const currentUserId =
    (
      user as
        | {
            id?: string;
            userId?: string;
          }
        | null
        | undefined
    )?.id ??
    (
      user as
        | {
            id?: string;
            userId?: string;
          }
        | null
        | undefined
    )?.userId;

  const loadProject =
    useCallback(async () => {
      if (!id) {
        setError(
          'Project ID was not provided.'
        );

        setLoading(false);

        return;
      }

      try {
        setError('');

        const result =
          await api.get<ProjectDetails>(
            `/projects/${id}`
          );

        setProject(result);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Could not load this opportunity.'
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const myApplication =
    useMemo(() => {
      if (
        !project ||
        !currentUserId
      ) {
        return undefined;
      }

      return project.applications?.find(
        (application) =>
          application.userId ===
          currentUserId
      );
    }, [
      project,
      currentUserId,
    ]);

  const applicationStatus =
    myApplication?.status ?? null;

  const hasApplied =
    Boolean(myApplication);

  const isCreator =
    Boolean(
      project?.creatorId &&
        currentUserId &&
        project.creatorId ===
          currentUserId
    );

  async function applyToProject() {
    if (
      !project ||
      applying ||
      hasApplied ||
      isCreator
    ) {
      return;
    }

    setApplying(true);
    setError('');
    setSuccess('');

    try {
      await api.post(
        `/projects/${project.id}/apply`,
        {}
      );

      setSuccess(
        'Your application has been submitted successfully.'
      );

      await loadProject();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not submit your application.'
      );
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return (
      <Screen>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
            styles.backButton,
            pressed &&
              styles.backButtonPressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.text}
          />

          <Text
            style={[
              styles.backButtonText,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Back
          </Text>
        </Pressable>

        <Notice>
          {error ||
            'Project not found.'}
        </Notice>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* SMALL BACK BUTTON */}
      <Pressable
        onPress={() =>
          router.back()
        }
        style={({ pressed }) => [
          styles.backButton,
          pressed &&
            styles.backButtonPressed,
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={20}
          color={colors.text}
        />

        <Text
          style={[
            styles.backButtonText,
            {
              color:
                colors.text,
            },
          ]}
        >
          Back
        </Text>
      </Pressable>

      {/* PAGE HEADER */}
      <Heading subtitle="Review the project details before applying.">
        Opportunity Details
      </Heading>

      {error ? (
        <Notice>
          {error}
        </Notice>
      ) : null}

      {success ? (
        <Card>
          <View
            style={
              styles.successRow
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={
                accentColor
              }
            />

            <Text
              style={[
                styles.successText,
                {
                  color:
                    accentColor,
                },
              ]}
            >
              {success}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* MAIN PROJECT CARD */}
      <Card>
        <View
          style={
            styles.categoryRow
          }
        >
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons
              name="leaf-outline"
              size={16}
              color={
                accentColor
              }
            />

            <Text
              style={[
                styles.categoryText,
                {
                  color:
                    accentColor,
                },
              ]}
            >
              {project.category.replaceAll(
                '_',
                ' '
              )}
            </Text>
          </View>

          <Text
            style={[
              styles.xp,
              {
                color:
                  accentColor,
              },
            ]}
          >
            {project.xpReward} XP
          </Text>
        </View>

        <Text
          style={[
            styles.projectTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          {project.title}
        </Text>

        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name="business-outline"
            size={17}
            color={
              colors.muted
            }
          />

          <Text
            style={[
              styles.infoText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {project.organization}
          </Text>
        </View>

        {project.location ? (
          <View
            style={
              styles.infoRow
            }
          >
            <Ionicons
              name="location-outline"
              size={17}
              color={
                colors.muted
              }
            />

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              {project.location}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* APPLICATION STATUS */}
      {hasApplied ? (
        <Card>
          <View
            style={
              styles.statusHeader
            }
          >
            <Ionicons
              name={
                applicationStatus ===
                'APPROVED'
                  ? 'checkmark-circle'
                  : applicationStatus ===
                      'DECLINED'
                    ? 'close-circle'
                    : 'time-outline'
              }
              size={23}
              color={
                applicationStatus ===
                'APPROVED'
                  ? accentColor
                  : applicationStatus ===
                      'DECLINED'
                    ? '#B3261E'
                    : '#B7791F'
              }
            />

            <View
              style={
                styles.statusCopy
              }
            >
              <Text
                style={[
                  styles.statusHeading,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Application Status
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  {
                    color:
                      applicationStatus ===
                      'APPROVED'
                        ? accentColor
                        : applicationStatus ===
                            'DECLINED'
                          ? '#B3261E'
                          : '#B7791F',
                  },
                ]}
              >
                {applicationStatus ===
                'APPROVED'
                  ? 'Approved'
                  : applicationStatus ===
                      'DECLINED'
                    ? 'Declined'
                    : 'Pending'}
              </Text>
            </View>
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
            {applicationStatus ===
            'APPROVED'
              ? 'Your request to participate in this project has been approved.'
              : applicationStatus ===
                  'DECLINED'
                ? 'Your request to participate in this project was declined.'
                : 'Your request has been submitted and is waiting for review.'}
          </Text>
        </Card>
      ) : null}

      {/* OVERVIEW */}
      <Card>
        <View
          style={
            styles.sectionHeadingRow
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={
              accentColor
            }
          />

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Overview
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
          {project.description}
        </Text>
      </Card>

      {/* REQUIREMENTS */}
      <Card>
        <View
          style={
            styles.sectionHeadingRow
          }
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={21}
            color={
              accentColor
            }
          />

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Requirements
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
          {project.requirements?.trim()
            ? project.requirements
            : 'No specific requirements were provided for this project.'}
        </Text>
      </Card>

      {/* EXPERIENCE REWARD */}
      <Card>
        <View
          style={
            styles.sectionHeadingRow
          }
        >
          <Ionicons
            name="star-outline"
            size={21}
            color={
              accentColor
            }
          />

          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Experience Reward
          </Text>
        </View>

        <Text
          style={[
            styles.xpLarge,
            {
              color:
                accentColor,
            },
          ]}
        >
          {project.xpReward} XP
        </Text>
      </Card>

      {/* ACTION AREA */}
      {isCreator ? (
        <Card>
          <View
            style={
              styles.statusHeader
            }
          >
            <Ionicons
              name="person-circle-outline"
              size={23}
              color={
                accentColor
              }
            />

            <View
              style={
                styles.statusCopy
              }
            >
              <Text
                style={[
                  styles.statusHeading,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Your Project
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
                You created this community project.
              </Text>
            </View>
          </View>
        </Card>
      ) : hasApplied ? (
        <View
          style={
            styles.applicationComplete
          }
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={
              colors.muted
            }
          />

          <Text
            style={[
              styles.applicationCompleteText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            Your application status is shown above.
          </Text>
        </View>
      ) : (
        <Button
          title={
            applying
              ? 'Submitting Application...'
              : 'Apply / Join Project'
          }
          onPress={
            applyToProject
          }
          disabled={
            applying
          }
        />
      )}
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 4,
    },

    backButtonPressed: {
      opacity: 0.6,
    },

    backButtonText: {
      fontSize: 15,
      fontWeight: '700',
    },

    categoryRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      gap: 10,
    },

    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 14,
    },

    categoryText: {
      fontSize: 11,
      fontWeight: '800',
    },

    xp: {
      fontSize: 13,
      fontWeight: '800',
    },

    projectTitle: {
      fontSize: 24,
      fontWeight: '800',
      marginTop: 12,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 8,
    },

    infoText: {
      flex: 1,
      fontSize: 13,
    },

    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
    },

    description: {
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },

    successRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    successText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
    },

    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    statusCopy: {
      flex: 1,
    },

    statusHeading: {
      fontSize: 15,
      fontWeight: '800',
    },

    statusValue: {
      fontSize: 14,
      fontWeight: '800',
      marginTop: 2,
    },

    xpLarge: {
      fontSize: 20,
      fontWeight: '800',
      marginTop: 8,
    },

    applicationComplete: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 10,
    },

    applicationCompleteText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });