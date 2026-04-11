import { test as teardown } from '@playwright/test';
import { zeroAllRitualStock } from '../helpers/db-reset';

teardown('global teardown — zero out seeded inventory', async () => {
  await zeroAllRitualStock();
});
