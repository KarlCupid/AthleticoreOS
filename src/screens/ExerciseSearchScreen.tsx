import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { searchExercises } from '../../lib/api/scService';
import { ExerciseLibraryRow, ExerciseType, MuscleGroup } from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';
import { IconChevronLeft, IconPlus } from '../components/icons';
import type { TrainStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<TrainStackParamList>;

const TYPE_FILTERS: { value: ExerciseType; label: string }[] = [
    { value: 'heavy_lift', label: 'Lifts' },
    { value: 'power', label: 'Power' },
    { value: 'sport_specific', label: 'Boxing' },
    { value: 'conditioning', label: 'Conditioning' },
    { value: 'mobility', label: 'Mobility' },
    { value: 'active_recovery', label: 'Recovery' },
];

const MUSCLE_FILTERS: { value: MuscleGroup; label: string }[] = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'quads', label: 'Quads' },
    { value: 'hamstrings', label: 'Hamstrings' },
    { value: 'glutes', label: 'Glutes' },
    { value: 'arms', label: 'Arms' },
    { value: 'core', label: 'Core' },
    { value: 'full_body', label: 'Full Body' },
];

export function ExerciseSearchScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const { themeColor } = useReadinessTheme();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ExerciseLibraryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [typeFilter, setTypeFilter] = useState<ExerciseType | null>(null);
    const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);

    // Load all exercises on mount
    useEffect(() => {
        doSearch();
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => doSearch(), 300);
        return () => clearTimeout(timer);
    }, [query, typeFilter, muscleFilter]);

    const doSearch = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (typeFilter) filters.type = typeFilter;
            if (muscleFilter) filters.muscle_group = muscleFilter;
            const data = await searchExercises(query, filters, 50);
            setResults(data);
        } catch (e) {
            logError('ExerciseSearchScreen.search', e, { query });
        }
        setLoading(false);
    };

    const renderItem = ({ item, index }: { item: ExerciseLibraryRow; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 30).duration(200).springify()}>
            <AnimatedPressable
                style={styles.exerciseItem}
                onPress={() => navigation.navigate('ExerciseDetail', { exercise: item })}
            >
                <View style={styles.exerciseLeft}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <View style={styles.tagRow}>
                        <View style={[styles.tag, { backgroundColor: COLORS.borderLight }]}>
                            <Text style={styles.tagText}>{item.type.replace(/_/g, ' ')}</Text>
                        </View>
                        <View style={[styles.tag, { backgroundColor: COLORS.borderLight }]}>
                            <Text style={styles.tagText}>{item.muscle_group.replace(/_/g, ' ')}</Text>
                        </View>
                        {item.equipment !== 'bodyweight' && (
                            <View style={[styles.tag, { backgroundColor: COLORS.borderLight }]}>
                                <Text style={styles.tagText}>{item.equipment.replace(/_/g, ' ')}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.cnsIndicator}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.cnsDot,
                                {
                                    backgroundColor: i < Math.ceil(item.cns_load / 2)
                                        ? COLORS.readiness.depleted
                                        : COLORS.borderLight
                                },
                            ]}
                        />
                    ))}
                </View>
            </AnimatedPressable>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <IconChevronLeft size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Exercise Library</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CustomExercise')}
                    style={styles.addButton}
                >
                    <IconPlus size={20} color={themeColor} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[
                        styles.searchInput,
                        searchFocused && { borderColor: COLORS.accent, ...SHADOWS.sm }
                    ]}
                    placeholder="Search exercises..."
                    placeholderTextColor={COLORS.text.tertiary}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                />
            </View>

            {/* Type Filters */}
            <FlatList
                data={TYPE_FILTERS}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            typeFilter === item.value && { backgroundColor: themeColor },
                        ]}
                        onPress={() => setTypeFilter(typeFilter === item.value ? null : item.value)}
                    >
                        <Text style={[
                            styles.filterChipText,
                            typeFilter === item.value && { color: '#F5F5F0' },
                        ]}>{item.label}</Text>
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.value}
            />

            {/* Muscle Filters */}
            <FlatList
                data={MUSCLE_FILTERS}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.filterRow, { marginTop: SPACING.xs }]}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            muscleFilter === item.value && { backgroundColor: themeColor },
                        ]}
                        onPress={() => setMuscleFilter(muscleFilter === item.value ? null : item.value)}
                    >
                        <Text style={[
                            styles.filterChipText,
                            muscleFilter === item.value && { color: '#F5F5F0' },
                        ]}>{item.label}</Text>
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.value}
            />

            {/* Results */}
            {loading ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <SkeletonLoader
                            key={i}
                            width="100%"
                            height={76}
                            shape="rect"
                            style={{ marginBottom: SPACING.sm, borderRadius: RADIUS.lg }}
                        />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No exercises found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    backButton: { padding: SPACING.sm, marginRight: SPACING.sm },
    title: {
        flex: 1,
        fontSize: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    addButton: { padding: SPACING.sm },
    searchContainer: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    searchInput: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterRow: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.xs,
        paddingVertical: SPACING.xs,
    },
    filterChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 2,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterChipText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    listContent: {
        padding: SPACING.lg,
        paddingTop: SPACING.md,
    },
    exerciseItem: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.card,
    },
    exerciseLeft: { flex: 1 },
    exerciseName: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: SPACING.xs,
    },
    tag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'capitalize',
    },
    cnsIndicator: {
        flexDirection: 'row',
        gap: 3,
        marginLeft: SPACING.sm,
    },
    cnsDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
});
