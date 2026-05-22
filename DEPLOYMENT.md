# WhatsApp AI Bot - Deployment Guide

## 🚀 Deployment Options

### 1. Render.com (Recommended - Free & Easy)

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Deploy bot"
git push origin main
```

#### Step 2: Create Render Account
- Go to https://render.com
- Sign up with GitHub account
- Grant repository access

#### Step 3: Create Web Service
1. Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: whatsapp-bot
   - **Runtime**: Node
   - **Build Command**: `npm install && node seed.js`
   - **Start Command**: `npm start`
   - **Plan**: Free (12-hour auto-sleep after 15min inactivity)

#### Step 4: Set Environment Variables
1. Go to Environment
2. Add variables:
   - `GEMINI_API_KEY` - Your API key
   - `ADMIN_NUMBER` - Your number
   - `NODE_ENV` - production
   - `PORT` - 3000

#### Step 5: Deploy
- Click Deploy
- Monitor logs
- Bot starts in 2-3 minutes

**Note**: Free plan sleeps after 15 minutes of inactivity. Upgrade to paid ($7/month) for 24/7 uptime.

---

### 2. Railway.app

#### Step 1: Deploy
```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

#### Step 2: Configure
- Go to Railway Dashboard
- Add Variables:
  - `GEMINI_API_KEY`
  - `ADMIN_NUMBER`

**Cost**: $5/month free credits, then pay-as-you-go

---

### 3. Heroku (Limited Free Tier)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-whatsapp-bot

# Set variables
heroku config:set GEMINI_API_KEY=xxx
heroku config:set ADMIN_NUMBER=919111514980

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

**Cost**: Discontinued free tier (paid only now)

---

### 4. DigitalOcean App Platform

#### Step 1: Push to GitHub

#### Step 2: Create App
1. Go to https://www.digitalocean.com
2. App Platform → Create App
3. Select GitHub repository
4. Configure:
   - Build: `npm install && node seed.js`
   - Run: `npm start`

#### Step 3: Set Environment
Add all variables in settings

#### Step 4: Deploy

**Cost**: Starts at $5/month (includes 3 apps)

---

### 5. Local Server (Always On)

#### Windows
```batch
REM Install PM2
npm install -g pm2

REM Start bot
pm2 start index.js --name "whatsapp-bot"

REM Make it restart on reboot
pm2 startup
pm2 save
```

#### Linux/Mac
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
pm2 status
```

---

### 6. Docker Deployment

#### Build Image
```bash
docker build -t whatsapp-bot:latest .
```

#### Run Container
```bash
docker run -d \
  --name whatsapp-bot \
  -p 3000:3000 \
  -e GEMINI_API_KEY=xxx \
  -e ADMIN_NUMBER=919111514980 \
  -v /path/to/data:/app/data \
  whatsapp-bot:latest
```

#### Docker Compose
```bash
docker-compose up -d
docker-compose logs -f
```

---

### 7. AWS Lambda + API Gateway

1. Package code
2. Create Lambda function
3. Set timeout to 900 seconds
4. Configure environment variables
5. Create API Gateway trigger
6. Deploy

**Cost**: Free tier covers most bots

---

### 8. Azure App Service

1. Create App Service (Linux, Node.js 18)
2. Deploy from GitHub
3. Configure app settings
4. Enable always-on (paid feature)

**Cost**: Free tier available

---

## 📊 Deployment Comparison

| Platform | Cost | Uptime | Setup | Support |
|----------|------|--------|-------|---------|
| Render | Free (12hr) / $7+ | 95% | Easy | Good |
| Railway | $5 credit / Pay | 99% | Easy | Good |
| Local | $0 | 99% | Medium | Self |
| Docker | $0-20 | 99% | Hard | Community |
| AWS Lambda | Free/Pay | 99.9% | Hard | Excellent |
| DigitalOcean | $5+ | 99.9% | Medium | Excellent |

---

## 🔧 Post-Deployment Setup

### 1. Verify Bot is Running
```bash
curl https://your-app-url.com/health
```

### 2. Scan WhatsApp QR Code
- Check deployment logs
- Scan QR with WhatsApp
- Bot is now active!

### 3. Test Commands
Send to bot number:
- `Hello` - Should get AI response
- `!status` (from admin) - Check status
- `!help` (from admin) - See commands

### 4. Monitor Performance
```bash
# Get logs
https://your-app-url.com/api/logs?user_number=919111514980

# Check stats
https://your-app-url.com/api/user-stats?user_number=919111514980

# Health check
https://your-app-url.com/health
```

---

## 🔐 Security Checklist

- [ ] .env file not committed to GitHub
- [ ] Use strong GEMINI_API_KEY
- [ ] Restrict admin number access
- [ ] Enable HTTPS (automatic on cloud platforms)
- [ ] Regular database backups
- [ ] Monitor API usage
- [ ] Set rate limits on APIs
- [ ] Keep dependencies updated

---

## 💾 Backup Strategy

### Daily Backups
```bash
# Backup database
cp database.db backup_$(date +%Y%m%d).db

# Backup to cloud
curl -X POST https://your-backup-service.com/upload \
  -F "file=@database.db"
```

### Automated Backup (Render)
- Use file storage service
- Or upload to GitHub (gist)
- Or upload to AWS S3

---

## 📈 Scaling Tips

**For 100+ daily users:**
1. Upgrade to paid plan ($7+/month)
2. Enable always-on
3. Add caching (Redis)
4. Use PostgreSQL instead of SQLite

**For 1000+ daily users:**
1. Dedicated server ($20+/month)
2. Load balancer
3. Message queue (Bull, RabbitMQ)
4. Multiple bot instances

**For 10000+ daily users:**
1. Kubernetes cluster
2. Database clustering
3. CDN for assets
4. Professional DevOps team

---

## 🆘 Troubleshooting

### Bot Not Responding
- Check bot is running: `curl /health`
- Check Gemini API key
- Check WhatsApp account status
- Rescan QR code

### Database Errors
- Check database.db permissions
- Ensure disk space available
- Verify database not corrupted

### API Not Working
- Check server is running
- Verify environment variables
- Check firewall rules
- Review error logs

---

## 📞 Support Resources

- GitHub Issues: Report bugs
- Discord: Community support
- Email: support@example.com
- Docs: Check README.md

---

**Questions? Check README.md or open a GitHub issue!**
