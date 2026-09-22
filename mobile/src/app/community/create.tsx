import { useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

export default function CreateCommunityProjectScreen() {
  const router = useRouter();

  const {
    colors,
    theme,
  } = useTheme();

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState('');

  const [form, setForm] =
    useState({
      title: '',
      organization: '',
      location: '',
      description: '',
      requirements: '',
      category: 'SUSTAINABILITY',
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

  async function createProject() {
    if (
      !formValid ||
      creating
    ) {
      return;
    }

    setCreating(true);
    setError('');

    try {
      await api.post(
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

          category:
            form.category,
        }
      );

      router.replace(
        '/community' as never
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
      {/* SMALL BACK BUTTON */}
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
      <Heading subtitle="Create a project that students can discover and apply to through Community.">
        Create Community Project
      </Heading>

      {error ? (
        <Notice>
          {error}
        </Notice>
      ) : null}

      {/* SINGLE MAIN FORM CARD */}
      <Card>
        {/* PROJECT INFORMATION */}
        <View
          style={
            styles.sectionHeader
          }
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
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Project Information
          </Text>
        </View>

        <Field
          label="Project title"
          value={
            form.title
          }
          onChangeText={(
            title
          ) =>
            setForm({
              ...form,
              title,
            })
          }
          placeholder="Enter a clear project title"
        />

        <Field
          label="Organization"
          value={
            form.organization
          }
          onChangeText={(
            organization
          ) =>
            setForm({
              ...form,
              organization,
            })
          }
          placeholder="Organization or project owner"
        />

        <Field
          label="Location (optional)"
          value={
            form.location
          }
          onChangeText={(
            location
          ) =>
            setForm({
              ...form,
              location,
            })
          }
          placeholder="e.g. Johannesburg or Remote"
        />

        {/* DIVIDER */}
        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                colors.border,
            },
          ]}
        />

        {/* PROJECT DETAILS */}
        <View
          style={
            styles.sectionHeader
          }
        >
          <Ionicons
            name="document-text-outline"
            size={20}
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
            Project Details
          </Text>
        </View>

        <Field
          label="Description"
          value={
            form.description
          }
          onChangeText={(
            description
          ) =>
            setForm({
              ...form,
              description,
            })
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
            requirements
          ) =>
            setForm({
              ...form,
              requirements,
            })
          }
          placeholder="e.g. React, REST APIs, teamwork"
          multiline
        />

        {/* DIVIDER */}
        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                colors.border,
            },
          ]}
        />

        {/* CATEGORY */}
        <View
          style={
            styles.sectionHeader
          }
        >
          <Ionicons
            name="grid-outline"
            size={20}
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
            Category
          </Text>
        </View>

        <Text
          style={[
            styles.helperText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          Select the category that best describes this project.
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
                    setForm({
                      ...form,

                      category:
                        category.value,
                    })
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

      {/* CREATE BUTTON */}
      <Button
        title={
          creating
            ? 'Creating Project...'
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
        description and category are required.
      </Text>
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

    divider: {
      height: 1,
      width: '100%',
      marginVertical: 6,
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