import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import {
  Screen,
  Loading,
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
import { useAuth } from '@/context/AuthContext';

import type { Project } from '@/types/api';

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

export default function CommunityScreen() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [search, setSearch] =
    useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('ALL');

  const [loaded, setLoaded] =
    useState(false);

  const [error, setError] =
    useState('');

  const load = useCallback(
    async (
      query = '',
      category = 'ALL'
    ) => {
      try {
        setError('');

        const params: string[] = [];

        if (query.trim()) {
          params.push(
            `search=${encodeURIComponent(
              query.trim()
            )}`
          );
        }

        if (
          category &&
          category !== 'ALL'
        ) {
          params.push(
            `category=${encodeURIComponent(
              category
            )}`
          );
        }

        const queryString =
          params.length > 0
            ? `?${params.join('&')}`
            : '';

        const result =
          await api.get<Project[]>(
            `/projects${queryString}`
          );

        setProjects(result);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Could not load community projects.'
        );
      } finally {
        setLoaded(true);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch() {
    setSelectedCategory('ALL');

    load(
      search,
      'ALL'
    );
  }

  function handleCategory(
    category: string
  ) {
    setSelectedCategory(category);
    setSearch('');

    load(
      '',
      category
    );
  }

  function showAllProjects() {
    setSelectedCategory('ALL');
    setSearch('');

    load(
      '',
      'ALL'
    );
  }

  const canCreate =
    user?.role === 'STUDENT' ||
    user?.role === 'ORGANIZATION' ||
    user?.role === 'ADMIN';

  if (!loaded) {
    return <Loading />;
  }

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const myProjects =
    projects.filter(
      (project) =>
        project.isCreator
    );

  const projectRequests =
    projects.filter(
      (project) =>
        !project.isCreator &&
        project.hasApplied
    );

  const featuredProjects =
    projects.filter(
      (project) =>
        !project.isCreator
    );

  return (
    <Screen>
      {/* HEADER */}
      <View
        style={
          styles.headerRow
        }
      >
        <Image
          source={require('../../../assets/images/community-logo.png')}
          style={
            styles.communityLogo
          }
          contentFit="contain"
        />

        <View
          style={
            styles.headerText
          }
        >
          <Heading subtitle="Discover projects, collaborate and contribute to community initiatives.">
            Community
          </Heading>
        </View>
      </View>

      {error ? (
        <Notice>
          {error}
        </Notice>
      ) : null}

      {/* SEARCH */}
      <Card>
        <Field
          label="Find projects"
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search projects or organizations"
          onSubmitEditing={
            handleSearch
          }
        />

        <Button
          title="Search"
          secondary
          onPress={
            handleSearch
          }
        />
      </Card>

      {/* CATEGORY FILTERS */}
      <View
        style={
          styles.categorySection
        }
      >
        <View
          style={
            styles.sectionHeaderRow
          }
        >
          <Text
            style={[
              styles.sectionHeading,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Explore Categories
          </Text>

          {selectedCategory !==
          'ALL' ? (
            <Pressable
              onPress={
                showAllProjects
              }
            >
              <Text
                style={[
                  styles.showAll,
                  {
                    color:
                      accentColor,
                  },
                ]}
              >
                Show all
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={
            styles.categoryGrid
          }
        >
          {PROJECT_CATEGORIES.map(
            (category) => (
              <Pressable
                key={
                  category.value
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${category.label} projects`}
                onPress={() =>
                  handleCategory(
                    category.value
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.categoryCard,

                  {
                    backgroundColor:
                      colors.surface,

                    borderColor:
                      selectedCategory ===
                      category.value
                        ? accentColor
                        : colors.border,
                  },

                  pressed &&
                    styles.categoryPressed,
                ]}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    {
                      backgroundColor:
                        colors.surfaceElevated,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      category.icon
                    }
                    size={22}
                    color={
                      accentColor
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.categoryTitle,
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
              </Pressable>
            )
          )}
        </View>
      </View>

      {/* CREATE PROJECT */}
      {canCreate ? (
        <Button
          title="Create a Community Project"
          onPress={() =>
            router.push(
              '/community/create' as never
            )
          }
        />
      ) : null}

      {/* MY COMMUNITY PROJECTS */}
      {canCreate ? (
        <>
          <Text
            style={[
              styles.sectionHeading,
              {
                color:
                  colors.text,
              },
            ]}
          >
            My Community Projects
          </Text>

          {myProjects.length >
          0 ? (
            myProjects.map(
              (project) => (
                <Card
                  key={
                    project.id
                  }
                >
                  <Text
                    style={[
                      styles.tag,
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
                      styles.title,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {
                      project.title
                    }
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
                    {
                      project.organization
                    }

                    {project.location
                      ? ` • ${project.location}`
                      : ''}
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
                    {
                      project.description
                    }
                  </Text>

                  {project.requirements ? (
                    <Text
                      style={[
                        styles.copy,
                        {
                          color:
                            colors.muted,
                        },
                      ]}
                    >
                      Requirements:{' '}
                      {
                        project.requirements
                      }
                    </Text>
                  ) : null}

                  <View
                    style={
                      styles.applicationRow
                    }
                  >
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={
                        colors.muted
                      }
                    />

                    <Text
                      style={[
                        styles.applicationCount,
                        {
                          color:
                            colors.muted,
                        },
                      ]}
                    >
                      {
                        project._count
                          ?.applications ??
                        0
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
                </Card>
              )
            )
          ) : (
            <Card>
              <Text
                style={[
                  styles.copy,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                You have not created
                any community projects
                yet.
              </Text>
            </Card>
          )}
        </>
      ) : null}

      {/* PROJECT REQUESTS */}
      <Text
        style={[
          styles.sectionHeading,
          {
            color:
              colors.text,
          },
        ]}
      >
        Project Requests
      </Text>

      {projectRequests.length >
      0 ? (
        projectRequests.map(
          (project) => (
            <Card
              key={
                project.id
              }
            >
              <Text
                style={[
                  styles.tag,
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
                  styles.title,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  project.title
                }
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
                {
                  project.organization
                }

                {project.location
                  ? ` • ${project.location}`
                  : ''}
              </Text>

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      project.applicationStatus ===
                      'APPROVED'
                        ? accentColor
                        : project.applicationStatus ===
                            'DECLINED'
                          ? '#B3261E'
                          : '#B7791F',
                  },
                ]}
              >
                {project.applicationStatus ===
                'APPROVED'
                  ? 'Approved'
                  : project.applicationStatus ===
                      'DECLINED'
                    ? 'Declined'
                    : 'Pending'}
              </Text>

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
          )
        )
      ) : (
        <Card>
          <Text
            style={[
              styles.copy,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            You have no project
            requests yet.
          </Text>
        </Card>
      )}

      {/* FEATURED OPPORTUNITIES */}
      <Text
        style={[
          styles.sectionHeading,
          {
            color:
              colors.text,
          },
        ]}
      >
        Featured Opportunities
      </Text>

      {featuredProjects.length >
      0 ? (
        featuredProjects.map(
          (project) => (
            <Card
              key={
                project.id
              }
            >
              <Text
                style={[
                  styles.tag,
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
                  styles.title,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  project.title
                }
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
                    styles.copy,
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
                      styles.copy,
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

              <Text
                style={[
                  styles.copy,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                {
                  project.description
                }
              </Text>

              {project.requirements ? (
                <Text
                  style={[
                    styles.copy,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  Requirements:{' '}
                  {
                    project.requirements
                  }
                </Text>
              ) : null}

              <Text
                style={[
                  styles.xpText,
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

              <Button
                title={
                  project.hasApplied
                    ? 'View Opportunity'
                    : 'View & Apply'
                }
                onPress={() =>
                  router.push(
                    `/community/${project.id}` as never
                  )
                }
              />

              {project.hasApplied ? (
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        project.applicationStatus ===
                        'APPROVED'
                          ? accentColor
                          : project.applicationStatus ===
                              'DECLINED'
                            ? '#B3261E'
                            : '#B7791F',
                    },
                  ]}
                >
                  {project.applicationStatus ===
                  'APPROVED'
                    ? 'Application approved'
                    : project.applicationStatus ===
                        'DECLINED'
                      ? 'Application declined'
                      : 'Application pending'}
                </Text>
              ) : null}
            </Card>
          )
        )
      ) : (
        <Card>
          <Text
            style={[
              styles.emptyTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            No opportunities available
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
            No active community
            opportunities from other
            users match the current
            search or category.
          </Text>

          {selectedCategory !==
          'ALL' ? (
            <Button
              title="Show All Projects"
              secondary
              onPress={
                showAllProjects
              }
            />
          ) : null}
        </Card>
      )}
    </Screen>
  );
}

const styles =
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 8,
    },

    communityLogo: {
      width: 58,
      height: 58,
    },

    headerText: {
      flex: 1,
    },

    categorySection: {
      gap: 12,
      marginTop: 4,
      marginBottom: 10,
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    sectionHeading: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 12,
    },

    showAll: {
      fontSize: 13,
      fontWeight: '800',
      marginTop: 12,
    },

    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      gap: 12,
    },

    categoryCard: {
      width: '48%',
      minHeight: 105,
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      justifyContent:
        'center',
      gap: 7,
    },

    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    categoryTitle: {
      fontSize: 13,
      fontWeight: '800',
    },

    categoryPressed: {
      opacity: 0.7,
    },

    title: {
      fontSize: 17,
      fontWeight: '800',
    },

    tag: {
      fontSize: 12,
      fontWeight: '800',
    },

    copy: {
      fontSize: 13,
      lineHeight: 20,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    xpText: {
      fontSize: 13,
      fontWeight: '800',
    },

    applicationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    applicationCount: {
      fontSize: 12,
      fontWeight: '600',
    },

    statusText: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
    },
  });