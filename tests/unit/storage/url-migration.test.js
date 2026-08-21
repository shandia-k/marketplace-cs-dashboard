/**
 * tests/unit/storage/url-migration.test.js
 * Storage unit testing: automatic URL migration for deprecated marketplace endpoints
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Migration logic mirroring readStores
function migrateStoreUrls(stores) {
  if (!Array.isArray(stores)) return stores;
  let updated = false;
  const migrated = stores.map(s => {
    const copy = { ...s };
    if (copy.marketplace === 'shopee' && (copy.url === 'https://seller.shopee.co.id/portal/chat' || copy.url === 'https://seller.shopee.co.id/portal/chat/')) {
      copy.url = 'https://seller.shopee.co.id/';
      updated = true;
    }
    return copy;
  });
  return { migrated, wasUpdated: updated };
}

describe('Level 3: Storage & Schema URL Migration Tests', () => {
  test('should migrate deprecated Shopee /portal/chat URL to official root domain', () => {
    const legacyStores = [
      { id: 's1', marketplace: 'shopee', url: 'https://seller.shopee.co.id/portal/chat' },
      { id: 's2', marketplace: 'shopee', url: 'https://seller.shopee.co.id/portal/chat/' },
      { id: 's3', marketplace: 'tokopedia', url: 'https://seller.tokopedia.com/chat' }
    ];

    const { migrated, wasUpdated } = migrateStoreUrls(legacyStores);
    assert.equal(wasUpdated, true);
    assert.equal(migrated[0].url, 'https://seller.shopee.co.id/');
    assert.equal(migrated[1].url, 'https://seller.shopee.co.id/');
    assert.equal(migrated[2].url, 'https://seller.tokopedia.com/chat', 'Tokopedia URL should not be changed');
  });

  test('should not alter stores that already have valid modern URLs', () => {
    const modernStores = [
      { id: 's1', marketplace: 'shopee', url: 'https://seller.shopee.co.id/' },
      { id: 's2', marketplace: 'lazada', url: 'https://sellercenter.lazada.co.id/apps/seller/chat' }
    ];

    const { migrated, wasUpdated } = migrateStoreUrls(modernStores);
    assert.equal(wasUpdated, false);
    assert.deepEqual(migrated, modernStores);
  });
});
