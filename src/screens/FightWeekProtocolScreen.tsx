import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useWeightCutData } from '../hooks/useWeightCutData';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { IconChevronLeft, IconDroplets, IconAlertTriangle, IconCheckCircle } from '../components/icons';
import { UrineColorPicker } from '../components/UrineColorPicker';
import { CognitiveTestCard } from '../components/CognitiveTestCard';
import { CutPhase } from '../../lib/engine/types';

const DAY_LABELS: Record<number, string> = {
  7: 'Day 7', 6: 'Day 6', 5: 'Day 5', 4: 'Day 4',
  3: 'Day 3', 2: 'Day 2', 1: 'Day 1', 0: 'Weigh-In',
};

const DAY_PHASE: Record<number, string> = {
  7: 'Water Loading', 6: 'Water Loading', 5: 'Water Loading', 4: 'Water Loading',
  3: 'Water Cut', 2: 'Water Cut', 1: 'Water Cut', 0: 'Weigh-In Day',
};

const PHASE_COLORS: Record<number, string[]> = {
  7: ['#06B6D4', '#0891B2'], 6: ['#06B6D4', '#0891B2'],
  5: ['#06B6D4', '#0891B2'], 4: ['#06B6D4', '#0891B2'],
  3: ['#F59E0B', '#D97706'], 2: ['#F59E0B', '#D97706'],
  1: ['#EF4444', '#DC2626'], 0: ['#166534', '#6D28D9'],
};

export function FightWeekProtocolScreen() {
  const nav = useNavigation();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(7);
  const [showUrine, setShowUrine] = useState(false);
  const [showCognitive, setShowCognitive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { activePlan, todayProtocol, loading, logSafetyCheck } = useWeightCutData(userId);

  useEffect(() => {
    if (todayProtocol?.days_to_weigh_in !== undefined) {
      setSelectedDay(Math.min(7, Math.max(0, todayProtocol.days_to_weigh_in)));
    }
  }, [todayProtocol]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>;
  }

  if (!activePlan) {
    return <View style={styles.center}><Text style={styles.emptyText}>No active cut plan.</Text></View>;
  }

  const isToday = todayProtocol?.days_to_weigh_in === selectedDay;
  const protocol = isToday ? todayProtocol : null;
  const phaseColors = (PHASE_COLORS[selectedDay] ?? ['#16A34A', '#15803D']) as [string, string];

  const dayDots = Array.from({ length: 8 }, (_, i) => 7 - i);  // 7 down to 0

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={phaseColors} style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <IconChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fight Week Protocol</Text>
        <Text style={styles.headerSub}>{activePlan.weight_class_name ?? 'Weight Cut'}</Text>
      </LinearGradient>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}
      >
        {dayDots.map(d => (
          <TouchableOpacity
            key={d}
            style={[
              styles.dayTab,
              selectedDay === d && { backgroundColor: phaseColors[0] },
              d === (todayProtocol?.days_to_weigh_in ?? -1) && styles.dayTabToday,
            ]}
            onPress={() => setSelectedDay(d)}
          >
            <Text style={[styles.dayTabLabel, selectedDay === d && { color: '#fff' }]}>
              {DAY_LABELS[d]}
            </Text>
            <Text style={[styles.dayTabPhase, selectedDay === d && { color: 'rgba(255,255,255,0.8)' }]}>
              {DAY_PHASE[d]}
            </Text>
            {d === (todayProtocol?.days_to_weigh_in ?? -1) && (
              <View style={[styles.todayDot, { backgroundColor: phaseColors[0] }]} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}>

        {/* Day header */}
        <View style={[styles.dayCard, { borderLeftColor: phaseColors[0] }]}>
          <Text style={styles.dayCardTitle}>{DAY_LABELS[selectedDay]} â€” {DAY_PHASE[selectedDay]}</Text>
          {isToday && <Text style={styles.todayBadge}>TODAY</Text>}
        </View>

        {/* Protocol from today's computed data (show only for today) */}
        {isToday && protocol ? (
          <>
            {/* Water */}
            <ProtocolSection
              icon={<IconDroplets size={18} color="#06B6D4" />}
              title="Hydration"
              color="#06B6D4"
              items={[
                `Target: ${protocol.water_target_oz} oz (${Math.round(protocol.water_target_oz / 33.8 * 10) / 10}L)`,
                protocol.sodium_instruction ?? '',
                protocol.fiber_instruction ?? '',
              ].filter(Boolean)}
            />

            {/* Nutrition */}
            <ProtocolSection
              icon={null}
              title="Nutrition Targets"
              color={COLORS.chart.protein}
              items={[
                `${protocol.prescribed_calories} calories`,
                `${protocol.prescribed_protein}g protein  |  ${protocol.prescribed_carbs}g carbs  |  ${protocol.prescribed_fat}g fat`,
              ]}
            />

            {/* Training */}
            <ProtocolSection
              icon={null}
              title="Training"
              color={COLORS.chart.fitness}
              items={[
                protocol.training_recommendation ?? 'No specific recommendation',
                protocol.training_intensity_cap !== null ? `Max RPE: ${protocol.training_intensity_cap}/10` : '',
              ].filter(Boolean)}
            />

            {/* Daily brief */}
            {protocol.morning_protocol && (
              <View style={styles.briefCard}>
                <Text style={styles.briefTitle}>Morning</Text>
                <Text style={styles.briefText}>{protocol.morning_protocol}</Text>
              </View>
            )}
            {protocol.afternoon_protocol && (
              <View style={styles.briefCard}>
                <Text style={styles.briefTitle}>Afternoon</Text>
                <Text style={styles.briefText}>{protocol.afternoon_protocol}</Text>
              </View>
            )}
            {protocol.evening_protocol && (
              <View style={styles.briefCard}>
                <Text style={styles.briefTitle}>Evening</Text>
                <Text style={styles.briefText}>{protocol.evening_protocol}</Text>
              </View>
            )}

            {/* Safety vitals (fight week) */}
            {(selectedDay <= 4) && (
              <>
                <TouchableOpacity
                  style={styles.vitalButton}
                  onPress={() => setShowUrine(!showUrine)}
                >
                  <Text style={styles.vitalButtonText}>Log Urine Color Check</Text>
                </TouchableOpacity>
                {showUrine && (
                  <UrineColorPicker onSelect={async (color) => {
                    await logSafetyCheck({ urineColor: color });
                    setShowUrine(false);
                  }} />
                )}

                <TouchableOpacity
                  style={[styles.vitalButton, { backgroundColor: '#DCFCE7' }]}
                  onPress={() => setShowCognitive(!showCognitive)}
                >
                  <Text style={[styles.vitalButtonText, { color: '#16A34A' }]}>Reaction Time Test</Text>
                </TouchableOpacity>
                {showCognitive && (
                  <CognitiveTestCard onResult={async (ms) => {
                    await logSafetyCheck({ cognitiveScore: ms });
                    setShowCognitive(false);
                  }} baseline={activePlan.baseline_cognitive_score} />
                )}
              </>
            )}

          </>
        ) : (
          // Static info for non-today days
          <StaticDayProtocol day={selectedDay} />
        )}

        {/* Safety flags */}
        {isToday && (protocol?.safety_flags?.length ?? 0) > 0 && (
          <View style={styles.flagsContainer}>
            <Text style={styles.flagsTitle}>Safety Flags</Text>
            {(protocol?.safety_flags ?? []).map((f: any, i: number) => (
              <View key={i} style={[styles.flagCard, { borderLeftColor: FLAG_COLORS[f.severity] }]}>
                <Text style={styles.flagTitle}>{f.title}</Text>
                <Text style={styles.flagMessage}>{f.message}</Text>
                <Text style={styles.flagRec}>{f.recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function ProtocolSection({ icon, title, color, items }: { icon: any; title: string; color: string; items: string[] }) {
  return (
    <View style={[styles.sectionCard, { borderLeftColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm }}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <Text key={i} style={styles.sectionItem}>â€¢ {item}</Text>
      ))}
    </View>
  );
}

function StaticDayProtocol({ day }: { day: number }) {
  const content = STATIC_DAY_CONTENT[day];
  if (!content) return null;
  return (
    <>
      <ProtocolSection icon={<IconDroplets size={18} color="#06B6D4" />} title="Hydration" color="#06B6D4" items={[content.water]} />
      <ProtocolSection icon={null} title="Sodium" color={COLORS.chart.accent} items={[content.sodium]} />
      <ProtocolSection icon={null} title="Food" color={COLORS.chart.protein} items={[content.food]} />
      <ProtocolSection icon={null} title="Training" color={COLORS.chart.fitness} items={[content.training]} />
    </>
  );
}

const STATIC_DAY_CONTENT: Record<number, { water: string; sodium: string; food: string; training: string }> = {
  7: { water: '~2Ã— normal (100â€“130 oz). SUPERHYDRATION begins.', sodium: 'Normal to slightly elevated.', food: 'Maintenance calories. Clean eating.', training: 'Normal to light. No sparring.' },
  6: { water: '~2Ã— normal (100â€“130 oz). Keep loading.', sodium: 'Normal.', food: 'Maintenance calories. Start reducing fiber slightly.', training: 'Light. Shadow boxing and pad work only.' },
  5: { water: '~1.5Ã— normal (80â€“100 oz).', sodium: 'Normal. Slight reduction starting.', food: '-5% calories. Fiber under 15g.', training: 'Shadow boxing only. 30 min max.' },
  4: { water: '~1.5Ã— normal (80â€“100 oz). Final big water day.', sodium: 'Normal.', food: '-10% calories. Low fiber.', training: 'Stretching and shadow only. No heavy work.' },
  3: { water: '64 oz maximum. Restriction begins.', sodium: 'Minimal â€” under 500mg total.', food: '~800 cal. White rice, egg whites, grilled chicken only.', training: 'Active recovery â€” light stretching. No cardio.' },
  2: { water: '32 oz maximum. Sip throughout day.', sodium: 'Zero added sodium.', food: '~600 cal. Tiny meals. Zero fiber.', training: 'Rest. Conserve energy.' },
  1: { water: '16 oz (sips only). Near-zero restriction.', sodium: 'Zero.', food: '~400 cal. Absolutely minimal.', training: 'Rest completely.' },
  0: { water: 'Sips only until weigh-in.', sodium: 'Zero until after weigh-in.', food: 'Nothing until after weigh-in. Then see Rehydration Protocol.', training: 'Rest.' },
};

const FLAG_COLORS: Record<string, string> = { danger: COLORS.error, warning: COLORS.warning, info: COLORS.accent };

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  emptyText: { fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: 4,
  },
  backBtn: { marginBottom: SPACING.sm },
  headerTitle: { fontSize: 24, fontFamily: FONT_FAMILY.black, color: '#fff' },
  headerSub: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: 'rgba(255,255,255,0.8)' },
  daySelector: { maxHeight: 80 },
  dayTab: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    alignItems: 'center', minWidth: 80,
    ...SHADOWS.sm,
  },
  dayTabToday: { borderWidth: 2, borderColor: COLORS.accent },
  dayTabLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayTabPhase: { fontSize: 10, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 2, textAlign: 'center' },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  dayCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderLeftWidth: 4, ...SHADOWS.sm,
  },
  dayCardTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  todayBadge: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent, letterSpacing: 1, backgroundColor: COLORS.accentLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  sectionCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderLeftWidth: 3, ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  sectionItem: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 22, marginTop: 2 },
  briefCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md },
  briefTitle: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  briefText: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary, lineHeight: 22 },
  vitalButton: {
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.readiness.prime,
  },
  vitalButtonText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.prime },
  flagsContainer: { gap: SPACING.sm },
  flagsTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  flagCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md,
    borderLeftWidth: 3, gap: 4, ...SHADOWS.sm,
  },
  flagTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  flagMessage: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20 },
  flagRec: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent, marginTop: 4 },
});

