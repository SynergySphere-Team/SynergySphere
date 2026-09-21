import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen, Loading, Notice } from '@/components/Screen';
import { Button, Card, Heading } from '@/components/ui';
import { api } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';

type ProjectDetails = {
  id: string;
  title: string;
  category: string;
  location: string | null;
  organization: string;
  description: string;
  requirements: string | null;
  xpReward: number;

  applications: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED';
    userId: string;
    createdAt: string;
  }[];
};

export default function OpportunityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();

  const [project, setProject] =
    useState<ProjectDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLight = theme === 'light';

  const accentColor = isLight
    ? '#1e6827'
    : colors.primary;

  useEffect(() => {
    async function loadProject() {
      if (!id) {
        setError('Project ID was not provided.');
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
    }

    loadProject();
  }, [id]);

  async function applyToProject() {
    if (!project) {
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
        'Your request has been submitted successfully.'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not submit your request.'
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
        <Notice>
          {error || 'Project not found.'}
        </Notice>

        <Button
          title="Back to Community"
          secondary
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* BACK BUTTON */}
      <Button
        title="← Back to Community"
        secondary
        onPress={() => router.back()}
      />

      {/* PAGE HEADING */}
      <Heading subtitle="Learn more before requesting to participate.">
        Opportunity Details
      </Heading>

      {error ? (
        <Notice>{error}</Notice>
      ) : null}

      {success ? (
        <Card>
          <View style={styles.successRow}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={accentColor}
            />

            <Text
              style={[
                styles.successText,
                { color: accentColor },
              ]}
            >
              {success}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* MAIN OPPORTUNITY CARD */}
      <Card>
        <View style={styles.categoryRow}>
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
              color={accentColor}
            />

            <Text
              style={[
                styles.categoryText,
                { color: accentColor },
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
              { color: accentColor },
            ]}
          >
            {project.xpReward} XP
          </Text>
        </View>

        <Text
          style={[
            styles.projectTitle,
            { color: colors.text },
          ]}
        >
          {project.title}
        </Text>

        <View style={styles.infoRow}>
          <Ionicons
            name="business-outline"
            size={17}
            color={colors.muted}
          />

          <Text
            style={[
              styles.infoText,
              { color: colors.muted },
            ]}
          >
            {project.organization}
          </Text>
        </View>

        {project.location ? (
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={17}
              color={colors.muted}
            />

            <Text
              style={[
                styles.infoText,
                { color: colors.muted },
              ]}
            >
              {project.location}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* OVERVIEW */}
      <Card>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Overview
        </Text>

        <Text
          style={[
            styles.description,
            { color: colors.muted },
          ]}
        >
          {project.description}
        </Text>
      </Card>

      {/* REQUIREMENTS */}
      <Card>
        <View style={styles.sectionHeadingRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={accentColor}
          />

          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            Requirements
          </Text>
        </View>

        <Text
          style={[
            styles.description,
            { color: colors.muted },
          ]}
        >
          {project.requirements?.trim()
            ? project.requirements
            : 'No specific requirements have been provided for this opportunity.'}
        </Text>
      </Card>

      {/* COMMUNITY IMPACT */}
      <Card>
        <View style={styles.sectionHeadingRow}>
          <Ionicons
            name="people-outline"
            size={20}
            color={accentColor}
          />

          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            Community Opportunity
          </Text>
        </View>

        <Text
          style={[
            styles.description,
            { color: colors.muted },
          ]}
        >
          Participate in this project to gain
          practical experience while contributing
          to a community-focused initiative.
        </Text>
      </Card>

      {/* APPLY */}
      {!success ? (
        <Button
          title={
            applying
              ? 'Submitting request...'
              : 'Apply / Join Project'
          }
          onPress={applyToProject}
          disabled={applying}
        />
      ) : (
        <Button
          title="Back to Community"
          secondary
          onPress={() => router.back()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    lineHeight: 22,
    marginTop: 8,
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
});