# TraderMind

**TraderMind** is a premium, AI-enhanced trading intelligence dashboard designed for the Deriv platform. It features a modern "Glassmorphism" UI, real-time data streaming, role-based session management, and a deterministic AI evaluation engine.

![TraderMind Dashboard](frontend/public/tradermind-logo.png)

## 🚀 Key Features

*   **Premium SPA UI**: Glassmorphism design, dynamic theming (Cyberpunk, Midnight), and smooth transitions.
*   **Real-Time Data**: WebSocket streaming for account balances and multi-account support (Real/Demo).
*   **Role-Based Access**: strict separation between Admin (Session Control) and User (Read-Only) roles.
*   **AI Intelligence Engine**: Evaluation-only AI that provides confidence decay and anomaly scores—never trading advice.
*   **Local AI Training**: Utilities to fine-tune local LLMs (via Ollama) on safety and evaluation protocols.

## 🛠️ Architecture

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query.
*   **Backend (API Gateway)**: Node.js, Express, WebSocket.
*   **AI Layer**: Python, FastAPI, Deterministic Logic Engine.

## 📦 Installation & Setup

### Prerequisites
*   Node.js v18+
*   Python 3.10+
*   Ollama (optional, for local AI training)

### 1. Backend Setup
```bash
# Install API Gateway dependencies
cd backend/api-gateway
npm install
npm run build
npm start
```

### 2. AI Layer Setup
```bash
cd backend/ai-layer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🧠 AI Training (Ollama)

TraderMind includes tools to train a local AI model that understands its specific risk language and constraints.

1.  **Generate Dataset**:
    ```bash
    cd backend/ai-layer
    python3 scripts/generate_eval_data.py
    python3 scripts/generate_qa_refusals.py
    python3 scripts/prepare_training_set.py
    ```
    This creates `datasets/tradermind_finetune.jsonl` (52,500 records).

2.  **Create Model**:
    Ensure Ollama is installed and running.
    ```bash
    ollama create tradermind -f Modelfile
    ```

3.  **Run Model**:
    ```bash
    ollama run tradermind
    ```

## 🔐 Security & Constraints
*   **Encryption**: Sensitive tokens are handled securely.
*   **AI Safety**: The AI is hard-coded to **never** provide trading instructions (Buy/Sell/Enter/Exit). It is an **Evaluation Only** engine.
*   **RBAC**: Session controls are strictly validated on the backend.

## 📄 License
Private & Confidential.
