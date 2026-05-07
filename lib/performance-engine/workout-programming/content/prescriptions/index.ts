import type { PrescriptionTemplate } from '../../types.ts';
import { uniqueById } from '../helpers.ts';
import { balancePrescriptionTemplates } from './balance.ts';
import { boxingPrescriptionTemplates } from './boxing.ts';
import { cardioPrescriptionTemplates } from './cardio.ts';
import { flexibilityPrescriptionTemplates } from './flexibility.ts';
import { hypertrophyPrescriptionTemplates } from './hypertrophy.ts';
import { intervalPrescriptionTemplates } from './intervals.ts';
import { mobilityPrescriptionTemplates } from './mobility.ts';
import { powerPrescriptionTemplates } from './power.ts';
import { recoveryPrescriptionTemplates } from './recovery.ts';
import { strengthPrescriptionTemplates } from './strength.ts';

export {
  balancePrescriptionTemplates,
  boxingPrescriptionTemplates,
  cardioPrescriptionTemplates,
  flexibilityPrescriptionTemplates,
  hypertrophyPrescriptionTemplates,
  intervalPrescriptionTemplates,
  mobilityPrescriptionTemplates,
  powerPrescriptionTemplates,
  recoveryPrescriptionTemplates,
  strengthPrescriptionTemplates,
};

export const prescriptionContentPacks = {
  boxing: boxingPrescriptionTemplates,
  strength: strengthPrescriptionTemplates,
  hypertrophy: hypertrophyPrescriptionTemplates,
  cardio: cardioPrescriptionTemplates,
  intervals: intervalPrescriptionTemplates,
  mobility: mobilityPrescriptionTemplates,
  flexibility: flexibilityPrescriptionTemplates,
  recovery: recoveryPrescriptionTemplates,
  balance: balancePrescriptionTemplates,
  power: powerPrescriptionTemplates,
};

export const prescriptionTemplates: PrescriptionTemplate[] = uniqueById(Object.values(prescriptionContentPacks).flat());
