const express = require('express');
const router = express.Router();
const pino = require('pino');
const fs = require('fs-extra');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore 
} = require('@whiskeysockets/baileys');
const { uploadToMega } = require('./mega');

router.get('/', async (req, res) => {
    let phone = req.query.phone;

    if (!phone) {
        return res.status(400).send({ error: 'Phone number is required' });
    }

    // Clean phone number input
    phone = phone.replace(/[^0-9]/g, '');

    const sessionDir = `./session_${Date.now()}`;
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    try {
        const Socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            printQRInTerminal: false,
            logger: pino({ level: 'fatal' }),
            browser: ['Ubuntu', 'Chrome', '20.0.04']
        });

        if (!Socket.authState.creds.registered) {
            await delay(1500);
            const code = await Socket.requestPairingCode(phone);
            res.send({ code: code });
        }

        Socket.ev.on('creds.update', saveCreds);

        Socket.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect } = s;

            if (connection === 'open') {
                await delay(5000);
                const credsPath = `${sessionDir}/creds.json`;
                
                if (fs.existsSync(credsPath)) {
                    // Upload creds.json to Mega to generate Session ID
                    const sessionId = await uploadToMega(credsPath);
                    
                    // Send Session ID to the user on WhatsApp
                    await Socket.sendMessage(Socket.user.id, { text: sessionId });
                    
                    // Clean up local temp folder
                    await Socket.ws.close();
                    fs.removeSync(sessionDir);
                }
            }
        });

    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Failed to generate pairing code' });
        }
        fs.removeSync(sessionDir);
    }
});

module.exports = router;
