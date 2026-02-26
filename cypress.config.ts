import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    backendUrl: 'http://127.0.0.1:3001'
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}'
  }
});
