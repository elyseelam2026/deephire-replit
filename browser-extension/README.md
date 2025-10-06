# 🚀 DeepHire LinkedIn Importer

A Chrome browser extension that reads LinkedIn profiles you're viewing and imports them into DeepHire for AI-powered biography generation.

## ✨ Features

- **No Scraping**: Reads the page you're already viewing (similar to Apollo, Lusha)
- **Works with Your Login**: Uses your own LinkedIn session
- **AI Biography Generation**: Automatically creates professional 3-section biographies
- **Smart Matching**: Updates existing candidates or creates new ones
- **Full Data Extraction**: Name, headline, experience, education, skills, location

## 📦 Installation

See `INSTALLATION.txt` for detailed step-by-step instructions.

Quick start:
1. Set `EXTENSION_API_KEY` secret in Replit
2. Load unpacked extension in Chrome from this folder
3. Configure API URL and key in extension popup
4. Visit LinkedIn profiles and click "Import to DeepHire" button

## 🔒 Privacy & Legal

- Extension only reads pages you manually visit
- No automated browsing or scraping
- Uses your own LinkedIn account
- Similar approach to popular tools (Apollo.io, Lusha, etc.)
- Gray area but widely accepted industry practice

## 🛠 Technical Details

- Manifest V3 Chrome extension
- Content script extracts DOM data
- Secure API communication with DeepHire backend
- Real-time biography generation using xAI Grok

Built for DeepHire talent acquisition platform.
