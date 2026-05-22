#!/usr/bin/env node

/**
 * WhatsApp AI Bot - CLI Tool
 * Manage bot operations from command line
 * Usage: node cli.js [command] [options]
 */

const Database = require("better-sqlite3");
const fs = require("fs");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "./database.db";
const db = new Database(DB_PATH);

const commands = {
  "kb:list": listKnowledgeBase,
  "kb:add": addKnowledgeBase,
  "kb:delete": deleteKnowledgeBase,
  "user:list": listUsers,
  "user:block": blockUser,
  "user:unblock": unblockUser,
  "log:view": viewLogs,
  "log:clear": clearLogs,
  "stats:show": showStats,
  "db:backup": backupDatabase,
  "db:restore": restoreDatabase,
  help: showHelp,
};

function showHelp() {
  console.log(`
🤖 WhatsApp AI Bot - CLI Tool

Usage: node cli.js [command] [options]

Commands:

Knowledge Base:
  kb:list                    - List all knowledge base entries
  kb:add [category] [kw] [response]  - Add knowledge base entry
  kb:delete [id]             - Delete knowledge base entry

Users:
  user:list                  - List all users
  user:block [number]        - Block user
  user:unblock [number]      - Unblock user

Logs:
  log:view [number] [limit]  - View logs for user
  log:clear [days]           - Clear logs older than X days

Statistics:
  stats:show                 - Show bot statistics

Database:
  db:backup                  - Backup database
  db:restore [file]          - Restore database

Help:
  help                       - Show this message

Examples:
  node cli.js kb:list
  node cli.js kb:add support hours "We are open 24/7"
  node cli.js user:list
  node cli.js user:block 919111514980
  node cli.js stats:show
  node cli.js db:backup
  `);
}

function listKnowledgeBase() {
  try {
    const entries = db
      .prepare("SELECT * FROM knowledge_base WHERE enabled = 1 ORDER BY id DESC")
      .all();

    if (entries.length === 0) {
      console.log("📚 No knowledge base entries found");
      return;
    }

    console.log("\n📚 Knowledge Base Entries:");
    console.log("─".repeat(80));

    entries.forEach((entry) => {
      console.log(`\nID: ${entry.id}`);
      console.log(`Category: ${entry.category}`);
      console.log(`Keyword: ${entry.keyword}`);
      console.log(`Response: ${entry.response}`);
      console.log(`Created: ${entry.created_at}`);
    });

    console.log("\n─".repeat(80));
    console.log(`Total: ${entries.length} entries\n`);
  } catch (error) {
    console.error("✗ Error listing knowledge base:", error.message);
  }
}

function addKnowledgeBase(category, keyword, response) {
  if (!category || !keyword || !response) {
    console.error(
      "✗ Usage: node cli.js kb:add [category] [keyword] [response]"
    );
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO knowledge_base (category, keyword, content, response)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(category, keyword, keyword, response);

    console.log(`✓ Added knowledge base entry (ID: ${info.lastInsertRowid})`);
    console.log(`  Category: ${category}`);
    console.log(`  Keyword: ${keyword}`);
    console.log(`  Response: ${response}\n`);
  } catch (error) {
    console.error("✗ Error adding entry:", error.message);
  }
}

function deleteKnowledgeBase(id) {
  if (!id) {
    console.error("✗ Usage: node cli.js kb:delete [id]");
    return;
  }

  try {
    const stmt = db.prepare("DELETE FROM knowledge_base WHERE id = ?");
    stmt.run(id);
    console.log(`✓ Deleted knowledge base entry (ID: ${id})\n`);
  } catch (error) {
    console.error("✗ Error deleting entry:", error.message);
  }
}

function listUsers() {
  try {
    const users = db
      .prepare("SELECT * FROM user_interactions ORDER BY total_messages DESC")
      .all();

    if (users.length === 0) {
      console.log("👥 No users found\n");
      return;
    }

    console.log("\n👥 Users:");
    console.log("─".repeat(100));
    console.log(
      "Number             | Name            | Messages | Last Seen        | Status"
    );
    console.log("─".repeat(100));

    users.forEach((user) => {
      const status = user.blocked ? "🚫 BLOCKED" : "✓ Active";
      console.log(
        `${user.user_number.padEnd(18)} | ${(user.user_name || "Unknown").padEnd(15)} | ${user.total_messages.toString().padEnd(8)} | ${user.last_interaction.substring(0, 16).padEnd(16)} | ${status}`
      );
    });

    console.log("─".repeat(100));
    console.log(`Total: ${users.length} users\n`);
  } catch (error) {
    console.error("✗ Error listing users:", error.message);
  }
}

function blockUser(number) {
  if (!number) {
    console.error("✗ Usage: node cli.js user:block [number]");
    return;
  }

  try {
    const stmt = db.prepare(
      "UPDATE user_interactions SET blocked = 1 WHERE user_number = ?"
    );
    stmt.run(number);
    console.log(`✓ Blocked user: ${number}\n`);
  } catch (error) {
    console.error("✗ Error blocking user:", error.message);
  }
}

function unblockUser(number) {
  if (!number) {
    console.error("✗ Usage: node cli.js user:unblock [number]");
    return;
  }

  try {
    const stmt = db.prepare(
      "UPDATE user_interactions SET blocked = 0 WHERE user_number = ?"
    );
    stmt.run(number);
    console.log(`✓ Unblocked user: ${number}\n`);
  } catch (error) {
    console.error("✗ Error unblocking user:", error.message);
  }
}

function viewLogs(number, limit = 10) {
  if (!number) {
    console.error("✗ Usage: node cli.js log:view [number] [limit]");
    return;
  }

  try {
    const logs = db
      .prepare(
        "SELECT * FROM chat_logs WHERE user_number = ? ORDER BY timestamp DESC LIMIT ?"
      )
      .all(number, parseInt(limit));

    if (logs.length === 0) {
      console.log(`📝 No logs found for ${number}\n`);
      return;
    }

    console.log(`\n📝 Chat Logs for ${number}:`);
    console.log("─".repeat(100));

    logs.reverse().forEach((log) => {
      console.log(`\n[${log.timestamp}]`);
      console.log(`User: ${log.message}`);
      console.log(`Bot: ${log.response}`);
    });

    console.log("\n─".repeat(100));
    console.log(`Total: ${logs.length} messages\n`);
  } catch (error) {
    console.error("✗ Error viewing logs:", error.message);
  }
}

function clearLogs(days = 30) {
  try {
    const stmt = db.prepare(`
      DELETE FROM chat_logs 
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `);

    stmt.run(days);
    console.log(`✓ Cleared logs older than ${days} days\n`);
  } catch (error) {
    console.error("✗ Error clearing logs:", error.message);
  }
}

function showStats() {
  try {
    const totalMessages = db
      .prepare("SELECT COUNT(*) as count FROM chat_logs")
      .get();
    const totalUsers = db
      .prepare("SELECT COUNT(*) as count FROM user_interactions")
      .get();
    const kbEntries = db
      .prepare("SELECT COUNT(*) as count FROM knowledge_base WHERE enabled = 1")
      .get();
    const activeUsers = db
      .prepare(
        "SELECT COUNT(*) as count FROM user_interactions WHERE total_messages > 0"
      )
      .get();

    console.log("\n📊 Bot Statistics:");
    console.log("─".repeat(50));
    console.log(`Total Messages: ${totalMessages.count}`);
    console.log(`Total Users: ${totalUsers.count}`);
    console.log(`Active Users: ${activeUsers.count}`);
    console.log(`Knowledge Base Entries: ${kbEntries.count}`);
    console.log("─".repeat(50) + "\n");
  } catch (error) {
    console.error("✗ Error showing stats:", error.message);
  }
}

function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = `backup_${timestamp}.db`;

    fs.copyFileSync(DB_PATH, backupFile);

    console.log(`✓ Database backed up to: ${backupFile}\n`);
  } catch (error) {
    console.error("✗ Error backing up database:", error.message);
  }
}

function restoreDatabase(backupFile) {
  if (!backupFile) {
    console.error("✗ Usage: node cli.js db:restore [backup_file]");
    return;
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`✗ Backup file not found: ${backupFile}`);
    return;
  }

  try {
    db.close();
    fs.copyFileSync(backupFile, DB_PATH);
    console.log(`✓ Database restored from: ${backupFile}\n`);
  } catch (error) {
    console.error("✗ Error restoring database:", error.message);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || "help";

if (commands[command]) {
  commands[command](...args.slice(1));
} else {
  console.error(`✗ Unknown command: ${command}`);
  showHelp();
}

db.close();
