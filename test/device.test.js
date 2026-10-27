// node test/device.test.js
const assert = require('assert');
const D = require('../src/device');

assert.strictEqual(D.parseMachineId('\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\r\n    MachineGuid    REG_SZ    4C4C4544-0042-3510-8051-B4C04F4E4B32\r\n'), '4c4c4544-0042-3510-8051-b4c04f4e4b32');
assert.strictEqual(D.parseMachineId('    "IOPlatformUUID" = "564D1A2B-1234-5678-9ABC-DEF012345678"'), '564d1a2b-1234-5678-9abc-def012345678');
assert.strictEqual(D.parseMachineId('nothing here'), null);

const joined = `+----------------------------------------------------------------------+
| Device State                                                         |
+----------------------------------------------------------------------+
             AzureAdJoined : YES
          EnterpriseJoined : NO
              DomainJoined : NO
+----------------------------------------------------------------------+
| Tenant Details                                                       |
+----------------------------------------------------------------------+
                TenantName : Contoso
                  TenantId : 72F988BF-86F1-41AF-91AB-2D7CD011DB47`;
assert.deepStrictEqual(D.parseDsreg(joined), { tenant: '72f988bf-86f1-41af-91ab-2d7cd011db47' });
assert.deepStrictEqual(D.parseDsreg(joined.replace('AzureAdJoined : YES', 'AzureAdJoined : NO')), { tenant: '' });
assert.deepStrictEqual(D.parseDsreg(''), { tenant: '' });

const h = D.installHash('4c4c4544-0042-3510-8051-b4c04f4e4b32');
assert.match(h, /^[0-9a-f]{64}$/);
assert.strictEqual(h, D.installHash('4c4c4544-0042-3510-8051-b4c04f4e4b32'));
assert.ok(!h.includes('4c4c4544'));
console.log('device ok');
