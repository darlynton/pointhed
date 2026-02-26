describe('Purchase + redemption smoke', () => {
  const backend = Cypress.env('backendUrl') || 'http://127.0.0.1:3001';
  const api = `${backend}/api/v1`;

  it('can query purchases and redemptions with auth', () => {
    cy.request('POST', `${api}/auth/vendor/login`, {
      email: 'joe@coffeehouse.com',
      password: 'password123'
    }).then((loginResp) => {
      const token = loginResp.body.access_token;

      cy.request({
        method: 'GET',
        url: `${api}/purchases?page=1&limit=5`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((pResp) => {
        expect(pResp.status).to.equal(200);
        expect(pResp.body).to.have.property('data');
      });

      cy.request({
        method: 'GET',
        url: `${api}/redemptions?status=pending&page=1&limit=5`,
        headers: { Authorization: `Bearer ${token}` }
      }).then((rResp) => {
        expect(rResp.status).to.equal(200);
        expect(rResp.body).to.have.property('data');
      });
    });
  });
});
