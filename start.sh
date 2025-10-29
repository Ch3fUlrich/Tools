#!/bin/bash

# Quick Start Script for Tools Project
# This script helps you quickly set up and run both backend and frontend

set -e

echo "🚀 Tools Project Quick Start"
echo "=============================="
echo ""

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v cargo &> /dev/null; then
        echo "❌ Rust/Cargo not found. Please install from https://rustup.rs/"
        exit 1
    fi
    echo "✅ Rust/Cargo found: $(cargo --version)"
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    echo "✅ Node.js found: $(node --version)"
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm not found. Please install npm"
        exit 1
    fi
    echo "✅ npm found: $(npm --version)"
    if ! command -v docker &> /dev/null; then
        echo "⚠️  docker not found. Docker compose test services will not be available."
    else
        echo "✅ docker found: $(docker --version)"
    fi
    echo ""
}

# Backend setup
setup_backend() {
    echo "🦀 Setting up Rust backend..."
    cd backend
    cargo build
    echo "✅ Backend built successfully"
    cd ..
    echo ""
}

# Frontend setup
setup_frontend() {
    echo "⚛️  Setting up Next.js frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    echo "✅ Frontend dependencies installed"
    cd ..
    echo ""
}

# Run backend
run_backend() {
    echo "🚀 Starting backend on http://localhost:3001"
    cd backend
    # Run backend in background; inherits terminal environment
    cargo run &
    BACKEND_PID=$!
    cd ..
    echo "Backend PID: $BACKEND_PID"
}

# Run frontend
run_frontend() {
    echo "🚀 Starting frontend on http://localhost:3000"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo "Frontend PID: $FRONTEND_PID"
}

run_docker_compose() {
    # Start the test services (Postgres + Redis) if docker is available
    if command -v docker >/dev/null 2>&1; then
        echo "🚢 Starting docker-compose test services..."
        docker compose -f backend/docker-compose.test.yml up -d || true
    else
        echo "⚠️  docker not available; skipping docker-compose startup"
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Ensure docker compose stack is torn down if we brought it up
    if command -v docker >/dev/null 2>&1; then
        docker compose -f backend/docker-compose.test.yml down -v || true
    fi
    echo "👋 Goodbye!"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    check_prerequisites
    
    if [ "$1" == "setup" ]; then
        setup_backend
        setup_frontend
        echo "✨ Setup complete! Run './start.sh' to start the servers."
        exit 0
    fi
    
    if [ "$1" == "backend" ]; then
        run_backend
        echo ""
        echo "✅ Backend running. Press Ctrl+C to stop."
        wait $BACKEND_PID
        exit 0
    fi
    
    if [ "$1" == "frontend" ]; then
        run_frontend
        echo ""
        echo "✅ Frontend running. Press Ctrl+C to stop."
        wait $FRONTEND_PID
        exit 0
    fi
    
    # Default: run both
    setup_backend
    setup_frontend
    
    echo "🎉 Starting both servers..."
    echo ""
    # Start the compose test services first so backend can connect if needed
    run_docker_compose
    run_backend
    sleep 2
    run_frontend
    
    echo ""
    echo "✅ Both services running!"
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:3001"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
}

# Show help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: ./start.sh [command]"
    echo ""
    echo "Commands:"
    echo "  (none)      - Build and run both backend and frontend"
    echo "  setup       - Only build/setup without running"
    echo "  backend     - Run only backend"
    echo "  frontend    - Run only frontend"
    echo "  --help, -h  - Show this help message"
    echo ""
    exit 0
fi

main "$@"
