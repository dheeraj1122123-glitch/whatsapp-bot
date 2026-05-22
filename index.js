/**
 * WhatsApp AI Agent - Main Server
 * Features: Gemini AI Integration, SQLite Database, Admin Commands, 24/7 Support
 * Free & Open Source - Production Ready
 */

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");
const Database = require("better-sqlite3");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

// ===================== CONFIGURATION =====================
const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || "919111514980"; // Format: countrycode+number
const DB_PATH = process.env.DB_PATH || "./database.db";

// ===================== MIDDLEWARE =====================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ===================== DATABASE INITIALIZATION =====================
/**
 * Initialize SQLite Database with required tables
 * Tables: chat_logs, knowledge_base, user_interactions
 */
let db;
try {
  db = new Database(DB_PATH);
  console.log("✓ Database connection established");

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create Chat Logs Table - stores all conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_number TEXT NOT NULL,
      user_name TEXT,
      message TEXT NOT NULL,
      response TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_admin INTEGER DEFAULT 0,
      command TEXT,
      status TEXT DEFAULT 'processed'
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_number ON chat_logs(user_number);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON chat_logs(timestamp);
  `);

  // Create Knowledge Base Table - custom user data
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      keyword TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      enabled INTEGER DEFAULT 1
    );
    
    CREATE INDEX IF NOT EXISTS idx_keyword ON knowledge_base(keyword);
    CREATE INDEX IF NOT EXISTS idx_category ON knowledge_base(category);
  `);

  // Create User Interactions Table - track user behavior
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_number TEXT NOT NULL UNIQUE,
      user_name TEXT,
      total_messages INTEGER DEFAULT 0,
      last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      blocked INTEGER DEFAULT 0
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_interactions ON user_interactions(user_number);
  `);

  console.log("✓ Database tables initialized");
} catch (error) {
  console.error("✗ Database initialization failed:", error.message);
  process.exit(1);
}

// ===================== GEMINI AI INITIALIZATION =====================
/**
 * Initialize Google Generative AI (Gemini)
 * Model: gemini-1.5-flash (free tier)
 */
let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log("✓ Gemini API initialized");
} else {
  console.warn("⚠ GEMINI_API_KEY not set - AI responses will use fallback");
}

// ===================== WHATSAPP CLIENT =====================
/**
 * WhatsApp Web Client with LocalAuth
 * No authentication required after first QR scan
 */
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
});

// ===================== HELPER FUNCTIONS =====================

/**
 * Get chat history for context
 * @param {string} userNumber - User's WhatsApp number
 * @param {number} limit - Number of previous messages to fetch
 * @returns {Array} Array of chat messages
 */
function getChatHistory(userNumber, limit = 5) {
  try {
    const stmt = db.prepare(`
      SELECT user_name, message, response, timestamp 
      FROM chat_logs 
      WHERE user_number = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(userNumber, limit).reverse();
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

/**
 * Search knowledge base for relevant information
 * @param {string} query - Search query
 * @returns {Array} Matching knowledge base entries
 */
function searchKnowledgeBase(query) {
  try {
    const stmt = db.prepare(`
      SELECT category, keyword, content, response 
      FROM knowledge_base 
      WHERE enabled = 1 
      AND (keyword LIKE ? OR content LIKE ?)
      LIMIT 3
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm);
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}

/**
 * Save message to chat logs
 * @param {string} userNumber - User's number
 * @param {string} userName - User's name
 * @param {string} message - User message
 * @param {string} response - Bot response
 * @param {boolean} isAdmin - Is user admin
 * @param {string} command - Command executed (if any)
 */
function saveChatLog(
  userNumber,
  userName,
  message,
  response = null,
  isAdmin = false,
  command = null
) {
  try {
    const stmt = db.prepare(`
      INSERT INTO chat_logs 
      (user_number, user_name, message, response, is_admin, command, status)
      VALUES (?, ?, ?, ?, ?, ?, 'processed')
    `);
    stmt.run(userNumber, userName, message, response, isAdmin ? 1 : 0, command);

    // Update or create user interaction record
    const userStmt = db.prepare(`
      INSERT INTO user_interactions 
      (user_number, user_name, total_messages, last_interaction)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(user_number) DO UPDATE SET
        total_messages = total_messages + 1,
        last_interaction = CURRENT_TIMESTAMP,
        user_name = ?
    `);
    userStmt.run(userNumber, userName, userName);
  } catch (error) {
    console.error("Error saving chat log:", error);
  }
}

/**
 * Update user interaction stats
 * @param {string} userNumber - User's number
 */
function updateUserStats(userNumber) {
  try {
    const stmt = db.prepare(`
      UPDATE user_interactions 
      SET total_messages = total_messages + 1,
          last_interaction = CURRENT_TIMESTAMP
      WHERE user_number = ?
    `);
    stmt.run(userNumber);
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
}

/**
 * Check if user is admin
 * @param {string} userNumber - User's number
 * @returns {boolean}
 */
function isAdmin(userNumber) {
  const normalizedAdmin = ADMIN_NUMBER.replace(/[^\d]/g, "");
  const normalizedUser = userNumber.replace(/[^\d]/g, "");
  return normalizedUser === normalizedAdmin;
}

/**
 * Get AI response using Gemini
 * @param {string} userMessage - User's message
 * @param {string} userNumber - User's number
 * @param {string} userName - User's name
 * @returns {Promise<string>} AI generated response
 */
async function getAIResponse(userMessage, userNumber, userName) {
  try {
    // Search knowledge base first
    const knowledgeBase = searchKnowledgeBase(userMessage);
    let context = "";

    if (knowledgeBase.length > 0) {
      context = "Based on available information:\n";
      knowledgeBase.forEach((kb) => {
        context += `\n[${kb.category}] ${kb.keyword}: ${kb.response}`;
      });
    }

    // Get chat history for context
    const chatHistory = getChatHistory(userNumber, 3);
    let historyContext = "";
    if (chatHistory.length > 0) {
      historyContext = "\nPrevious conversation:\n";
      chatHistory.forEach((msg) => {
        historyContext += `User: ${msg.message}\nAssistant: ${msg.response}\n`;
      });
    }

    // Build prompt
    const prompt = `You are a helpful WhatsApp assistant. 
User: ${userName} (${userNumber})
${historyContext}
${context}

Current Message: ${userMessage}

Provide a concise, friendly response suitable for WhatsApp (keep under 1000 characters).`;

    if (!genAI) {
      return "Hello! I'm here to help. Unfortunately, my AI is not configured. Please try again later.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return response || "I understood your message but couldn't generate a response.";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "Sorry, I encountered an error processing your message. Please try again.";
  }
}

/**
 * Handle admin commands
 * @param {string} command - Command string
 * @param {string} userNumber - User's number
 * @returns {Object} {success, message}
 */
function handleAdminCommand(command, userNumber) {
  const cmd = command.toLowerCase().trim();

  if (cmd === "!pause") {
    try {
      const stmt = db.prepare(`
        UPDATE user_interactions SET blocked = 1 WHERE user_number = ?
      `);
      stmt.run(userNumber);
      saveChatLog(userNumber, "Admin", "!pause", "Bot paused", true, "PAUSE");
      return {
        success: true,
        message: "✓ Bot paused. Send !resume to reactivate.",
      };
    } catch (error) {
      return { success: false, message: "Error pausing bot: " + error.message };
    }
  }

  if (cmd === "!resume") {
    try {
      const stmt = db.prepare(`
        UPDATE user_interactions SET blocked = 0 WHERE user_number = ?
      `);
      stmt.run(userNumber);
      saveChatLog(userNumber, "Admin", "!resume", "Bot resumed", true, "RESUME");
      return {
        success: true,
        message: "✓ Bot resumed. Ready to assist!",
      };
    } catch (error) {
      return { success: false, message: "Error resuming bot: " + error.message };
    }
  }

  if (cmd === "!status") {
    try {
      const chatCount = db
        .prepare(
          "SELECT COUNT(*) as count FROM chat_logs WHERE user_number = ?"
        )
        .get(userNumber);
      const userInfo = db
        .prepare(
          "SELECT total_messages, blocked FROM user_interactions WHERE user_number = ?"
        )
        .get(userNumber);

      return {
        success: true,
        message: `📊 Bot Status:\nMessages processed: ${chatCount.count}\nTotal interactions: ${userInfo?.total_messages || 0}\nStatus: ${userInfo?.blocked ? "PAUSED" : "ACTIVE"}`,
      };
    } catch (error) {
      return { success: false, message: "Error getting status: " + error.message };
    }
  }

  if (cmd === "!help") {
    return {
      success: true,
      message: `🤖 WhatsApp AI Bot Commands:\n!pause - Pause bot\n!resume - Resume bot\n!status - Check status\n!help - Show this message\n!kb list - List knowledge base\n!kb add [keyword]:[response] - Add KB entry`,
    };
  }

  if (cmd.startsWith("!kb")) {
    const kbCmd = cmd.substring(3).trim();
    if (kbCmd === "list") {
      try {
        const entries = db.prepare(
          "SELECT keyword, category FROM knowledge_base WHERE enabled = 1"
        );
        const all = entries.all();
        const list = all.map((e) => `${e.category}: ${e.keyword}`).join("\n");
        return {
          success: true,
          message: `📚 Knowledge Base:\n${list || "No entries yet"}`,
        };
      } catch (error) {
        return { success: false, message: "Error listing KB: " + error.message };
      }
    }

    if (kbCmd.startsWith("add ")) {
      const content = kbCmd.substring(4);
      const [keyword, response] = content.split(":");
      if (!keyword || !response) {
        return {
          success: false,
          message: "Format: !kb add [keyword]:[response]",
        };
      }

      try {
        const stmt = db.prepare(`
          INSERT INTO knowledge_base (category, keyword, content, response)
          VALUES ('admin', ?, ?, ?)
        `);
        stmt.run(keyword.trim(), keyword.trim(), response.trim());
        return {
          success: true,
          message: `✓ Added to knowledge base: "${keyword.trim()}"`,
        };
      } catch (error) {
        return {
          success: false,
          message: "Error adding KB entry: " + error.message,
        };
      }
    }
  }

  return {
    success: false,
    message: "Unknown command. Send !help for available commands.",
  };
}

// ===================== MESSAGE HANDLER =====================
/**
 * Main message handler for WhatsApp
 */
client.on("message_create", async (message) => {
  try {
    // Ignore group messages and status
    if (message.from.includes("@g.us") || message.from.includes("@status")) {
      return;
    }

    const userNumber = message.from.split("@")[0];
    const userName = message._data?.notifyName || "User";
    const userMessage = message.body.trim();

    console.log(`📨 Message from ${userName} (${userNumber}): ${userMessage}`);

    // Check if user is blocked
    const userCheck = db
      .prepare("SELECT blocked FROM user_interactions WHERE user_number = ?")
      .get(userNumber);

    if (userCheck && userCheck.blocked) {
      console.log("⛔ User is blocked, ignoring message");
      return;
    }

    // Handle admin commands
    if (
      isAdmin(userNumber) &&
      (userMessage.startsWith("!pause") ||
        userMessage.startsWith("!resume") ||
        userMessage.startsWith("!status") ||
        userMessage.startsWith("!help") ||
        userMessage.startsWith("!kb"))
    ) {
      const result = handleAdminCommand(userMessage, userNumber);
      saveChatLog(
        userNumber,
        userName,
        userMessage,
        result.message,
        true,
        userMessage.split(" ")[0].substring(1)
      );
      await message.reply(result.message);
      return;
    }

    // Get AI response
    const aiResponse = await getAIResponse(userMessage, userNumber, userName);

    // Save to database
    saveChatLog(userNumber, userName, userMessage, aiResponse, isAdmin(userNumber));

    // Send response
    await message.reply(aiResponse);
    console.log(`✓ Response sent to ${userName}`);
  } catch (error) {
    console.error("Error handling message:", error);
    try {
      await message.reply(
        "Sorry, I encountered an error. Please try again later."
      );
    } catch (e) {
      console.error("Error sending error message:", e);
    }
  }
});

// ===================== CLIENT EVENTS =====================

client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR Code with WhatsApp to authenticate:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("✓ WhatsApp authenticated successfully");
});

client.on("auth_failure", () => {
  console.error("✗ Authentication failed. Delete .wwebjs_auth folder and restart.");
});

client.on("ready", () => {
  console.log("✓ WhatsApp client is ready - Bot is online 24/7");
  console.log(`✓ Admin number: ${ADMIN_NUMBER}`);
  console.log(`✓ Database: ${DB_PATH}`);
});

client.on("disconnected", (reason) => {
  console.log(`⚠ Client disconnected: ${reason}`);
  console.log("Attempting to reconnect...");
});

// ===================== EXPRESS API ROUTES =====================

/**
 * Health Check Endpoint
 * Used for monitoring bot status
 */
app.get("/health", (req, res) => {
  try {
    const dbStatus = db ? "✓ Connected" : "✗ Disconnected";
    const clientStatus = client.pupPage ? "✓ Active" : "⚠ Initializing";

    res.json({
      status: "ok",
      bot_active: true,
      timestamp: new Date().toISOString(),
      database: dbStatus,
      whatsapp_client: clientStatus,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      bot_active: false,
    });
  }
});

/**
 * Get Chat Logs
 * Query: ?user_number=xxx&limit=10&skip=0
 */
app.get("/api/logs", (req, res) => {
  try {
    const { user_number, limit = 20, skip = 0 } = req.query;

    if (!user_number) {
      return res.status(400).json({ error: "user_number parameter required" });
    }

    const stmt = db.prepare(`
      SELECT * FROM chat_logs 
      WHERE user_number = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);

    const logs = stmt.all(user_number, parseInt(limit), parseInt(skip));

    res.json({
      success: true,
      user_number,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Knowledge Base
 * Query: ?category=xxx&limit=10
 */
app.get("/api/knowledge-base", (req, res) => {
  try {
    const { category, limit = 20 } = req.query;

    let stmt;
    if (category) {
      stmt = db.prepare(`
        SELECT * FROM knowledge_base 
        WHERE category = ? AND enabled = 1
        LIMIT ?
      `);
      var result = stmt.all(category, parseInt(limit));
    } else {
      stmt = db.prepare(`
        SELECT * FROM knowledge_base 
        WHERE enabled = 1
        LIMIT ?
      `);
      result = stmt.all(parseInt(limit));
    }

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add Knowledge Base Entry
 * POST body: {category, keyword, content, response}
 */
app.post("/api/knowledge-base", (req, res) => {
  try {
    const { category, keyword, content, response } = req.body;

    if (!category || !keyword || !response) {
      return res
        .status(400)
        .json({
          error: "category, keyword, and response are required",
        });
    }

    const stmt = db.prepare(`
      INSERT INTO knowledge_base (category, keyword, content, response)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(
      category,
      keyword,
      content || keyword,
      response
    );

    res.json({
      success: true,
      message: "Knowledge base entry added",
      id: info.lastInsertRowid,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get User Statistics
 * Query: ?user_number=xxx
 */
app.get("/api/user-stats", (req, res) => {
  try {
    const { user_number } = req.query;

    if (!user_number) {
      return res.status(400).json({ error: "user_number parameter required" });
    }

    const stmt = db.prepare(`
      SELECT * FROM user_interactions 
      WHERE user_number = ?
    `);

    const stats = stmt.get(user_number);

    if (!stats) {
      return res.json({
        success: true,
        user_number,
        data: {
          total_messages: 0,
          first_seen: null,
          last_interaction: null,
          blocked: 0,
        },
      });
    }

    res.json({
      success: true,
      user_number,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Query Custom Database
 * POST body: {query, params}
 * WARNING: Only for SELECT queries from your own database
 */
app.post("/api/query-db", (req, res) => {
  try {
    const { query, params = [] } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query parameter required" });
    }

    // Security: Only allow SELECT queries
    if (!query.trim().toUpperCase().startsWith("SELECT")) {
      return res.status(403).json({ error: "Only SELECT queries allowed" });
    }

    const stmt = db.prepare(query);
    const result = stmt.all(...params);

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send Message via API
 * POST body: {to, message}
 */
app.post("/api/send-message", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "to and message are required" });
    }

    const chatId = to.includes("@") ? to : `${to}@c.us`;
    await client.sendMessage(chatId, message);

    res.json({
      success: true,
      message: "Message sent successfully",
      to,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: error.message });
  }
});

// ===================== 404 HANDLER =====================
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    available_endpoints: [
      "GET /health",
      "GET /api/logs?user_number=xxx",
      "GET /api/knowledge-base",
      "POST /api/knowledge-base",
      "GET /api/user-stats?user_number=xxx",
      "POST /api/query-db",
      "POST /api/send-message",
    ],
  });
});

// ===================== ERROR HANDLER =====================
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ===================== SERVER START =====================
const server = app.listen(PORT, () => {
  console.log(`\n🚀 WhatsApp AI Agent Server Running on Port ${PORT}`);
  console.log(`📡 API Available at http://localhost:${PORT}`);
  console.log(`\n⏳ Initializing WhatsApp client...`);
});

client.initialize();

// ===================== GRACEFUL SHUTDOWN =====================
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down gracefully...");
  client.destroy();
  db.close();
  server.close(() => {
    console.log("✓ Server closed");
    process.exit(0);
  });
});

module.exports = { app, db, client };
