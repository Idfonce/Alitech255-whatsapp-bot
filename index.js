const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const cron = require('node-cron');

// Configuration
const CONFIG = {
    ownerNumber: process.env.OWNER_NUMBER || '255623553450',
    botName: process.env.BOT_NAME || 'Supreme Leader',
    alwaysOnline: true,
    autoStatusReact: true,
    autoViewStatus: true,
    autoTyping: true
};

console.log(`🤖 ${CONFIG.botName} Bot Starting...`);
console.log(`👑 Owner: ${CONFIG.ownerNumber}`);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Supreme Leader Bot', 'Safari', '1.0.0']
    });

    // Save credentials
    sock.ev
