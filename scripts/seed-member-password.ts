import { seedMemberPassword } from '@/lib/seed-member-password';

const printUsage = (): void => {
  console.error(`Usage: npm run member:seed-password -- <membershipNumber> <password> [--reset]

Dev-only: create or replace portal login without Mail registration.

  membershipNumber  Council roster membership # (username)
  password          Min 8 characters
  --reset           Delete existing auth user and recreate`);
};

const parseArgs = (
  argv: string[],
): { membershipNumber: string; password: string; reset: boolean } | null => {
  const reset = argv.includes('--reset');
  const positional = argv.filter((arg) => arg !== '--reset');

  if (positional.length < 2) {
    return null;
  }

  return {
    membershipNumber: positional[0],
    password: positional[1],
    reset,
  };
};

const main = async (): Promise<void> => {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed) {
    printUsage();
    process.exit(1);
  }

  const result = await seedMemberPassword({
    membershipNumber: parsed.membershipNumber,
    password: parsed.password,
    reset: parsed.reset,
  });

  if (result.action === 'skipped') {
    console.log(`Skipped ${result.membershipNumber}: ${result.reason}`);
    process.exit(0);
  }

  console.log(
    `${result.action === 'created' ? 'Created' : 'Reset'} login for ${result.membershipNumber} (${result.email})`,
  );
  console.log('Sign in at /members/login with membership number + password.');
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
