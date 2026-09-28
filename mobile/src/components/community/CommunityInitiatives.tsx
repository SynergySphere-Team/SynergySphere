import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

type InitiativeProject = {
  id: string;
  title: string;
  category: string;
  location?: string | null;
  organization?: string | null;
  description?: string | null;
  requirements?: string | null;
  xpReward?: number | null;
  isActive?: boolean;
  isCreator?: boolean;
  hasApplied?: boolean;
  applicationStatus?: string | null;
  techStack?: string | null;
  teamCapacity?: number | null;
  deliverableType?: string | null;
  githubUrl?: string | null;
  _count?: {
    applications?: number;
  };
};

const CATEGORIES = [
  { value: 'OPEN_SOURCE', label: 'Open Source', icon: 'code-slash-outline' as const },
  { value: 'GREEN_SOFTWARE', label: 'Green Software', icon: 'leaf-outline' as const },
  { value: 'CIVIC_TECH', label: 'Civic Tech', icon: 'globe-outline' as const },
  { value: 'EDTECH', label: 'EdTech', icon: 'school-outline' as const },
  { value: 'SUSTAINABILITY', label: 'Sustainability', icon: 'earth-outline' as const },
  { value: 'RECYCLING', label: 'Recycling', icon: 'refresh-circle-outline' as const },
  { value: 'ECO_TOURISM', label: 'Eco-tourism', icon: 'leaf-outline' as const },
  { value: 'GREEN_INFRASTRUCTURE', label: 'Green Infrastructure', icon: 'business-outline' as const },
  { value: 'OTHER', label: 'Other', icon: 'folder-outline' as const },
];

function categoryLabel(value?: string | null) {
  return String(value ?? 'OTHER')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLabel(status?: string | null) {
  switch (String(status ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'Approved';
    case 'DECLINED':
      return 'Declined';
    case 'INVITATION_SENT':
      return 'GitHub invitation sent';
    case 'ACCEPTED':
      return 'Joined';
    case 'COMPLETED':
      return 'Completed';
    case 'PENDING':
      return 'Pending';
    default:
      return status || 'Submitted';
  }
}

export function CommunityInitiatives() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme } = useTheme();

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const [projects, setProjects] =
    useState<InitiativeProject[]>([]);

  const [search, setSearch] =
    useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('ALL');

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [error, setError] =
    useState('');

  const role =
    String(user?.role ?? '').toUpperCase();

  const isAdmin =
    role === 'ADMIN';

  const canCreate =
    role === 'STUDENT' ||
    role === 'ORGANIZATION' ||
    role === 'ADMIN';

  const loadProjects =
    useCallback(
      async (
        query = '',
        category = 'ALL',
      ) => {
        try {
          setError('');
          setSearching(true);

          const params: string[] = [];

          if (query.trim()) {
            params.push(
              `search=${encodeURIComponent(
                query.trim(),
              )}`,
            );
          }

          if (
            category &&
            category !== 'ALL'
          ) {
            params.push(
              `category=${encodeURIComponent(
                category,
              )}`,
            );
          }

          const queryString =
            params.length
              ? `?${params.join('&')}`
              : '';

          const result =
            await api.get<
              InitiativeProject[]
            >(
              `/projects${queryString}`,
            );

          setProjects(
            Array.isArray(result)
              ? result
              : [],
          );
        } catch (e) {
          setProjects([]);

          setError(
            e instanceof Error
              ? e.message
              : 'Could not load Community initiatives.',
          );
        } finally {
          setLoading(false);
          setSearching(false);
        }
      },
      [],
    );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const myProjects =
    useMemo(
      () =>
        isAdmin
          ? projects.filter(
              (project) =>
                project.isCreator,
            )
          : projects.filter(
              (project) =>
                project.isCreator,
            ),
      [projects, isAdmin],
    );

  const myApplications =
    useMemo(
      () =>
        projects.filter(
          (project) =>
            !project.isCreator &&
            project.hasApplied,
        ),
      [projects],
    );

  const opportunities =
    useMemo(
      () =>
        projects.filter(
          (project) =>
            !project.isCreator,
        ),
      [projects],
    );

  function searchProjects() {
    setSelectedCategory('ALL');

    loadProjects(
      search,
      'ALL',
    );
  }

  function clearSearch() {
    setSearch('');
    setSelectedCategory('ALL');

    loadProjects(
      '',
      'ALL',
    );
  }

  function selectCategory(
    category: string,
  ) {
    setSelectedCategory(
      category,
    );

    setSearch('');

    loadProjects(
      '',
      category,
    );
  }

  function showAll() {
    setSelectedCategory('ALL');
    setSearch('');

    loadProjects(
      '',
      'ALL',
    );
  }

  function openProject(
    projectId: string,
  ) {
    router.push(
      `/community/${projectId}` as never,
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loadingCard,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <ActivityIndicator
          color={
            accentColor
          }
        />

        <Text
          style={{
            color:
              colors.muted,
          }}
        >
          Loading initiatives...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={
        styles.wrap
      }
    >
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color="#B3261E"
          />

          <Text
            style={[
              styles.errorText,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {error}
          </Text>

          <Pressable
            onPress={() =>
              setError('')
            }
          >
            <Ionicons
              name="close"
              size={18}
              color={
                colors.muted
              }
            />
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.searchCard,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.label,
            {
              color:
                colors.text,
            },
          ]}
        >
          Find projects
        </Text>

        <View
          style={
            styles.searchRow
          }
        >
          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            onSubmitEditing={
              searchProjects
            }
            placeholder="Search projects or organizations"
            placeholderTextColor={
              colors.muted
            }
            style={[
              styles.searchInput,
              {
                color:
                  colors.text,
                backgroundColor:
                  colors.surfaceElevated,
                borderColor:
                  colors.border,
              },
            ]}
          />

          <Pressable
            onPress={
              searchProjects
            }
            disabled={
              searching
            }
            style={[
              styles.searchButton,
              {
                backgroundColor:
                  accentColor,
                opacity:
                  searching
                    ? 0.55
                    : 1,
              },
            ]}
          >
            {searching ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="search"
                size={18}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </View>

        {search.trim() ? (
          <Pressable
            onPress={
              clearSearch
            }
          >
            <Text
              style={[
                styles.clearText,
                {
                  color:
                    accentColor,
                },
              ]}
            >
              Clear search
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={
          styles.sectionHeader
        }
      >
        <Text
          style={[
            styles.sectionTitle,
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
              showAll
            }
          >
            <Text
              style={{
                color:
                  accentColor,
                fontSize: 12,
                fontWeight:
                  '800',
              }}
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
        {CATEGORIES.map(
          (
            category,
          ) => {
            const selected =
              selectedCategory ===
              category.value;

            return (
              <Pressable
                key={
                  category.value
                }
                onPress={() =>
                  selectCategory(
                    category.value,
                  )
                }
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor:
                      colors.surface,

                    borderColor:
                      selected
                        ? accentColor
                        : colors.border,
                  },
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
                    size={20}
                    color={
                      accentColor
                    }
                  />
                </View>

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
              </Pressable>
            );
          },
        )}
      </View>

      {canCreate ? (
        <Pressable
          onPress={() =>
            router.push(
              '/community/create' as never,
            )
          }
          style={[
            styles.primaryButton,
            {
              backgroundColor:
                accentColor,
            },
          ]}
        >
          <Ionicons
            name="add-circle-outline"
            size={19}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.primaryButtonText
            }
          >
            Create a Community Project
          </Text>
        </Pressable>
      ) : null}

      {myProjects.length >
      0 ? (
        <View
          style={
            styles.section
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            My Community Projects
          </Text>

          {myProjects.map(
            (
              project,
            ) => (
              <View
                key={
                  project.id
                }
                style={[
                  styles.projectCard,
                  {
                    backgroundColor:
                      colors.surface,

                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryTag,
                    {
                      color:
                        accentColor,
                    },
                  ]}
                >
                  {categoryLabel(
                    project.category,
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
                  {
                    project.title
                  }
                </Text>

                <Text
                  style={[
                    styles.projectMeta,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  {project.organization ||
                    'Community'}
                  {project.location
                    ? ` • ${project.location}`
                    : ''}
                </Text>

                <Text
                  numberOfLines={
                    3
                  }
                  style={[
                    styles.description,
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

                <View
                  style={
                    styles.applicationInfo
                  }
                >
                  <Ionicons
                    name="people-outline"
                    size={15}
                    color={
                      colors.muted
                    }
                  />

                  <Text
                    style={[
                      styles.projectMeta,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {project._count
                      ?.applications ??
                      0}{' '}
                    application(s)
                  </Text>
                </View>

                <View
                  style={
                    styles.projectButtons
                  }
                >
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/community/requests/${project.id}` as never,
                      )
                    }
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor:
                          accentColor,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          accentColor,
                        fontSize:
                          11,
                        fontWeight:
                          '800',
                      }}
                    >
                      Join Requests
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      router.push(
                        `/community/manage/${project.id}` as never,
                      )
                    }
                    style={[
                      styles.smallPrimaryButton,
                      {
                        backgroundColor:
                          accentColor,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.smallPrimaryText
                      }
                    >
                      Manage
                    </Text>
                  </Pressable>
                </View>
              </View>
            ),
          )}
        </View>
      ) : null}

      {myApplications.length >
      0 ? (
        <View
          style={
            styles.section
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            My Applications
          </Text>

          {myApplications.map(
            (
              project,
            ) => (
              <Pressable
                key={
                  project.id
                }
                onPress={() =>
                  openProject(
                    project.id,
                  )
                }
                style={[
                  styles.applicationCard,
                  {
                    backgroundColor:
                      colors.surface,

                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={{
                    flex: 1,
                    gap: 4,
                  }}
                >
                  <Text
                    style={[
                      styles.applicationTitle,
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
                      styles.projectMeta,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {project.organization ||
                      'Community'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        accentColor,
                      fontSize: 10,
                      fontWeight:
                        '900',
                    }}
                  >
                    {statusLabel(
                      project.applicationStatus,
                    )}
                  </Text>
                </View>
              </Pressable>
            ),
          )}
        </View>
      ) : null}

      <View
        style={
          styles.section
        }
      >
        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Featured Opportunities
          </Text>

          <Text
            style={[
              styles.resultCount,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {opportunities.length}{' '}
            result
            {opportunities.length ===
            1
              ? ''
              : 's'}
          </Text>
        </View>

        {opportunities.length ===
        0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={28}
              color={
                accentColor
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
              No opportunities found
            </Text>

            <Text
              style={[
                styles.description,
                {
                  color:
                    colors.muted,
                  textAlign:
                    'center',
                },
              ]}
            >
              Try another search or category.
            </Text>
          </View>
        ) : (
          opportunities.map(
            (
              project,
            ) => (
              <Pressable
                key={
                  project.id
                }
                onPress={() =>
                  openProject(
                    project.id,
                  )
                }
                style={[
                  styles.projectCard,
                  {
                    backgroundColor:
                      colors.surface,
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={
                    styles.projectTopRow
                  }
                >
                  <Text
                    style={[
                      styles.categoryTag,
                      {
                        color:
                          accentColor,
                      },
                    ]}
                  >
                    {categoryLabel(
                      project.category,
                    )}
                  </Text>

                  {project.hasApplied ? (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            colors.surfaceElevated,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            accentColor,
                          fontSize:
                            9,
                          fontWeight:
                            '900',
                        }}
                      >
                        {statusLabel(
                          project.applicationStatus,
                        )}
                      </Text>
                    </View>
                  ) : null}
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
                    size={14}
                    color={
                      colors.muted
                    }
                  />

                  <Text
                    style={[
                      styles.projectMeta,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {project.organization ||
                      'Community'}
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
                      size={14}
                      color={
                        colors.muted
                      }
                    />

                    <Text
                      style={[
                        styles.projectMeta,
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
                  numberOfLines={
                    4
                  }
                  style={[
                    styles.description,
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

                <View
                  style={
                    styles.bottomRow
                  }
                >
                  <Text
                    style={[
                      styles.xpText,
                      {
                        color:
                          accentColor,
                      },
                    ]}
                  >
                    {project.xpReward ??
                      0}{' '}
                    XP
                  </Text>

                  <View
                    style={
                      styles.viewRow
                    }
                  >
                    <Text
                      style={{
                        color:
                          accentColor,
                        fontSize:
                          11,
                        fontWeight:
                          '800',
                      }}
                    >
                      View opportunity
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={
                        accentColor
                      }
                    />
                  </View>
                </View>
              </Pressable>
            ),
          )
        )}
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrap: {
      gap: 14,
    },

    loadingCard: {
      minHeight: 170,
      borderWidth: 1,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    errorBox: {
      minHeight: 46,
      borderWidth: 1,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },

    errorText: {
      flex: 1,
      fontSize: 11,
    },

    searchCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 13,
      gap: 9,
    },

    label: {
      fontSize: 13,
      fontWeight: '800',
    },

    searchRow: {
      flexDirection: 'row',
      gap: 8,
    },

    searchInput: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 12,
      fontSize: 12,
    },

    searchButton: {
      width: 44,
      height: 44,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    clearText: {
      fontSize: 11,
      fontWeight: '800',
    },

    section: {
      gap: 10,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginTop: 4,
    },

    resultCount: {
      fontSize: 10,
      fontWeight: '700',
    },

    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },

    categoryCard: {
      width: '48%',
      minHeight: 105,
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      justifyContent: 'center',
      gap: 7,
    },

    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    categoryText: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
    },

    primaryButton: {
      minHeight: 47,
      borderRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
    },

    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },

    projectCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      gap: 8,
    },

    projectTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    categoryTag: {
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },

    projectTitle: {
      fontSize: 17,
      fontWeight: '800',
    },

    projectMeta: {
      fontSize: 13,
      lineHeight: 20,
    },

    description: {
      fontSize: 13,
      lineHeight: 20,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    applicationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    projectButtons: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 2,
    },

    secondaryButton: {
      flex: 1,
      minHeight: 39,
      borderWidth: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    smallPrimaryButton: {
      flex: 1,
      minHeight: 39,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    smallPrimaryText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },

    applicationCard: {
      minHeight: 68,
      borderWidth: 1,
      borderRadius: 15,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    applicationTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 2,
    },

    xpText: {
      fontSize: 13,
      fontWeight: '800',
    },

    viewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },

    emptyCard: {
      minHeight: 160,
      borderWidth: 1,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: '900',
    },
  });
