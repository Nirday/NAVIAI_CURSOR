#!/bin/bash

# Setup script for local development with mock data
# This script helps set up the environment for local development

echo "🚀 Setting up Navi AI for local development..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Local Development Configuration
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=naviai.local

# Optional: Add your OpenAI API key if you want to test AI features
# OPENAI_API_KEY=your-key-here
EOF
    echo "✅ Created .env.local file"
else
    echo "ℹ️  .env.local already exists"
    echo "   Make sure it contains: NEXT_PUBLIC_USE_MOCK_DATA=true"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "The application will use mock data automatically."
echo "Mock User ID: mock-user-123"
echo "Mock Website: Bella's Bakery"

