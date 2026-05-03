import type { SessionTemplate } from '../../types.ts';
import { uniqueById } from '../helpers.ts';
import { balanceSessionTemplates } from './balance.ts';
import { cardioSessionTemplates } from './cardio.ts';
import { hypertrophySessionTemplates } from './hypertrophy.ts';
import { mobilitySessionTemplates } from './mobility.ts';
import { powerSessionTemplates } from './power.ts';
import { recoverySessionTemplates } from './recovery.ts';
import { strengthSessionTemplates } from './strength.ts';

export {
  balanceSessionTemplates,
  cardioSessionTemplates,
  hypertrophySessionTemplates,
  mobilitySessionTemplates,
  powerSessionTemplates,
  recoverySessionTemplates,
  strengthSessionTemplates,
};

export const sessionContentPacks = {
  strength: strengthSessionTemplates,
  hypertrophy: hypertrophySessionTemplates,
  cardio: cardioSessionTemplates,
  mobility: mobilitySessionTemplates,
  recovery: recoverySessionTemplates,
  balance: balanceSessionTemplates,
  power: powerSessionTemplates,
};

export const sessionTemplates: SessionTemplate[] = uniqueById(Object.values(sessionContentPacks).flat());
