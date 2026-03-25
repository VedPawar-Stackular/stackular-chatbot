# Stackular Website Chatbot

This project is an AI-powered website chatbot designed for the Stackular website. It provides automated, context-aware responses to user queries relating to Stackular's services, industry expertise, and company contact information.

## What We Did

We built an intelligent Retrieval-Augmented Generation (RAG) chatbot capable of answering questions about Stackular. To ensure the bot has the most up-to-date and accurate context, it scrapes text directly from Stackular's public web pages, stores the text in a vector database, and retrieves the relevant context dynamically to answer user questions. 

## How We Did It (Architectural Flow)

The application architecture is divided into a robust Python backend and a modern React frontend:

1. **Web Scraping:** A Selenium web scraper visits a curated list of Stackular URLs, executes any JavaScript required, and extracts clean text using BeautifulSoup.
2. **Data Chunking:** Langchain's `RecursiveCharacterTextSplitter` breaks the scraped text down into smaller, manageable chunks.
3. **Embedding Generation:** The text chunks are converted into mathematical vector representations using an embedding model.
4. **Vector Database:** These vector representations are uploaded and stored in a Pinecone vector index.
5. **Retrieval and Generation (Backend):** 
   - A FastAPI application serves as the core backend.
   - When a user submits a question via the `/chat` endpoint, the query is converted into an embedding using the identical embedding model.
   - The system queries Pinecone to retrieve the top matching text chunks from the original website material.
   - The retrieved context and the user query are injected into a strict system prompt and sent to an active LLM to generate the final, precise answer.
6. **User Interface (Frontend):** A Next.js application provides the chat interface, communicating asynchronously with the FastAPI backend to display responses.

## Models and Technologies Used

### Core Models
- **Embedding Model:** `BAAI/bge-small-en` (loaded locally via HuggingFace's `sentence-transformers`). This converts page text into dimensional vectors suitable for Pinecone.
- **Large Language Model (LLM):** `llama-3.3-70b-versatile` (served remotely via the Groq API). We selected this model for its fast inference speed, cost-effectiveness, and high accuracy for contextual retrieval tasks.

### Infrastructure stack
- **Vector Database:** Pinecone
- **Web App Framework:** Next.js (React)
- **Backend API:** FastAPI running on Uvicorn
- **Scraping Toolkit:** Selenium and BeautifulSoup 4
- **Orchestration:** Langchain (for text splitting and message formatting)

## Try the Chatbot

You can test the frontend web application in your local environment by following the setup steps below.

*(Placeholder: Link to the deployed application will go here once hosted publicly).*

## How to Run the Project Locally

Follow these steps to get both the frontend and backend running on your machine natively in a single command.

### 1. Prerequisites
Ensure you have the following installed on your system:
- Python 3.10+
- Node.js & npm (v18+)

### 2. Environment Configuration
Navigate to the `stackular-api` folder and ensure your `.env` file is properly configured with your API keys:

```text
GROQ_API_KEY=your_groq_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
```

### 3. Install Root Dependencies
From the root of the project directory (`Stackular_Demo`), install the global development dependencies that allow running the app in one command:

```bash
npm install
```

### 4. Install Component Dependencies
Make sure both halves of the project are set up:

**Backend:**
```bash
cd stackular-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd stackular-frontend
npm install
cd ..
```

### 5. Start the Application
Return to the root directory (`Stackular_Demo`) and run the following command to boot both systems concurrently. The backend API handles its own model downloading and index creation dynamically if it is empty.

```bash
npm run dev:all
```

*(You will see Uvicorn start on port 8000 and Next.js start on port 3000)*

![App Running in Terminal](assests/terminal-output.png)
The Warning Explained<br>
<sub>*UserWarning: Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.*</sub><br>
<sub>*This happens because the library being used (LangChain) internally relies on Pydantic V1, but we are running a very new/experimental version of Python (Python 3.14). Pydantic V1 is officially legacy and has known compatibility issues with newer Python internals.*</sub><br>
<sub>*What should you do? For now, we can ignore it as the app is functional, but for a production environment, it is highly recommended to use Python 3.11 or 3.12, which are the current stable industry standards for AI/ML libraries.*</sub><br>

### 6. Access the Application
Open your web browser and navigate to:
`http://localhost:3000`

![Chatbot User Interface](assests/chatbot-ui.png)
