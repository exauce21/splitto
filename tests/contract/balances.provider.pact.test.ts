import { PactV3, Verifier } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createApp } from '../../src/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationSql = readFileSync(join(__dirname, '../../migrations/001-initial.sql'), 'utf8');

describe('Pact Provider - Splitto API', () => {
  let container: PostgreSqlContainer;
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let server: any;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('splitto')
      .withUsername('splitto')
      .withPassword('splitto')
      .start();

    pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
    });

    await pool.query(migrationSql);

    app = createApp(pool);
    server = app.listen(3002); // Use a different port for provider test
  }, 180000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (pool) {
      await pool.end();
    }
    if (container) {
      await container.stop();
    }
  });

  it('validates the expectations of splitto-frontend', async () => {
    const verifier = new Verifier({
      provider: 'splitto-api',
      providerBaseUrl: 'http://localhost:3002',
      pactUrls: ['pacts/splitto-frontend-splitto-api.json'],
      stateHandlers: {
        'group-1 a 3 membres et 2 dépenses': async () => {
          // Truncate first
          await pool.query('TRUNCATE groups, members, expenses CASCADE');

          // Insert group
          await pool.query(`
            INSERT INTO groups (id, name, currency) VALUES
            ('group-1', 'Group 1', 'EUR')
          `);

          // Insert 3 members
          await pool.query(`
            INSERT INTO members (id, group_id, name, email) VALUES
            ('member-1', 'group-1', 'Alice', 'alice@example.com'),
            ('member-2', 'group-1', 'Bob', 'bob@example.com'),
            ('member-3', 'group-1', 'Charlie', 'charlie@example.com')
          `);

          // Insert 2 expenses
          await pool.query(`
            INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, paid_at, split_mode, split_data, category, created_at) VALUES
            ('expense-1', 'group-1', 'Dinner', 30.00, 'EUR', 'member-1', '2023-01-01T12:00:00Z', 'equal', '{"mode": "equal", "beneficiaries": ["member-1", "member-2", "member-3"]}', NULL, '2023-01-01T12:00:00Z'),
            ('expense-2', 'group-1', 'Drinks', 15.00, 'EUR', 'member-2', '2023-01-02T12:00:00Z', 'equal', '{"mode": "equal", "beneficiaries": ["member-1", "member-2", "member-3"]}', NULL, '2023-01-02T12:00:00Z')
          `);
        },
        'aucun groupe inexistant': async () => {
          // Truncate all tables
          await pool.query('TRUNCATE groups, members, expenses CASCADE');
        },
      },
    });

    await verifier.verifyProvider();
  });
});