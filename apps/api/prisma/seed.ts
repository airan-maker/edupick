import { runAcademySeedSync } from '../src/scripts/academy-seed-sync';

runAcademySeedSync(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
