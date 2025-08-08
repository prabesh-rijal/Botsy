# 🤖 Chatbot Builder MVP (React + FastAPI + Supabase)

A lightweight chatbot builder platform where users can sign up, create custom bots with file/URL-based knowledge, and interact with them through a clean chat UI.


## ⚙️ Tech Stack

| Layer      | Tech                                   |
|------------|---------------------------------------|
| Frontend   | React + TypeScript + Vite              |
| Backend    | FastAPI                                |
| Auth       | Supabase Auth                          |
| Database   | Supabase Postgres                      |
| Styling    | Tailwind CSS + shadcn/ui               |
| LLM API    | Groq (Llama3 – Free API)               |
| Embeddings | Local (Sentence Transformers)          |


## 🔧 Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend `.env`:**
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key


**Frontend `.env`:**
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

## 🚀 Installation & Setup

Follow these steps to get started:

### 1. Clone the Repository

```bash
git clone https://github.com/prabesh-rijal/Botsy.git
cd Botsy
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Frontend

```bash
cd ../frontend
npm install
npm run dev
```

## 📖 Usage

1. **Create Account**: Sign up in the dashboard  
2. **Create Bot**: Upload documents or provide URLs  
3. **Get Embed Code**: Click "Get Embed Code" for any bot  
4. **Embed**: Add the generated code to your website  


## 🧾 Iteration Docs
<!-- ITERATION_DOCS_START -->
- [📌 Iteration 01 – Bot Menu Options & Chat UI Enhancements](docs/it01_botoptions-chatui-update.md)
- [📌 Iteration 02 – Automated Options](docs/it02_second.md)
<!-- ITERATION_DOCS_END -->
