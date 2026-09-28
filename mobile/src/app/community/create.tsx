import { useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Screen,
  Notice,
} from '@/components/Screen';

import {
  Button,
  Card,
  Field,
  Heading,
} from '@/components/ui';

import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

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

type CreateProjectForm = {
  title: string;
  organization: string;
  location: string;
  description: string;
  requirements: string;

  skillsNeeded: string;
  techStack: string;

  durationWeeks: string;
  applicationDeadline: string;
  teamCapacity: string;
  deliverableType: string;

  imageUrl: string;
  projectUrl: string;
  githubRepositoryUrl: string;

  category: ProjectCategory;
};

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
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.toISOString();
}

function isHttpUrl(
  value: string
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return true;
  }

  try {
    const parsed =
      new URL(trimmed);

    return (
      parsed.protocol ===
        'http:' ||
      parsed.protocol ===
        'https:'
    );
  } catch {
    return false;
  }
}

function isGithubRepositoryUrl(
  value: string
) {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return true;
  }

  try {
    const parsed =
      new URL(trimmed);

    const parts =
      parsed.pathname
        .split('/')
        .filter(Boolean);

    return (
      parsed.protocol ===
        'https:' &&
      parsed.hostname.toLowerCase() ===
        'github.com' &&
      parts.length === 2
    );
  } catch {
    return false;
  }
}

export default function CreateCommunityProjectScreen() {
  const router =
    useRouter();

  const {
    colors,
    theme,
  } = useTheme();

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    createdProjectId,
    setCreatedProjectId,
  ] =
    useState<string | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<CreateProjectForm>({
      title: '',
      organization: '',
      location: '',
      description: '',
      requirements: '',

      skillsNeeded: '',
      techStack: '',

      durationWeeks: '',
      applicationDeadline: '',
      teamCapacity: '10',
      deliverableType:
        'Software Solution',

      imageUrl: '',
      projectUrl: '',
      githubRepositoryUrl: '',

      category:
        'OPEN_SOURCE',
    });

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const formValid =
    Boolean(
      form.title.trim() &&
        form.organization.trim() &&
        form.description.trim() &&
        form.category
    );

  function updateForm<
    K extends keyof CreateProjectForm,
  >(
    key: K,
    value:
      CreateProjectForm[K]
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,
        [key]: value,
      })
    );
  }

  async function createProject() {
    if (
      !formValid ||
      creating ||
      createdProjectId
    ) {
      return;
    }

    setError('');

    let durationWeeks:
      | number
      | undefined;

    if (
      form.durationWeeks.trim()
    ) {
      durationWeeks =
        Number(
          form.durationWeeks
        );

      if (
        !Number.isInteger(
          durationWeeks
        ) ||
        durationWeeks < 1 ||
        durationWeeks > 104
      ) {
        setError(
          'Duration must be between 1 and 104 weeks.'
        );
        return;
      }
    }

    let teamCapacity:
      | number
      | undefined;

    if (
      form.teamCapacity.trim()
    ) {
      teamCapacity =
        Number(
          form.teamCapacity
        );

      if (
        !Number.isInteger(
          teamCapacity
        ) ||
        teamCapacity < 1 ||
        teamCapacity > 100
      ) {
        setError(
          'Team capacity must be between 1 and 100.'
        );
        return;
      }
    }

    const applicationDeadline =
      dateInputToIso(
        form.applicationDeadline
      );

    if (
      applicationDeadline ===
      null
    ) {
      setError(
        'Application deadline must use YYYY-MM-DD format.'
      );
      return;
    }

    if (
      !isHttpUrl(
        form.imageUrl
      )
    ) {
      setError(
        'Project image URL must be a valid http or https URL.'
      );
      return;
    }

    if (
      !isHttpUrl(
        form.projectUrl
      )
    ) {
      setError(
        'Project / demo URL must be a valid http or https URL.'
      );
      return;
    }

    if (
      !isGithubRepositoryUrl(
        form.githubRepositoryUrl
      )
    ) {
      setError(
        'GitHub repository URL must look like https://github.com/owner/repository.'
      );
      return;
    }

    try {
      setCreating(true);

      const createdProject =
        await api.post<{
          id: string;
        }>(
        '/projects',
        {
          title:
            form.title.trim(),

          organization:
            form.organization.trim(),

          location:
            form.location.trim() ||
            undefined,

          description:
            form.description.trim(),

          requirements:
            form.requirements.trim() ||
            undefined,

          skillsNeeded:
            form.skillsNeeded.trim() ||
            undefined,

          techStack:
            form.techStack.trim() ||
            undefined,

          durationWeeks,

          applicationDeadline,

          teamCapacity,

          deliverableType:
            form.deliverableType.trim() ||
            'Software Solution',

          imageUrl:
            form.imageUrl.trim() ||
            undefined,

          projectUrl:
            form.projectUrl.trim() ||
            undefined,

          category:
            form.category,
        }
      );

      setCreatedProjectId(
        createdProject.id
      );

      const repositoryUrl =
        form.githubRepositoryUrl.trim();

      if (repositoryUrl) {
        try {
          await api.patch(
            `/projects/${createdProject.id}/github`,
            {
              repositoryUrl,
            }
          );
        } catch (githubError) {
          setError(
            `Project created successfully, but the GitHub repository could not be linked: ${
              githubError instanceof Error
                ? githubError.message
                : 'Unknown GitHub error.'
            } You can link it from Manage Project.`
          );

          setCreating(false);
          return;
        }
      }

      router.replace(
        `/community/manage/${createdProject.id}` as never
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not create this project.'
      );
    } finally {
      setCreating(false);
    }
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
        style={({
          pressed,
        }) => [
          styles.backButton,

          pressed &&
            styles.backButtonPressed,
        ]}
      >
        <Ionicons
          name="arrow-back"
          size={19}
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

      <Heading subtitle="Create a complete community initiative that students can discover, join and showcase through SynergySphere.">
        Create Community Project
      </Heading>

      {error ? (
        <Notice>
          {error}
        </Notice>
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
          label="Project title"
          value={
            form.title
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'title',
              value
            )
          }
          placeholder="Enter a clear project title"
        />

        <Field
          label="Organization"
          value={
            form.organization
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'organization',
              value
            )
          }
          placeholder="Organization, team or project owner"
        />

        <Field
          label="Location (optional)"
          value={
            form.location
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'location',
              value
            )
          }
          placeholder="e.g. Johannesburg or Remote"
        />
      </Card>

      {/* PROJECT DETAILS */}

      <Card>
        <SectionHeader
          icon="document-text-outline"
          title="Project Details"
          color={
            colors.text
          }
          accent={
            accentColor
          }
        />

        <Field
          label="Description"
          value={
            form.description
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'description',
              value
            )
          }
          placeholder="Explain the purpose, goals and expected contribution"
          multiline
        />

        <Field
          label="Requirements (optional)"
          value={
            form.requirements
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'requirements',
              value
            )
          }
          placeholder="General participation requirements"
          multiline
        />
      </Card>

      {/* SKILLS AND TECHNOLOGY */}

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
          label="Skills Needed (optional)"
          value={
            form.skillsNeeded
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'skillsNeeded',
              value
            )
          }
          placeholder="e.g. UI design, teamwork, API integration"
          multiline
        />

        <Field
          label="Tech Stack (optional)"
          value={
            form.techStack
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'techStack',
              value
            )
          }
          placeholder="e.g. React Native, Node.js, PostgreSQL"
          multiline
        />

        <Field
          label="Expected Deliverable"
          value={
            form.deliverableType
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'deliverableType',
              value
            )
          }
          placeholder="e.g. Mobile Application"
        />
      </Card>

      {/* TIMELINE AND CAPACITY */}

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
          label="Duration in weeks (optional)"
          value={
            form.durationWeeks
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'durationWeeks',
              value
            )
          }
          keyboardType="numeric"
          placeholder="e.g. 8"
        />

        <Field
          label="Application deadline (optional)"
          value={
            form.applicationDeadline
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'applicationDeadline',
              value
            )
          }
          placeholder="YYYY-MM-DD"
        />

        <Field
          label="Team Capacity"
          value={
            form.teamCapacity
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'teamCapacity',
              value
            )
          }
          keyboardType="numeric"
          placeholder="e.g. 10"
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
          XP is assigned by
          SynergySphere when the
          project is created.
        </Text>
      </Card>

      {/* MEDIA AND LINKS */}

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
          label="Project image URL (optional)"
          value={
            form.imageUrl
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'imageUrl',
              value
            )
          }
          keyboardType="url"
          placeholder="https://..."
        />

        {form.imageUrl.trim() &&
        isHttpUrl(
          form.imageUrl
        ) ? (
          <Image
            source={{
              uri:
                form.imageUrl.trim(),
            }}
            contentFit="cover"
            style={
              styles.imagePreview
            }
          />
        ) : null}

        <Field
          label="Project / demo URL (optional)"
          value={
            form.projectUrl
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'projectUrl',
              value
            )
          }
          keyboardType="url"
          placeholder="https://..."
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
          Use the project URL for a
          live website, deployed app,
          demo, documentation or
          presentation.
        </Text>
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

        <Field
          label="Repository URL (optional)"
          value={
            form.githubRepositoryUrl
          }
          onChangeText={(
            value
          ) =>
            updateForm(
              'githubRepositoryUrl',
              value
            )
          }
          keyboardType="url"
          placeholder="https://github.com/owner/repository"
        />

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
            name="git-branch-outline"
            size={21}
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
            If you add a repository,
            SynergySphere will create
            the Community project
            first and then
            automatically link this
            GitHub repository. Your
            GitHub account must
            already be connected.
          </Text>
        </View>
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

        <Text
          style={[
            styles.helperText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          Select the category that
          best describes this
          project.
        </Text>

        <View
          style={
            styles.categoryGrid
          }
        >
          {PROJECT_CATEGORIES.map(
            (category) => {
              const selected =
                form.category ===
                category.value;

              return (
                <Pressable
                  key={
                    category.value
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${category.label}`}
                  onPress={() =>
                    updateForm(
                      'category',
                      category.value
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.categoryCard,

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
                      styles.categoryPressed,
                  ]}
                >
                  <Ionicons
                    name={
                      category.icon
                    }
                    size={20}
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
                      category.label
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

      {/* CREATE */}

      {createdProjectId ? (
        <>
          <Button
            title="Open Manage Project"
            onPress={() =>
              router.replace(
                `/community/manage/${createdProjectId}` as never
              )
            }
          />

          <Button
            title="Back to Community"
            secondary
            onPress={() =>
              router.replace(
                '/community' as never
              )
            }
          />
        </>
      ) : (
        <Button
          title={
            creating
              ? form.githubRepositoryUrl.trim()
                ? 'Creating & Linking GitHub...'
                : 'Creating Project...'
              : 'Create Project'
          }
          onPress={
            createProject
          }
          disabled={
            creating ||
            !formValid
          }
        />
      )}

      <Text
        style={[
          styles.requiredText,
          {
            color:
              colors.muted,
          },
        ]}
      >
        Project title, organization,
        description and category are
        required. GitHub is optional.
      </Text>
    </Screen>
  );
}

type SectionHeaderProps = {
  icon:
    | 'information-circle-outline'
    | 'document-text-outline'
    | 'construct-outline'
    | 'calendar-outline'
    | 'image-outline'
    | 'logo-github'
    | 'grid-outline';

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

      gap: 5,

      paddingVertical: 4,

      paddingHorizontal: 2,

      marginBottom: 0,
    },

    backButtonPressed: {
      opacity: 0.6,
    },

    backText: {
      fontSize: 14,
      fontWeight: '700',
    },

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      marginBottom: 2,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
    },

    helperText: {
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 2,
    },

    imagePreview: {
      width: '100%',
      height: 170,
      borderRadius: 14,
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

    categoryGrid: {
      gap: 7,
    },

    categoryCard: {
      minHeight: 48,

      borderWidth: 1,

      borderRadius: 12,

      paddingHorizontal: 12,
      paddingVertical: 8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,
    },

    categoryText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
    },

    categoryPressed: {
      opacity: 0.7,
    },

    requiredText: {
      textAlign:
        'center',

      fontSize: 11,

      lineHeight: 16,

      paddingHorizontal: 12,

      marginTop: -4,
    },
  });
