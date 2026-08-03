const assert = require('assert');
const { shouldAllowRenewalResubmission, getAdminRenewalTargetStatus } = require('../server');

assert.strictEqual(shouldAllowRenewalResubmission('Invalid Submission'), true, 'invalid submissions should reopen resubmission');
assert.strictEqual(shouldAllowRenewalResubmission('Processing'), false, 'processing submissions should remain locked');
assert.strictEqual(shouldAllowRenewalResubmission('In Probation'), false, 'probation should stay locked');
assert.strictEqual(getAdminRenewalTargetStatus('Invalid Submission'), 'Invalid Submission');
assert.strictEqual(getAdminRenewalTargetStatus('In Probation'), 'In Probation');
assert.strictEqual(getAdminRenewalTargetStatus('Renewed'), 'Renewed');

console.log('Renewal resubmission regression tests passed.');
