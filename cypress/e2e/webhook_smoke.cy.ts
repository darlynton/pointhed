describe('Webhook smoke', () => {
  const backend = Cypress.env('backendUrl') || 'http://127.0.0.1:3001';

  it('rejects invalid verification token', () => {
    cy.request({
      method: 'GET',
      url: `${backend}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=12345`,
      failOnStatusCode: false
    }).then((resp) => {
      expect(resp.status).to.equal(403);
    });
  });

  it('handles webhook payload validation and valid empty event envelope', () => {
    cy.request({
      method: 'POST',
      url: `${backend}/webhook/whatsapp`,
      body: {},
      failOnStatusCode: false
    }).then((resp) => {
      expect(resp.status).to.equal(400);
    });

    cy.request({
      method: 'POST',
      url: `${backend}/webhook/whatsapp`,
      body: {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [],
                  statuses: []
                }
              }
            ]
          }
        ]
      }
    }).then((resp) => {
      expect(resp.status).to.equal(200);
    });
  });
});
