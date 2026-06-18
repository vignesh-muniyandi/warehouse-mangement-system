# Production Deployment Checklist

**Last Updated**: June 18, 2026  
**Version**: 1.0.0

---

## 🔒 Security Checklist

### Secrets & Environment Variables
- [ ] Generate strong JWT secrets (32+ characters):
  ```bash
  openssl rand -base64 32  # Run 3 times for JWT, Refresh, Reset tokens
  ```
- [ ] Store secrets in `.env` (never commit to git)
- [ ] Use different secrets for development and production
- [ ] Rotate secrets periodically (quarterly recommended)
- [ ] Add `.env` to `.gitignore` (already in template)

### Database Security
- [ ] Create dedicated PostgreSQL user (not postgres):
  ```sql
  CREATE USER wms_user WITH PASSWORD 'strong_random_password';
  CREATE DATABASE wms_db OWNER wms_user;
  ```
- [ ] Restrict user permissions:
  ```sql
  GRANT CONNECT ON DATABASE wms_db TO wms_user;
  GRANT USAGE ON SCHEMA public TO wms_user;
  GRANT CREATE ON SCHEMA public TO wms_user;
  ```
- [ ] Enable SSL for database connections (production):
  ```env
  DB_SSL=require
  ```
- [ ] Regular backups (daily):
  ```bash
  pg_dump wms_db | gzip > backup_$(date +%Y%m%d).sql.gz
  ```
- [ ] Test restore procedure monthly

### API Security
- [ ] Enable HTTPS/TLS (SSL certificate):
  ```nginx
  listen 443 ssl http2;
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
  ```
- [ ] Set secure cookie flags:
  ```env
  # Already set in code for production
  # Verify in authRoutes.js: secure, httpOnly, sameSite=strict
  ```
- [ ] Enable CORS only for trusted origins:
  ```env
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```
- [ ] Set security headers (Helmet middleware enabled):
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```
- [ ] Implement rate limiting:
  ```env
  RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
  RATE_LIMIT_MAX_REQUESTS=10     # 10 requests per window
  ```

### Code Security
- [ ] Run npm security audit:
  ```bash
  npm audit fix  # Fix vulnerabilities
  npm audit      # Check remaining
  ```
- [ ] Update dependencies:
  ```bash
  npm update
  npm outdated
  ```
- [ ] Enable helmet.js (already enabled):
  ```javascript
  app.use(helmet());
  ```
- [ ] Input validation on all endpoints (already implemented)
- [ ] SQL injection prevention (using parameterized queries)
- [ ] No sensitive data in logs (check authService.js, controllers)

---

## 📊 Database & Performance

### Database Optimization
- [ ] Create indexes on frequently queried columns:
  ```sql
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_users_role_id ON users(role_id);
  CREATE INDEX idx_orders_status ON orders(status);
  CREATE INDEX idx_tasks_assigned_user_id ON tasks(assigned_user_id);
  CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
  ```
- [ ] Vacuum and analyze tables:
  ```bash
  vacuumdb -U wms_user -d wms_db -z
  ```
- [ ] Connection pooling configured (using node-postgres pool)
- [ ] Monitor slow queries:
  ```sql
  ALTER SYSTEM SET log_statement = 'all';
  ALTER SYSTEM SET log_duration = on;
  SELECT pg_reload_conf();
  ```

### Caching (Redis)
- [ ] Configure Redis persistence:
  ```
  appendonly yes
  appendfsync everysec
  save 900 1        # Save if 1 key changed in 15 minutes
  save 300 10       # Save if 10 keys changed in 5 minutes
  ```
- [ ] Set Redis password:
  ```env
  REDIS_URL=redis://:your_password@localhost:6379
  ```
- [ ] Monitor Redis memory:
  ```bash
  redis-cli INFO memory
  ```
- [ ] Set maxmemory policy:
  ```
  maxmemory 2gb
  maxmemory-policy allkeys-lru
  ```

---

## 🚀 Deployment (Choose One)

### Option 1: Docker (Recommended)

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY src src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  db:
    image: postgres:14-alpine
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    env_file: .env
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

Deploy:
```bash
docker-compose up -d
docker-compose logs -f backend
```

### Option 2: PM2 (Process Manager)

#### Install PM2
```bash
npm install -g pm2
pm2 startup
pm2 save
```

#### Backend Process
```bash
cd backend
pm2 start src/index.js --name "wms-backend" --env production
pm2 save
```

#### Frontend Build & Serve
```bash
cd frontend
npm run build
pm2 serve build 3000 --spa
pm2 save
```

#### Monitor
```bash
pm2 monit
pm2 logs wms-backend
```

### Option 3: Kubernetes (Advanced)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wms-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: wms-backend
  template:
    metadata:
      labels:
        app: wms-backend
    spec:
      containers:
      - name: backend
        image: your-registry/wms-backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: wms-secrets
              key: jwt-secret
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
```

Deploy:
```bash
kubectl create secret generic wms-secrets --from-literal=jwt-secret=your_secret
kubectl apply -f deployment.yaml
kubectl get pods
```

---

## 📈 Monitoring & Logging

### Application Monitoring
- [ ] Set up error tracking (Sentry):
  ```env
  SENTRY_DSN=https://key@sentry.io/123456
  ```
  ```javascript
  // In backend/src/index.js
  const Sentry = require("@sentry/node");
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  app.use(Sentry.Handlers.errorHandler());
  ```

- [ ] Monitor performance (New Relic, DataDog):
  ```env
  NEW_RELIC_LICENSE_KEY=your_key
  NEW_RELIC_APP_NAME=wms-backend
  ```

- [ ] Set up alerts for:
  - Database connection failures
  - Redis connection failures
  - High error rate (>1%)
  - Slow API responses (>1s)

### Logging
- [ ] Centralize logs (ELK Stack, Splunk, CloudWatch):
  ```javascript
  // Use winston or bunyan for structured logging
  const winston = require('winston');
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
  ```

- [ ] Log retention policy: 30 days minimum
- [ ] Audit log retention: 90 days minimum
- [ ] Separate logs:
  - Application logs
  - Access logs
  - Error logs
  - Audit logs

---

## 🧪 Testing

### Automated Tests
- [ ] Unit tests for services:
  ```bash
  npm test -- --coverage
  ```
- [ ] Integration tests for endpoints:
  ```javascript
  // Example: test/auth.test.js
  const request = require('supertest');
  const app = require('../src/index');
  
  describe('POST /auth/login', () => {
    it('should return token on valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'password' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });
  ```
- [ ] Load testing (k6, Artillery):
  ```javascript
  // k6 test
  import http from 'k6/http';
  import { check } from 'k6';
  
  export const options = {
    vus: 100,
    duration: '30s',
  };
  
  export default function() {
    const res = http.get('https://yourdomain.com/api/dashboard/manager/summary', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    check(res, {
      'status is 200': r => r.status === 200,
      'response time < 500ms': r => r.timings.duration < 500,
    });
  }
  ```

### Manual Testing
- [ ] Test all RBAC scenarios:
  - Admin access to all modules
  - Manager access restricted to warehouse
  - Worker access only to own tasks
  - Delivery access only to own shipments
- [ ] Test token expiration and refresh
- [ ] Test failed login lockout
- [ ] Test password reset flow
- [ ] Test permission denials (403 responses)

---

## 📋 Pre-Launch Checklist

### Backend
- [ ] `.env` configured with production secrets
- [ ] Database initialized and tested
- [ ] Redis running and tested
- [ ] All npm dependencies updated
- [ ] `npm audit` passed (no vulnerabilities)
- [ ] HTTPS/TLS certificate installed
- [ ] CORS origins configured
- [ ] Rate limiting enabled
- [ ] Error tracking (Sentry) configured
- [ ] Logging centralized
- [ ] Database backups automated
- [ ] PM2 or Docker configured
- [ ] Load tested (100+ concurrent users)

### Frontend
- [ ] Build optimized: `npm run build`
- [ ] No console errors/warnings in dev tools
- [ ] All routes protected
- [ ] Token refresh working
- [ ] Error pages styled
- [ ] Images optimized
- [ ] Deployed to CDN (Vercel, Netlify, S3 + CloudFront)
- [ ] SSL certificate installed
- [ ] Gzip compression enabled

### Infrastructure
- [ ] Database backups: daily
- [ ] Redis backups: daily
- [ ] Monitoring alerts: configured
- [ ] Uptime monitoring: configured (UptimeRobot)
- [ ] SSL certificate auto-renewal: enabled
- [ ] Firewall rules: configured
- [ ] DDoS protection: enabled (Cloudflare)

### Documentation
- [ ] Runbook created (how to start/stop/restart services)
- [ ] Incident response plan documented
- [ ] Administrator contacts listed
- [ ] Backup/restore procedures documented
- [ ] Database migration guide prepared

---

## 🚨 Post-Launch Monitoring

### First Week
- [ ] Monitor 24/7 for errors
- [ ] Check database performance
- [ ] Verify backups are working
- [ ] Monitor API response times
- [ ] Check logs for security issues
- [ ] Test failover procedures

### Ongoing
- [ ] Weekly: Review logs and errors
- [ ] Monthly: Review security audit logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Penetration testing
- [ ] Quarterly: Disaster recovery drill
- [ ] Annual: Security audit

---

## 📞 Incident Response

### Database Connection Lost
1. Check PostgreSQL service: `systemctl status postgresql`
2. Check network connectivity: `ping db-server`
3. Check credentials in `.env`
4. Restart service: `systemctl restart postgresql`
5. Check backups are available

### API Unresponsive
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs`
3. Restart service: `pm2 restart wms-backend`
4. Check system resources: `top`, `free -h`
5. Scale up if needed

### Data Loss
1. Stop all services (prevent corruption)
2. Restore from latest backup: `pg_restore backup.sql`
3. Verify data integrity
4. Restart services
5. Notify users of downtime

---

## ✅ Final Verification

Before going live:

```bash
# Backend health check
curl https://yourdomain.com/health

# Frontend loads
curl https://yourdomain.com

# Login works
curl -X POST https://yourdomain.com/auth/login \
  -d '{"email":"manager@wms.example.com","password":"password"}'

# Database connected
psql -U wms_user -d wms_db -c "SELECT COUNT(*) FROM users;"

# Redis connected
redis-cli ping

# HTTPS certificate valid
openssl s_client -connect yourdomain.com:443
```

---

## 🎉 You're Ready to Launch!

When all checkboxes are checked, your WMS RBAC system is ready for production.

**Good luck! 🚀**
