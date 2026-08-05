const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExtractPDFParams,
  ExtractElementType,
  ExtractPDFJob,
  ExtractPDFResult
} = require('@adobe/pdfservices-node-sdk');

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Sends a PDF file to Adobe PDF Extract API and returns the structured JSON data.
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<object>} The structured JSON data.
 */
async function extractPDFData(filePath) {
  let readStream;
  try {
    let clientId = process.env.PDF_SERVICES_CLIENT_ID || process.env.ADOBE_CLIENT_ID;
    let clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET || process.env.ADOBE_CLIENT_SECRET;

    // Fallback to JSON file if environment variables are not populated
    if (!clientId || !clientSecret) {
      const credentialsPath = path.join(__dirname, 'pdfservices-api-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        if (creds.client_credentials) {
          clientId = creds.client_credentials.client_id;
          clientSecret = creds.client_credentials.client_secret;
        }
      }
    }

    if (!clientId || !clientSecret) {
      throw new Error('Adobe credentials not found in environment variables or pdfservices-api-credentials.json');
    }

    const credentials = new ServicePrincipalCredentials({
      clientId,
      clientSecret
    });

    const pdfServices = new PDFServices({ credentials });
    readStream = fs.createReadStream(filePath);

    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF
    });

    const params = new ExtractPDFParams({
      elementsToExtract: [ExtractElementType.TEXT, ExtractElementType.TABLES]
    });

    const job = new ExtractPDFJob({ inputAsset, params });
    const pollingURL = await pdfServices.submit({ job });
    
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult
    });

    const resultAsset = pdfServicesResponse.result.resource;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });
    const zipBuffer = await streamToBuffer(streamAsset.readStream);
    
    const zip = new AdmZip(zipBuffer);
    const entry = zip.getEntry('structuredData.json');
    if (!entry) {
      throw new Error('structuredData.json was not found in the Adobe extract ZIP payload.');
    }

    return JSON.parse(entry.getData().toString('utf8'));
  } catch (err) {
    throw err;
  } finally {
    if (readStream) {
      readStream.destroy();
    }
  }
}

module.exports = {
  extractPDFData
};
