describe('Exchange rate and currency symbol flow', () => {
  const backend = 'http://127.0.0.1:3001/api/v1';
  const vendorEmail = 'joe@coffeehouse.com';
  const vendorPassword = 'password123';

  it('logs in, sets vendor currency, and verifies frontend reflects symbol and precision', () => {
    // 1) Login via API to get token and tenantId
    cy.request('POST', `${backend}/auth/vendor/login`, {
      email: vendorEmail,
      password: vendorPassword
    }).then((resp) => {
      expect(resp.status).to.equal(200);
      const token = resp.body.access_token;
      const tenantId = resp.body.user?.tenantId || resp.body.user?.tenant_id;
      expect(token).to.be.a('string');
      expect(tenantId).to.be.a('string');

      // 2) Set home currency via financial endpoint (authenticated)
      cy.request({
        method: 'POST',
        url: `${backend}/financial/set-home-currency`,
        headers: { Authorization: `Bearer ${token}` },
        body: { homeCurrency: 'GBP' }
      }).then((r2) => {
        expect(r2.status).to.be.oneOf([200,201]);

        // 3) Visit test page and set auth token in localStorage before load
        cy.visit(`/test/currency?vendorId=${tenantId}`, {
          onBeforeLoad(win) {
            win.localStorage.setItem('auth_token', token);
          }
        });

        // 4) Assert the page shows GBP symbol and two decimals
        cy.get('[data-testid=currency-symbol]').should('contain', '£');
        cy.get('[data-testid=formatted-amount]').should('contain', '£1,234.50');
      });
    });
  });
});
