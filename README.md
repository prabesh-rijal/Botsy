# RAG Botsy v1 🤖

A simple and powerful RAG (Retrieval-Augmented Generation) chatbot system that allows you to create AI assistants trained on your documents and embed them on any website.

## ✨ Features

- **Document Upload**: Support for PDF, TXT, DOCX, and Markdown files
- **URL Scraping**: Extract content from websites automatically
- **Simple Embedding**: Easy copy-paste embed code for any website
- **Multi-tenant**: Support for multiple users and bots
- **Clean UI**: Modern, responsive dashboard with dark theme

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- Supabase account (for database)
- Groq API key (free!)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
python main.py
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Access the Application

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:8000

## 📁 Project Structure

```
RAG_Botsy/
├── backend/           # FastAPI backend
│   ├── main.py       # Main application
│   ├── models.py     # Database models
│   ├── database.py   # Database connection
│   ├── auth/         # Authentication
│   ├── bots/         # Bot management
│   ├── chat/         # Chat functionality
│   ├── routers/      # API routes
│   └── utils/        # Utilities
├── frontend/         # React frontend
│   ├── src/
│   │   ├── pages/    # Dashboard and pages
│   │   ├── components/ # UI components
│   │   └── api/      # API client
│   └── public/
│       └── widget-demo.html # Embed code generator
└── README.md
```

## 🔧 Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env):**

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

**Frontend (.env):**

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📖 Usage

1. **Create Account**: Sign up in the dashboard
2. **Create Bot**: Upload documents or provide URLs
3. **Get Embed Code**: Click "Get Embed Code" for any bot
4. **Embed**: Add the generated code to your website

## 💻 Development

- **Backend**: FastAPI with Supabase
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **AI**: Groq Llama3 + Free Local Embeddings (Sentence Transformers)
# Botsy
