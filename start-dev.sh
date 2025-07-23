#!/bin/bash

echo "🚀 Starting MyTutor Development Environment"
echo "=========================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists ruby; then
    echo "❌ Ruby is not installed. Please install Ruby first."
    exit 1
fi

if ! command_exists mysql; then
    echo "⚠️  MySQL is not installed. Please install MySQL first."
    echo "   You can still run the frontend, but the backend will fail."
fi

echo "✅ Prerequisites check complete"
echo ""

# Start backend
echo "🔧 Starting Rails Backend..."
cd backend

# Check if bundle is installed
if ! command_exists bundle; then
    echo "📦 Installing bundler..."
    gem install bundler
fi

# Install dependencies
echo "📦 Installing Rails dependencies..."
bundle install

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
rails db:create 2>/dev/null || echo "Database already exists"
rails db:migrate

# Start Rails server in background
echo "🚀 Starting Rails server on http://localhost:3000"
rails server -p 3000 &
RAILS_PID=$!

cd ..

# Start frontend
echo "🔧 Starting Angular Frontend..."
cd frontend

# Install dependencies
echo "📦 Installing Angular dependencies..."
npm install

# Start Angular server in background
echo "🚀 Starting Angular server on http://localhost:4200"
ng serve --port 4200 &
ANGULAR_PID=$!

cd ..

echo ""
echo "🎉 Development servers started!"
echo "================================"
echo "📱 Frontend: http://localhost:4200"
echo "🔧 Backend:  http://localhost:3000"
echo "📊 GraphQL:  http://localhost:3000/graphql"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $RAILS_PID 2>/dev/null
    kill $ANGULAR_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait 