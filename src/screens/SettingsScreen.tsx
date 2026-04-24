import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { Card } from '../components/Card';
import { IconChevronRight, IconPerson } from '../components/icons';
import { supabase } from '../../lib/supabase';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';

interface AthleteProfile {
    biological_sex: string;
    fight_status: string;
    phase: string;
    target_weight: number | null;
    base_weight: number | null;
    cycle_tracking: boolean;
}

export function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { themeColor } = useReadinessTheme();
    const [email, setEmail] = useState('');
    const [profile, setProfile] = useState<AthleteProfile | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        setEmail(session.user.email || '');

        const { data } = await supabase
            .from('athlete_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (data) setProfile(data);
    }

    const formatPhase = (phase: string) => {
        return phase.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Card */}
                <Card>
                    <View style={styles.profileRow}>
                        <View style={[styles.avatar, { backgroundColor: themeColor + '20' }]}>
                            <IconPerson size={28} color={themeColor} />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>Athlete</Text>
                            <Text style={styles.profileEmail}>{email}</Text>
                        </View>
                        <IconChevronRight size={20} color={COLORS.text.tertiary} />
                    </View>
                </Card>

                {/* Athletic Profile Card */}
                {profile && (
                    <View style={{ marginTop: SPACING.md }}>
                        <Card title="Athletic Profile">
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Phase</Text>
                                <Text style={styles.settingValue}>{formatPhase(profile.phase)}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Status</Text>
                                <Text style={styles.settingValue}>
                                    {profile.fight_status.charAt(0).toUpperCase() + profile.fight_status.slice(1)}
                                </Text>
                            </View>
                            {profile.target_weight && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.settingRow}>
                                        <Text style={styles.settingLabel}>Target Weight</Text>
                                        <Text style={styles.settingValue}>{profile.target_weight} lbs</Text>
                                    </View>
                                </>
                            )}
                            <View style={styles.divider} />
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Biological Sex</Text>
                                <Text style={styles.settingValue}>
                                    {profile.biological_sex.charAt(0).toUpperCase() + profile.biological_sex.slice(1)}
                                </Text>
                            </View>
                        </Card>
                    </View>
                )}

                {/* Preferences */}
                <View style={{ marginTop: SPACING.md }}>
                    <Card title="Preferences">
                        {profile && (
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Cycle Tracking</Text>
                                <Switch
                                    value={profile.cycle_tracking}
                                    trackColor={{ true: themeColor, false: COLORS.border }}
                                    thumbColor="#FFF"
                                />
                            </View>
                        )}
                    </Card>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={() => supabase.auth.signOut()}
                >
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>v1.0.0</Text>
                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
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
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 17,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    profileEmail: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
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
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.borderLight,
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
