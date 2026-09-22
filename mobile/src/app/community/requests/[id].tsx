import {
  useCallback,
  useEffect,
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

import type {
  ProjectJoinRequest,
} from '@/types/api';

type ProjectInfo = {
  id: string;
  title: string;
  organization: string;
  location: string | null;
  category: string;
  description: string;
};

export default function ProjectRequestsScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const router = useRouter();

  const {
    colors,
    theme,
  } = useTheme();

  const [project, setProject] =
    useState<ProjectInfo | null>(
      null
    );

  const [requests, setRequests] =
    useState<
      ProjectJoinRequest[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [reviewing, setReviewing] =
    useState('');

  const [error, setError] =
    useState('');

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const loadData =
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

        const [
          projectResult,
          applicationResult,
        ] = await Promise.all([
          api.get<ProjectInfo>(
            `/projects/${id}`
          ),

          api.get<
            ProjectJoinRequest[]
          >(
            `/projects/${id}/applications`
          ),
        ]);

        setProject(
          projectResult
        );

        setRequests(
          applicationResult
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Could not load join requests.'
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function reviewRequest(
    applicationId: string,
    status:
      | 'APPROVED'
      | 'DECLINED'
  ) {
    if (
      !id ||
      reviewing
    ) {
      return;
    }

    setReviewing(
      applicationId
    );

    setError('');

    try {
      await api.patch(
        `/projects/${id}/applications/${applicationId}`,
        {
          status,
        }
      );

      /*
       * Reload applications from the
       * backend after the review.
       */
      const updated =
        await api.get<
          ProjectJoinRequest[]
        >(
          `/projects/${id}/applications`
        );

      setRequests(
        updated
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not review this request.'
      );
    } finally {
      setReviewing('');
    }
  }

  function statusColor(
    status: ProjectJoinRequest['status']
  ) {
    if (
      status === 'APPROVED'
    ) {
      return accentColor;
    }

    if (
      status === 'DECLINED'
    ) {
      return '#B3261E';
    }

    return '#B7791F';
  }

  function statusIcon(
    status: ProjectJoinRequest['status']
  ):
    | 'checkmark-circle'
    | 'close-circle'
    | 'time-outline' {
    if (
      status === 'APPROVED'
    ) {
      return 'checkmark-circle';
    }

    if (
      status === 'DECLINED'
    ) {
      return 'close-circle';
    }

    return 'time-outline';
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <Screen>
      {/* BACK */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
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
          color={
            colors.text
          }
        />

        <Text
          style={[
            styles.backText,
            {
              color:
                colors.text,
            },
          ]}
        >
          Back
        </Text>
      </Pressable>

      {/* HEADER */}
      <Heading subtitle="Review students who have requested to participate in this project.">
        Join Requests
      </Heading>

      {error ? (
        <Notice>
          {error}
        </Notice>
      ) : null}

      {/* PROJECT INFORMATION */}
      {project ? (
        <Card>
          <Text
            style={[
              styles.category,
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
              size={16}
              color={
                colors.muted
              }
            />

            <Text
              style={[
                styles.projectInfo,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              {
                project.organization
              }
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
                size={16}
                color={
                  colors.muted
                }
              />

              <Text
                style={[
                  styles.projectInfo,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                {
                  project.location
                }
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.countRow
            }
          >
            <Ionicons
              name="people-outline"
              size={17}
              color={
                accentColor
              }
            />

            <Text
              style={[
                styles.countText,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {requests.length}{' '}
              request
              {requests.length ===
              1
                ? ''
                : 's'}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* REQUEST LIST */}
      <Text
        style={[
          styles.sectionHeading,
          {
            color:
              colors.text,
          },
        ]}
      >
        Applicants
      </Text>

      {requests.length >
      0 ? (
        requests.map(
          (request) => (
            <Card
              key={
                request.id
              }
            >
              {/* APPLICANT */}
              <View
                style={
                  styles.applicantHeader
                }
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        colors.surfaceElevated,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color={
                      accentColor
                    }
                  />
                </View>

                <View
                  style={
                    styles.applicantCopy
                  }
                >
                  <Text
                    style={[
                      styles.applicantName,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {
                      request.firstName
                    }{' '}
                    {
                      request.lastName
                    }
                  </Text>

                  <Text
                    style={[
                      styles.email,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {
                      request.email
                    }
                  </Text>
                </View>
              </View>

              {/* STATUS */}
              <View
                style={
                  styles.statusRow
                }
              >
                <Ionicons
                  name={statusIcon(
                    request.status
                  )}
                  size={18}
                  color={statusColor(
                    request.status
                  )}
                />

                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        statusColor(
                          request.status
                        ),
                    },
                  ]}
                >
                  {request.status ===
                  'APPROVED'
                    ? 'Approved'
                    : request.status ===
                        'DECLINED'
                      ? 'Declined'
                      : 'Pending'}
                </Text>
              </View>

              {/* ACTIONS */}
              {request.status ===
              'PENDING' ? (
                <View
                  style={
                    styles.actions
                  }
                >
                  <View
                    style={
                      styles.actionButton
                    }
                  >
                    <Button
                      title={
                        reviewing ===
                        request.id
                          ? 'Reviewing...'
                          : 'Approve'
                      }
                      onPress={() =>
                        reviewRequest(
                          request.id,
                          'APPROVED'
                        )
                      }
                      disabled={Boolean(
                        reviewing
                      )}
                    />
                  </View>

                  <View
                    style={
                      styles.actionButton
                    }
                  >
                    <Button
                      title="Decline"
                      secondary
                      onPress={() =>
                        reviewRequest(
                          request.id,
                          'DECLINED'
                        )
                      }
                      disabled={Boolean(
                        reviewing
                      )}
                    />
                  </View>
                </View>
              ) : (
                <Text
                  style={[
                    styles.reviewedText,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  This request has
                  already been
                  reviewed.
                </Text>
              )}
            </Card>
          )
        )
      ) : (
        <Card>
          <View
            style={
              styles.emptyState
            }
          >
            <Ionicons
              name="people-outline"
              size={32}
              color={
                colors.muted
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              No join requests
            </Text>

            <Text
              style={[
                styles.emptyCopy,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              No students have
              requested to join
              this project yet.
            </Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    backButton: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

      paddingVertical: 4,
      paddingHorizontal: 2,
    },

    backButtonPressed: {
      opacity: 0.6,
    },

    backText: {
      fontSize: 14,
      fontWeight: '700',
    },

    category: {
      fontSize: 12,
      fontWeight: '800',
    },

    projectTitle: {
      fontSize: 19,
      fontWeight: '800',
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    projectInfo: {
      flex: 1,
      fontSize: 13,
    },

    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 3,
    },

    countText: {
      fontSize: 13,
      fontWeight: '700',
    },

    sectionHeading: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 8,
    },

    applicantHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },

    applicantCopy: {
      flex: 1,
      gap: 2,
    },

    applicantName: {
      fontSize: 16,
      fontWeight: '800',
    },

    email: {
      fontSize: 12,
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    statusText: {
      fontSize: 13,
      fontWeight: '800',
    },

    actions: {
      flexDirection: 'row',
      gap: 8,
    },

    actionButton: {
      flex: 1,
    },

    reviewedText: {
      fontSize: 12,
    },

    emptyState: {
      alignItems: 'center',
      gap: 7,
      paddingVertical: 12,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
    },

    emptyCopy: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
    },
  });