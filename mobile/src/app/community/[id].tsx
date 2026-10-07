import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { Image } from 'expo-image';
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
  | 'DECLINED'
  | 'INVITATION_SENT'
  | 'ACCEPTED'
  | 'COMPLETED';

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

  techStack?: string | null;
  teamCapacity?: number | null;
  deliverableType?: string | null;

  skillsNeeded?: string | null;
  durationWeeks?: number | null;
  applicationDeadline?: string | null;

  imageUrl?: string | null;
  projectUrl?: string | null;

  githubUrl?: string | null;
  githubFullName?: string | null;
  githubOwner?: string | null;
  githubRepo?: string | null;
  githubVisibility?: string | null;
  primaryLanguage?: string | null;
  githubStars?: number | null;
  githubForks?: number | null;
  isGithubBacked?: boolean;

  applications: ProjectApplication[];

  isCreator?: boolean;
  hasApplied?: boolean;
  applicationStatus?: ApplicationStatus | null;
};

function formatCategory(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDeadline(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getStatusDetails(
  status: ApplicationStatus | null
) {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Approved',
        message:
          'Your request to participate in this project has been approved.',
        icon: 'checkmark-circle' as const,
        tone: 'success' as const,
      };

    case 'DECLINED':
      return {
        label: 'Declined',
        message:
          'Your request to participate in this project was declined.',
        icon: 'close-circle' as const,
        tone: 'danger' as const,
      };

    case 'INVITATION_SENT':
      return {
        label: 'GitHub Invitation Sent',
        message:
          'Your request was approved and a GitHub repository invitation has been sent.',
        icon: 'logo-github' as const,
        tone: 'success' as const,
      };

    case 'ACCEPTED':
      return {
        label: 'Joined',
        message:
          'You have joined this project and can participate in the project work.',
        icon: 'people-circle' as const,
        tone: 'success' as const,
      };

    case 'COMPLETED':
      return {
        label: 'Completed',
        message:
          'Your participation in this project has been marked as completed.',
        icon: 'ribbon' as const,
        tone: 'success' as const,
      };

    case 'PENDING':
    default:
      return {
        label: 'Pending',
        message:
          'Your request has been submitted and is waiting for review.',
        icon: 'time-outline' as const,
        tone: 'warning' as const,
      };
  }
}

export default function OpportunityDetailsScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const router = useRouter();

  const {
    colors,
    theme,
  } = useTheme();

  const { user } = useAuth();

  const [
    project,
    setProject,
  ] =
    useState<ProjectDetails | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    applying,
    setApplying,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
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

  const role =
    String(
      user?.role ?? ''
    ).toUpperCase();

  const isStudent =
    role === 'STUDENT';

  const isAdmin =
    role === 'ADMIN';

  const loadProject =
    useCallback(
      async () => {
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
      },
      [id]
    );

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProject();
    setRefreshing(false);
  }, [loadProject]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const myApplication =
    useMemo(() => {
      if (!project) {
        return undefined;
      }

      if (
        project.applicationStatus
      ) {
        return {
          id: 'current',
          status:
            project.applicationStatus,
          userId:
            currentUserId ?? '',
          createdAt: '',
        } satisfies ProjectApplication;
      }

      if (!currentUserId) {
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
    Boolean(
      project?.hasApplied ||
        myApplication
    );

  const isCreator =
    Boolean(
      project?.isCreator ||
        (
          project?.creatorId &&
          currentUserId &&
          project.creatorId ===
            currentUserId
        )
    );

  const canManage =
    isCreator ||
    isAdmin;

  const deadlineDate =
    project?.applicationDeadline
      ? new Date(
          project.applicationDeadline
        )
      : null;

  const applicationsClosed =
    Boolean(
      deadlineDate &&
        !Number.isNaN(
          deadlineDate.getTime()
        ) &&
        deadlineDate.getTime() <
          Date.now()
    );

  const canApply =
    Boolean(
      project &&
        isStudent &&
        !isCreator &&
        !hasApplied &&
        project.isActive !==
          false &&
        !applicationsClosed &&
        !applying
    );

  const statusDetails =
    applicationStatus
      ? getStatusDetails(
          applicationStatus
        )
      : null;

  const statusColor =
    statusDetails?.tone ===
    'danger'
      ? '#B3261E'
      : statusDetails?.tone ===
        'warning'
        ? '#B7791F'
        : accentColor;

  async function applyToProject() {
    if (
      !project ||
      !canApply
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

  async function openUrl(
    url: string
  ) {
    try {
      const supported =
        await Linking.canOpenURL(
          url
        );

      if (!supported) {
        setError(
          'This link could not be opened.'
        );
        return;
      }

      await Linking.openURL(
        url
      );
    } catch {
      setError(
        'This link could not be opened.'
      );
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return (
      <Screen>
        <Notice>
          {error ||
            'Project not found.'}
        </Notice>
      </Screen>
    );
  }

  const formattedDeadline =
    formatDeadline(
      project.applicationDeadline
    );

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* HEADER */}

      <Heading
        subtitle={
          canManage
            ? 'View the full project information and manage this initiative.'
            : 'Review the complete project information before joining.'
        }
      >
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
              styles.messageRow
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={23}
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

      {/* PROJECT IMAGE */}

      {project.imageUrl ? (
        <Image
          source={{
            uri:
              project.imageUrl,
          }}
          contentFit="cover"
          style={
            styles.heroImage
          }
        />
      ) : null}

      {/* PROJECT SUMMARY */}

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
              name="layers-outline"
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
              {formatCategory(
                project.category
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

        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name={
              project.isActive ===
              false
                ? 'pause-circle-outline'
                : 'checkmark-circle-outline'
            }
            size={17}
            color={
              project.isActive ===
              false
                ? '#B7791F'
                : accentColor
            }
          />

          <Text
            style={[
              styles.infoText,
              {
                color:
                  project.isActive ===
                  false
                    ? '#B7791F'
                    : accentColor,

                fontWeight:
                  '700',
              },
            ]}
          >
            {project.isActive ===
            false
              ? 'Inactive project'
              : 'Active project'}
          </Text>
        </View>
      </Card>

      {/* APPLICATION STATUS */}

      {isStudent &&
      hasApplied &&
      statusDetails ? (
        <Card>
          <View
            style={
              styles.statusRow
            }
          >
            <Ionicons
              name={
                statusDetails.icon
              }
              size={24}
              color={
                statusColor
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
                      statusColor,
                  },
                ]}
              >
                {
                  statusDetails.label
                }
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.bodyText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {
              statusDetails.message
            }
          </Text>
        </Card>
      ) : null}

      {/* OVERVIEW */}

      <Card>
        <SectionHeading
          icon="information-circle-outline"
          title="Overview"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Text
          style={[
            styles.bodyText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {project.description}
        </Text>
      </Card>

      {/* PROJECT DETAILS */}

      <Card>
        <SectionHeading
          icon="calendar-outline"
          title="Project Details"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <DetailRow
          icon="time-outline"
          label="Duration"
          value={
            project.durationWeeks
              ? `${project.durationWeeks} week${
                  project.durationWeeks ===
                  1
                    ? ''
                    : 's'
                }`
              : 'Flexible / not specified'
          }
          textColor={
            colors.text
          }
          mutedColor={
            colors.muted
          }
        />

        <DetailRow
          icon="calendar-number-outline"
          label="Application Deadline"
          value={
            formattedDeadline ??
            'No deadline specified'
          }
          textColor={
            colors.text
          }
          mutedColor={
            colors.muted
          }
        />

        <DetailRow
          icon="people-outline"
          label="Team Capacity"
          value={
            project.teamCapacity
              ? `${project.teamCapacity} participant${
                  project.teamCapacity ===
                  1
                    ? ''
                    : 's'
                }`
              : 'Not specified'
          }
          textColor={
            colors.text
          }
          mutedColor={
            colors.muted
          }
        />

        <DetailRow
          icon="cube-outline"
          label="Deliverable Type"
          value={
            project.deliverableType ||
            'Software Solution'
          }
          textColor={
            colors.text
          }
          mutedColor={
            colors.muted
          }
        />
      </Card>

      {/* SKILLS */}

      <Card>
        <SectionHeading
          icon="construct-outline"
          title="Skills & Technology"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <DetailTextBlock
          label="Skills Needed"
          value={
            project.skillsNeeded
          }
          fallback="No specific skills were listed."
          textColor={
            colors.text
          }
          mutedColor={
            colors.muted
          }
        />

        <DetailTextBlock
          label="Tech Stack"
          value={
            project.techStack
          }
          fallback="No technology stack was specified."
          textColor={
            colors.text
          }
          mutedColor={
            colors.muted
          }
        />
      </Card>

      {/* REQUIREMENTS */}

      <Card>
        <SectionHeading
          icon="checkmark-circle-outline"
          title="Requirements"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Text
          style={[
            styles.bodyText,
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

      {/* LINKS */}

      {(project.projectUrl ||
        project.githubUrl ||
        project.isGithubBacked) ? (
        <Card>
          <SectionHeading
            icon="link-outline"
            title="Project Links"
            color={
              colors.text
            }
            accent={
              accentColor
            }
          />

          {project.githubUrl ? (
            <View
              style={
                styles.linkBlock
              }
            >
              <View
                style={
                  styles.linkTitleRow
                }
              >
                <Ionicons
                  name="logo-github"
                  size={20}
                  color={
                    colors.text
                  }
                />

                <View
                  style={
                    styles.linkTitleCopy
                  }
                >
                  <Text
                    style={[
                      styles.detailLabel,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    GitHub Repository
                  </Text>

                  <Text
                    style={[
                      styles.smallText,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {project.githubFullName ||
                      [
                        project.githubOwner,
                        project.githubRepo,
                      ]
                        .filter(Boolean)
                        .join('/') ||
                      'Linked repository'}
                  </Text>
                </View>
              </View>

              {(project.primaryLanguage ||
                project.githubVisibility) ? (
                <Text
                  style={[
                    styles.smallText,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  {[
                    project.primaryLanguage,
                    project.githubVisibility
                      ? `${project.githubVisibility} repository`
                      : null,
                    typeof project.githubStars ===
                    'number'
                      ? `${project.githubStars} stars`
                      : null,
                    typeof project.githubForks ===
                    'number'
                      ? `${project.githubForks} forks`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              ) : null}

              <Button
                title="Open GitHub Repository"
                secondary
                onPress={() =>
                  openUrl(
                    project.githubUrl!
                  )
                }
              />
            </View>
          ) : project.isGithubBacked ? (
            <Text
              style={[
                styles.bodyText,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              This is a GitHub-backed
              project, but no public
              repository URL is
              available.
            </Text>
          ) : null}

          {project.projectUrl ? (
            <View
              style={
                styles.linkBlock
              }
            >
              <View
                style={
                  styles.linkTitleRow
                }
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={
                    accentColor
                  }
                />

                <View
                  style={
                    styles.linkTitleCopy
                  }
                >
                  <Text
                    style={[
                      styles.detailLabel,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    Project / Demo
                  </Text>

                  <Text
                    numberOfLines={
                      1
                    }
                    style={[
                      styles.smallText,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {
                      project.projectUrl
                    }
                  </Text>
                </View>
              </View>

              <Button
                title="Open Project Link"
                secondary
                onPress={() =>
                  openUrl(
                    project.projectUrl!
                  )
                }
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* EXPERIENCE */}

      <Card>
        <SectionHeading
          icon="star-outline"
          title="Experience Reward"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

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

        <Text
          style={[
            styles.smallText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          Experience points are
          awarded according to the
          project's participation
          and completion rules.
        </Text>
      </Card>

      {/* DEADLINE / INACTIVE NOTICE */}

      {!hasApplied &&
      isStudent &&
      applicationsClosed ? (
        <Card>
          <View
            style={
              styles.warningRow
            }
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color="#B7791F"
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
                Applications Closed
              </Text>

              <Text
                style={[
                  styles.smallText,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                The application
                deadline for this
                project has passed.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {!hasApplied &&
      isStudent &&
      project.isActive ===
        false ? (
        <Card>
          <View
            style={
              styles.warningRow
            }
          >
            <Ionicons
              name="pause-circle-outline"
              size={22}
              color="#B7791F"
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
                Project Inactive
              </Text>

              <Text
                style={[
                  styles.smallText,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                This project is not
                currently accepting
                applications.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* ACTION AREA */}

      {canManage ? (
        <>
          <Button
            title="Manage Project"
            onPress={() =>
              router.push(
                `/community/manage/${project.id}` as never
              )
            }
          />

          <Button
            title="Review Join Requests"
            secondary
            onPress={() =>
              router.push(
                `/community/requests/${project.id}` as never
              )
            }
          />
        </>
      ) : isStudent &&
        hasApplied ? (
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
            Your application status
            is shown above.
          </Text>
        </View>
      ) : isStudent &&
        !applicationsClosed &&
        project.isActive !==
          false ? (
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
            !canApply
          }
        />
      ) : !isStudent ? (
        <Card>
          <View
            style={
              styles.viewOnlyRow
            }
          >
            <Ionicons
              name="eye-outline"
              size={21}
              color={
                colors.muted
              }
            />

            <Text
              style={[
                styles.viewOnlyText,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              This account can view
              the opportunity. Student
              accounts can apply to
              participate.
            </Text>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

type SectionHeadingProps = {
  icon:
    | 'information-circle-outline'
    | 'calendar-outline'
    | 'construct-outline'
    | 'checkmark-circle-outline'
    | 'link-outline'
    | 'star-outline';

  title: string;
  color: string;
  accent: string;
};

function SectionHeading({
  icon,
  title,
  color,
  accent,
}: SectionHeadingProps) {
  return (
    <View
      style={
        styles.sectionHeadingRow
      }
    >
      <Ionicons
        name={
          icon
        }
        size={21}
        color={
          accent
        }
      />

      <Text
        style={[
          styles.sectionTitle,
          {
            color,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

type DetailRowProps = {
  icon:
    | 'time-outline'
    | 'calendar-number-outline'
    | 'people-outline'
    | 'cube-outline';

  label: string;
  value: string;
  textColor: string;
  mutedColor: string;
};

function DetailRow({
  icon,
  label,
  value,
  textColor,
  mutedColor,
}: DetailRowProps) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <Ionicons
        name={
          icon
        }
        size={19}
        color={
          mutedColor
        }
      />

      <View
        style={
          styles.detailCopy
        }
      >
        <Text
          style={[
            styles.detailLabel,
            {
              color:
                textColor,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.detailValue,
            {
              color:
                mutedColor,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

type DetailTextBlockProps = {
  label: string;
  value?: string | null;
  fallback: string;
  textColor: string;
  mutedColor: string;
};

function DetailTextBlock({
  label,
  value,
  fallback,
  textColor,
  mutedColor,
}: DetailTextBlockProps) {
  return (
    <View
      style={
        styles.textBlock
      }
    >
      <Text
        style={[
          styles.detailLabel,
          {
            color:
              textColor,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.bodyText,
          {
            color:
              mutedColor,
          },
        ]}
      >
        {value?.trim()
          ? value
          : fallback}
      </Text>
    </View>
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

      gap: 6,

      paddingVertical: 8,
      paddingHorizontal: 4,

      marginBottom: 4,
    },

    backText: {
      fontSize: 15,
      fontWeight: '700',
    },

    pressed: {
      opacity: 0.65,
    },

    heroImage: {
      width: '100%',
      height: 200,
      borderRadius: 18,
    },

    categoryRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap: 10,
    },

    categoryBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,

      borderRadius: 14,

      paddingHorizontal: 10,
      paddingVertical: 7,

      flexShrink: 1,
    },

    categoryText: {
      fontSize: 11,
      fontWeight: '800',
      flexShrink: 1,
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
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      marginTop: 8,
    },

    infoText: {
      flex: 1,
      fontSize: 13,
    },

    messageRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,
    },

    successText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
    },

    sectionHeadingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
    },

    bodyText: {
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },

    statusRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,
    },

    warningRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

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

    detailRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 10,

      paddingVertical: 4,
    },

    detailCopy: {
      flex: 1,
    },

    detailLabel: {
      fontSize: 13,
      fontWeight: '800',
    },

    detailValue: {
      fontSize: 13,
      lineHeight: 19,
      marginTop: 2,
    },

    textBlock: {
      marginTop: 5,
    },

    linkBlock: {
      gap: 8,
      marginTop: 6,
    },

    linkTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,
    },

    linkTitleCopy: {
      flex: 1,
    },

    smallText: {
      fontSize: 12,
      lineHeight: 18,
    },

    xpLarge: {
      fontSize: 20,
      fontWeight: '800',
      marginTop: 8,
    },

    applicationComplete: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,

      paddingVertical: 10,
    },

    applicationCompleteText: {
      fontSize: 13,
      fontWeight: '600',
    },

    viewOnlyRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,
    },

    viewOnlyText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
    },
  });
