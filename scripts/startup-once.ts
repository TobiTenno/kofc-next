import { runStartupTasks } from '@/lib/startup';

const main = async (): Promise<void> => {
  await runStartupTasks();
  console.log('startup ok');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
