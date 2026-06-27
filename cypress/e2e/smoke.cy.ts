describe('public site (example council.json)', () => {
  it('shows council data on the home page', () => {
    cy.visit('/');
    cy.contains('h1', 'Council #1234');
    cy.contains('1234 - Example Parish');
    cy.contains('Meeting at 7:00 PM');
  });

  it('loads calendar and officers pages', () => {
    cy.visit('/calendar');
    cy.contains('h1', 'Council Calendar');

    cy.visit('/officers');
    cy.contains('h2', 'Meet our officers');
    cy.contains('Example Admin');
    cy.contains('Financial Secretary');
  });

  it('loads the about page', () => {
    cy.visit('/about');
    cy.contains('h2', 'Our Mission');
  });

  it('shows the member login form', () => {
    cy.visit('/members/login');
    cy.get('#membership-number').should('be.visible');
    cy.get('#membership-password').should('be.visible');
    cy.contains('button', 'Sign in');
  });
});

describe('member login (example council.csv + seeded password)', () => {
  it('signs in with the CI test member', () => {
    cy.visit('/members/login');
    cy.get('#membership-number').type(
      Cypress.env('TEST_MEMBER_NUMBER') as string,
    );
    cy.get('#membership-password').type(
      Cypress.env('TEST_MEMBER_PASSWORD') as string,
      { log: false },
    );
    cy.contains('button', 'Sign in').click();
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
    cy.contains('nav a', 'Sign in').should('not.exist');
  });
});
