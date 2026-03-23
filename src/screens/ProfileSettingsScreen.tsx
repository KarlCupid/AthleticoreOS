import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { Card } from '../components/Card';
import { IconPerson } from '../components/icons';
import { supabase } from '../../lib/supabase';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { EngineReplayLab } from '../components/EngineReplayLab';
import { resetFirstRunGuidance } from '../../lib/api/firstRunGuidanceService';
import { logError } from '../../lib/utils/logger';

interface AthleteProfile {
  biological_sex: string;
  fight_status: string;
  phase: string;
  target_weight: number | null;
  base_weight: number | null;
  cycle_tracking: boolean;
  height_inches: number | null;
  age: number | null;
  activity_level: string | null;
  nutrition_goal: string | null;
  fight_date: string | null;
  first_run_guidance_status: 'pending' | 'completed' | null;
}

export function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeColor, currentLevel } = useReadinessTheme();
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [guidanceStatus, setGuidanceStatus] = useState<'pending' | 'completed'>('pending');
  const [engineReplayVisible, setEngineReplayVisible] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [lastVersionTapAt, setLastVersionTapAt] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    setEmail(session.user.email || '');

    const [profileRes, sessionsRes] = await Promise.all([
      supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single(),
      supabase
        .from('training_sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', session.user.id),
    ]);

    if (profileRes.data) {
      const nextProfile = profileRes.data as AthleteProfile;
      setProfile(nextProfile);
      setGuidanceStatus(nextProfile.first_run_guidance_status === 'completed' ? 'completed' : 'pending');
    }
    setTotalSessions(sessionsRes.count || 0);
  }

  const formatPhase = (phase: string) =>
    phase
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const formatActivityLevel = (level: string | null) => {
    if (!level) return 'Moderate';
    return level
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatNutritionGoal = (goal: string | null) => {
    if (!goal) return 'Maintain';
    return goal.charAt(0).toUpperCase() + goal.slice(1);
  };

  async function updateField(field: string, value: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase
      .from('athlete_profiles')
      .update({ [field]: value })
      .eq('user_id', session.user.id);
    if (error) {
      Alert.alert('Error', 'Failed to update field');
      throw error;
    }
  }

  async function handleReplaySetupGuide() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      await resetFirstRunGuidance(session.user.id);
      setGuidanceStatus('pending');
      setProfile((prev) => (
        prev
          ? { ...prev, first_run_guidance_status: 'pending' }
          : prev
      ));
      Alert.alert('Setup guide reset', 'Your first-run guide will appear again on Dashboard.');
    } catch (error) {
      logError('ProfileSettingsScreen.replaySetupGuide', error);
      Alert.alert('Error', 'Could not reset setup guide right now.');
    }
  }

  function handleVersionPress() {
    const now = Date.now();
    const nextCount = now - lastVersionTapAt < 1500 ? versionTapCount + 1 : 1;

    setVersionTapCount(nextCount);
    setLastVersionTapAt(now);

    if (nextCount >= 5) {
      setVersionTapCount(0);
      setEngineReplayVisible(true);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.normal).springify()} style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: themeColor + '20' }]}>
            <IconPerson size={40} color={themeColor} />
          </View>
          <Text style={styles.name}>Athlete</Text>
          <Text style={styles.email}>{email}</Text>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()} style={styles.statsRow}>
          <View style={styles.statBox}>
            <AnimatedNumber value={totalSessions} style={styles.statValue} />
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: themeColor }]}>{currentLevel}</Text>
            <Text style={styles.statLabel}>Readiness</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {profile?.phase ? formatPhase(profile.phase) : '--'}
            </Text>
            <Text style={styles.statLabel}>Phase</Text>
          </View>
        </Animated.View>

        {/* Athletic Profile */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()}>
            <Card title="Athletic Profile">
              <DetailRow label="Fight Status" value={profile.fight_status.charAt(0).toUpperCase() + profile.fight_status.slice(1)} />
              <DetailRow label="Biological Sex" value={profile.biological_sex.charAt(0).toUpperCase() + profile.biological_sex.slice(1)} />
              <EditableRow
                label="Target Weight"
                value={profile.target_weight ? `${profile.target_weight} lbs` : '--'}
                isEditing={editingField === 'target_weight'}
                editValue={editValue}
                onEdit={() => {
                  setEditingField('target_weight');
                  setEditValue(profile.target_weight?.toString() || '');
                }}
                onChangeText={setEditValue}
                onSave={async () => {
                  const val = editValue ? parseFloat(editValue) : null;
                  await updateField('target_weight', val);
                  setProfile({ ...profile, target_weight: val });
                  setEditingField(null);
                }}
                onCancel={() => setEditingField(null)}
              />
              <EditableRow
                label="Base Weight"
                value={profile.base_weight ? `${profile.base_weight} lbs` : '--'}
                isEditing={editingField === 'base_weight'}
                editValue={editValue}
                onEdit={() => {
                  setEditingField('base_weight');
                  setEditValue(profile.base_weight?.toString() || '');
                }}
                onChangeText={setEditValue}
                onSave={async () => {
                  const val = editValue ? parseFloat(editValue) : null;
                  await updateField('base_weight', val);
                  setProfile({ ...profile, base_weight: val });
                  setEditingField(null);
                }}
                onCancel={() => setEditingField(null)}
              />
              <EditableRow
                label="Fight Date"
                value={profile.fight_date || '--'}
                isEditing={editingField === 'fight_date'}
                editValue={editValue}
                onEdit={() => {
                  setEditingField('fight_date');
                  setEditValue(profile.fight_date || '');
                }}
                onChangeText={setEditValue}
                placeholder="YYYY-MM-DD"
                onSave={async () => {
                  const val = editValue || null;
                  await updateField('fight_date', val);
                  setProfile({ ...profile, fight_date: val });
                  setEditingField(null);
                }}
                onCancel={() => setEditingField(null)}
              />
            </Card>
          </Animated.View>
        )}

        {/* Nutrition Settings */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(200).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
            <Card title="Nutrition Settings">
              <DetailRow label="Activity Level" value={formatActivityLevel(profile.activity_level)} />
              <DetailRow label="Nutrition Goal" value={formatNutritionGoal(profile.nutrition_goal)} />
              {profile.height_inches && (
                <DetailRow
                  label="Height"
                  value={`${Math.floor(profile.height_inches / 12)}'${profile.height_inches % 12}"`}
                />
              )}
              {profile.age && <DetailRow label="Age" value={`${profile.age}`} />}
            </Card>
          </Animated.View>
        )}

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(250).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
          <Card title="Preferences">
            {profile && (
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Cycle Tracking</Text>
                <Switch
                  onValueChange={async (val) => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return;
                    await supabase
                      .from('athlete_profiles')
                      .update({ cycle_tracking: val })
                      .eq('user_id', session.user.id);
                    setProfile({ ...profile, cycle_tracking: val });
                  }}
                  value={profile.cycle_tracking}
                  trackColor={{ true: themeColor, false: COLORS.border }}
                  thumbColor="#FFF"
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.delay(290).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
          <Card title="Setup Guide">
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Status</Text>
              <Text style={styles.settingValue}>{guidanceStatus === 'completed' ? 'Completed' : 'In progress'}</Text>
            </View>
            <AnimatedPressable style={styles.replayGuideButton} onPress={handleReplaySetupGuide}>
              <Text style={styles.replayGuideButtonText}>Replay setup guide</Text>
            </AnimatedPressable>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(ANIMATION.normal).springify()}>
          <AnimatedPressable
            style={styles.signOutButton}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </AnimatedPressable>
        </Animated.View>

        <AnimatedPressable onPress={handleVersionPress}>
          <Text style={styles.version}>v1.0.0</Text>
        </AnimatedPressable>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <EngineReplayLab visible={engineReplayVisible} onClose={() => setEngineReplayVisible(false)} />
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function EditableRow({
  label,
  value,
  isEditing,
  editValue,
  onEdit,
  onChangeText,
  onSave,
  onCancel,
  placeholder,
}: {
  label: string;
  value: string;
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  if (isEditing) {
    return (
      <View style={detailStyles.editRow}>
        <Text style={detailStyles.label}>{label}</Text>
        <View style={detailStyles.editActions}>
          <TextInput
            style={detailStyles.editInput}
            value={editValue}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.text.tertiary}
            autoFocus
            keyboardType={placeholder ? 'default' : 'numeric'}
          />
          <TouchableOpacity onPress={onSave} style={detailStyles.saveBtn}>
            <Text style={detailStyles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <Text style={detailStyles.cancelBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={detailStyles.row} onPress={onEdit}>
      <Text style={detailStyles.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
        <Text style={detailStyles.value}>{value}</Text>
        <Text style={{ fontSize: 11, color: COLORS.text.tertiary }}>✎</Text>
      </View>
    </TouchableOpacity>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  editInput: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    paddingVertical: SPACING.xs,
    minWidth: 70,
    textAlign: 'right',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  saveBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  cancelBtnText: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  label: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
  value: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  content: {
    padding: SPACING.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  email: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  replayGuideButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  replayGuideButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  signOutButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.depleted,
  },
  version: {
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
});

