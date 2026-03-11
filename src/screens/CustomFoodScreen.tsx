import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { IconChevronLeft } from '../components/icons';
import { createCustomFood } from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';

const STAGGER_DELAY = 60;

export function CustomFoodScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingLabel, setServingLabel] = useState('100g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isSupplement, setIsSupplement] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && calories.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'Not signed in');
        return;
      }

      await createCustomFood(session.user.id, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        serving_size_g: parseFloat(servingSize) || 100,
        serving_label: servingLabel.trim() || '100g',
        calories_per_serving: parseFloat(calories) || 0,
        protein_per_serving: parseFloat(protein) || 0,
        carbs_per_serving: parseFloat(carbs) || 0,
        fat_per_serving: parseFloat(fat) || 0,
        is_supplement: isSupplement,
      });

      Alert.alert('Saved', `${name.trim()} has been created.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title}>Create Custom Food</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.slow).springify()}>
          <Card>
            <Field label="Name *" value={name} onChangeText={setName} placeholder="e.g. Protein shake" />
            <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Optional" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Serving size (g)"
                  value={servingSize}
                  onChangeText={setServingSize}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Serving label"
                  value={servingLabel}
                  onChangeText={setServingLabel}
                  placeholder="e.g. 1 scoop"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.slow).springify()}>
          <Card style={{ marginTop: SPACING.md }}>
            <Text style={styles.sectionTitle}>Nutrition per serving</Text>
            <Field
              label="Calories *"
              value={calories}
              onChangeText={setCalories}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Protein (g)"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Carbs (g)"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Fat (g)"
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.slow).springify()}>
          <Card style={{ marginTop: SPACING.md }}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>This is a supplement</Text>
              <Switch
                value={isSupplement}
                onValueChange={setIsSupplement}
                trackColor={{ true: COLORS.chart.protein, false: COLORS.border }}
                thumbColor="#FFF"
              />
            </View>
          </Card>
        </Animated.View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <AnimatedPressable
          style={[styles.saveButtonWrapper, (!canSave || saving) && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <LinearGradient
            colors={[...GRADIENTS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Food'}
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          focused && { borderColor: COLORS.accent, ...SHADOWS.sm },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.tertiary}
        keyboardType={keyboardType ?? 'default'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs + 2,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  content: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  saveButtonWrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.colored.accent,
  },
  saveButtonGradient: {
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
});
