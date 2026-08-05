const assert = require('assert');
const { shouldAllowRenewalResubmission, getAdminRenewalTargetStatus, getScholarshipTgpaThreshold, normalizeRenewalStatus } = require('../server');

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

// Scholarship Stipend Details tests
const { getScholarshipStipendDetails } = require('../server');

const starDetails = getScholarshipStipendDetails('Star Scholars Program');
assert.strictEqual(starDetails.hasStipend, true, 'Star Scholar should have stipend');
assert.strictEqual(starDetails.type, 'monthly', 'Star Scholar should have monthly stipend type');
assert.strictEqual(starDetails.amount, 18000, 'Star Scholar amount should be 18000');

const animoDetails = getScholarshipStipendDetails('Animo Grants Scholarship Program');
assert.strictEqual(animoDetails.hasStipend, true, 'Animo Grant should have stipend');
assert.strictEqual(animoDetails.type, 'termly', 'Animo Grant should have termly stipend type');
assert.strictEqual(animoDetails.amount, 40000, 'Animo Grant amount should be 40000');

const dostDetails = getScholarshipStipendDetails('DOST-SEI Undergraduate Scholarship');
assert.strictEqual(dostDetails.hasStipend, true, 'DOST should have stipend');
assert.strictEqual(dostDetails.type, 'monthly', 'DOST should have monthly stipend type');
assert.strictEqual(dostDetails.amount, 8000, 'DOST amount should be 8000');

const lasalleDetails = getScholarshipStipendDetails('St. La Salle Financial Assistance Grant');
assert.strictEqual(lasalleDetails.hasStipend, false, 'St. La Salle should not have stipend');

const archerDetails = getScholarshipStipendDetails('Archer Achiever Scholarship');
assert.strictEqual(archerDetails.hasStipend, false, 'Archer Achiever should not have stipend');

console.log('Scholarship stipend details mapping tests passed.');

// Status Normalization tests
assert.strictEqual(normalizeRenewalStatus('Renewed'), 'Renewed', 'Renewed should map to Renewed');
assert.strictEqual(normalizeRenewalStatus('Processed'), 'Renewed', 'Processed should map to Renewed');
assert.strictEqual(normalizeRenewalStatus('Approved'), 'Renewed', 'Approved should map to Renewed');
assert.strictEqual(normalizeRenewalStatus('In Probation'), 'Probation', 'In Probation should map to Probation');
assert.strictEqual(normalizeRenewalStatus('Reconsidered'), 'Reconsidered', 'Reconsidered should map to Reconsidered');
assert.strictEqual(normalizeRenewalStatus('Terminated'), 'Terminated', 'Terminated should map to Terminated');
assert.strictEqual(normalizeRenewalStatus('Processing'), 'Processing', 'Processing should map to Processing');
assert.strictEqual(normalizeRenewalStatus('Not Started'), 'Not Started', 'Not Started should map to Not Started');

console.log('Status normalization tests passed.');

