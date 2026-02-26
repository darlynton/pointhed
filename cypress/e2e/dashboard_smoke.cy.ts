describe('Dashboard smoke', () => {
  const backend = Cypress.env('backendUrl') || 'http://127.0.0.1:3001';
  const api = `${backend}/api/v1`;

  it('loads dashboard overview for an authenticated vendor', () => {
    cy.request('POST', `${api}/auth/vendor/login`, {
      email: 'joe@coffeehouse.com',
      password: 'password123'
    }).then((loginResp) => {
      const token = loginResp.body.access_token;

      cy.visit('/dashboard/overview', {
        onBeforeLoad(win) {
          win.localStorage.setItem('auth_token', token);
        }
      });

      cy.location('pathname').should('include', '/dashboard');
      cy.get('body').should('not.contain', 'Something went wrong');
    });
  });
});
