import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { getActiveBuildPhaseGoal } from '../../lib/api/buildPhaseService';
import { getAndSyncFirstRunGuidanceState, resetFirstRunGuidance } from '../../lib/api/firstRunGuidanceService';
import { getFightCampStatus } from '../../lib/api/fightCampService';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getPlanningSetupStatus, resetTrainingProgrammingForTester } from '../../lib/api/planningSetupService';
import { getLatestWeight } from '../../lib/api/weightService';
import { getWeeklyPlanConfig } from '../../lib/api/weeklyPlanService';
import { getActiveWeightClassPlan } from '../../lib/api/weightClassPlanService';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import { getAthleteProfile, type AthleteProfileRow } from '../../lib/api/athleteContextService';
import {
  buildUnifiedPerformanceViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
import type { BuildPhaseGoalRow, FightCampStatus, WeeklyPlanConfigRow } from '../../lib/engine/types';
import type { GymProfileRow } from '../../lib/engine/types/training';
import type { WeightClassPlanRow } from '../../lib/engine/types/weightClassPlan';
import type { FirstRunGuidanceState } from '../../lib/api/firstRunGuidanceService';
import type { PlanningSetupStatus } from '../../lib/api/planningSetupService';
import { logError } from '../../lib/utils/logger';
import { todayLocalDate } from '../../lib/utils/date';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { EngineReplayLab } from '../components/EngineReplayLab';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import {
  IconActivity,
  IconBarChart,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconPerson,
  IconScale,
  IconSettings,
  IconShieldCheck,
  IconTarget,
  IconTrendUp,
} from '../components/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { ANIMATION, COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

type EditableField = 'base_weight' | 'target_weight' | 'fight_date';

interface MeSnapshot {
  email: string;
  profile: AthleteProfileRow | null;
  totalSessions: number;
  latestWeight: { weight: number; date: string } | null;
  planningStatus: PlanningSetupStatus;
  activeWeightClassPlan: WeightClassPlanRow | null;
  fightCampStatus: FightCampStatus;
  buildGoal: BuildPhaseGoalRow | null;
  defaultGymProfile: GymProfileRow | null;
  weeklyPlanConfig: WeeklyPlanConfigRow | null;
  guidanceState: FirstRunGuidanceState;
  performanceContext: UnifiedPerformanceViewModel;
}

function formatTitleCase(value: string | null | undefined, fallback = '--') {
  if (!value) return fallback;
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatGoalMode(value: 'fight_camp' | 'build_phase' | null | undefined) {
  return value === 'fight_camp' ? 'Fight Camp' : 'Build Phase';
}

function formatCampPhase(value: FightCampStatus['campPhase']) {
  return value ? `${formatTitleCase(value)} Phase` : '--';
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return '--';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWeightLabel(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '--';
  return `${Number(value).toFixed(1)} lbs`;
}

function formatHeightLabel(heightInches: number | null | undefined) {
  if (heightInches == null || !Number.isFinite(heightInches)) return '--';
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  return `${feet}'${inches}"`;
}

function formatAvailabilitySummary(config: WeeklyPlanConfigRow | null) {
  if (!config) return 'Not set up';
  const availableDays = config.availability_windows?.length
    ? config.availability_windows.length
    : config.available_days?.length ?? 0;
  if (!availableDays) return 'Not set up';
  const sessionLabel = config.session_duration_min ? `${config.session_duration_min} min sessions` : 'Session length not set';
  return `${availableDays} day${availableDays === 1 ? '' : 's'} - ${sessionLabel}`;
}

function formatGuidanceStatus(guidanceState: FirstRunGuidanceState) {
  return guidanceState.status === 'completed' ? 'Completed' : 'Pending';
}

function getManagedSourceLabel(activeWeightClassPlan: WeightClassPlanRow | null, fightCampStatus: FightCampStatus) {
  if (activeWeightClassPlan) return 'Managed by active weight-class plan';
  if (fightCampStatus.camp) return 'Managed by fight camp';
  return 'Stored on profile';
}

export function ProfileSettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useReadinessTheme();

  const [snapshot, setSnapshot] = useState<MeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [engineReplayVisible, setEngineReplayVisible] = useState(false);
  const [resettingProgramming, setResettingProgramming] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [lastVersionTapAt, setLastVersionTapAt] = useState(0);
  const hasLoadedRef = useRef(false);

  const loadSnapshot = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSnapshot(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userId = session.user.id;
      const [
        profile,
        sessionsRes,
        latestWeight,
        planningStatus,
        activeWeightClassPlan,
        fightCampStatus,
        buildGoal,
        defaultGymProfile,
        weeklyPlanConfig,
        guidanceState,
        engineState,
      ] = await Promise.all([
        getAthleteProfile(userId),
        supabase.from('training_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        getLatestWeight(userId),
        getPlanningSetupStatus(userId),
        getActiveWeightClassPlan(userId),
        getFightCampStatus(userId),
        getActiveBuildPhaseGoal(userId),
        getDefaultGymProfile(userId),
        getWeeklyPlanConfig(userId),
        getAndSyncFirstRunGuidanceState(userId),
        getDailyEngineState(userId, todayLocalDate()).catch((engineError) => {
          logError('ProfileSettingsScreen.loadSnapshot.dailyEngine', engineError);
          return null;
        }),
      ]);

      setSnapshot({
        email: session.user.email ?? '',
        profile,
        totalSessions: sessionsRes.count ?? 0,
        latestWeight,
        planningStatus,
        activeWeightClassPlan,
        fightCampStatus,
        buildGoal,
        defaultGymProfile,
        weeklyPlanConfig,
        guidanceState,
        performanceContext: buildUnifiedPerformanceViewModel(engineState?.unifiedPerformance),
      });
    } catch (loadError) {
      logError('ProfileSettingsScreen.loadSnapshot', loadError);
      setError('Could not load your profile data right now.');
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const task = InteractionManager.runAfterInteractions(() => {
        if (isActive) void loadSnapshot(hasLoadedRef.current ? 'refresh' : 'initial');
      });

      return () => {
        isActive = false;
        task.cancel();
      };
    }, [loadSnapshot])
  );

  const profile = snapshot?.profile ?? null;
  const latestWeight = snapshot?.latestWeight ?? null;
  const goalMode = snapshot?.planningStatus.goalMode ?? 'build_phase';
  const resolvedFightDate = snapshot?.activeWeightClassPlan?.fight_date
    ?? snapshot?.fightCampStatus.camp?.fightDate
    ?? profile?.fight_date
    ?? null;
  const resolvedTargetWeight = snapshot?.activeWeightClassPlan?.target_weight
    ?? snapshot?.fightCampStatus.camp?.targetWeight
    ?? profile?.target_weight
    ?? null;
  const isFightDateManaged = Boolean(snapshot?.activeWeightClassPlan || snapshot?.fightCampStatus.camp);
  const isTargetWeightManaged = Boolean(snapshot?.activeWeightClassPlan || snapshot?.fightCampStatus.camp);
  const phaseLabel = snapshot?.fightCampStatus.camp
    ? formatCampPhase(snapshot.fightCampStatus.campPhase)
    : formatTitleCase(profile?.phase);
  const weightTileLabel = latestWeight ? 'CURRENT WT' : profile?.base_weight != null ? 'BASE WT' : 'WEIGHT';
  const weightTileValue = latestWeight?.weight ?? profile?.base_weight ?? null;
  const latestWeightNote = latestWeight
    ? `Last check-in ${formatDateLabel(latestWeight.date)}`
    : profile?.base_weight != null
      ? 'No recent weigh-in, using profile baseline'
      : 'Add a weigh-in from Log to personalize training';
  const profileTargetsNote = getManagedSourceLabel(
    snapshot?.activeWeightClassPlan ?? null,
    snapshot?.fightCampStatus ?? { camp: null, campPhase: null, daysOut: null, label: 'Build Phase', weightClassState: 'none' },
  );
  const setupSummary = formatAvailabilitySummary(snapshot?.weeklyPlanConfig ?? null);
  const guideProgress = snapshot?.guidanceState.progress.completedCount ?? 0;
  const guideTotal = snapshot?.guidanceState.progress.totalCount ?? 3;

  async function updateField(field: EditableField | 'cycle_tracking', value: string | number | boolean | null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error: updateError } = await supabase
      .from('athlete_profiles')
      .update({ [field]: value })
      .eq('user_id', session.user.id);

    if (updateError) {
      Alert.alert('Update failed', 'Could not save that change right now.');
      throw updateError;
    }
  }

  async function handleSaveEdit(field: EditableField) {
    const trimmed = editValue.trim();

    try {
      if (field === 'fight_date') {
        if (trimmed.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
          return;
        }
        const nextValue = trimmed.length > 0 ? trimmed : null;
        await updateField(field, nextValue);
        setSnapshot((current) => current && current.profile
          ? { ...current, profile: { ...current.profile, fight_date: nextValue } }
          : current);
      } else {
        const nextValue = trimmed.length > 0 ? Number.parseFloat(trimmed) : null;
        if (trimmed.length > 0 && !Number.isFinite(nextValue)) {
          Alert.alert('Invalid number', 'Enter a valid numeric value.');
          return;
        }
        await updateField(field, nextValue);
        setSnapshot((current) => current && current.profile
          ? { ...current, profile: { ...current.profile, [field]: nextValue } }
          : current);
      }

      setEditingField(null);
      setEditValue('');
    } catch (saveError) {
      logError('ProfileSettingsScreen.handleSaveEdit', saveError, { field });
    }
  }

  async function handleCycleTrackingChange(nextValue: boolean) {
    if (!profile) return;

    try {
      await updateField('cycle_tracking', nextValue);
      setSnapshot((current) => current && current.profile
        ? { ...current, profile: { ...current.profile, cycle_tracking: nextValue } }
        : current);
    } catch (toggleError) {
      logError('ProfileSettingsScreen.handleCycleTrackingChange', toggleError);
    }
  }

  async function handleReplaySetupGuide() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      await resetFirstRunGuidance(session.user.id);
      setSnapshot((current) => current
        ? { ...current, guidanceState: { ...current.guidanceState, status: 'pending', introSeenAt: null } }
        : current);
      Alert.alert('Setup guide restarted', 'The guide will appear again on the Today screen.');
    } catch (resetError) {
      logError('ProfileSettingsScreen.handleReplaySetupGuide', resetError);
      Alert.alert('Error', 'Could not reset the setup guide right now.');
    }
  }

  function handleResetTrainingProgramming() {
    if (!__DEV__) return;

    Alert.alert(
      'Reset training programming?',
      'This clears setup, active plans, generated sessions, recurring training commitments, and engine snapshots for this tester account. Workout, nutrition, check-in, PR, and exercise history stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            setResettingProgramming(true);
            try {
              await resetTrainingProgrammingForTester(session.user.id);
              await loadSnapshot('refresh');
              Alert.alert('Training programming reset', 'Your tester account is ready for a clean planning setup.');
            } catch (resetError) {
              logError('ProfileSettingsScreen.handleResetTrainingProgramming', resetError);
              Alert.alert('Reset failed', 'Could not reset training programming right now.');
            } finally {
              setResettingProgramming(false);
            }
          },
        },
      ],
    );
  }

  function handleVersionPress() {
    if (!__DEV__) {
      return;
    }

    const now = Date.now();
    const nextCount = now - lastVersionTapAt < 1500 ? versionTapCount + 1 : 1;

    setVersionTapCount(nextCount);
    setLastVersionTapAt(now);

    if (nextCount >= 5) {
      setVersionTapCount(0);
      setEngineReplayVisible(true);
    }
  }

  function openWeeklySetup() {
    navigation.getParent()?.navigate('Train', { screen: 'WeeklyPlanSetup' });
  }

  function openGymProfiles() {
    navigation.getParent()?.navigate('Train', { screen: 'GymProfiles' });
  }

  function openWeightClassPlan() {
    navigation.getParent()?.navigate('Fuel', {
      screen: snapshot?.activeWeightClassPlan ? 'WeightClassHome' : 'WeightClassPlanSetup',
    });
  }

  function openCheckIn() {
    navigation.getParent()?.navigate('Today', { screen: 'Log' });
  }

  function openLegalSupport() {
    navigation.navigate('LegalSupport');
  }

  function openDeleteAccount() {
    navigation.navigate('DeleteAccount');
  }

  if (loading && !snapshot) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Connecting your profile, planner, and weight-class data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!snapshot) {
    return (
      <ScreenWrapper>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <ScreenHeader
            kicker="Me"
            title="Profile & settings"
            subtitle="Profile, setup, account."
          />
        </View>
        <View style={styles.emptyState}>
          <Card
            variant="glass"
            backgroundTone="profile"
            backgroundScrimColor="rgba(10, 10, 10, 0.72)"
          >
            <Text style={styles.emptyTitle}>We couldn't load your profile.</Text>
            <Text style={styles.emptyBody}>{error ?? 'Try refreshing this screen in a moment.'}</Text>
            <AnimatedPressable style={styles.primaryButton} onPress={() => void loadSnapshot('initial')}>
              <Text style={styles.primaryButtonText}>Retry</Text>
            </AnimatedPressable>
          </Card>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <ScreenHeader
          kicker="Me"
          title="Profile & settings"
          subtitle="Profile, setup, account."
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSnapshot('refresh')} tintColor={themeColor} />}
      >
        <Animated.View entering={FadeInDown.delay(40).duration(ANIMATION.normal).springify()}>
          <Card
            variant="glass"
            style={styles.heroCard}
            noPadding
            backgroundTone="profile"
            backgroundScrimColor="rgba(10, 10, 10, 0.58)"
          >
            <View style={styles.heroContent}>
              <View style={[styles.avatarGlow, { borderColor: themeColor + '80' }]}>
                <View style={styles.avatar}>
                  <IconPerson size={44} color={themeColor} />
                </View>
              </View>
              <View style={styles.heroIdentity}>
                <Text style={styles.name}>Athlete</Text>
                <Text style={styles.email}>{snapshot.email || 'Signed in'}</Text>
                <View style={styles.heroBadges}>
                  <View style={[styles.badge, { backgroundColor: themeColor + '20' }]}>
                    <Text style={[styles.badgeText, { color: themeColor }]}>{formatGoalMode(goalMode)}</Text>
                  </View>
                  {snapshot.activeWeightClassPlan ? (
                    <View style={[styles.badge, styles.badgeMuted]}>
                      <Text style={styles.badgeMutedText}>Active Class Plan</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroSummary}>
                  {snapshot.activeWeightClassPlan
                    ? `Weight-class target ${formatWeightLabel(snapshot.activeWeightClassPlan.target_weight)} by ${formatDateLabel(snapshot.activeWeightClassPlan.weigh_in_date)}.`
                    : snapshot.fightCampStatus.camp
                      ? snapshot.fightCampStatus.label
                      : snapshot.buildGoal?.goal_statement ?? 'Build phase profile is active.'}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).duration(ANIMATION.normal).springify()}>
          <UnifiedJourneySummaryCard
            summary={snapshot.performanceContext}
            compact
            showBodyMass={Boolean(snapshot.performanceContext.bodyMass)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
          <Card
            variant="glass"
            style={styles.statsMosaic}
            noPadding
            backgroundTone="profile"
            backgroundScrimColor="rgba(10, 10, 10, 0.76)"
          >
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{snapshot.totalSessions}</Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{weightTileValue != null ? Number(weightTileValue).toFixed(1) : '--'}</Text>
              <Text style={styles.statLabel}>{weightTileLabel}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{snapshot.weeklyPlanConfig?.available_days?.length ?? 0}</Text>
              <Text style={styles.statLabel}>PLAN DAYS</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(130).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
          <Card
            variant="glass"
            title="Current program"
            subtitle="Active plan"
            backgroundTone={snapshot.activeWeightClassPlan ? 'bodyMassSupport' : 'camp'}
            backgroundScrimColor="rgba(10, 10, 10, 0.72)"
          >
            <DetailRow icon={<IconTarget size={18} color={themeColor} />} label="Mode" value={formatGoalMode(goalMode)} />
            <DetailRow icon={<IconBarChart size={18} color={themeColor} />} label="Phase" value={phaseLabel} />
            <DetailRow
              icon={<IconCalendar size={18} color={themeColor} />}
              label="Fight Date"
              value={formatDateLabel(resolvedFightDate)}
              note={profileTargetsNote}
            />
            <DetailRow
              icon={<IconScale size={18} color={themeColor} />}
              label="Target Weight"
              value={formatWeightLabel(resolvedTargetWeight)}
              note={profileTargetsNote}
            />
            <DetailRow
              icon={<IconTrendUp size={18} color={themeColor} />}
              label="Weight Context"
              value={formatWeightLabel(latestWeight?.weight ?? profile?.base_weight ?? null)}
              note={latestWeightNote}
              isLast
            />

            <View style={styles.actionRow}>
              <ActionButton label={snapshot.activeWeightClassPlan ? 'Open Class Plan' : 'Evaluate Class'} onPress={openWeightClassPlan} />
              <ActionButton label="Adjust Journey" onPress={openWeeklySetup} variant="secondary" />
              <ActionButton label="Log Check-in" onPress={openCheckIn} variant="secondary" />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(170).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
          <Card
            variant="glass"
            title="Training setup"
            subtitle="Plan and gym"
            backgroundTone="workoutFloor"
            backgroundScrimColor="rgba(10, 10, 10, 0.74)"
          >
            <DetailRow icon={<IconActivity size={18} color={themeColor} />} label="Plan" value={setupSummary} />
            <DetailRow icon={<IconSettings size={18} color={themeColor} />} label="Default Gym" value={snapshot.defaultGymProfile?.name ?? 'Not set'} />
            <DetailRow
              icon={<IconShieldCheck size={18} color={themeColor} />}
              label="Planning Setup"
              value={snapshot.planningStatus.isComplete ? 'Connected' : 'Needs attention'}
              note={snapshot.planningStatus.isComplete ? 'Plan inputs are connected.' : 'Finish setup to personalize scheduling.'}
              isLast
            />

            <View style={styles.actionRow}>
              <ActionButton label="Gym Profiles" onPress={openGymProfiles} />
              <ActionButton label="Adjust Journey" onPress={openWeeklySetup} variant="secondary" />
            </View>
            {__DEV__ ? (
              <AnimatedPressable
                style={styles.resetProgrammingButton}
                onPress={handleResetTrainingProgramming}
                disabled={resettingProgramming}
              >
                {resettingProgramming ? (
                  <ActivityIndicator size="small" color={COLORS.readiness.depleted} />
                ) : null}
                <Text style={styles.resetProgrammingButtonText}>
                  {resettingProgramming ? 'Resetting programming...' : 'Reset Training Programming'}
                </Text>
              </AnimatedPressable>
            ) : null}
          </Card>
        </Animated.View>

        {profile ? (
          <Animated.View entering={FadeInDown.delay(210).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
            <Card
              variant="glass"
              title="Profile inputs"
              subtitle="Editable basics"
              backgroundTone="profile"
              backgroundScrimColor="rgba(10, 10, 10, 0.78)"
            >
              <DetailRow icon={<IconShieldCheck size={18} color={themeColor} />} label="Fight Status" value={formatTitleCase(profile.fight_status)} />
              <DetailRow icon={<IconPerson size={18} color={themeColor} />} label="Biological Sex" value={formatTitleCase(profile.biological_sex)} />
              <EditableRow
                icon={<IconScale size={18} color={themeColor} />}
                label="Base Weight"
                value={formatWeightLabel(profile.base_weight)}
                isEditing={editingField === 'base_weight'}
                editValue={editValue}
                onEdit={() => {
                  setEditingField('base_weight');
                  setEditValue(profile.base_weight?.toString() ?? '');
                }}
                onChangeText={setEditValue}
                onSave={() => void handleSaveEdit('base_weight')}
                onCancel={() => {
                  setEditingField(null);
                  setEditValue('');
                }}
                placeholder="155.0"
              />
              {isTargetWeightManaged ? (
                <DetailRow
                  icon={<IconTarget size={18} color={themeColor} />}
                  label="Target Weight"
                  value={formatWeightLabel(resolvedTargetWeight)}
                  note={profileTargetsNote}
                />
              ) : (
                <EditableRow
                  icon={<IconTarget size={18} color={themeColor} />}
                  label="Target Weight"
                  value={formatWeightLabel(profile.target_weight)}
                  isEditing={editingField === 'target_weight'}
                  editValue={editValue}
                  onEdit={() => {
                    setEditingField('target_weight');
                    setEditValue(profile.target_weight?.toString() ?? '');
                  }}
                  onChangeText={setEditValue}
                  onSave={() => void handleSaveEdit('target_weight')}
                  onCancel={() => {
                    setEditingField(null);
                    setEditValue('');
                  }}
                  placeholder="145.0"
                />
              )}
              {isFightDateManaged ? (
                <DetailRow
                  icon={<IconCalendar size={18} color={themeColor} />}
                  label="Fight Date"
                  value={formatDateLabel(resolvedFightDate)}
                  note={profileTargetsNote}
                />
              ) : (
                <EditableRow
                  icon={<IconCalendar size={18} color={themeColor} />}
                  label="Fight Date"
                  value={formatDateLabel(profile.fight_date)}
                  isEditing={editingField === 'fight_date'}
                  editValue={editValue}
                  onEdit={() => {
                    setEditingField('fight_date');
                    setEditValue(profile.fight_date ?? '');
                  }}
                  onChangeText={setEditValue}
                  onSave={() => void handleSaveEdit('fight_date')}
                  onCancel={() => {
                    setEditingField(null);
                    setEditValue('');
                  }}
                  placeholder="YYYY-MM-DD"
                  keyboardType="default"
                />
              )}
              <DetailRow icon={<IconTrendUp size={18} color={themeColor} />} label="Height" value={formatHeightLabel(profile.height_inches)} />
              <DetailRow icon={<IconSettings size={18} color={themeColor} />} label="Age" value={profile.age != null ? String(profile.age) : '--'} isLast />
            </Card>
          </Animated.View>
        ) : null}

        {profile ? (
          <Animated.View entering={FadeInDown.delay(250).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
            <Card
              variant="glass"
              title="Nutrition & recovery"
              subtitle="Planning inputs"
              backgroundTone="fuelQuiet"
              backgroundScrimColor="rgba(10, 10, 10, 0.76)"
            >
              <DetailRow icon={<IconActivity size={18} color={themeColor} />} label="Activity Level" value={formatTitleCase(profile.activity_level, 'Moderate')} />
              <DetailRow icon={<IconTarget size={18} color={themeColor} />} label="Nutrition Goal" value={formatTitleCase(profile.nutrition_goal, 'Maintain')} />
              <View style={[styles.settingRow, styles.detailRowLast]}>
                <View style={styles.settingLabelGroup}>
                  <IconSettings size={18} color={themeColor} />
                  <Text style={styles.settingLabel}>Cycle Tracking</Text>
                </View>
                <Switch
                  value={Boolean(profile.cycle_tracking)}
                  onValueChange={(nextValue) => void handleCycleTrackingChange(nextValue)}
                  trackColor={{ true: themeColor, false: COLORS.border }}
                  thumbColor="#F5F5F0"
                />
              </View>
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(290).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
          <Card
            variant="glass"
            title="Setup guide"
            subtitle="First wins"
            backgroundTone="planning"
            backgroundScrimColor="rgba(10, 10, 10, 0.74)"
          >
            <DetailRow icon={<IconShieldCheck size={18} color={themeColor} />} label="Guide Status" value={formatGuidanceStatus(snapshot.guidanceState)} />
            <DetailRow
              icon={<IconCheck size={18} color={themeColor} />}
              label="Milestones"
              value={`${guideProgress}/${guideTotal}`}
              note="Check-in, workout, and nutrition logging"
              isLast
            />

            <View style={styles.progressRow}>
              <ProgressPill label="Check-in" complete={snapshot.guidanceState.progress.checkinDone} />
              <ProgressPill label="Workout" complete={snapshot.guidanceState.progress.workoutDone} />
              <ProgressPill label="Nutrition" complete={snapshot.guidanceState.progress.nutritionDone} />
            </View>

            <AnimatedPressable style={styles.replayGuideButton} onPress={() => void handleReplaySetupGuide()}>
              <Text style={styles.replayGuideButtonText}>Restart setup guide</Text>
            </AnimatedPressable>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(330).duration(ANIMATION.normal).springify()} style={styles.sectionSpacing}>
          <Card
            variant="glass"
            title="Account"
            subtitle={snapshot.email || 'Signed in'}
            backgroundTone="profile"
            backgroundScrimColor="rgba(10, 10, 10, 0.78)"
          >
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            <View style={styles.accountActionStack}>
              <AccountLinkButton label="Privacy & support" onPress={openLegalSupport} />
              <AccountLinkButton label="Delete account" onPress={openDeleteAccount} tone="danger" />
            </View>
            <AnimatedPressable style={styles.signOutButton} onPress={() => void supabase.auth.signOut()}>
              <IconClose size={18} color={COLORS.readiness.depleted} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </AnimatedPressable>
          </Card>
        </Animated.View>

        <AnimatedPressable onPress={handleVersionPress}>
          <Text style={styles.version}>v1.0.0</Text>
        </AnimatedPressable>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {__DEV__ ? <EngineReplayLab visible={engineReplayVisible} onClose={() => setEngineReplayVisible(false)} /> : null}
    </ScreenWrapper>
  );
}

function DetailRow(props: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  isLast?: boolean;
}) {
  const { icon, label, value, note, isLast = false } = props;

  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <View style={styles.detailLabelGroup}>
        {icon}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueGroup}>
        <Text style={styles.settingValue}>{value}</Text>
        {note ? <Text style={styles.detailNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

function EditableRow(props: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onChangeText: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
}) {
  const {
    icon,
    label,
    value,
    isEditing,
    editValue,
    onEdit,
    onChangeText,
    onSave,
    onCancel,
    placeholder,
    keyboardType = 'numeric',
  } = props;

  if (isEditing) {
    return (
      <View style={styles.editRow}>
        <View style={styles.detailLabelGroup}>
          {icon}
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <View style={styles.editActions}>
          <TextInput
            style={styles.editInput}
            value={editValue}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.text.tertiary}
            autoFocus
            keyboardType={keyboardType}
          />
          <TouchableOpacity onPress={onSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.detailRow} onPress={onEdit} activeOpacity={0.8}>
      <View style={styles.detailLabelGroup}>
        {icon}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueGroup}>
        <Text style={styles.settingValue}>{value}</Text>
        <Text style={styles.detailNote}>Tap to edit</Text>
      </View>
    </TouchableOpacity>
  );
}

function ActionButton(props: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const { label, onPress, variant = 'primary' } = props;
  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      style={[styles.actionButton, isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary]}
      onPress={onPress}
    >
      <Text style={[styles.actionButtonText, !isPrimary && styles.actionButtonTextSecondary]}>{label}</Text>
      <IconChevronRight size={16} color={isPrimary ? COLORS.text.inverse : COLORS.text.primary} />
    </AnimatedPressable>
  );
}

function ProgressPill(props: { label: string; complete: boolean }) {
  const { label, complete } = props;

  return (
    <View style={[styles.progressPill, complete ? styles.progressPillComplete : styles.progressPillPending]}>
      <Text style={[styles.progressPillText, complete ? styles.progressPillTextComplete : styles.progressPillTextPending]}>
        {label}
      </Text>
    </View>
  );
}

function AccountLinkButton(props: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const { label, onPress, tone = 'default' } = props;
  const danger = tone === 'danger';

  return (
    <AnimatedPressable
      style={[styles.accountLinkButton, danger && styles.accountLinkButtonDanger]}
      onPress={onPress}
    >
      <Text style={[styles.accountLinkText, danger && styles.accountLinkTextDanger]}>{label}</Text>
      <IconChevronRight size={16} color={danger ? COLORS.readiness.depleted : COLORS.text.secondary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  emptyBody: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  sectionSpacing: {
    marginTop: SPACING.md,
  },
  heroCard: {
    marginTop: SPACING.xs,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  avatarGlow: {
    padding: 3,
    borderRadius: RADIUS.full,
    borderWidth: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.58)',
  },
  heroIdentity: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  email: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeMuted: {
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
  },
  badgeMutedText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  heroSummary: {
    marginTop: SPACING.sm,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  statsMosaic: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  statDivider: {
    width: 1,
    marginVertical: SPACING.xs,
    backgroundColor: COLORS.borderLight,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  detailValueGroup: {
    flexShrink: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  detailNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    textAlign: 'right',
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
  settingValue: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    textAlign: 'right',
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  editActions: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  editInput: {
    minWidth: 118,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'right',
  },
  saveButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
  },
  saveButtonText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  cancelButtonText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  actionRow: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.accent,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  actionButtonTextSecondary: {
    color: COLORS.text.primary,
  },
  resetProgrammingButton: {
    marginTop: SPACING.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.error}18`,
    borderWidth: 1,
    borderColor: `${COLORS.error}44`,
  },
  resetProgrammingButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.depleted,
  },
  primaryButton: {
    marginTop: SPACING.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  progressPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  progressPillComplete: {
    backgroundColor: `${COLORS.success}18`,
    borderColor: `${COLORS.success}44`,
  },
  progressPillPending: {
    backgroundColor: COLORS.surfaceSecondary,
    borderColor: COLORS.borderLight,
  },
  progressPillText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
  },
  progressPillTextComplete: {
    color: COLORS.success,
  },
  progressPillTextPending: {
    color: COLORS.text.secondary,
  },
  replayGuideButton: {
    marginTop: SPACING.md,
    minHeight: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentLight,
  },
  replayGuideButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  accountActionStack: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  accountLinkButton: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountLinkButtonDanger: {
    backgroundColor: `${COLORS.error}12`,
    borderColor: `${COLORS.error}36`,
  },
  accountLinkText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  accountLinkTextDanger: {
    color: COLORS.readiness.depleted,
  },
  inlineError: {
    marginBottom: SPACING.md,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.error,
    lineHeight: 20,
  },
  signOutButton: {
    minHeight: 48,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.error}18`,
    borderWidth: 1,
    borderColor: `${COLORS.error}40`,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.depleted,
  },
  version: {
    marginTop: SPACING.lg,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
});
