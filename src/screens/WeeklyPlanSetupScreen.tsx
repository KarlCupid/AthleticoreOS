import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { supabase } from '../../lib/supabase';
import type { AppRouteParamList } from '../navigation/types';
import { COMMITMENT_DURATION_OPTIONS, SETUP_PHASES } from './weeklyPlanSetup/constants';
import { AvailabilityPhase } from './weeklyPlanSetup/AvailabilityPhase';
import { CommitmentsPhase } from './weeklyPlanSetup/CommitmentsPhase';
import { ObjectivePhase } from './weeklyPlanSetup/ObjectivePhase';
import { styles } from './weeklyPlanSetup/styles';
import { useWeeklyPlanSetupController } from './weeklyPlanSetup/useWeeklyPlanSetupController';
import { getSetupPhaseIndex } from './weeklyPlanSetup/utils';
import { GRADIENTS, COLORS, SPACING } from '../theme/theme';

interface WeeklyPlanSetupScreenProps {
  onComplete?: () => void;
}

export function WeeklyPlanSetupScreen({ onComplete }: WeeklyPlanSetupScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AppRouteParamList, 'WeeklyPlanSetup'>>();

  const controller = useWeeklyPlanSetupController({
    initialGoalMode: route.params?.initialGoalMode,
    initialPhaseIndex: getSetupPhaseIndex(route.params?.initialPhaseKey),
    navigation,
    onComplete,
  });

  const {
    loading,
    saving,
    phaseIndex,
    currentPhase,
    availableDays,
    buildGoalTypeLabel,
    buildRecommendation,
    selectedBuildMetric,
    daysToFight,
    startDate,
    setStartDate,
    goalMode,
    setGoalMode,
    buildGoalType,
    setBuildGoalType,
    goalLabel,
    setGoalLabel,
    goalStatement,
    setGoalStatement,
    primaryOutcome,
    setPrimaryOutcome,
    secondaryConstraint,
    setSecondaryConstraint,
    setTargetMetric,
    targetValue,
    setTargetValue,
    targetDate,
    setTargetDate,
    targetHorizonWeeks,
    setTargetHorizonWeeks,
    showAdvancedOverride,
    setShowAdvancedOverride,
    fightDate,
    setFightDate,
    fightOpportunityStatus,
    setFightOpportunityStatus,
    competitionTime,
    setCompetitionTime,
    weighInDate,
    setWeighInDate,
    weighInTime,
    setWeighInTime,
    targetWeightClassName,
    setTargetWeightClassName,
    travelStartDate,
    setTravelStartDate,
    travelEndDate,
    setTravelEndDate,
    weighInTiming,
    setWeighInTiming,
    targetWeight,
    setTargetWeight,
    weightClassChanged,
    setWeightClassChanged,
    opponentName,
    setOpponentName,
    opponentStance,
    setOpponentStance,
    eventName,
    setEventName,
    eventLocation,
    setEventLocation,
    roundCount,
    setRoundCount,
    roundDurationSec,
    setRoundDurationSec,
    restDurationSec,
    setRestDurationSec,
    toggleAvailabilityDay,
    commitments,
    updateCommitment,
    removeCommitment,
    addCommitment,
    durationPickerCommitmentId,
    setDurationPickerCommitmentId,
    canProceedPhase,
    handleNextPhase,
    handleBackPhase,
    handleSave,
    fightOpportunitySummary,
  } = controller;

  function renderCurrentPhase() {
    switch (currentPhase.key) {
      case 'objective':
        return (
          <ObjectivePhase
            startDate={startDate}
            setStartDate={setStartDate}
            goalMode={goalMode}
            setGoalMode={setGoalMode}
            buildGoalType={buildGoalType}
            setBuildGoalType={setBuildGoalType}
            buildGoalTypeLabel={buildGoalTypeLabel}
            buildRecommendation={buildRecommendation}
            secondaryConstraint={secondaryConstraint}
            setSecondaryConstraint={setSecondaryConstraint}
            showAdvancedOverride={showAdvancedOverride}
            setShowAdvancedOverride={setShowAdvancedOverride}
            goalLabel={goalLabel}
            setGoalLabel={setGoalLabel}
            goalStatement={goalStatement}
            setGoalStatement={setGoalStatement}
            primaryOutcome={primaryOutcome}
            setPrimaryOutcome={setPrimaryOutcome}
            selectedBuildMetric={selectedBuildMetric}
            setTargetMetric={setTargetMetric}
            targetValue={targetValue}
            setTargetValue={setTargetValue}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            targetHorizonWeeks={targetHorizonWeeks}
            setTargetHorizonWeeks={setTargetHorizonWeeks}
            fightDate={fightDate}
            setFightDate={setFightDate}
            fightOpportunityStatus={fightOpportunityStatus}
            setFightOpportunityStatus={setFightOpportunityStatus}
            competitionTime={competitionTime}
            setCompetitionTime={setCompetitionTime}
            weighInDate={weighInDate}
            setWeighInDate={setWeighInDate}
            weighInTime={weighInTime}
            setWeighInTime={setWeighInTime}
            targetWeightClassName={targetWeightClassName}
            setTargetWeightClassName={setTargetWeightClassName}
            targetWeight={targetWeight}
            setTargetWeight={setTargetWeight}
            weightClassChanged={weightClassChanged}
            setWeightClassChanged={setWeightClassChanged}
            opponentName={opponentName}
            setOpponentName={setOpponentName}
            opponentStance={opponentStance}
            setOpponentStance={setOpponentStance}
            eventName={eventName}
            setEventName={setEventName}
            eventLocation={eventLocation}
            setEventLocation={setEventLocation}
            weighInTiming={weighInTiming}
            setWeighInTiming={setWeighInTiming}
            travelStartDate={travelStartDate}
            setTravelStartDate={setTravelStartDate}
            travelEndDate={travelEndDate}
            setTravelEndDate={setTravelEndDate}
            roundCount={roundCount}
            setRoundCount={setRoundCount}
            roundDurationSec={roundDurationSec}
            setRoundDurationSec={setRoundDurationSec}
            restDurationSec={restDurationSec}
            setRestDurationSec={setRestDurationSec}
            daysToFight={daysToFight}
            fightOpportunitySummary={fightOpportunitySummary}
          />
        );
      case 'availability':
        return (
          <AvailabilityPhase
            availableDays={availableDays}
            toggleAvailabilityDay={toggleAvailabilityDay}
          />
        );
      case 'commitments':
        return (
          <CommitmentsPhase
            commitments={commitments}
            updateCommitment={updateCommitment}
            removeCommitment={removeCommitment}
            addCommitment={addCommitment}
            setDurationPickerCommitmentId={setDurationPickerCommitmentId}
          />
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const isLastPhase = phaseIndex === SETUP_PHASES.length - 1;
  const proceedDisabled = isLastPhase ? saving : !canProceedPhase(phaseIndex);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Moves to the previous planning step or returns to the previous screen."
            onPress={handleBackPhase}
            style={styles.backButton}
            activeOpacity={0.75}
            testID="weekly-setup-back"
          >
            <Text style={styles.backButtonText}>{phaseIndex > 0 || navigation.canGoBack() ? 'Back' : ''}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Journey Planning</Text>
          {navigation.canGoBack() ? (
            <View style={styles.headerRight} />
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              accessibilityHint="Signs out and returns to the authentication screen."
              onPress={() => supabase.auth.signOut()}
              style={styles.headerRight}
              activeOpacity={0.75}
              testID="weekly-setup-sign-out"
            >
              <Text style={styles.backButtonText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.progressShell}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressEyebrow}>{currentPhase.eyebrow}</Text>
              <Text style={styles.progressCount}>{phaseIndex + 1} of {SETUP_PHASES.length}</Text>
            </View>
            <Text style={styles.phaseTitle}>{currentPhase.title}</Text>
            <Text style={styles.phaseDescription}>{currentPhase.description}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((phaseIndex + 1) / SETUP_PHASES.length) * 100}%` }]} />
            </View>
          </View>

          <Animated.View key={currentPhase.key} entering={FadeInRight.duration(350).springify()} style={{ flex: 1 }}>
            {renderCurrentPhase()}
          </Animated.View>

          <View style={styles.saveBarContainer}>
            <TouchableOpacity
              testID="weekly-setup-submit"
              accessibilityRole="button"
              accessibilityLabel={saving ? 'Saving journey plan' : isLastPhase ? 'Update journey plan' : 'Continue planning setup'}
              accessibilityHint={isLastPhase ? 'Saves your journey planning setup.' : 'Moves to the next planning setup step.'}
              accessibilityState={{ disabled: proceedDisabled, busy: saving }}
              style={[styles.saveButtonWrap, proceedDisabled && styles.saveButtonDisabled]} 
              onPress={isLastPhase ? handleSave : handleNextPhase} 
              activeOpacity={0.8} 
              disabled={proceedDisabled}
            >
              <LinearGradient
                colors={[...GRADIENTS.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonBg}
              >
                 {saving ? <ActivityIndicator color={COLORS.text.inverse} /> : <Text style={styles.saveButtonText}>{isLastPhase ? 'Update Journey' : 'Continue'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(durationPickerCommitmentId)}
        transparent
        animationType="fade"
        onRequestClose={() => setDurationPickerCommitmentId(null)}
      >
        <View style={styles.durationPickerOverlay}>
          <View style={[styles.durationPickerSheet, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <Text style={styles.durationPickerTitle}>Select Duration</Text>
            {COMMITMENT_DURATION_OPTIONS.map((minutes) => {
              const selectedCommitment = commitments.find((item) => item.id === durationPickerCommitmentId);
              const selected = selectedCommitment?.durationMin === String(minutes);
              return (
                <TouchableOpacity
                  key={minutes}
                  accessibilityRole="button"
                  accessibilityLabel={`Set duration to ${minutes} minutes`}
                  accessibilityState={{ selected }}
                  style={[styles.durationPickerOption, selected && styles.durationPickerOptionSelected]}
                  onPress={() => {
                    if (!durationPickerCommitmentId) return;
                    updateCommitment(durationPickerCommitmentId, { durationMin: String(minutes) });
                    setDurationPickerCommitmentId(null);
                  }}
                  activeOpacity={0.7}
                  testID={`weekly-setup-duration-${minutes}`}
                >
                  <Text style={[styles.durationPickerOptionText, selected && styles.durationPickerOptionTextSelected]}>
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel duration picker"
              style={styles.durationPickerCancel}
              onPress={() => setDurationPickerCommitmentId(null)}
              testID="weekly-setup-duration-cancel"
            >
              <Text style={styles.durationPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
