const { File } = require('megajs');
const fs = require('fs');

/**
 * Zip or upload session folder/file to Mega
 * @param {string} filePath - Path to the session file or directory
 * @returns {Promise<string>} - Mega file link / Session ID
 */
async function uploadToMega(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const stream = fs.createReadStream(filePath);
            const storage = new File({
                // Mega credentials context (Anonymous upload)
            });

            // Standard anonymous upload logic to Mega
            File.upload(filePath, async (err, file) => {
                if (err) return reject(err);
                const link = await file.link();
                // Link එකේ 'SESSION_ID:' prefix එක යොදා Session ID එකක් ලෙස Return කිරීම
                const sessionId = 'SESSION_ID:' + link.replace('https://mega.nz/file/', '');
                resolve(sessionId);
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { uploadToMega };
