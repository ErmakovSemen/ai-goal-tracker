#!/bin/bash
# Quick install script for Ollama

echo "=== Ollama Installation ==="
echo ""

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS"
    if command -v brew &> /dev/null; then
        echo "Installing via Homebrew..."
        brew install ollama
    else
        echo "Homebrew not found. Please install Ollama manually:"
        echo "1. Download from https://ollama.ai/download"
        echo "2. Or install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Detected Linux"
    echo "Installing via install script..."
    curl -fsSL https://ollama.ai/install.sh | sh
else
    echo "Unsupported OS. Please install Ollama manually from https://ollama.ai/download"
    exit 1
fi

echo ""
echo "=== Installation complete! ==="
echo ""
echo "Next steps:"
echo "1. Start Ollama: ollama serve"
echo "2. In another terminal, pull a model: ollama pull llama3.2"
echo "3. Restart your backend"
