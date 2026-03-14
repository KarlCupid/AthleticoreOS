import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { Card } from '../components/Card';
import { IconPerson } from '../components/icons';
import { supabase } from '../../lib/supabase';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';

interface AthleteProfile {
    biological_sex: string;
    fight_status: string;
    phase: string;
    target_weight: number | null;
    base_weight: number | null;
    cycle_tracking: boolean;
    fight_date: string | null;
}

interface ActiveCutInfo {
    weigh_in_date: string;
    target_weight: number;
}

export function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { themeColor, currentLevel } = useReadinessTheme();
    const [email, setEmail] = useState('');
    const [profile, setProfile] = useState<AthleteProfile | null>(null);
    const [activeCut, setActiveCut] = useState<ActiveCutInfo | null>(null);
    const [totalSessions, setTotalSessions] = useState(0);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        setEmail(session.user.email || '');

        const [profileRes, sessionsRes, cutRes] = await Promise.all([
            supabase.from('athlete_profiles').select('*').eq('user_id', session.user.id).single(),
            supabase.from('training_sessions').select('id', { count: 'exact' }).eq('user_id', session.user.id),
            supabase.from('weight_cut_plans').select('weigh_in_date, target_weight').eq('user_id', session.user.id).eq('status', 'active').maybeSingle(),
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        if (cutRes.data) setActiveCut(cutRes.data);
        setTotalSessions(sessionsRes.count || 0);
    }

    const formatPhase = (phase: string) =>
        phase.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar & Name */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatar, { backgroundColor: themeColor + '20' }]}>
                        <IconPerson size={40} color={themeColor} />
                    </View>
                    <Text style={styles.name}>Athlete</Text>
                    <Text style={styles.email}>{email}</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalSessions}</Text>
                        <Text style={styles.statLabel}>Sessions</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: themeColor }]}>{currentLevel}</Text>
                        <Text style={styles.statLabel}>Readiness</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{profile?.phase ? formatPhase(profile.phase) : '--'}</Text>
                        <Text style={styles.statLabel}>Phase</Text>
                    </View>
                </View>

                {/* Details */}
                {profile && (
                    <Card title="Details">
                        <DetailRow label="Fight Status" value={profile.fight_status.charAt(0).toUpperCase() + profile.fight_status.slice(1)} />
                        <DetailRow label="Biological Sex" value={profile.biological_sex.charAt(0).toUpperCase() + profile.biological_sex.slice(1)} />

                        {/* Target Weight: Show Cut target with a tag if active, otherwise standard profile target */}
                        {activeCut ? (
                            <DetailRow label="Target Weight" value={`${activeCut.target_weight} lbs (Active Cut)`} />
                        ) : profile.target_weight ? (
                            <DetailRow label="Target Weight" value={`${profile.target_weight} lbs`} />
                        ) : null}

                        {/* Fight Date: Show Weigh-in date with a tag if active, otherwise standard profile fight date */}
                        {activeCut ? (
                            <DetailRow label="Fight Date" value={`${new Date(activeCut.weigh_in_date).toLocaleDateString()} (Active Cut)`} />
                        ) : profile.fight_date ? (
                            <DetailRow label="Fight Date" value={new Date(profile.fight_date).toLocaleDateString()} />
                        ) : null}

                        {profile.base_weight && <DetailRow label="Base Weight" value={`${profile.base_weight} lbs`} />}
                        <DetailRow label="Cycle Tracking" value={profile.cycle_tracking ? 'Enabled' : 'Disabled'} isLast />
                    </Card>
                )}

                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
        </View>
    );
}

function DetailRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
    return (
        <View style={[detailStyles.row, !isLast && detailStyles.border]}>
            <Text style={detailStyles.label}>{label}</Text>
            <Text style={detailStyles.value}>{value}</Text>
        </View>
    );
}

const detailStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
    },
    border: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
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
});
