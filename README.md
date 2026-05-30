# 🎥 VidMind AI

> AI-Powered Video Intelligence Platform that transforms videos into searchable knowledge using Transcription, RAG, and Multi-Video AI Chat.

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![LangChain](https://img.shields.io/badge/LangChain-RAG-orange)
![Whisper](https://img.shields.io/badge/Faster--Whisper-STT-red)
![ChromaDB](https://img.shields.io/badge/ChromaDB-VectorDB-purple)

---

## 🚀 Overview

VidMind AI is an AI-powered video research assistant that converts YouTube videos and local media files into an interactive knowledge base.

Instead of watching hours of content, users can:

- Generate AI summaries
- Extract key takeaways
- Understand important concepts
- Ask questions about videos
- Compare multiple videos
- View timestamped sources
- Export insights

---

## ✨ Features

### 📹 Video Analysis

- YouTube URL support
- Local file support
- Automatic audio extraction
- Faster-Whisper transcription
- AI-generated titles

### 📝 AI Insights

- Summary generation
- Key takeaways
- Important concepts
- Interesting questions
- Suggested questions

### 💬 Chat With Videos

- Retrieval-Augmented Generation (RAG)
- Source-grounded answers
- Timestamp references
- Conversation history

### 📚 Multi-Video Research

- Chat across multiple videos
- Cross-video reasoning
- Multi-video comparison
- Unified source retrieval

### 🧠 RAG Pipeline

- ChromaDB vector storage
- Semantic retrieval
- Re-ranking
- Source attribution

### 📄 Export

- Summary PDF
- Chat PDF
- Transcript download

---

## 🏗️ Architecture

```text
User
 │
 ▼
Video Input
 │
 ▼
Audio Processing
 │
 ▼
Faster Whisper
 │
 ▼
Transcript
 │
 ├── Summary
 ├── Key Takeaways
 ├── Concepts
 ├── Questions
 │
 ▼
RAG Pipeline
 │
 ├── ChromaDB
 ├── Retriever
 ├── Re-Ranker
 │
 ▼
AI Chat
 │
 ▼
Answer + Sources
```

---

## 🛠️ Tech Stack

### Backend

- FastAPI
- Python

### AI & NLP

- Ollama
- LangChain
- Faster-Whisper

### Vector Database

- ChromaDB

### Audio Processing

- yt-dlp
- FFmpeg

### Frontend

- Streamlit (Current)
- Next.js + Tailwind (Planned)

---

## 📂 Project Structure

```bash
VidMind-AI/
│
├── backend/
│   └── api.py
│
├── core/
│   ├── transcriber.py
│   ├── summarizer.py
│   ├── extractor.py
│   ├── rag_chain.py
│   ├── reranker.py
│   └── suggested_questions.py
│
├── utils/
│   ├── audio_processor.py
│   ├── pdf_export.py
│   └── text_cleaner.py
│
├── vector_db/
├── downloads/
│
├── app.py
├── main.py
├── requirements.txt
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|----------|----------|----------|
| GET | `/` | Health Check |
| POST | `/analyze` | Analyze Video |
| GET | `/workspace` | Get Workspace |
| GET | `/video/{id}` | Get Video Details |
| POST | `/chat` | Chat With Video |
| GET | `/chat-history/{id}` | Get Chat History |
| POST | `/multi-chat` | Multi Video Chat |
| GET | `/multi-chat-history/{id}` | Multi Chat History |
| DELETE | `/video/{id}` | Delete Video |

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/DhruvvK05/VidMind-AI.git
cd VidMind-AI
```

### Create Virtual Environment

```bash
python -m venv .venv
```

### Activate Environment

Windows

```bash
.venv\Scripts\activate
```

Mac/Linux

```bash
source .venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Install Ollama

```bash
ollama pull llama3
```

### Run Backend

```bash
uvicorn backend.api:app --reload
```

Open Swagger Docs:

```text
http://127.0.0.1:8000/docs
```

---

## 📸 Screenshots

### Dashboard

_Add screenshot here_

### Video Analysis

_Add screenshot here_

### Chat Interface

_Add screenshot here_

### Multi-Video Research

_Add screenshot here_

---

## 🎯 Roadmap

- [x] Video Transcription
- [x] RAG Chat
- [x] Multi-Video Chat
- [x] Chat History
- [x] Source Attribution
- [ ] Next.js Frontend
- [ ] Authentication
- [ ] Database Persistence
- [ ] Cloud Deployment
- [ ] Knowledge Graph Generation

---

## 👨‍💻 Author

**Dhruv Kimbahune**

Built to make video content searchable, interactive, and instantly useful using AI and Retrieval-Augmented Generation (RAG).