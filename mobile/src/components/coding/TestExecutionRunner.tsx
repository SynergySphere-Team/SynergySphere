import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/context/ThemeContext';
import { triggerSuccessHaptic, triggerErrorHaptic } from '@/services/nativePolish';
import type { TestCase, TestExecutionReport } from '@/types/interview';

interface TestExecutionRunnerProps {
  testCases: TestCase[];
  onRunTests: () => Promise<TestExecutionReport>;
  report?: TestExecutionReport | null;
}

export function TestExecutionRunner({
  testCases,
  onRunTests,
  report,
}: TestExecutionRunnerProps) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [isRunning, setIsRunning] = useState(false);
  const [selectedTestIndex, setSelectedTestIndex] = useState(0);
  const [currentReport, setCurrentReport] = useState<TestExecutionReport | null>(report || null);
  const [showStdout, setShowStdout] = useState(false);

  async function handleRun() {
    setIsRunning(true);
    try {
      const rep = await onRunTests();
      setCurrentReport(rep);
      if (rep.passed === rep.total && rep.total > 0) {
        triggerSuccessHaptic();
      } else {
        triggerErrorHaptic();
      }
    } finally {
      setIsRunning(false);
    }
  }

  const activeResults = currentReport?.testResults || testCases;
  const activeTestCase = activeResults[selectedTestIndex] || activeResults[0];

  const allPassed = currentReport && currentReport.passed === currentReport.total && currentReport.total > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {/* Top Header & Run Trigger */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Automated Test Suite</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {currentReport
              ? `${currentReport.passed}/${currentReport.total} test cases passed`
              : `${testCases.length} test cases configured (visible & hidden)`}
          </Text>
        </View>

        <Pressable
          onPress={handleRun}
          disabled={isRunning}
          style={({ pressed }) => [
            styles.runBtn,
            {
              backgroundColor: isRunning ? colors.border : '#059669',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityLabel="Run test suite against implementation"
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="play" size={14} color="#ffffff" />
              <Text style={styles.runBtnText}>Run Tests</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Execution Performance Metrics (If executed) */}
      {currentReport && (
        <View
          style={[
            styles.metricsBanner,
            {
              backgroundColor: allPassed
                ? isLight ? '#ecfdf5' : '#064e3b'
                : isLight ? '#fef2f2' : '#450a0a',
              borderColor: allPassed ? '#059669' : '#dc2626',
            },
          ]}
        >
          <View style={styles.metricsStatusRow}>
            <Ionicons
              name={allPassed ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={allPassed ? '#059669' : '#dc2626'}
            />
            <Text
              style={[
                styles.metricsStatusText,
                { color: allPassed ? '#059669' : '#dc2626' },
              ]}
            >
              {allPassed ? 'ALL TEST CASES PASSED' : 'TEST SUITE FAILED'}
            </Text>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Execution Time</Text>
              <Text style={[styles.kpiValue, { color: colors.text }]}>
                {currentReport.durationMs}ms
              </Text>
            </View>
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Memory Est.</Text>
              <Text style={[styles.kpiValue, { color: colors.text }]}>
                {((currentReport.memoryKb || 1800) / 1024).toFixed(1)} MB
              </Text>
            </View>
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Pass Rate</Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: allPassed ? '#059669' : '#dc2626' },
                ]}
              >
                {Math.round((currentReport.passed / currentReport.total) * 100)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Test Case Tab Bar */}
      <View style={styles.tabBar}>
        {activeResults.map((tc, idx) => {
          const isSelected = idx === selectedTestIndex;
          const hasRun = tc.passed !== undefined;
          return (
            <Pressable
              key={tc.id || idx}
              onPress={() => setSelectedTestIndex(idx)}
              style={[
                styles.tabChip,
                {
                  backgroundColor: isSelected ? colors.surface : isLight ? '#f8fafc' : '#1e293b',
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: !hasRun
                      ? colors.muted
                      : tc.passed
                      ? '#059669'
                      : '#dc2626',
                  },
                ]}
              />
              <Text
                style={[
                  styles.tabChipText,
                  {
                    color: isSelected ? colors.text : colors.muted,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                Case {idx + 1} {tc.isHidden ? '(Hidden)' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active Test Case Detail Inspector */}
      {activeTestCase && (
        <View style={[styles.detailBox, { backgroundColor: isLight ? '#f8fafc' : '#020617', borderColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>
              {activeTestCase.inputDescription}
            </Text>
            {activeTestCase.passed !== undefined && (
              <View
                style={[
                  styles.resultBadge,
                  {
                    backgroundColor: activeTestCase.passed ? '#ecfdf5' : '#fee2e2',
                    borderColor: activeTestCase.passed ? '#059669' : '#dc2626',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultBadgeText,
                    { color: activeTestCase.passed ? '#059669' : '#dc2626' },
                  ]}
                >
                  {activeTestCase.passed ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            )}
          </View>

          {/* Test I/O */}
          <View style={styles.ioRow}>
            <Text style={[styles.ioLabel, { color: colors.muted }]}>INPUT:</Text>
            <Text
              style={[
                styles.ioCode,
                { color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
              ]}
            >
              {activeTestCase.input}
            </Text>
          </View>

          <View style={styles.ioRow}>
            <Text style={[styles.ioLabel, { color: colors.muted }]}>EXPECTED OUTPUT:</Text>
            <Text
              style={[
                styles.ioCode,
                { color: '#059669', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
              ]}
            >
              {activeTestCase.expectedOutput}
            </Text>
          </View>

          {activeTestCase.actualOutput ? (
            <View style={styles.ioRow}>
              <Text style={[styles.ioLabel, { color: colors.muted }]}>ACTUAL OUTPUT:</Text>
              <Text
                style={[
                  styles.ioCode,
                  {
                    color: activeTestCase.passed ? '#059669' : '#dc2626',
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  },
                ]}
              >
                {activeTestCase.actualOutput}
              </Text>
            </View>
          ) : null}

          {/* Output Diff Viewer if failed */}
          {activeTestCase.passed === false && activeTestCase.actualOutput && (
            <View style={[styles.diffBox, { backgroundColor: isLight ? '#fef2f2' : '#311010', borderColor: '#f87171' }]}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626' }}>MISMATCH DIFF:</Text>
              <Text style={{ fontSize: 11, color: '#dc2626', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                - Expected: {activeTestCase.expectedOutput}{'\n'}+ Actual: {activeTestCase.actualOutput}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Stdout Console Accordion */}
      {currentReport?.stdout ? (
        <View style={styles.stdoutWrapper}>
          <Pressable
            onPress={() => setShowStdout((s) => !s)}
            style={styles.stdoutToggle}
          >
            <Ionicons name="terminal-outline" size={14} color={colors.muted} />
            <Text style={[styles.stdoutToggleText, { color: colors.muted }]}>
              Console stdout output {showStdout ? '▲' : '▼'}
            </Text>
          </Pressable>

          {showStdout && (
            <View style={[styles.stdoutBox, { backgroundColor: isLight ? '#0f172a' : '#020617', borderColor: colors.border }]}>
              <Text style={[styles.stdoutText, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                {currentReport.stdout}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  metricsBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  metricsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsStatusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  kpiCol: {
    gap: 2,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabChipText: {
    fontSize: 11,
  },
  detailBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  resultBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  ioRow: {
    gap: 2,
  },
  ioLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ioCode: {
    fontSize: 12,
  },
  diffBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    gap: 4,
    marginTop: 4,
  },
  stdoutWrapper: {
    gap: 4,
  },
  stdoutToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  stdoutToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stdoutBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  stdoutText: {
    fontSize: 11,
    color: '#38bdf8',
    lineHeight: 16,
  },
});
