export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  const { runStartupTasks } = await import('@/lib/startup');
  await runStartupTasks();
};
