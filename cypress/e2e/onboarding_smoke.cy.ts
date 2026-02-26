describe('Onboarding smoke', () => {
  const backend = Cypress.env('backendUrl') || 'http://127.0.0.1:3001';
  const api = `${backend}/api/v1`;

  it('returns current user and reaches onboarding route without crash', () => {
    cy.request('POST', `${api}/auth/vendor/login`, {
      email: 'joe@coffeehouse.com',
      password: 'password123'
    }).then((loginResp) => {
      const token = loginResp.body.access_token;
      expect(token).to.be.a('string');

      cy.request({
        method: 'GET',
        url: `${api}/auth/me`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((meResp) => {
        expect(meResp.status).to.equal(200);
        expect(meResp.body.user).to.exist;
      });

      cy.visit('/onboarding', {
        onBeforeLoad(win) {
          win.localStorage.setItem('auth_token', token);
        }
      });

      cy.location('pathname').then((pathname) => {
        expect(pathname === '/onboarding' || pathname.startsWith('/dashboard')).to.equal(true);
      });
    });
  });
});
