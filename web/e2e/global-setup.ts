import {
  createSafeE2EAdminClient,
  resetE2EData,
} from './support/test-data';

export default async function globalSetup() {
  const db = createSafeE2EAdminClient();
  await resetE2EData(db);
  console.log('✓ [e2e setup] development test data cleared');
  console.log('✓ [e2e setup] kit_inventory: ground=250, ritual=250');
}
