# AdBot — Smart Personalized Advertising & Analytics Platform

AdBot is an interactive advertising web application that personalizes video offers based on audience **Category** and **Interests**, generates instant **Discount Coupons & QR Codes**, includes a **Bilingual AI Chatbot (English & Arabic)**, and provides a **Standalone Analytics Dashboard**.

---

## Implemented Features

1. **Personalized User Flow**
   - **Welcome Screen** (`index.html`) -> **Category Selection** (`categories.html`: Children, Teenagers, Adults, Family, Friends, Visitors) -> **Interests Selection** (`interests.html`: Gaming, Food, Entertainment, Shopping, Travel) -> **Filtered Video Ads** (`ads.html`) -> **Coupon & QR Code Generator** (`coupon.html`).
   - Works out-of-the-box with built-in fallback catalog data (even without MySQL or SQL Server running).

2. **Trained Bilingual AI Chatbot (EN / AR)**
   - Available across all customer pages (`js/chatbot.js`, `chatbotBrain.js`).
   - Understands both **English** and **Arabic**, detects age/category/interests from messages, and recommends matching offers.
   - Training phrases, keywords, and intents live in `data/chatbot-training.json` for easy updates.

3. **Standalone Analytics Dashboard**
   - Separate admin view at `http://localhost:3001/dashboard.html`.
   - Tracks total visits, unique visitors, page views, top categories, popular interests, video views & completion rates, claimed coupons, and chatbot insights (`data/analytics.json`).

---

## Quick Start (Team Setup)

### Requirements
- [Node.js](https://nodejs.org/) (v18+ recommended)

### Run Locally
```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```
*(On Windows, you can also double-click `start-adbot.bat`.)*

### Open in Browser
- **Website:** http://localhost:3001
- **Standalone Analytics Dashboard:** http://localhost:3001/dashboard.html

> **Optional Database:** Copy `.env.example` to `.env` if you want to connect a local MySQL instance (`adbot_db`). If MySQL is not running, the server automatically uses the local fallback catalog.

---

## Project Structure

```text
├── index.html               # Welcome page
├── categories.html          # Step 1: Audience category selection
├── interests.html           # Step 2: Personal interests selection
├── ads.html                 # Step 3: Filtered video advertisements
├── coupon.html              # Step 4: Discount code & QR code generator
├── dashboard.html           # Standalone analytics dashboard
├── server.js                # Express server & API routes
├── chatbotBrain.js          # Bilingual NLU & recommendation engine
├── analyticsStore.js        # Persistent JSON analytics tracker
├── data/
│   └── chatbot-training.json # Editable intents & keywords (EN/AR)
├── css/                     # Stylesheets (style.css, dashboard.css)
├── js/                      # Frontend logic (script.js, chatbot.js, dashboard.js)
├── videos/                  # Promotional video assets
└── backend/                 # Optional Python FastAPI + Gemini backend
```
