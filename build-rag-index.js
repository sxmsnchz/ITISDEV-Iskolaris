require('dotenv').config();

const { buildRagIndex } = require('./rag-service');

async function run() {
  try {
    console.log('Building Iskolaris RAG index...');

    await buildRagIndex();

    console.log('RAG index created successfully.');
    process.exitCode = 0;
  } catch (error) {
    console.error('RAG indexing failed:', error.message);
    process.exitCode = 1;
  }
}

run();