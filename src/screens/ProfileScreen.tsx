import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { Card } from '../components/Card';
import { IconPerson } from '../components/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
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
    const { currentLevel } = useReadinessTheme();
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
        <ScreenWrapper useSafeArea={true}>
            <View style={styles.header}>
                <ScreenHeader
                    kicker="Me"
                    title="Athlete Profile"
                    subtitle={email}
                />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xxl }]} 
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar & Name */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarGlassRing}>
                        <View style={[styles.avatar, { backgroundColor: COLORS.surface }]}>
                            <IconPerson size={44} color={COLORS.accent} />
                        </View>
                    </View>
                    <Text style={styles.name}>Athlete</Text>
                    <Text style={styles.statusBadge}>{profile?.fight_status ? profile.fight_status.toUpperCase() : 'ACTIVE'}</Text>
                </View>

                {/* Stats Row */}
                <Card
                    style={styles.statsRow}
                    noPadding
                    backgroundTone="profile"
                    backgroundScrimColor="rgba(10, 10, 10, 0.76)"
                >
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalSessions}</Text>
                        <Text style={styles.statLabel}>Sessions</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statValue, { color: COLORS.accent }]}>{currentLevel}</Text>
                        <Text style={styles.statLabel}>Readiness</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{profile?.phase ? formatPhase(profile.phase) : '--'}</Text>
                        <Text style={styles.statLabel}>Phase</Text>
                    </View>
                </Card>

                {/* Details */}
                {profile && (
                    <Card
                        variant="glass"
                        style={{ marginBottom: SPACING.lg }}
                        backgroundTone="profile"
                        backgroundScrimColor="rgba(10, 10, 10, 0.78)"
                    >
                        <Text style={styles.sectionTitle}>Training Details</Text>
                        <DetailRow label="Fight Status" value={profile.fight_status.charAt(0).toUpperCase() + profile.fight_status.slice(1)} />
                        <DetailRow label="Biological Sex" value={profile.biological_sex.charAt(0).toUpperCase() + profile.biological_sex.slice(1)} />

                        {activeCut ? (
                            <DetailRow label="Target Weight" value={`${activeCut.target_weight} lbs (Active Cut)`} />
                        ) : profile.target_weight ? (
                            <DetailRow label="Target Weight" value={`${profile.target_weight} lbs`} />
                        ) : null}

                        {activeCut ? (
                            <DetailRow label="Fight Date" value={`${new Date(activeCut.weigh_in_date).toLocaleDateString()} (Active Cut)`} />
                        ) : profile.fight_date ? (
                            <DetailRow label="Fight Date" value={new Date(profile.fight_date).toLocaleDateString()} />
                        ) : null}

                        {profile.base_weight && <DetailRow label="Base Weight" value={`${profile.base_weight} lbs`} />}
                        <DetailRow label="Cycle Tracking" value={profile.cycle_tracking ? 'Enabled' : 'Disabled'} isLast />
                    </Card>
                )}
            </ScrollView>
        </ScreenWrapper>
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
        paddingVertical: SPACING.md,
    },
    border: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    label: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    value: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
});

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    content: {
        padding: SPACING.md,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.md,
    },
    avatarGlassRing: {
        padding: 4,
        borderRadius: 50,
        backgroundColor: 'rgba(10, 10, 10, 0.58)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.24)',
        marginBottom: SPACING.md,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 24,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: 0,
    },
    statusBadge: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        backgroundColor: COLORS.accent + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
        marginTop: SPACING.xs,
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.borderLight,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
});
