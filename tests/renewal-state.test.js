const assert = require('assert');
const { shouldAllowRenewalResubmission, getAdminRenewalTargetStatus, getScholarshipTgpaThreshold } = require('../server');

assert.strictEqual(shouldAllowRenewalResubmission('Invalid Submission'), true, 'invalid submissions should reopen resubmission');
assert.strictEqual(shouldAllowRenewalResubmission('Processing'), false, 'processing submissions should remain locked');
assert.strictEqual(shouldAllowRenewalResubmission('In Probation'), false, 'probation should stay locked');
assert.strictEqual(getAdminRenewalTargetStatus('Invalid Submission'), 'Invalid Submission');
assert.strictEqual(getAdminRenewalTargetStatus('In Probation'), 'In Probation');
assert.strictEqual(getAdminRenewalTargetStatus('Renewed'), 'Renewed');

console.log('Renewal resubmission regression tests passed.');

// Scholarship TGPA Threshold tests
assert.strictEqual(getScholarshipTgpaThreshold('Star Scholar'), 2.5, 'Star Scholar threshold should be 2.5');
assert.strictEqual(getScholarshipTgpaThreshold('Star Scholars Program'), 2.5, 'Star Scholars Program threshold should be 2.5');
assert.strictEqual(getScholarshipTgpaThreshold('DOST-SEI Undergraduate Scholarship'), 2.5, 'DOST threshold should be 2.5');
assert.strictEqual(getScholarshipTgpaThreshold('DOST Scholar'), 2.5, 'DOST Scholar threshold should be 2.5');
assert.strictEqual(getScholarshipTgpaThreshold('Archer Achiever Scholarship'), 2.5, 'Archer Achiever threshold should be 2.5');
assert.strictEqual(getScholarshipTgpaThreshold('Animo Grants Scholarship Program'), 2.5, 'Animo Grants threshold should be 2.5');
assert.strictEqual(getScholarshipTgpaThreshold('St. La Salle Financial Assistance Grant'), 2.0, 'St. La Salle threshold should be 2.0');
assert.strictEqual(getScholarshipTgpaThreshold('St. La Salle Financial Assistance'), 2.0, 'St. La Salle threshold should be 2.0');
assert.strictEqual(getScholarshipTgpaThreshold('Random Scholarship'), 2.0, 'Default threshold should be 2.0');
assert.strictEqual(getScholarshipTgpaThreshold(null), 2.0, 'Null scholarship should default to 2.0');

console.log('Scholarship TGPA threshold mapping tests passed.');
