const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { parseGradesFile, parseEAFFile } = require('./server');

async function test() {
  console.log("=== STARTING SCANNER PIPELINE TESTS ===");

  const eafFile = path.join(__dirname, 'standard_submissions', 'Enrollment Assessment Form Example.pdf');
  const gradesFile = path.join(__dirname, 'standard_submissions', 'Grades Form Example.pdf');
  
  // Create a dummy invalid file for testing rejection
  const invalidFile = path.join(__dirname, 'scratch', 'dummy_receipt.pdf');
  if (!fs.existsSync(path.join(__dirname, 'scratch'))) {
    fs.mkdirSync(path.join(__dirname, 'scratch'), { recursive: true });
  }
  fs.writeFileSync(invalidFile, 'NOT A PDF BINARY CONTENT');

  // Test Case 1: Validate Grades Form parsing
  console.log("\nTest Case 1: Parsing Grades Form Example...");
  const gradesResult = await parseGradesFile(gradesFile, '12414638');
  console.log("Grades parsing result:", JSON.stringify(gradesResult, null, 2));

  assert.strictEqual(gradesResult.valid, true, 'Expected the sample PDF to be accepted as a valid grades submission');
  assert.strictEqual(gradesResult.documentType, 'Grades Form', 'Document type should be detected as Grades Form');
  assert.ok(gradesResult.score >= 90, `Expected high confidence score, got: ${gradesResult.score}`);
  assert.strictEqual(gradesResult.terms.length, 5, 'Expected to extract exactly 5 term rows');
  
  // Assert 100% accuracy of parsed values for first and last terms
  const latestTerm = gradesResult.terms[gradesResult.terms.length - 1]; // AY 2025-2026 Term 2
  assert.strictEqual(latestTerm.academic_year, 'A.Y. 2025 - 2026');
  assert.strictEqual(latestTerm.term_number, 2);
  assert.strictEqual(latestTerm.reg_credits, 17.00);
  assert.strictEqual(latestTerm.earned_credits, 17.00);
  assert.strictEqual(latestTerm.tgpa, 3.765);
  assert.strictEqual(latestTerm.cgpa, 3.574);
  assert.strictEqual(latestTerm.withheld_status, '-');

  const firstTerm = gradesResult.terms[0]; // AY 2024-2025 Term 1
  assert.strictEqual(firstTerm.academic_year, 'A.Y. 2024 - 2025');
  assert.strictEqual(firstTerm.term_number, 1);
  assert.strictEqual(firstTerm.reg_credits, 12.00);
  assert.strictEqual(firstTerm.earned_credits, 12.00);
  assert.strictEqual(firstTerm.tgpa, 3.625);
  assert.strictEqual(firstTerm.cgpa, 3.625);
  assert.strictEqual(firstTerm.withheld_status, '-');

  // Test Case 2: Validate EAF parsing
  console.log("\nTest Case 2: Parsing EAF Example...");
  const eafResult = await parseEAFFile(eafFile, '12414638', 'A.Y. 2025 - 2026 Term 3');
  console.log("EAF parsing result:", JSON.stringify(eafResult, null, 2));

  assert.strictEqual(eafResult.valid, true, 'Expected the sample PDF to be accepted as a valid EAF submission');
  assert.strictEqual(eafResult.documentType, 'EAF', 'Document type should be detected as EAF');
  assert.ok(eafResult.score >= 90, `Expected high confidence score, got: ${eafResult.score}`);
  assert.strictEqual(eafResult.extractedFields.studentId, '12414638', 'Expected extracted student ID to be 12414638');

  // Test Case 3: Rejection protection ("LOL uploads" / invalid PDFs)
  console.log("\nTest Case 3: Parsing invalid document...");
  const invalidResult = await parseGradesFile(invalidFile, '12414638');
  console.log("Invalid doc parsing result:", JSON.stringify(invalidResult, null, 2));
  
  assert.strictEqual(invalidResult.valid, false, 'Expected invalid document to be rejected');
  assert.strictEqual(invalidResult.score, 0, 'Expected score of 0 for invalid files');

  console.log("\n=== ALL PIPELINE TESTS PASSED SUCCESSFULY ===");
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
