const assert = require('assert');
const path = require('path');
const { parseGradesFile } = require('./server');

async function test() {
  const gradesFile = path.join(__dirname, 'standard_submissions', 'Grades Form Example.pdf');
  const result = await parseGradesFile(gradesFile, '123');

  console.log(JSON.stringify(result, null, 2));
  assert.strictEqual(result.valid, true, 'Expected the sample PDF to be accepted as a valid grades submission');
  assert.ok(result.terms.length > 0, 'Expected the parser to extract at least one summary term row');
  assert.ok(result.latestCGPA > 0, 'Expected the parser to recover the latest CGPA from the summary table');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
