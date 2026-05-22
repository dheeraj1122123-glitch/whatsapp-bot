# 🤖 WhatsApp AI Agent - Free 24/7 Chatbot

A production-ready WhatsApp AI chatbot powered by Google Gemini API, with SQLite database support and admin controls. **100% FREE & OPEN SOURCE** - works 24/7 on any platform.

## 🚀 Features

✅ **AI-Powered Responses** - Google Gemini AI for intelligent replies  
✅ **24/7 Operation** - Always online and ready to respond  
✅ **Custom Knowledge Base** - Add your own FAQ and responses  
✅ **Message History** - Maintains conversation context  
✅ **Admin Commands** - Pause/resume, status check, KB management  
✅ **SQLite Database** - No external DB needed, data stored locally  
✅ **REST API** - Query logs, stats, and manage KB via API  
✅ **Multi-User Support** - Handle hundreds of conversations  
✅ **User Blocking** - Block spam or unwanted users  
✅ **Cloud Ready** - Deploy on Render, Railway, DigitalOcean, etc.  

## 📋 Requirements

- **Node.js** 16+ (or higher)
- **npm** or **yarn**
- **Google Gemini API Key** (free at https://makersuite.google.com/app/apikey)
- **WhatsApp Account** (any personal account works)
- **Server/Computer** to run bot (or cloud platform)

## 📥 Installation

### 1. Clone Repository
```bash
git clone https://github.com/dheeraj1122123-glitch/whatsapp-bot.git
cd whatsapp-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` and add your values:
```env
GEMINI_API_KEY=your_api_key_here
ADMIN_NUMBER=919111514980
PORT=3000
DB_PATH=./database.db
NODE_ENV=production
```

### 4. Initialize Database
```bash
node seed.js
```

### 5. Start Bot
```bash
npm start
```

Bot will show a **QR code** in terminal. Scan it with WhatsApp to authenticate.

## 🎮 Usage

### User Commands (Anyone can use)
Send any message to the bot and it will:
1. Check chat history for context
2. Search knowledge base
3. Use Gemini AI to generate response
4. Save conversation to database

### Admin Commands (Your number only)
Send these from your registered admin number:

```
!pause          - Pause the bot (won't reply to anyone)
!resume         - Resume the bot
!status         - Check bot status and stats
!help           - Show all commands
!kb list        - List all knowledge base entries
!kb add [kw]:[response]  - Add new KB entry
```

Example:
```
!kb add hours:We are open 24/7, 365 days a year
```

## 🌐 API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Chat Logs
```bash
curl "http://localhost:3000/api/logs?user_number=919111514980&limit=10"
```

### Get Knowledge Base
```bash
curl "http://localhost:3000/api/knowledge-base"
```

### Add KB Entry
```bash
curl -X POST http://localhost:3000/api/knowledge-base \
  -H "Content-Type: application/json" \
  -d '{"category":"support","keyword":"help","response":"How can we help you?"}'
```

### Get User Stats
```bash
curl "http://localhost:3000/api/user-stats?user_number=919111514980"
```

### Query Custom Database
```bash
curl -X POST http://localhost:3000/api/query-db \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT * FROM chat_logs LIMIT 5"}'
```

### Send Message via API
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"to":"919111514980","message":"Hello from API!"}'
```

## 🛠️ Management

### CLI Tool
Manage bot from command line:

```bash
# List all users
node cli.js user:list

# Block a user
node cli.js user:block 919111514980

# View chat logs
node cli.js log:view 919111514980 20

# Show statistics
node cli.js stats:show

# List knowledge base
node cli.js kb:list

# Add KB entry
node cli.js kb:add support hours "We are open 24/7"

# Backup database
node cli.js db:backup

# Restore database
node cli.js db:restore backup_2024-01-15.db
```

## 🚀 Deployment

### Option 1: Render.com (Easiest - FREE)
```bash
# Push to GitHub
git add .
git commit -m "Deploy bot"
git push origin main

# Create web service on Render
# Build: npm install && node seed.js
# Start: npm start
# Add env vars: GEMINI_API_KEY, ADMIN_NUMBER
```

### Option 2: Railway
```bash
npm install -g railway
railway login
railway init
railway up
```

### Option 3: DigitalOcean App Platform
- Create account
- Connect GitHub
- Deploy app
- Add environment variables

### Option 4: Local Server (Always On)
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name "whatsapp-bot"

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 logs whatsapp-bot
```

See **DEPLOYMENT.md** for detailed instructions.

## 📊 Database Schema

### chat_logs
```sql
- id: Message ID
- user_number: WhatsApp number
- user_name: User's name
- message: User's message
- response: Bot's response
- timestamp: When sent
- is_admin: Is admin user
- command: Command executed
- status: Processing status
```

### knowledge_base
```sql
- id: Entry ID
- category: Category (support, faq, etc)
- keyword: Search keyword
- content: Full content
- response: Bot response
- created_at: Creation date
- updated_at: Last update
- enabled: Is active
```

### user_interactions
```sql
- id: User ID
- user_number: WhatsApp number
- user_name: User's name
- total_messages: Message count
- last_interaction: Last seen
- first_seen: First contact
- blocked: Is blocked
```

## 🔧 Configuration

### Customize Responses
Edit `.env` to change:
- `GEMINI_API_KEY` - AI model API key
- `ADMIN_NUMBER` - Your WhatsApp number for admin commands
- `PORT` - Server port (default 3000)
- `DB_PATH` - Database location

### Add Custom Database
To use your own database, edit `index.js`:

```javascript
// Add at top of file
const mysql = require('mysql2/promise');

async function queryCustomDB(sql) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const [results] = await connection.execute(sql);
  await connection.end();
  return results;
}
```

Then use in AI response:
```javascript
const customData = await queryCustomDB('SELECT * FROM products');
```

## 📝 Example Scenarios

### E-Commerce Bot
```
Knowledge Base:
- Category: Products
  Keyword: "laptop"
  Response: "Check our latest laptops with warranty..."
  
- Category: Orders
  Keyword: "status"
  Response: "Track your order at example.com/track"
```

### Customer Support Bot
```
Knowledge Base:
- Category: Support
  Keyword: "refund"
  Response: "30-day money-back guarantee..."
  
- Category: Support
  Keyword: "hours"
  Response: "Available 24/7..."
```

### FAQ Bot
```
Knowledge Base:
- Category: FAQ
  Keyword: "shipping"
  Response: "Free shipping on orders above $50..."
```

## 🔒 Security

- ✅ Private database (SQLite local)
- ✅ Environment variables for secrets
- ✅ Admin-only commands with number verification
- ✅ User blocking capability
- ✅ HTTPS support on cloud platforms
- ✅ Input validation and error handling
- ✅ .gitignore protects sensitive files

## 📈 Performance

- **Memory**: ~200MB
- **Disk**: ~50MB (with 10k messages)
- **CPU**: Low usage
- **Concurrent Users**: 100+
- **Response Time**: <2 seconds

## 🐛 Troubleshooting

### Bot Not Responding
```bash
# Check if running
curl http://localhost:3000/health

# Check logs
npm start  # Watch console logs

# Rescan QR code
rm -rf .wwebjs_auth
npm start
```

### Gemini API Error
- Verify API key in `.env`
- Check API quota at https://makersuite.google.com
- Ensure internet connection

### Database Error
```bash
# Rebuild database
rm database.db
node seed.js
npm start
```

## 📚 Learn More

- **WhatsApp Web.js**: https://wwebjs.dev
- **Google Gemini**: https://ai.google.dev
- **SQLite**: https://www.sqlite.org
- **Express.js**: https://expressjs.com

## 🤝 Contributing

Found a bug? Have an idea?  
Open an issue or submit a pull request!

## 📄 License

MIT License - Free to use for personal and commercial projects

## ⭐ Support

If this project helped you, please star it on GitHub!

---

**Questions?** Check the issues or documentation.  
**Want to contribute?** Pull requests welcome!  
**Need help?** Open an issue on GitHub.

**Made with ❤️ for WhatsApp Bot enthusiasts**
