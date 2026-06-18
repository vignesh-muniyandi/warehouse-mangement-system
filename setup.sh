#!/bin/bash

# ============================================
# WMS Backend & Frontend Setup Script
# ============================================

set -e

echo "🚀 WMS - Role-Based Access Control Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm is not installed. Please install npm 8+${NC}"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo -e "${YELLOW}⚠️  PostgreSQL client not found. You'll need to initialize the database manually.${NC}"
fi

if ! command -v redis-cli &> /dev/null; then
  echo -e "${YELLOW}⚠️  Redis CLI not found. Make sure Redis is running.${NC}"
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"
echo ""

# Backend Setup
echo "⚙️  Setting up Backend..."
cd backend

if [ ! -f ".env" ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
  echo -e "${YELLOW}📝 Please edit backend/.env with your database and JWT secrets${NC}"
  echo "   - Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME"
  echo "   - Generate JWT secrets: openssl rand -base64 32"
  read -p "Press Enter after updating .env..."
fi

echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Database Setup
echo "🗄️  Setting up Database..."
read -p "Do you want to initialize the PostgreSQL schema? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -f "src/scripts/schema.sql" ]; then
    echo "Would you like to seed test data? (y/n)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "📝 Running schema + seed..."
      # Note: Adjust connection string based on your .env
      # psql -U postgres -d wms_db -f src/scripts/schema.sql
      # psql -U postgres -d wms_db -f src/scripts/seed.sql
      echo -e "${YELLOW}⚠️  Please run these commands manually:${NC}"
      echo "   psql -U postgres -d wms_db -f src/scripts/schema.sql"
      echo "   psql -U postgres -d wms_db -f src/scripts/seed.sql"
    fi
  else
    echo -e "${YELLOW}⚠️  Schema file not found at src/scripts/schema.sql${NC}"
  fi
fi

echo ""
echo "✅ Backend setup complete!"
echo ""

# Frontend Setup
echo "⚙️  Setting up Frontend..."
cd ../frontend

if [ ! -f ".env.local" ]; then
  echo "📄 Creating .env.local..."
  echo "REACT_APP_API_URL=http://localhost:4000/api" > .env.local
  echo -e "${GREEN}✓ .env.local created${NC}"
fi

echo "📦 Installing frontend dependencies..."
npm install --legacy-peer-deps

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "🚀 To start the application:"
echo ""
echo "   Terminal 1 - Backend:"
echo "   $ cd backend"
echo "   $ npm run dev"
echo ""
echo "   Terminal 2 - Frontend:"
echo "   $ cd frontend"
echo "   $ npm start"
echo ""
echo "📖 Documentation:"
echo "   - Setup Guide: ../RBAC_SETUP.md"
echo "   - Backend Routes: http://localhost:4000"
echo "   - Frontend App: http://localhost:3000"
echo ""
echo "🔐 Default Test Users (if seeded):"
echo "   - Admin: admin@wms.example.com / Admin@12345"
echo "   - Manager: manager@wms.example.com / Manager@12345"
echo "   - Worker: worker@wms.example.com / Worker@12345"
echo "   - Delivery: delivery@wms.example.com / Delivery@12345"
echo ""
echo -e "${YELLOW}⚠️  Before running:${NC}"
echo "   1. Ensure PostgreSQL is running"
echo "   2. Ensure Redis is running"
echo "   3. Update backend/.env with your database credentials"
echo "   4. Run database schema initialization"
echo ""
