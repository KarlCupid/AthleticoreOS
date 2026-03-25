import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import type { PlanStackParamList } from '../navigation/types';
import { COMMITMENT_DURATION_OPTIONS, SETUP_PHASES } from './weeklyPlanSetup/constants';
import { AvailabilityPhase } from './weeklyPlanSetup/AvailabilityPhase';
import { CommitmentsPhase } from './weeklyPlanSetup/CommitmentsPhase';
import { ObjectivePhase } from './weeklyPlanSetup/ObjectivePhase';
import { PlannerPhase } from './weeklyPlanSetup/PlannerPhase';
import { styles } from './weeklyPlanSetup/styles';
import { useWeeklyPlanSetupController } from './weeklyPlanSetup/useWeeklyPlanSetupController';
import { getSetupPhaseIndex } from './weeklyPlanSetup/utils';

interface WeeklyPlanSetupScreenProps {
  onComplete?: () => void;
}

export function WeeklyPlanSetupScreen({ onComplete }: WeeklyPlanSetupScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PlanStackParamList, 'WeeklyPlanSetup'>>();

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
    weeklyLockedSlots,
    estimatedRoundWorkMin,
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
    travelStartDate,
    setTravelStartDate,
    travelEndDate,
    setTravelEndDate,
    weighInTiming,
    setWeighInTiming,
    targetWeight,
    setTargetWeight,
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
    autoDeloadInterval,
    setAutoDeloadInterval,
    durationPickerCommitmentId,
    setDurationPickerCommitmentId,
    canProceedPhase,
    handleNextPhase,
    handleBackPhase,
    handleSave,
    addCommitment,
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
            targetWeight={targetWeight}
            setTargetWeight={setTargetWeight}
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
            weeklyLockedSlots={weeklyLockedSlots}
            estimatedRoundWorkMin={estimatedRoundWorkMin}
            daysToFight={daysToFight}
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
      case 'planner':
        return (
          <PlannerPhase
            autoDeloadInterval={autoDeloadInterval}
            setAutoDeloadInterval={setAutoDeloadInterval}
          />
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPhase} style={styles.backButton} activeOpacity={0.75}>
          <Text style={styles.backButtonText}>{phaseIndex > 0 || navigation.canGoBack() ? 'Back' : ''}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planning Setup</Text>
        {navigation.canGoBack() ? (
          <View style={styles.headerRight} />
        ) : (
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.headerRight} activeOpacity={0.75}>
            <Text style={styles.backButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentPhase()}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
        {phaseIndex < SETUP_PHASES.length - 1 ? (
          <TouchableOpacity style={[styles.saveButton, !canProceedPhase(phaseIndex) && styles.saveButtonDisabled]} onPress={handleNextPhase} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} activeOpacity={0.8} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Planning Setup</Text>}
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={Boolean(durationPickerCommitmentId)}
        transparent
        animationType="fade"
        onRequestClose={() => setDurationPickerCommitmentId(null)}
      >
        <View style={styles.durationPickerOverlay}>
          <View style={styles.durationPickerSheet}>
            <Text style={styles.durationPickerTitle}>Select Duration</Text>
            {COMMITMENT_DURATION_OPTIONS.map((minutes) => {
              const selectedCommitment = commitments.find((item) => item.id === durationPickerCommitmentId);
              const selected = selectedCommitment?.durationMin === String(minutes);
              return (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.durationPickerOption, selected && styles.durationPickerOptionSelected]}
                  onPress={() => {
                    if (!durationPickerCommitmentId) return;
                    updateCommitment(durationPickerCommitmentId, { durationMin: String(minutes) });
                    setDurationPickerCommitmentId(null);
                  }}
                >
                  <Text style={[styles.durationPickerOptionText, selected && styles.durationPickerOptionTextSelected]}>
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.durationPickerCancel} onPress={() => setDurationPickerCommitmentId(null)}>
              <Text style={styles.durationPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
