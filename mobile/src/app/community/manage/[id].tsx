import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
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
  Loading,
  Notice,
  Screen,
} from '@/components/Screen';

import {
  Button,
  Card,
  Field,
  Heading,
} from '@/components/ui';

import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const PROJECT_CATEGORIES = [
  {
    value: 'OPEN_SOURCE',
    label: 'Open Source',
    icon: 'code-slash-outline' as const,
  },
  {
    value: 'GREEN_SOFTWARE',
    label: 'Green Software',
    icon: 'leaf-outline' as const,
  },
  {
    value: 'CIVIC_TECH',
    label: 'Civic Tech',
    icon: 'globe-outline' as const,
  },
  {
    value: 'EDTECH',
    label: 'EdTech',
    icon: 'school-outline' as const,
  },
  {
    value: 'SUSTAINABILITY',
    label: 'Sustainability',
    icon: 'earth-outline' as const,
  },
  {
    value: 'RECYCLING',
    label: 'Recycling',
    icon: 'refresh-circle-outline' as const,
  },
  {
    value: 'ECO_TOURISM',
    label: 'Eco-tourism',
    icon: 'leaf-outline' as const,
  },
  {
    value: 'GREEN_INFRASTRUCTURE',
    label: 'Green Infrastructure',
    icon: 'business-outline' as const,
  },
  {
    value: 'OTHER',
    label: 'Other',
    icon: 'folder-outline' as const,
  },
] as const;

type ProjectCategory =
  (typeof PROJECT_CATEGORIES)[number]['value'];

type ProjectApplication = {
  id: string;
  status: string;
  userId: string;
  createdAt: string;
};

type ProjectDetails = {
  id: string;
  creatorId?: string | null;

  title: string;
  category: ProjectCategory;

  location: string | null;
  organization: string;
  description: string;
  requirements: string | null;

  xpReward: number;

  techStack?: string | null;
  teamCapacity?: number | null;
  deliverableType?: string | null;

  skillsNeeded?: string | null;
  durationWeeks?: number | null;
  applicationDeadline?: string | null;

  imageUrl?: string | null;
  projectUrl?: string | null;

  githubOwner?: string | null;
  githubRepo?: string | null;
  githubFullName?: string | null;
  githubUrl?: string | null;
  githubVisibility?: string | null;
  primaryLanguage?: string | null;
  githubStars?: number | null;
  githubForks?: number | null;
  isGithubBacked?: boolean;

  isActive?: boolean;
  isCreator?: boolean;

  applications?: ProjectApplication[];
};

function formatDateInput(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function dateInputToIso(
  value: string
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      trimmed
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      year,
      month - 1,
      day,
      23,
      59,
      59,
      999
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

function isGithubRepositoryUrl(
  value: string
) {
  try {
    const url =
      new URL(
        value.trim()
      );

    const parts =
      url.pathname
        .split('/')
        .filter(Boolean);

    return (
      url.protocol ===
        'https:' &&
      url.hostname.toLowerCase() ===
        'github.com' &&
      parts.length === 2
    );
  } catch {
    return false;
  }
}

export default function ManageProjectScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const router =
    useRouter();

  const {
    colors,
    theme,
  } = useTheme();

  const {
    user,
  } = useAuth();

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
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    changingStatus,
    setChangingStatus,
  ] =
    useState(false);

  const [
    linkingGithub,
    setLinkingGithub,
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

  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    organization,
    setOrganization,
  ] =
    useState('');

  const [
    location,
    setLocation,
  ] =
    useState('');

  const [
    description,
    setDescription,
  ] =
    useState('');

  const [
    requirements,
    setRequirements,
  ] =
    useState('');

  const [
    category,
    setCategory,
  ] =
    useState<ProjectCategory>(
      'OTHER'
    );

  const [
    skillsNeeded,
    setSkillsNeeded,
  ] =
    useState('');

  const [
    techStack,
    setTechStack,
  ] =
    useState('');

  const [
    durationWeeks,
    setDurationWeeks,
  ] =
    useState('');

  const [
    applicationDeadline,
    setApplicationDeadline,
  ] =
    useState('');

  const [
    teamCapacity,
    setTeamCapacity,
  ] =
    useState('');

  const [
    deliverableType,
    setDeliverableType,
  ] =
    useState('');

  const [
    imageUrl,
    setImageUrl,
  ] =
    useState('');

  const [
    projectUrl,
    setProjectUrl,
  ] =
    useState('');

  const [
    githubRepositoryUrl,
    setGithubRepositoryUrl,
  ] =
    useState('');

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const role =
    String(
      user?.role ?? ''
    ).toUpperCase();

  const isAdmin =
    role === 'ADMIN';

  const populateForm =
    useCallback(
      (
        data: ProjectDetails
      ) => {
        setTitle(
          data.title ?? ''
        );

        setOrganization(
          data.organization ??
            ''
        );

        setLocation(
          data.location ?? ''
        );

        setDescription(
          data.description ??
            ''
        );

        setRequirements(
          data.requirements ??
            ''
        );

        setCategory(
          data.category ??
            'OTHER'
        );

        setSkillsNeeded(
          data.skillsNeeded ??
            ''
        );

        setTechStack(
          data.techStack ??
            ''
        );

        setDurationWeeks(
          data.durationWeeks
            ? String(
                data.durationWeeks
              )
            : ''
        );

        setApplicationDeadline(
          formatDateInput(
            data.applicationDeadline
          )
        );

        setTeamCapacity(
          data.teamCapacity
            ? String(
                data.teamCapacity
              )
            : '10'
        );

        setDeliverableType(
          data.deliverableType ??
            'Software Solution'
        );

        setImageUrl(
          data.imageUrl ?? ''
        );

        setProjectUrl(
          data.projectUrl ?? ''
        );

        setGithubRepositoryUrl(
          data.githubUrl ?? ''
        );
      },
      []
    );

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

          setProject(
            result
          );

          populateForm(
            result
          );
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load this project.'
          );
        } finally {
          setLoading(false);
        }
      },
      [
        id,
        populateForm,
      ]
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

  const isCreator =
    Boolean(
      project?.isCreator
    );

  const canManage =
    Boolean(
      isCreator ||
        isAdmin
    );

  /*
   * Repository linking stays owner-only.
   * The backend later uses the project creator's
   * GitHub connection when it sends collaborator
   * invitations.
   */
  const canLinkGithub =
    isCreator;

  async function saveChanges() {
    if (
      !project ||
      !canManage ||
      saving
    ) {
      return;
    }

    setError('');
    setSuccess('');

    if (
      !title.trim()
    ) {
      setError(
        'Project title is required.'
      );
      return;
    }

    if (
      !organization.trim()
    ) {
      setError(
        'Organization is required.'
      );
      return;
    }

    if (
      !description.trim()
    ) {
      setError(
        'Project description is required.'
      );
      return;
    }

    let duration:
      | number
      | undefined;

    if (
      durationWeeks.trim()
    ) {
      duration =
        Number(
          durationWeeks
        );

      if (
        !Number.isInteger(
          duration
        ) ||
        duration < 1 ||
        duration > 104
      ) {
        setError(
          'Duration must be between 1 and 104 weeks.'
        );
        return;
      }
    }

    let capacity:
      | number
      | undefined;

    if (
      teamCapacity.trim()
    ) {
      capacity =
        Number(
          teamCapacity
        );

      if (
        !Number.isInteger(
          capacity
        ) ||
        capacity < 1 ||
        capacity > 100
      ) {
        setError(
          'Team capacity must be between 1 and 100.'
        );
        return;
      }
    }

    const deadline =
      dateInputToIso(
        applicationDeadline
      );

    if (
      deadline === null
    ) {
      setError(
        'Application deadline must use YYYY-MM-DD format.'
      );
      return;
    }

    try {
      setSaving(true);

      const updated =
        await api.patch<ProjectDetails>(
          `/projects/${project.id}`,
          {
            title:
              title.trim(),

            organization:
              organization.trim(),

            location:
              location.trim(),

            description:
              description.trim(),

            requirements:
              requirements.trim(),

            category,

            skillsNeeded:
              skillsNeeded.trim(),

            techStack:
              techStack.trim(),

            durationWeeks:
              duration,

            applicationDeadline:
              deadline,

            teamCapacity:
              capacity,

            deliverableType:
              deliverableType.trim() ||
              'Software Solution',

            imageUrl:
              imageUrl.trim() ||
              undefined,

            projectUrl:
              projectUrl.trim() ||
              undefined,
          }
        );

      setProject(
        (
          current
        ) => ({
          ...(current ??
            updated),

          ...updated,
        })
      );

      populateForm(
        updated
      );

      setSuccess(
        'Project changes saved successfully.'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save project changes.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function linkGithubRepository() {
    if (
      !project ||
      !canLinkGithub ||
      linkingGithub
    ) {
      return;
    }

    setError('');
    setSuccess('');

    const repositoryUrl =
      githubRepositoryUrl.trim();

    if (
      !repositoryUrl
    ) {
      setError(
        'Enter the GitHub repository URL you want to link.'
      );
      return;
    }

    if (
      !isGithubRepositoryUrl(
        repositoryUrl
      )
    ) {
      setError(
        'Enter a repository URL such as https://github.com/owner/repository.'
      );
      return;
    }

    try {
      setLinkingGithub(
        true
      );

      const updated =
        await api.patch<ProjectDetails>(
          `/projects/${project.id}/github`,
          {
            repositoryUrl,
          }
        );

      setProject(
        (
          current
        ) => ({
          ...(current ??
            updated),

          ...updated,
        })
      );

      setGithubRepositoryUrl(
        updated.githubUrl ??
          repositoryUrl
      );

      setSuccess(
        updated.isGithubBacked
          ? 'GitHub repository linked successfully.'
          : 'GitHub repository updated successfully.'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not link the GitHub repository.'
      );
    } finally {
      setLinkingGithub(
        false
      );
    }
  }

  async function setProjectStatus(
    isActive: boolean
  ) {
    if (
      !project ||
      !canManage ||
      changingStatus
    ) {
      return;
    }

    try {
      setChangingStatus(
        true
      );

      setError('');
      setSuccess('');

      const updated =
        await api.patch<ProjectDetails>(
          `/projects/${project.id}`,
          {
            isActive,
          }
        );

      setProject(
        (
          current
        ) => ({
          ...(current ??
            updated),

          ...updated,
        })
      );

      setSuccess(
        isActive
          ? 'Project reactivated successfully.'
          : 'Project deactivated successfully.'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not update the project status.'
      );
    } finally {
      setChangingStatus(
        false
      );
    }
  }

  function handleStatusChange() {
    if (!project) {
      return;
    }

    if (
      project.isActive ===
      false
    ) {
      setProjectStatus(
        true
      );
      return;
    }

    Alert.alert(
      'Deactivate Project',
      'This project will be removed from active Community opportunities. Existing project data will remain stored.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Deactivate',
          style:
            'destructive',
          onPress: () =>
            setProjectStatus(
              false
            ),
        },
      ]
    );
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
        <BackButton
          onPress={() =>
            router.back()
          }
          color={
            colors.text
          }
        />

        <Notice>
          {error ||
            'Project not found.'}
        </Notice>
      </Screen>
    );
  }

  if (!canManage) {
    return (
      <Screen>
        <BackButton
          onPress={() =>
            router.back()
          }
          color={
            colors.text
          }
        />

        <Heading subtitle="Only the project owner or an administrator can manage this project.">
          Manage Project
        </Heading>

        <Notice>
          You do not have
          permission to edit
          this project.
        </Notice>

        <Button
          title="View Opportunity"
          secondary
          onPress={() =>
            router.replace(
              `/community/${project.id}` as never
            )
          }
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <BackButton
        onPress={() =>
          router.back()
        }
        color={
          colors.text
        }
      />

      <Heading subtitle="Update project information, connect GitHub, review applicants and control whether the initiative is active.">
        Manage Project
      </Heading>

      {/* STATUS */}

      <Card>
        <View
          style={
            styles.statusRow
          }
        >
          <View
            style={[
              styles.statusIcon,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons
              name={
                project.isActive ===
                  false
                  ? 'pause-circle-outline'
                  : 'checkmark-circle-outline'
              }
              size={24}
              color={
                project.isActive ===
                  false
                  ? '#B7791F'
                  : accentColor
              }
            />
          </View>

          <View
            style={
              styles.statusCopy
            }
          >
            <Text
              style={[
                styles.statusTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {project.isActive ===
              false
                ? 'Project Inactive'
                : 'Project Active'}
            </Text>

            <Text
              style={[
                styles.copy,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              {project.isActive ===
              false
                ? 'This project is hidden from active Community opportunities.'
                : 'Students can discover this project and submit applications.'}
            </Text>
          </View>
        </View>
      </Card>

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
              size={22}
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

      {/* IMAGE */}

      {imageUrl.trim() ? (
        <Card>
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Project Image
          </Text>

          <Image
            source={{
              uri:
                imageUrl.trim(),
            }}
            contentFit="cover"
            style={
              styles.projectImage
            }
          />
        </Card>
      ) : null}

      {/* PROJECT INFORMATION */}

      <Card>
        <SectionHeader
          icon="information-circle-outline"
          title="Project Information"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Field
          label="Project Title"
          value={
            title
          }
          onChangeText={
            setTitle
          }
          placeholder="Project title"
        />

        <Field
          label="Organization"
          value={
            organization
          }
          onChangeText={
            setOrganization
          }
          placeholder="Organization or team"
        />

        <Field
          label="Location"
          value={
            location
          }
          onChangeText={
            setLocation
          }
          placeholder="e.g. Johannesburg or Remote"
        />

        <Field
          label="Description"
          value={
            description
          }
          onChangeText={
            setDescription
          }
          placeholder="Describe the project"
          multiline
        />

        <Field
          label="Requirements"
          value={
            requirements
          }
          onChangeText={
            setRequirements
          }
          placeholder="General participation requirements"
          multiline
        />
      </Card>

      {/* CATEGORY */}

      <Card>
        <SectionHeader
          icon="grid-outline"
          title="Category"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <View
          style={
            styles.categoryGrid
          }
        >
          {PROJECT_CATEGORIES.map(
            (item) => {
              const selected =
                category ===
                item.value;

              return (
                <Pressable
                  key={
                    item.value
                  }
                  onPress={() =>
                    setCategory(
                      item.value
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.categoryButton,
                    {
                      backgroundColor:
                        selected
                          ? colors.surfaceElevated
                          : colors.surface,

                      borderColor:
                        selected
                          ? accentColor
                          : colors.border,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={
                      item.icon
                    }
                    size={18}
                    color={
                      accentColor
                    }
                  />

                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {
                      item.label
                    }
                  </Text>

                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={
                        accentColor
                      }
                    />
                  ) : null}
                </Pressable>
              );
            }
          )}
        </View>
      </Card>

      {/* SKILLS */}

      <Card>
        <SectionHeader
          icon="construct-outline"
          title="Skills & Technology"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Field
          label="Skills Needed"
          value={
            skillsNeeded
          }
          onChangeText={
            setSkillsNeeded
          }
          placeholder="e.g. UI design, teamwork, React Native"
          multiline
        />

        <Field
          label="Tech Stack"
          value={
            techStack
          }
          onChangeText={
            setTechStack
          }
          placeholder="e.g. React Native, Node.js, PostgreSQL"
          multiline
        />

        <Field
          label="Deliverable Type"
          value={
            deliverableType
          }
          onChangeText={
            setDeliverableType
          }
          placeholder="e.g. Mobile Application"
        />
      </Card>

      {/* TIMELINE */}

      <Card>
        <SectionHeader
          icon="calendar-outline"
          title="Timeline & Capacity"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Field
          label="Duration (weeks)"
          value={
            durationWeeks
          }
          onChangeText={
            setDurationWeeks
          }
          keyboardType="numeric"
          placeholder="e.g. 8"
        />

        <Field
          label="Application Deadline"
          value={
            applicationDeadline
          }
          onChangeText={
            setApplicationDeadline
          }
          placeholder="YYYY-MM-DD"
        />

        <Field
          label="Team Capacity"
          value={
            teamCapacity
          }
          onChangeText={
            setTeamCapacity
          }
          keyboardType="numeric"
          placeholder="e.g. 10"
        />

        <View
          style={
            styles.readOnlyRow
          }
        >
          <View>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              XP Reward
            </Text>

            <Text
              style={[
                styles.readOnlyValue,
                {
                  color:
                    accentColor,
                },
              ]}
            >
              {
                project.xpReward
              }{' '}
              XP
            </Text>
          </View>

          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={
              colors.muted
            }
          />
        </View>
      </Card>

      {/* MEDIA */}

      <Card>
        <SectionHeader
          icon="image-outline"
          title="Project Media & Links"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Field
          label="Project Image URL"
          value={
            imageUrl
          }
          onChangeText={
            setImageUrl
          }
          keyboardType="url"
          placeholder="https://..."
        />

        <Field
          label="Project / Demo URL"
          value={
            projectUrl
          }
          onChangeText={
            setProjectUrl
          }
          keyboardType="url"
          placeholder="https://..."
        />

        {project.projectUrl ? (
          <Button
            title="Open Project Link"
            secondary
            onPress={() =>
              openUrl(
                project.projectUrl!
              )
            }
          />
        ) : null}
      </Card>

      {/* GITHUB */}

      <Card>
        <SectionHeader
          icon="logo-github"
          title="GitHub Repository"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        {project.isGithubBacked &&
        project.githubUrl ? (
          <View
            style={[
              styles.githubSummary,
              {
                backgroundColor:
                  colors.surfaceElevated,

                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="logo-github"
              size={25}
              color={
                colors.text
              }
            />

            <View
              style={
                styles.githubCopy
              }
            >
              <Text
                style={[
                  styles.githubName,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {project.githubFullName ||
                  `${project.githubOwner}/${project.githubRepo}`}
              </Text>

              <Text
                style={[
                  styles.helperText,
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
            </View>
          </View>
        ) : (
          <Text
            style={[
              styles.copy,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            No GitHub repository is
            linked to this project
            yet.
          </Text>
        )}

        {project.githubUrl ? (
          <Button
            title="Open GitHub Repository"
            secondary
            onPress={() =>
              openUrl(
                project.githubUrl!
              )
            }
          />
        ) : null}

        {canLinkGithub ? (
          <>
            <Field
              label={
                project.isGithubBacked
                  ? 'Replace repository URL'
                  : 'Repository URL'
              }
              value={
                githubRepositoryUrl
              }
              onChangeText={
                setGithubRepositoryUrl
              }
              keyboardType="url"
              placeholder="https://github.com/owner/repository"
            />

            <Text
              style={[
                styles.helperText,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              The repository must be
              accessible through your
              connected GitHub
              account.
            </Text>

            <Button
              title={
                linkingGithub
                  ? 'Linking Repository...'
                  : project.isGithubBacked
                    ? 'Replace GitHub Repository'
                    : 'Link GitHub Repository'
              }
              onPress={
                linkGithubRepository
              }
              disabled={
                linkingGithub ||
                saving ||
                !githubRepositoryUrl.trim()
              }
            />
          </>
        ) : (
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor:
                  colors.surfaceElevated,

                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={
                accentColor
              }
            />

            <Text
              style={[
                styles.infoBoxText,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              Only the project owner
              can link or replace the
              GitHub repository.
              Administrators can
              still manage the
              project itself.
            </Text>
          </View>
        )}
      </Card>

      {/* PROJECT MANAGEMENT */}

      <Card>
        <SectionHeader
          icon="settings-outline"
          title="Project Management"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <View
          style={
            styles.managementStats
          }
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={
              accentColor
            }
          />

          <Text
            style={[
              styles.copy,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {
              project.applications
                ?.length ?? 0
            }{' '}
            application(s)
          </Text>
        </View>

        <Button
          title="Review Join Requests"
          secondary
          onPress={() =>
            router.push(
              `/community/requests/${project.id}` as never
            )
          }
        />

        <Button
          title="View Opportunity"
          secondary
          onPress={() =>
            router.push(
              `/community/${project.id}` as never
            )
          }
        />
      </Card>

      {/* SAVE */}

      <Button
        title={
          saving
            ? 'Saving Changes...'
            : 'Save Changes'
        }
        onPress={
          saveChanges
        }
        disabled={
          saving ||
          changingStatus ||
          linkingGithub
        }
      />

      {/* STATUS CONTROL */}

      <Card>
        <SectionHeader
          icon="warning-outline"
          title="Project Status"
          color={
            colors.text
          }
          accent={
            project.isActive ===
            false
              ? accentColor
              : '#B3261E'
          }
        />

        <Text
          style={[
            styles.copy,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {project.isActive ===
          false
            ? 'Reactivate this project to make it available to the Community again.'
            : 'Deactivating keeps the project data but removes it from active Community opportunities.'}
        </Text>

        <Button
          title={
            changingStatus
              ? 'Updating Status...'
              : project.isActive ===
                  false
                ? 'Reactivate Project'
                : 'Deactivate Project'
          }
          secondary
          onPress={
            handleStatusChange
          }
          disabled={
            saving ||
            changingStatus ||
            linkingGithub
          }
        />
      </Card>
    </Screen>
  );
}

type BackButtonProps = {
  onPress: () => void;
  color: string;
};

function BackButton({
  onPress,
  color,
}: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.backButton,

        pressed &&
          styles.pressed,
      ]}
    >
      <Ionicons
        name="arrow-back"
        size={20}
        color={
          color
        }
      />

      <Text
        style={[
          styles.backText,
          {
            color,
          },
        ]}
      >
        Back
      </Text>
    </Pressable>
  );
}

type SectionHeaderProps = {
  icon:
    | 'information-circle-outline'
    | 'grid-outline'
    | 'construct-outline'
    | 'calendar-outline'
    | 'image-outline'
    | 'logo-github'
    | 'settings-outline'
    | 'warning-outline';

  title: string;
  color: string;
  accent: string;
};

function SectionHeader({
  icon,
  title,
  color,
  accent,
}: SectionHeaderProps) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <Ionicons
        name={
          icon
        }
        size={20}
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

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      marginBottom: 2,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
    },

    copy: {
      fontSize: 13,
      lineHeight: 19,
    },

    helperText: {
      fontSize: 12,
      lineHeight: 18,
    },

    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
    },

    categoryGrid: {
      gap: 8,
      marginTop: 4,
    },

    categoryButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      minHeight: 46,

      borderWidth: 1,
      borderRadius: 12,

      paddingHorizontal: 11,
      paddingVertical: 8,
    },

    categoryText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
    },

    statusRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 11,
    },

    statusIcon: {
      width: 46,
      height: 46,

      borderRadius: 14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    statusCopy: {
      flex: 1,
    },

    statusTitle: {
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 2,
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

    projectImage: {
      width: '100%',
      height: 180,
      borderRadius: 14,
      marginTop: 8,
    },

    readOnlyRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      marginTop: 3,
    },

    readOnlyValue: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 3,
    },

    githubSummary: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 10,

      borderWidth: 1,
      borderRadius: 14,

      padding: 12,
    },

    githubCopy: {
      flex: 1,
    },

    githubName: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },

    infoBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 9,

      borderWidth: 1,
      borderRadius: 13,

      padding: 12,
    },

    infoBoxText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
    },

    managementStats: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,
    },
  });
