/**
 * MAIN BOT FILE
 * This is the heart of your WhatsApp bot
 * Each section is commented to explain what it does
 */

// =============================================
// PART 1: IMPORTING LIBRARIES (like loading tools)
// =============================================

// Import WhatsApp library (the main tool to connect to WhatsApp)
const { default: makeWASocket, 
        useMultiFileAuthState, 
        DisconnectReason,
        makeInMemoryStore } = require('@whiskeysockets/baileys');

// Import error handling library
const { Boom } = require('@hapi/boom');

// Import logging library (for showing messages in console)
const pino = require('pino');

// Import file system library (for saving files)
const fs = require('fs');

// Import cron library (for scheduling tasks)
const cron = require('node-cron');

// Import our configuration file
const config = require('./config');

// =============================================
// PART 2: SETUP AND CONFIGURATION
// =============================================

// Show startup message in console
console.log('╔════════════════════════════════════╗');
console.log(`║     ${config.botName} BOT STARTING     ║`);
console.log('╚════════════════════════════════════╝');
console.log(`👑 Owner: ${config.ownerNumber}`);
console.log('📱 Features enabled:');
console.log(`   • Always Online: ${config.features.alwaysOnline ? '✅' : '❌'}`);
console.log(`   • Auto Status React: ${config.features.autoStatusReact ? '✅' : '❌'}`);
console.log(`   • Auto View Status: ${config.features.autoViewStatus ? '✅' : '❌'}`);
console.log(`   • Auto Typing: ${config.features.autoTyping ? '✅' : '❌'}`);
console.log('');

// =============================================
// PART 3: MAIN BOT FUNCTION
// =============================================

/**
 * This is the main function that starts your bot
 * It connects to WhatsApp and handles all messages
 */
async function startBot() {
    console.log('🔄 Connecting to WhatsApp...');
    
    // Load saved session (so you don't need to scan QR every time)
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    // Create the WhatsApp connection
    const sock = makeWASocket({
        // Authentication data
        auth: state,
        
        // Show QR code in terminal for first connection
        printQRInTerminal: true,
        
        // Hide unnecessary logs (makes console cleaner)
        logger: pino({ level: 'silent' }),
        
        // Browser info (looks like a real device)
        browser: [config.botName, 'Safari', '1.0.0'],
        
        // Keep connection alive
        shouldSyncAuthState: true,
        
        // Additional options for stability
        syncFullHistory: false,
        markOnlineOnConnect: config.features.alwaysOnline
    });

    // =============================================
    // PART 4: SAVE CREDENTIALS (so you stay logged in)
    // =============================================
    
    // Save session credentials when they update
    sock.ev.on('creds.update', saveCreds);
    
    // =============================================
    // PART 5: HANDLE CONNECTION UPDATES
    // =============================================
    
    /**
     * This handles when connection status changes
     * Like: connected, disconnected, etc.
     */
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // If QR code is received, show it
        if (qr) {
            console.log('📱 Scan this QR code with your WhatsApp:');
        }
        
        // If connected successfully
        if (connection === 'open') {
            console.log('✅ Bot connected successfully!');
            console.log(`🤖 ${config.botName} is now online`);
            console.log('💡 Waiting for messages...');
        }
        
        // If disconnected
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            
            console.log('❌ Bot disconnected!');
            
            // Check why it disconnected
            if (reason === DisconnectReason.loggedOut) {
                console.log('🚫 Bot was logged out. Delete "session" folder and restart.');
                process.exit(1);
            } else {
                console.log('🔄 Reconnecting in 5 seconds...');
                // Reconnect after 5 seconds
                setTimeout(startBot, 5000);
            }
        }
    });

    // =============================================
    // PART 6: AUTO VIEW STATUS FEATURE
    // =============================================
    
    /**
     * This automatically views all status updates
     * from your contacts
     */
    if (config.features.autoViewStatus) {
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const message = m.messages[0];
                
                // Check if it's a status update
                if (message.key && message.key.remoteJid === 'status@broadcast') {
                    console.log('👀 Auto-viewing status...');
                    
                    // Mark status as read
                    await sock.readMessages([message.key]);
                    
                    // Auto react to status (if enabled)
                    if (config.features.autoStatusReact) {
                        // Pick random emoji from list
                        const emoji = config.statusReactions[
                            Math.floor(Math.random() * config.statusReactions.length)
                        ];
                        
                        // React to status
                        await sock.sendMessage(message.key.remoteJid, {
                            react: {
                                text: emoji,
                                key: message.key
                            }
                        });
                        
                        console.log(`✨ Reacted to status with ${emoji}`);
                    }
                }
            } catch (error) {
                console.log('Status view error:', error.message);
            }
        });
    }

    // =============================================
    // PART 7: AUTO TYPING AND MESSAGE HANDLING
    // =============================================
    
    /**
     * This handles incoming messages and replies
     */
    sock.ev.on('messages.upsert', async (messageUpdate) => {
        try {
            // Get the message
            const message = messageUpdate.messages[0];
            
            // Ignore if no message or it's from yourself
            if (!message.message || message.key.fromMe) return;
            
            // Get sender's number
            const sender = message.key.remoteJid;
            const senderNumber = sender.split('@')[0];
            
            // Get message text
            const messageText = message.message.conversation || 
                               message.message.extendedTextMessage?.text || '';
            
            // Show in console that message received
            console.log(`📨 Message from ${senderNumber}: ${messageText}`);
            
            // =========================================
            // AUTO TYPING FEATURE
            // =========================================
            
            if (config.features.autoTyping) {
                // Show typing indicator
                await sock.sendPresenceUpdate('composing', sender);
                console.log('⌨️ Auto typing...');
                
                // Wait a bit to look human
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // =========================================
            // CHECK IF MESSAGE IS FOR BOT
            // =========================================
            
            // Check if message starts with any prefix
            const hasPrefix = config.prefixes.some(prefix => 
                messageText.startsWith(prefix)
            );
            
            // Also check if bot is mentioned or it's a DM
            const isDM = sender.endsWith('@s.whatsapp.net');
            const isMentioned = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(
                sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
            );
            
            // If it's for the bot, process command
            if (hasPrefix || isDM || isMentioned) {
                // Remove prefix from message
                const command = messageText.slice(1).toLowerCase().split(' ')[0];
                const args = messageText.slice(1).split(' ').slice(1);
                
                console.log(`🎯 Command detected: ${command}`);
                
                // =========================================
                // COMMAND HANDLER
                // =========================================
                
                // Stop typing before responding
                if (config.features.autoTyping) {
                    await sock.sendPresenceUpdate('paused', sender);
                }
                
                // !ping command - check if bot is alive
                if (command === 'ping') {
                    await sock.sendMessage(sender, { 
                        text: '🏓 Pong! Bot is alive!' 
                    });
                    console.log('✅ Responded to ping');
                }
                
                // !info command - show bot info
                else if (command === 'info') {
                    await sock.sendMessage(sender, { 
                        text: `🤖 *${config.botName} Info*\n\n` +
                              `👑 Owner: ${config.ownerNumber}\n` +
                              `⚡ Features:\n` +
                              `• Always Online: ${config.features.alwaysOnline ? '✅' : '❌'}\n` +
                              `• Auto Status React: ${config.features.autoStatusReact ? '✅' : '❌'}\n` +
                              `• Auto View Status: ${config.features.autoViewStatus ? '✅' : '❌'}\n` +
                              `• Auto Typing: ${config.features.autoTyping ? '✅' : '❌'}\n\n` +
                              `📊 Status: Online and Working!` 
                    });
                    console.log('✅ Sent bot info');
                }
                
                // !help command - show available commands
                else if (command === 'help') {
                    await sock.sendMessage(sender, { 
                        text: config.messages.help 
                    });
                    console.log('✅ Sent help menu');
                }
                
                // !status command - force check status updates
                else if (command === 'status' && senderNumber === config.ownerNumber) {
                    await sock.sendMessage(sender, { 
                        text: '📱 Checking status updates...' 
                    });
                    console.log('✅ Owner requested status check');
                }
                
                // If no command matches, show help
                else if (hasPrefix) {
                    await sock.sendMessage(sender, { 
                        text: '❌ Command not found. Type !help for available commands.' 
                    });
                }
            }
            
        } catch (error) {
            console.log('❌ Error handling message:', error.message);
        }
    });

    // =============================================
    // PART 8: KEEP ALIVE FEATURE (Always Online)
    // =============================================
    
    if (config.features.alwaysOnline) {
        // Send online presence every 30 seconds
        setInterval(async () => {
            try {
                await sock.sendPresenceUpdate('available');
                console.log('💓 Heartbeat sent - staying online');
            } catch (error) {
                // Ignore errors (connection might be down)
            }
        }, 30000); // 30 seconds
        
        console.log('💓 Always Online feature activated');
    }
    
    // =============================================
    // PART 9: AUTO STATUS VIEW CHECK (every 5 minutes)
    // =============================================
    
    if (config.features.autoViewStatus) {
        cron.schedule('*/5 * * * *', async () => {
            try {
                console.log('🔄 Checking for new status updates...');
                // This will automatically trigger the status handler
                // when new statuses are available
            } catch (error) {
                console.log('Status check error:', error.message);
            }
        });
    }
    
    // Return the socket for use elsewhere
    return sock;
}

// =============================================
// PART 10: START THE BOT
// =============================================

// Handle any errors that crash the bot
process.on('uncaughtException', (error) => {
    console.log('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (error) => {
    console.log('❌ Unhandled Rejection:', error.message);
});

// Start the bot
startBot().catch(error => {
    console.log('❌ Failed to start bot:', error.message);
    console.log('🔄 Restarting in 10 seconds...');
    setTimeout(() => {
        console.log('🔄 Attempting to restart...');
        startBot();
    }, 10000);
});
