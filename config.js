/**
 * CONFIGURATION FILE
 * This is where all your bot settings are stored
 * Beginners: You only need to change the values below
 */

// Load environment variables from .env file
require('dotenv').config();

// Export all configuration settings
module.exports = {
    // Your WhatsApp number (used to identify you as the owner)
    // Format: country code + number (no +, no spaces)
    // Example: 255623553450 (Tanzania number)
    ownerNumber: process.env.OWNER_NUMBER || '255623553450',
    
    // Your bot's display name
    botName: process.env.BOT_NAME || 'Supreme Leader',
    
    // Feature flags - set to true to enable, false to disable
    features: {
        // Keeps bot connected 24/7 (recommended: true)
        alwaysOnline: process.env.ALWAYS_ONLINE === 'true' || true,
        
        // Auto reacts to contacts' status updates (recommended: true)
        autoStatusReact: process.env.AUTO_STATUS_REACT === 'true' || true,
        
        // Auto views all status updates (recommended: true)
        autoViewStatus: process.env.AUTO_VIEW_STATUS === 'true' || true,
        
        // Shows typing indicator when bot is responding (recommended: true)
        autoTyping: process.env.AUTO_TYPING === 'true' || true
    },
    
    // Status reactions - what emojis to use when reacting to statuses
    statusReactions: ['❤️', '🔥', '👋', '👍', '🌟', '💯'],
    
    // Messages the bot understands (command prefixes)
    // Example: !help, .help, /help
    prefixes: ['!', '.', '/', '#'],
    
    // Bot's response messages
    messages: {
        welcome: 'Hello! I am your WhatsApp bot. How can I help you?',
        help: 'Available commands:\n!help - Show this message\n!ping - Check if bot is alive\n!info - Show bot info'
    }
};
