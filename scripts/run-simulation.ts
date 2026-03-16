import { runSimulation } from '../lib/engine/simulation/runner.ts';
import { generateCSVReport } from '../lib/engine/simulation/reporting.ts';
import { ThePerfectStudent, TheGrinder, TheSlacker, TheBinger } from '../lib/engine/simulation/personas.ts';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const personaArg = args[0] || 'perfect';
  const weeksArg = parseInt(args[1]) || 8;

  let persona = ThePerfectStudent;
  if (personaArg === 'grinder') persona = TheGrinder;
  if (personaArg === 'slacker') persona = TheSlacker;
  if (personaArg === 'binger') persona = TheBinger;

  console.log(`🚀 Starting simulation for: ${persona.name} (${weeksArg} weeks)`);

  const startDate = new Date();
  const fightDate = new Date();
  fightDate.setDate(startDate.getDate() + (weeksArg * 7));

  const config = {
    startDate: startDate.toISOString().split('T')[0],
    weeks: weeksArg,
    persona,
    initialState: {
      weightLbs: 185,
      fitnessLevel: 'advanced' as const,
      goalMode: 'fight_camp' as const,
      targetWeight: 170,
      fightDate: fightDate.toISOString().split('T')[0]
    }
  };

  const result = await runSimulation(config);
  const csv = generateCSVReport(result);

  const outputDir = path.join(process.cwd(), 'sim_results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const fileName = `sim_${personaArg}_${weeksArg}weeks_${Date.now()}.csv`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, csv);

  console.log(`✅ Simulation complete!`);
  console.log(`📊 Report saved to: ${filePath}`);
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
