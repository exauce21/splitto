import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, expect } from 'vitest';

const { like, regex, eachLike } = MatchersV3;

describe('Pact Consumer - Splitto Frontend', () => {
  const provider = new PactV3({
    consumer: 'splitto-frontend',
    provider: 'splitto-api',
    port: 3001, // Use a different port for Pact mock server
    dir: 'pacts/',
  });

  describe('GET /api/groups/:id/balances', () => {
    it('returns balances when group has expenses', async () => {
      await provider.addInteraction({
        states: [{ description: 'group-1 a 3 membres et 2 dépenses' }],
        uponReceiving: 'a request for balances of a group with expenses',
        withRequest: {
          method: 'GET',
          path: '/api/groups/group-1/balances',
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            balances: like({
              'member-1': like(10.0),
              'member-2': like(-5.0),
              'member-3': like(-5.0),
            }),
            settlements: eachLike({
              from: regex('member-\\d+'),
              to: regex('member-\\d+'),
              amount: like(5.0),
            }),
          },
        },
      });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/groups/group-1/balances`);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('balances');
        expect(body).toHaveProperty('settlements');
      });
    });

    it('returns 404 when group does not exist', async () => {
      await provider.addInteraction({
        states: [{ description: 'aucun groupe inexistant' }],
        uponReceiving: 'a request for balances of a non-existent group',
        withRequest: {
          method: 'GET',
          path: '/api/groups/inexistant/balances',
        },
        willRespondWith: {
          status: 404,
        },
      });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/groups/inexistant/balances`);
        expect(response.status).toBe(404);
      });
    });
  });
});