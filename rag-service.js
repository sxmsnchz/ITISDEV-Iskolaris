const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const guidelinesPath = path.join(__dirname, 'guidelines');
const indexPath = path.join(__dirname, 'database', 'rag-index.json');

function splitTextIntoChunks(text, chunkSize = 1200, overlap = 200) {
  const cleanedText = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

  const chunks = [];
  let start = 0;

  while (start < cleanedText.length) {
    const end = Math.min(start + chunkSize, cleanedText.length);
    const chunk = cleanedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= cleanedText.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

async function createDocumentEmbedding(text, source) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: `title: ${source} | text: ${text}`
  });

  return response.embeddings[0].values;
}

async function createQueryEmbedding(question) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: `task: search result | query: ${question}`
  });

  return response.embeddings[0].values;
}

function cosineSimilarity(vectorA, vectorB) {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length !== vectorB.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index++) {
    dotProduct += vectorA[index] * vectorB[index];
    magnitudeA += vectorA[index] ** 2;
    magnitudeB += vectorB[index] ** 2;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (
    Math.sqrt(magnitudeA) *
    Math.sqrt(magnitudeB)
  );
}

function readRagIndex() {
  try {
    if (!fs.existsSync(indexPath)) {
      return [];
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Unable to read RAG index:', error);
    return [];
  }
}

function saveRagIndex(index) {
  const databaseDirectory = path.dirname(indexPath);

  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
  }

  fs.writeFileSync(
    indexPath,
    JSON.stringify(index, null, 2),
    'utf8'
  );
}

async function buildRagIndex() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from .env.');
  }

  if (!fs.existsSync(guidelinesPath)) {
    throw new Error('The guidelines folder does not exist.');
  }

  const files = fs
    .readdirSync(guidelinesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    throw new Error('No PDF files were found in the guidelines folder.');
  }

  const index = [];

  for (const filename of files) {
    console.log(`Processing: ${filename}`);

    const filePath = path.join(guidelinesPath, filename);
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);

    const chunks = splitTextIntoChunks(parsed.text);

    if (chunks.length === 0) {
      console.warn(`No searchable text found in ${filename}.`);
      continue;
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const content = chunks[chunkIndex];

      const embedding = await createDocumentEmbedding(
        content,
        filename
      );

      index.push({
        id: `${filename}-${chunkIndex}`,
        source: filename,
        chunkIndex,
        content,
        embedding
      });
    }
  }

  saveRagIndex(index);

  console.log(`RAG index created with ${index.length} chunks.`);

  return index;
}

async function retrieveRelevantChunks(question, limit = 4) {
  const index = readRagIndex();

  if (index.length === 0) {
    return [];
  }

  const questionEmbedding = await createQueryEmbedding(question);

  return index
    .map(item => ({
      ...item,
      similarity: cosineSimilarity(
        questionEmbedding,
        item.embedding
      )
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

module.exports = {
  buildRagIndex,
  retrieveRelevantChunks
};