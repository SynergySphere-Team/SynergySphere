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

import type {
  Project,
  ProjectJoinRequest,
} from '@/types/api';

const categories = [
  'SUSTAINABILITY',
  'RECYCLING',
  'ECO_TOURISM',
  'GREEN_INFRASTRUCTURE',
  'OTHER',
] as const;

const communityShortcuts = [
  {
    label: 'Eco-tourism',
    subtitle: 'Opportunities',
    category: 'ECO_TOURISM',
    icon: 'leaf-outline' as const,
  },
  {
    label: 'Green Infrastructure',
    subtitle: 'Projects',
    category: 'GREEN_INFRASTRUCTURE',
    icon: 'business-outline' as const,
  },
  {
    label: 'Events',
    subtitle: '& Webinars',
    category: 'OTHER',
    icon: 'calendar-outline' as const,
  },
  {
    label: 'Discussions',
    subtitle: 'Community',
    category: 'OTHER',
    icon: 'people-outline' as const,
  },
];

export default function CommunityScreen() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<string>('ALL');

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [requests, setRequests] = useState<
    Record<string, ProjectJoinRequest[]>
  >({});

  const [reviewing, setReviewing] =
    useState('');

  const [form, setForm] = useState({
    title: '',
    organization: '',
    location: '',
    description: '',
    category: 'SUSTAINABILITY',
  });

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
            : 'Could not load projects.'
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
    load(search, 'ALL');
  }

  function handleShortcut(
    category: string
  ) {
    setSelectedCategory(category);
    setSearch('');
    load('', category);
  }

  function showAllProjects() {
    setSelectedCategory('ALL');
    setSearch('');
    load('', 'ALL');
  }

  async function createProject() {
    if (
      !form.title.trim() ||
      !form.organization.trim() ||
      !form.description.trim()
    ) {
      return;
    }

    setCreating(true);

    try {
      setError('');

      await api.post('/projects', {
        ...form,
        title: form.title.trim(),
        organization:
          form.organization.trim(),
        description:
          form.description.trim(),
        location:
          form.location.trim() ||
          undefined,
      });

      setForm({
        title: '',
        organization: '',
        location: '',
        description: '',
        category: 'SUSTAINABILITY',
      });

      setShowCreate(false);

      await load(
        search,
        selectedCategory
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

  async function loadRequests(
    projectId: string
  ) {
    try {
      setError('');

      const result =
        await api.get<
          ProjectJoinRequest[]
        >(
          `/projects/${projectId}/applications`
        );

      setRequests((current) => ({
        ...current,
        [projectId]: result,
      }));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load join requests.'
      );
    }
  }

  async function reviewRequest(
    projectId: string,
    applicationId: string,
    status:
      | 'APPROVED'
      | 'DECLINED'
  ) {
    setReviewing(applicationId);

    try {
      setError('');

      await api.patch(
        `/projects/${projectId}/applications/${applicationId}`,
        { status }
      );

      await Promise.all([
        loadRequests(projectId),
        load(
          search,
          selectedCategory
        ),
      ]);
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

  const canCreate =
    user?.role === 'ORGANIZATION' ||
    user?.role === 'ADMIN';

  if (!loaded) {
    return <Loading />;
  }

  const isLight =
    theme === 'light';

  const tagColor = isLight
    ? '#1e6827'
    : colors.primary;

  const myProjects =
    projects.filter(
      (item) => item.isCreator
    );

  const projectRequests =
    projects.filter(
      (item) =>
        !item.isCreator &&
        item.hasApplied
    );

  const featuredProjects =
    projects.filter(
      (item) =>
        !item.isCreator &&
        !item.hasApplied
    );

  return (
    <Screen>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Image
          source={require('../../../assets/images/community-logo.png')}
          style={
            styles.communityLogo
          }
          contentFit="contain"
        />

        <View style={styles.headerText}>
          <Heading subtitle="Join projects that create a practical community impact.">
            Community
          </Heading>
        </View>
      </View>

      {error ? (
        <Notice>{error}</Notice>
      ) : null}

      {/* SEARCH */}
      <Card>
        <Field
          label="Find projects"
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects or organizations"
          onSubmitEditing={
            handleSearch
          }
        />

        <Button
          title="Search"
          onPress={handleSearch}
          secondary
        />
      </Card>

      {/* EXPLORE */}
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
                color: colors.text,
              },
            ]}
          >
            Explore Community
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
                  styles.clearFilter,
                  {
                    color:
                      tagColor,
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
          {communityShortcuts.map(
            (item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} ${item.subtitle}`}
                onPress={() =>
                  handleShortcut(
                    item.category
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
                      item.category
                        ? tagColor
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
                      item.icon
                    }
                    size={23}
                    color={
                      tagColor
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
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.categorySubtitle,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  {
                    item.subtitle
                  }
                </Text>
              </Pressable>
            )
          )}
        </View>
      </View>

      {/* CREATE PROJECT */}
      {canCreate ? (
        <>
          <Button
            title={
              showCreate
                ? 'Close project form'
                : 'Create a community project'
            }
            secondary
            onPress={() =>
              setShowCreate(
                (value) =>
                  !value
              )
            }
          />

          {showCreate ? (
            <Card>
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Create a project
              </Text>

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
              />

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
                multiline
              />

              <Text
                style={[
                  styles.categoryLabel,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Category
              </Text>

              <View
                style={
                  styles.categories
                }
              >
                {categories.map(
                  (category) => (
                    <Button
                      key={
                        category
                      }
                      title={category.replaceAll(
                        '_',
                        ' '
                      )}
                      secondary={
                        form.category !==
                        category
                      }
                      onPress={() =>
                        setForm({
                          ...form,
                          category,
                        })
                      }
                    />
                  )
                )}
              </View>

              <Button
                title={
                  creating
                    ? 'Creating project...'
                    : 'Create project'
                }
                onPress={
                  createProject
                }
                disabled={
                  creating ||
                  !form.title.trim() ||
                  !form.organization.trim() ||
                  !form.description.trim()
                }
              />
            </Card>
          ) : null}
        </>
      ) : null}

      {/* MY PROJECTS */}
      {canCreate ? (
        <>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: colors.text,
              },
            ]}
          >
            My Community Projects
          </Text>

          {myProjects.length >
          0 ? (
            myProjects.map(
              (item) => (
                <Card
                  key={
                    item.id
                  }
                >
                  <Text
                    style={[
                      styles.tag,
                      {
                        color:
                          tagColor,
                      },
                    ]}
                  >
                    {item.category.replaceAll(
                      '_',
                      ' '
                    )}{' '}
                    •{' '}
                    {
                      item.xpReward
                    }{' '}
                    XP
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
                    {item.title}
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
                      item.organization
                    }
                    {item.location
                      ? ` • ${item.location}`
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
                      item.description
                    }
                  </Text>

                  <Text
                    style={[
                      styles.hint,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {
                      item
                        ._count
                        ?.applications ??
                      0
                    }{' '}
                    application(s)
                  </Text>

                  <Button
                    title={
                      requests[
                        item.id
                      ]
                        ? 'Refresh join requests'
                        : 'Review join requests'
                    }
                    secondary
                    onPress={() =>
                      loadRequests(
                        item.id
                      )
                    }
                  />

                  {requests[
                    item.id
                  ]?.map(
                    (
                      request
                    ) => (
                      <View
                        key={
                          request.id
                        }
                        style={[
                          styles.request,
                          {
                            borderTopColor:
                              colors.border,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.requestCopy
                          }
                        >
                          <Text
                            style={[
                              styles.requestName,
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
                              styles.hint,
                              {
                                color:
                                  colors.muted,
                              },
                            ]}
                          >
                            {
                              request.email
                            }{' '}
                            •{' '}
                            {
                              request.status
                            }
                          </Text>
                        </View>

                        {request.status ===
                        'PENDING' ? (
                          <View
                            style={
                              styles.requestActions
                            }
                          >
                            <Button
                              title={
                                reviewing ===
                                request.id
                                  ? 'Reviewing...'
                                  : 'Allow'
                              }
                              onPress={() =>
                                reviewRequest(
                                  item.id,
                                  request.id,
                                  'APPROVED'
                                )
                              }
                              disabled={Boolean(
                                reviewing
                              )}
                            />

                            <Button
                              title="Decline"
                              secondary
                              onPress={() =>
                                reviewRequest(
                                  item.id,
                                  request.id,
                                  'DECLINED'
                                )
                              }
                              disabled={Boolean(
                                reviewing
                              )}
                            />
                          </View>
                        ) : null}
                      </View>
                    )
                  )}
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
                You have not
                created any
                community
                projects yet.
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
            color: colors.text,
          },
        ]}
      >
        Project Requests
      </Text>

      {projectRequests.length >
      0 ? (
        projectRequests.map(
          (item) => (
            <Card
              key={item.id}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {item.title}
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
                  item.organization
                }
                {item.location
                  ? ` • ${item.location}`
                  : ''}
              </Text>

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.applicationStatus ===
                      'APPROVED'
                        ? tagColor
                        : item.applicationStatus ===
                            'DECLINED'
                          ? '#B3261E'
                          : colors.muted,
                  },
                ]}
              >
                {item.applicationStatus ===
                'APPROVED'
                  ? 'Approved'
                  : item.applicationStatus ===
                      'DECLINED'
                    ? 'Declined'
                    : 'Pending'}
              </Text>

              <Button
                title="View Opportunity"
                secondary
                onPress={() =>
                  router.push(
                    `/community/${item.id}` as never
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
            You have no
            project requests
            yet.
          </Text>
        </Card>
      )}

      {/* FEATURED OPPORTUNITIES */}
      <Text
        style={[
          styles.sectionHeading,
          {
            color: colors.text,
          },
        ]}
      >
        Featured Opportunities
      </Text>

      {featuredProjects.length >
      0 ? (
        featuredProjects.map(
          (item) => (
            <Card
              key={item.id}
            >
              <Text
                style={[
                  styles.tag,
                  {
                    color:
                      tagColor,
                  },
                ]}
              >
                {item.category.replaceAll(
                  '_',
                  ' '
                )}{' '}
                •{' '}
                {
                  item.xpReward
                }{' '}
                XP
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
                {item.title}
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
                  item.organization
                }
                {item.location
                  ? ` • ${item.location}`
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
                  item.description
                }
              </Text>

              <Button
                title="View Opportunity"
                onPress={() =>
                  router.push(
                    `/community/${item.id}` as never
                  )
                }
              />

              <Text
                style={[
                  styles.hint,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                View the
                opportunity for
                full details and
                application
                information.
              </Text>
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
            No featured
            opportunities found
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
            You may already
            have applied to the
            available projects,
            or the current
            filter has no
            matching
            opportunities.
          </Text>

          {selectedCategory !==
          'ALL' ? (
            <Button
              title="Show all projects"
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

    clearFilter: {
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
      minHeight: 125,
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      justifyContent:
        'center',
      gap: 5,
    },

    categoryIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 5,
    },

    categoryTitle: {
      fontSize: 14,
      fontWeight: '800',
    },

    categorySubtitle: {
      fontSize: 12,
      fontWeight: '500',
    },

    categoryPressed: {
      opacity: 0.7,
    },

    tag: {
      fontSize: 12,
      fontWeight: '800',
    },

    title: {
      fontSize: 17,
      fontWeight: '800',
    },

    copy: {
      lineHeight: 20,
      fontSize: 13,
    },

    hint: {
      fontSize: 12,
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

    categoryLabel: {
      fontSize: 13,
      fontWeight: '700',
    },

    categories: {
      gap: 7,
    },

    request: {
      borderTopWidth: 1,
      paddingTop: 10,
      gap: 8,
    },

    requestCopy: {
      gap: 2,
    },

    requestName: {
      fontSize: 14,
      fontWeight: '800',
    },

    requestActions: {
      flexDirection: 'row',
      gap: 8,
    },
  });