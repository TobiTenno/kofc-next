import { defineConfig } from 'cypress';

const baseUrl = 'http://127.0.0.1:3000';

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15_000,
    env: {
      TEST_MEMBER_NUMBER: '0000000',
      TEST_MEMBER_PASSWORD: 'cypress-ci-password',
    },
  },
});
