# 🚀 Deployment Guide

This guide covers various deployment options for the Advanced Expense Tracker application.

## 📋 Prerequisites

- Node.js 16+ and npm/yarn
- PostgreSQL 12+
- Git
- Domain name (for production)
- SSL certificate (recommended)

## 🐳 Docker Deployment (Recommended)

### Quick Start with Docker Compose

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your production values
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec app npm run migrate
```

5. **Access the application**
- Application: http://localhost:5000
- Database: localhost:5432

### Custom Docker Build

```bash
# Build the image
docker build -t expense-tracker .

# Run with custom network
docker network create expense-network

# Run PostgreSQL
docker run -d \
  --name expense-db \
  --network expense-network \
  -e POSTGRES_DB=expense_tracker \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Run the application
docker run -d \
  --name expense-app \
  --network expense-network \
  -p 5000:5000 \
  -e DB_HOST=expense-db \
  -e DB_USER=postgres \
  -e DB_PASSWORD=password \
  -e JWT_SECRET=your_secret_here \
  expense-tracker
```

## ☁️ Cloud Deployment

### Heroku Deployment

1. **Install Heroku CLI**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

2. **Create Heroku app**
```bash
heroku create expense-tracker-app
heroku addons:create heroku-postgresql:hobby-dev
```

3. **Configure environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_super_secret_key
heroku config:set FRONTEND_URL=https://expense-tracker-app.herokuapp.com
```

4. **Deploy**
```bash
git push heroku main
```

5. **Run migrations**
```bash
heroku run npm run migrate
```

### AWS EC2 Deployment

1. **Launch EC2 instance**
   - Choose Ubuntu 20.04 LTS
   - t3.micro or larger
   - Configure security groups (ports 22, 80, 443, 5000)

2. **Connect and setup**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install PM2
sudo npm install -g pm2
```

3. **Setup database**
```bash
sudo -u postgres psql
CREATE DATABASE expense_tracker;
CREATE USER expense_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO expense_user;
\q
```

4. **Deploy application**
```bash
git clone https://github.com/yourusername/expense-tracker.git
cd expense-tracker

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# Setup environment
cp .env.example .env
# Edit .env with production values

# Run migrations
npm run migrate

# Start with PM2
pm2 start backend/server.js --name expense-tracker
pm2 startup
pm2 save
```

5. **Setup Nginx (optional)**
```bash
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/expense-tracker
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### DigitalOcean App Platform

1. **Create new app**
   - Connect GitHub repository
   - Choose Node.js environment

2. **Configure build settings**
```yaml
# .do/app.yaml
name: expense-tracker
services:
- name: web
  source_dir: /
  github:
    repo: yourusername/expense-tracker
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: JWT_SECRET
    value: your_secret_here
databases:
- name: expense-db
  engine: PG
  version: "13"
```

3. **Deploy**
   - Push to main branch
   - App Platform will auto-deploy

## 🖥️ VPS Deployment

### Ubuntu/Debian VPS Setup

1. **Initial server setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install PM2
sudo npm install -g pm2
```

2. **Database setup**
```bash
sudo -u postgres createdb expense_tracker
sudo -u postgres createuser --interactive expense_user
sudo -u postgres psql -c "ALTER USER expense_user PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO expense_user;"
```

3. **Application deployment**
```bash
# Clone repository
git clone https://github.com/yourusername/expense-tracker.git /var/www/expense-tracker
cd /var/www/expense-tracker

# Install dependencies
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build

# Setup environment
cp .env.example .env
nano .env  # Configure with production values

# Run migrations
npm run migrate

# Start application
pm2 start backend/server.js --name expense-tracker
pm2 startup
pm2 save
```

4. **Nginx configuration**
```bash
sudo nano /etc/nginx/sites-available/expense-tracker
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Serve static files
    location /static/ {
        alias /var/www/expense-tracker/frontend/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend routes
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/expense-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **SSL Certificate with Let's Encrypt**
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Required
NODE_ENV=production
DB_HOST=your_db_host
DB_NAME=expense_tracker
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secure_jwt_secret
FRONTEND_URL=https://your-domain.com

# Optional
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
REDIS_URL=redis://localhost:6379
```

### Security Checklist

- [ ] Use strong, unique passwords
- [ ] Enable firewall (ufw on Ubuntu)
- [ ] Configure SSL/TLS certificates
- [ ] Set up regular backups
- [ ] Enable fail2ban for SSH protection
- [ ] Use environment variables for secrets
- [ ] Enable database connection encryption
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Use HTTPS everywhere

## 📊 Monitoring & Maintenance

### PM2 Monitoring
```bash
# View logs
pm2 logs expense-tracker

# Monitor performance
pm2 monit

# Restart application
pm2 restart expense-tracker

# Update application
git pull origin main
npm install --production
pm2 restart expense-tracker
```

### Database Backup
```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U expense_user expense_tracker > /home/ubuntu/backups/expense_tracker_$DATE.sql
find /home/ubuntu/backups -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup-db.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/expense-tracker
```

```
/home/ubuntu/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U expense_user -d expense_tracker
```

2. **Application Won't Start**
```bash
# Check PM2 logs
pm2 logs expense-tracker

# Check environment variables
pm2 env 0
```

3. **Nginx 502 Bad Gateway**
```bash
# Check if app is running
pm2 status

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

4. **SSL Certificate Issues**
```bash
# Renew certificate
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
```

### Application Optimization
```bash
# Enable gzip compression in Nginx
sudo nano /etc/nginx/nginx.conf

# Add to http block:
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### Monitoring Setup
```bash
# Install monitoring tools
npm install -g clinic
npm install -g autocannon

# Performance testing
autocannon -c 10 -d 30 http://localhost:5000/api/health
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd backend && npm ci
        cd ../frontend && npm ci
        
    - name: Run tests
      run: |
        cd backend && npm test
        cd ../frontend && npm test
        
    - name: Build frontend
      run: cd frontend && npm run build
      
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.4
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/expense-tracker
          git pull origin main
          cd backend && npm ci --production
          cd ../frontend && npm ci && npm run build
          pm2 restart expense-tracker
```

---

For additional support, please refer to the main README.md or create an issue in the repository.