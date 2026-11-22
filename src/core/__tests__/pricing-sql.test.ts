import { readFileSync } from 'fs';
import { join } from 'path';
import { PARISH_TIERS } from '../pricing';

// The server enforces the same limits as the app shows (supabase/migrations/0005_plan_tiers.sql).
const sql = readFileSync(join(__dirname, '../../../supabase/migrations/0005_plan_tiers.sql'), 'utf8');

test.each(PARISH_TIERS.filter((t) => t.maxGroups !== null))('server limits match pricing.ts for $id', (t) => {
  expect(sql).toContain(`when '${t.id}' then ${t.maxGroups} `);
  expect(sql).toContain(`when '${t.id}' then ${t.maxMembers} `);
});
