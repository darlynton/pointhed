describe('Auth smoke', () => {
  const backend = Cypress.env('backendUrl') || 'http://127.0.0.1:3001';
  const api = `${backend}/api/v1`;

  it('loads auth pages and logs in with test vendor', () => {
    cy.visit('/login');
    cy.contains('Welcome Back').should('be.visible');

    cy.visit('/signup');
    cy.contains('Create').should('exist');

    cy.request('POST', `${api}/auth/vendor/login`, {
      email: 'joe@coffeehouse.com',
      password: 'password123'
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      expect(resp.body.access_token).to.be.a('string');
      expect(resp.body.refresh_token).to.be.a('string');
      expect(resp.body.user?.tenantId || resp.body.user?.tenant_id).to.exist;
    });
  });
});
