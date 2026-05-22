#!/usr/bin/env node

/**
 * WhatsApp AI Bot - Database Seed Script
 * Initialize database with sample knowledge base entries
 * Run: node seed.js
 */

const Database = require("better-sqlite3");
const fs = require("fs");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH || "./database.db";

console.log("🌱 Seeding database...");

try {
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
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

  console.log("✓ Tables created");

  // Check if knowledge base already has data
  const count = db
    .prepare("SELECT COUNT(*) as count FROM knowledge_base")
    .get();

  if (count.count === 0) {
    // Insert sample knowledge base entries
    const sampleData = [
      {
        category: "Support",
        keyword: "hours",
        content: "Business hours information",
        response:
          "We are available 24/7! You can reach us anytime via WhatsApp.",
      },
      {
        category: "Support",
        keyword: "contact",
        content: "How to contact support",
        response:
          "You can contact us via WhatsApp (always available), email, or call our support team.",
      },
      {
        category: "FAQ",
        keyword: "price",
        content: "Pricing information",
        response:
          "Our services start from affordable rates. Please ask about specific pricing for your needs.",
      },
      {
        category: "FAQ",
        keyword: "delivery",
        content: "Delivery time",
        response:
          "Standard delivery takes 3-5 business days. Express delivery available in 24 hours.",
      },
      {
        category: "FAQ",
        keyword: "refund",
        content: "Refund policy",
        response:
          "We offer 30-day money-back guarantee if you're not satisfied. No questions asked!",
      },
      {
        category: "Services",
        keyword: "features",
        content: "What we offer",
        response:
          "We offer: 24/7 Support, Fast Delivery, Quality Assured, Money-Back Guarantee, Free Consultation",
      },
      {
        category: "Services",
        keyword: "consultation",
        content: "Free consultation",
        response:
          "Yes! We offer completely free consultation. Share your needs and we'll suggest the best solution.",
      },
      {
        category: "Account",
        keyword: "login",
        content: "Account login help",
        response:
          "You can login using your WhatsApp number or email. Need help? Reply with 'reset password'",
      },
    ];

    const stmt = db.prepare(`
      INSERT INTO knowledge_base (category, keyword, content, response)
      VALUES (?, ?, ?, ?)
    `);

    sampleData.forEach((data) => {
      stmt.run(data.category, data.keyword, data.content, data.response);
    });

    console.log(`✓ Added ${sampleData.length} sample knowledge base entries`);
  } else {
    console.log(
      `✓ Knowledge base already has ${count.count} entries, skipping sample data`
    );
  }

  db.close();
  console.log("✓ Database seeding completed successfully!\n");
} catch (error) {
  console.error("✗ Error seeding database:", error.message);
  process.exit(1);
}
