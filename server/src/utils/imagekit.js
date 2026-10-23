const ImageKit = require('@imagekit/nodejs');
const fs = require('fs');
const config = require('../config');

const imagekit = new ImageKit({
  publicKey: config.imagekit.publicKey,
  privateKey: config.imagekit.privateKey,
  urlEndpoint: config.imagekit.urlEndpoint,
});

/**
 * Upload a local file to ImageKit.
 * @param {string} filePath  - Absolute path to the file on disk
 * @param {string} fileName  - Desired file name in ImageKit
 * @param {string} [folder]  - Target folder in ImageKit (default: '/kisanlens')
 * @returns {Promise<{url: string, fileId: string}>}
 */
async function uploadToImageKit(filePath, fileName, folder = '/kisanlens') {
  const fileBuffer = fs.readFileSync(filePath);
  const response = await imagekit.upload({
    file: fileBuffer,
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return { url: response.url, fileId: response.fileId };
}

module.exports = { imagekit, uploadToImageKit };
