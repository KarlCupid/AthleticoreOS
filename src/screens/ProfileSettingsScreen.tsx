import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Alert, InteractionManager } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { Card } from '../components/Card';
import { 
  IconPerson, 
  IconScale, 
  IconTarget, 
  IconCalendar, 
  IconBarChart, 
  IconActivity, 
  IconShieldCheck,
  IconTrendUp,
  IconSettings,
  IconClose
} from '../components/icons';
import { supabase } from '../../lib/supabase';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { EngineReplayLab } from '../components/EngineReplayLab';
import { resetFirstRunGuidance } from '../../lib/api/firstRunGuidanceService';
import { logError } from '../../lib/utils/logger';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';

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

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      InteractionManager.runAfterInteractions(() => {
        if (isActive) {
          loadProfile();
        }
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

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
    <ScreenWrapper>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <ScreenHeader
          kicker="Me"
          title="Profile & settings"
          subtitle="Account details, athlete profile, preferences, and setup tools."
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity Hero */}
        <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.normal).springify()}>
          <Card variant="glass" style={styles.heroCard} noPadding>
            <View style={styles.heroContent}>
              <View style={[styles.avatarGlow, { borderColor: themeColor + '80' }]}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <IconPerson size={44} color={themeColor} />
                </View>
              </View>
              <View style={styles.heroIdentity}>
                <Text style={styles.name}>Athlete</Text>
                <Text style={styles.email}>{email}</Text>
                <View style={[styles.badge, { backgroundColor: themeColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: themeColor }]}>{currentLevel?.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Stats Mosaic */}
        <Animated.View entering={FadeInDown.delay(100).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
          <Card variant="glass" style={styles.statsMosaic} noPadding>
            <View style={styles.statBox}>
              <AnimatedNumber value={totalSessions} style={styles.statValue} />
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: themeColor }]}>{currentLevel}</Text>
              <Text style={styles.statLabel}>READINESS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {profile?.phase ? formatPhase(profile.phase) : '--'}
              </Text>
              <Text style={styles.statLabel}>PHASE</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Athletic Profile */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
            <Card variant="glass" title="Athletic Strategy">
              <DetailRow icon={<IconShieldCheck size={18} color={themeColor} />} label="Fight Status" value={profile.fight_status.charAt(0).toUpperCase() + profile.fight_status.slice(1)} />
              <DetailRow icon={<IconPerson size={18} color={themeColor} />} label="Biological Sex" value={profile.biological_sex.charAt(0).toUpperCase() + profile.biological_sex.slice(1)} />
              <DetailRow icon={<IconBarChart size={18} color={themeColor} />} label="Phase" value={profile.phase ? formatPhase(profile.phase) : '--'} />
              <EditableRow
                icon={<IconCalendar size={18} color={themeColor} />}
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

        {/* Physical Profile */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(200).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
            <Card variant="glass" title="Physical Profile">
              <EditableRow
                icon={<IconScale size={18} color={themeColor} />}
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
                icon={<IconTarget size={18} color={themeColor} />}
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
              <DetailRow icon={<IconTrendUp size={18} color={themeColor} />} label="Height" value={profile.height_inches ? `${Math.floor(profile.height_inches / 12)}'${profile.height_inches % 12}"` : '--'} />
              <DetailRow icon={<IconSettings size={18} color={themeColor} />} label="Age" value={profile.age ? `${profile.age}` : '--'} />
            </Card>
          </Animated.View>
        )}

        {/* Nutrition Settings */}
        {profile && (
          <Animated.View entering={FadeInDown.delay(250).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
            <Card variant="glass" title="Nutrition Settings">
              <DetailRow icon={<IconActivity size={18} color={themeColor} />} label="Activity Level" value={formatActivityLevel(profile.activity_level)} />
              <DetailRow icon={<IconTarget size={18} color={themeColor} />} label="Nutrition Goal" value={formatNutritionGoal(profile.nutrition_goal)} />
            </Card>
          </Animated.View>
        )}

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(290).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
          <Card variant="glass" title="Preferences">
            {profile && (
              <View style={styles.settingRow}>
                <View style={styles.settingLabelGroup}>
                  <IconSettings size={18} color={themeColor} />
                  <Text style={styles.settingLabel}>Cycle Tracking</Text>
                </View>
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

        {/* Account & Security */}
        <Animated.View entering={FadeInDown.delay(330).duration(ANIMATION.normal).springify()} style={{ marginTop: SPACING.md }}>
          <Card variant="glass" title="Account & Security">
            <View style={styles.settingRow}>
               <View style={styles.settingLabelGroup}>
                 <IconShieldCheck size={18} color={themeColor} />
                 <Text style={styles.settingLabel}>Status</Text>
               </View>
               <Text style={styles.settingValue}>{guidanceStatus === 'completed' ? 'Elite Athlete' : 'In Training'}</Text>
            </View>
            
            <AnimatedPressable style={styles.replayGuideButton} onPress={handleReplaySetupGuide}>
              <Text style={styles.replayGuideButtonText}>Replay setup guide</Text>
            </AnimatedPressable>

            <View style={styles.cardDivider} />

            <AnimatedPressable
              style={styles.signOutButton}
              onPress={() => supabase.auth.signOut()}
            >
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

      <EngineReplayLab visible={engineReplayVisible} onClose={() => setEngineReplayVisible(false)} />
    </ScreenWrapper>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.labelGroup}>
        {icon}
        <Text style={detailStyles.label}>{label}</Text>
      </View>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

function EditableRow({
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
}: {
  icon?: React.ReactNode;
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
        <View style={detailStyles.labelGroup}>
          {icon}
          <Text style={detailStyles.label}>{label}</Text>
        </View>
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
      <View style={detailStyles.labelGroup}>
        {icon}
        <Text style={detailStyles.label}>{label}</Text>
      </View>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  content: {
    padding: SPACING.lg,
  },
  heroCard: {
    marginBottom: SPACING.md,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  avatarGlow: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIdentity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  email: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.black,
    letterSpacing: 0.5,
  },
  statsMosaic: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.5,
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
    paddingVertical: SPACING.md,
  },
  settingLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
    opacity: 0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  signOutText: {
    fontSize: 15,
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
