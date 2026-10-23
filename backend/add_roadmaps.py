import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from db import Base
from roadmaps.models import ClubRoadmap
import os
import json

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./club.db")
engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"statement_cache_size": 0})
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

roadmaps_data = {
    "ML": [
        {"title": "Foundations", "topics": ["Python", "NumPy", "Pandas", "Matplotlib / Seaborn", "Linear Algebra", "Probability & Statistics", "Calculus basics"]},
        {"title": "Data Preparation", "topics": ["Data collection", "Data cleaning", "Missing values", "Outlier detection", "Encoding categorical data", "Feature scaling", "Feature engineering", "Train / Validation / Test split", "Data leakage"]},
        {"title": "Supervised Learning", "topics": ["Regression", "Linear Regression", "Polynomial Regression", "Ridge / Lasso / Elastic Net", "Classification", "Logistic Regression", "KNN", "Naive Bayes", "Decision Trees", "Random Forest", "SVM"]},
        {"title": "Unsupervised Learning", "topics": ["K-Means", "Hierarchical Clustering", "DBSCAN", "Gaussian Mixture Models", "PCA", "Dimensionality Reduction"]},
        {"title": "Ensemble Learning", "topics": ["Bagging", "Boosting", "AdaBoost", "Gradient Boosting", "XGBoost", "LightGBM", "CatBoost", "Stacking / Blending"]},
        {"title": "Model Evaluation", "topics": ["Confusion Matrix", "Accuracy", "Precision", "Recall", "F1 Score", "ROC-AUC", "MAE / MSE / RMSE", "R²", "Cross-Validation"]},
        {"title": "Model Optimization", "topics": ["Hyperparameter tuning", "Grid Search", "Random Search", "Bayesian Optimization", "Feature selection", "Regularization", "Bias vs Variance", "Underfitting vs Overfitting"]},
        {"title": "Specialized ML", "topics": ["Time Series", "ARIMA", "SARIMA", "Prophet", "ML-based forecasting", "Recommendation Systems", "Anomaly Detection", "Imbalanced Learning", "Graph ML"]},
        {"title": "Advanced ML", "topics": ["Transfer Learning", "Self-Supervised Learning", "Semi-Supervised Learning", "Online Learning", "Federated Learning", "Explainable AI"]},
        {"title": "ML Engineering / MLOps", "topics": ["Model serialization", "APIs with FastAPI", "Docker", "Experiment tracking", "ML pipelines", "Model monitoring", "Data/version management", "CI/CD", "Cloud deployment"]}
    ],
    "DL": [
        {"title": "Foundations", "topics": ["Neural Networks basics", "Perceptron", "Activation Functions", "Loss Functions", "Gradient Descent", "Backpropagation", "Optimizers", "SGD", "Adam", "AdamW", "Regularization", "Dropout", "Batch Normalization", "Weight Decay"]},
        {"title": "Neural Network Architectures", "topics": ["ANN / MLP", "CNN", "RNN", "LSTM", "GRU", "Autoencoders"]},
        {"title": "Computer Vision", "topics": ["Image Classification", "Object Detection", "Image Segmentation", "CNN architectures", "LeNet", "AlexNet", "VGG", "Inception", "ResNet", "EfficientNet", "YOLO", "Vision Transformers (ViT)"]},
        {"title": "Sequence & Language Models", "topics": ["RNN", "LSTM", "GRU", "Seq2Seq", "Attention Mechanism", "Transformers"]},
        {"title": "Generative Deep Learning", "topics": ["Autoencoders", "Variational Autoencoders (VAE)", "GANs", "Diffusion Models"]},
        {"title": "Advanced Deep Learning", "topics": ["Transfer Learning", "Fine-tuning", "Self-Supervised Learning", "Contrastive Learning", "Multimodal Learning", "Vision-Language Models"]},
        {"title": "Modern Architectures", "topics": ["Transformers", "Vision Transformers", "Multimodal Transformers", "Mixture of Experts (MoE)", "Foundation Models"]},
        {"title": "Deep Learning Engineering", "topics": ["PyTorch", "TensorFlow / Keras", "GPU / CUDA basics", "Distributed Training", "Mixed Precision", "Model Optimization", "Quantization", "Model Deployment"]}
    ],
    "RL": [
        {"title": "Foundations", "topics": ["Agent", "Environment", "State", "Action", "Reward", "Policy", "Return", "Value Function", "Q-Function", "Markov Decision Process (MDP)"]},
        {"title": "Basic RL", "topics": ["Multi-Armed Bandits", "Exploration vs Exploitation", "Monte Carlo Methods", "Temporal Difference (TD) Learning", "TD(0)"]},
        {"title": "Value-Based RL", "topics": ["Q-Learning", "SARSA", "Deep Q-Network (DQN)", "Double DQN", "Dueling DQN", "Prioritized Experience Replay"]},
        {"title": "Policy-Based RL", "topics": ["Policy Gradient", "REINFORCE", "Actor-Critic", "Advantage Actor-Critic (A2C)", "Asynchronous Advantage Actor-Critic (A3C)"]},
        {"title": "Modern RL", "topics": ["PPO", "TRPO", "DDPG", "TD3", "SAC"]},
        {"title": "Advanced RL", "topics": ["Model-Based RL", "Model-Free RL", "Offline RL", "Hierarchical RL", "Multi-Agent RL", "Inverse RL", "Imitation Learning", "RL from Human Feedback (RLHF)"]},
        {"title": "RL + Deep Learning", "topics": ["Deep RL", "Neural Network Policies", "Neural Network Value Functions", "CNN + RL", "Transformer + RL"]},
        {"title": "RL Applications", "topics": ["Robotics", "Autonomous Vehicles", "Games", "Recommendation Systems", "Resource Optimization", "Trading", "LLM Alignment / RLHF", "AI Agents"]}
    ],
    "GENAI": [
        {
            "title": "Week 1: LLM Internals & Inference",
            "topics": [
                "AI vs ML vs DL vs GenAI vs LLMs",
                "Tokenization, token IDs & context windows",
                "Token embeddings vs retrieval embeddings",
                "Transformer self-attention & residual layers",
                "Logits, softmax probabilities & sampling (temp, top-p)",
                "Base vs instruction-tuned models & hallucinations",
                "Deliverable: LLM Playground"
            ]
        },
        {
            "title": "Week 2: Prompt Engineering & LLM APIs",
            "topics": [
                "Prompt anatomy: instructions, constraints & examples",
                "Zero-shot, few-shot, role & task decomposition",
                "Structured outputs, JSON schemas & Pydantic validation",
                "Function / tool calling interaction loops",
                "Async requests, streaming & retry with backoff",
                "Prompt evaluation & regression test suites",
                "Deliverable: AI Assistant"
            ]
        },
        {
            "title": "Week 3: RAG Fundamentals & Vector Databases",
            "topics": [
                "End-to-end RAG pipeline: ingest to generate",
                "Document loaders, metadata extraction & chunking strategies",
                "Embedding models & vector similarity metrics",
                "Qdrant vector database & pgvector PostgreSQL extension",
                "Top-k similarity search & metadata filtering",
                "Citations, groundedness & refusal handling",
                "Deliverable: PDF Q&A System"
            ]
        },
        {
            "title": "Week 4: Hybrid Search, Reranking & Adaptive Retrieval",
            "topics": [
                "Lexical BM25 + dense vector search (RRF)",
                "Cross-encoder reranking query-doc pairs",
                "Query rewriting, RAG-Fusion & HyDE",
                "Parent-child retrieval & contextual chunking",
                "Adaptive RAG, Self-RAG & Agentic retrieval",
                "RAG evaluation metrics: Ragas, Recall@K, Faithfulness",
                "Deliverable: Evaluated RAG Benchmark"
            ]
        },
        {
            "title": "Week 5: Function Calling, APIs & MCP",
            "topics": [
                "Tool schemas, required fields & argument validation",
                "Model-application tool execution lifecycle",
                "Idempotency, retries, error handling & allowlists",
                "Model Context Protocol (MCP): host, client & server",
                "Permission boundaries, human approval & secrets safety",
                "Deliverable: MCP Assistant"
            ]
        },
        {
            "title": "Week 6: LangGraph, State, Memory & Agent Loops",
            "topics": [
                "StateGraph, nodes, edges & conditional routing",
                "Planner/executor & ReAct observation-action loops",
                "Short-term thread state & checkpoint persistence",
                "Human-in-the-loop approval interrupts",
                "LangSmith observability & trace telemetry",
                "Deliverable: Personal AI Agent"
            ]
        },
        {
            "title": "Week 7: Multi-Agent Systems & Coordination",
            "topics": [
                "Supervisor router, specialist agents & synthesis",
                "Sequential vs parallel execution & delegation contracts",
                "Researcher, analyst, coder & reviewer roles",
                "Conflict resolution & reviewer rejection loops",
                "Multi-agent latency/cost trade-offs (CrewAI vs AutoGen)",
                "Deliverable: Multi-Agent Research System"
            ]
        },
        {
            "title": "Week 8: Evaluation, Security, Production & Deployment",
            "topics": [
                "Golden evaluation datasets & regression spot-checks",
                "OWASP Top 10 for LLMs: prompt injection defenses",
                "Secrets management, auth, rate limiting & input sanitization",
                "FastAPI production serving, health checks & Dockerization",
                "Threat modeling, system documentation & limitations",
                "Deliverable: Deployed Capstone System"
            ]
        }
    ],
    "AGENTIC": [
        {"title": "Foundations", "topics": ["LLMs", "Prompt Engineering", "Context Management", "Tool / Function Calling", "Structured Outputs", "APIs"]},
        {"title": "Agent Fundamentals", "topics": ["Agent Architecture", "Goals & Tasks", "Planning", "Reasoning", "Decision Making", "Action → Observation → Feedback loop", "State Management"]},
        {"title": "Agent Memory", "topics": ["Short-Term Memory", "Long-Term Memory", "Conversation Memory", "Vector Memory", "Episodic Memory", "Semantic Memory"]},
        {"title": "Tools & Environment", "topics": ["Web Search", "Code Execution", "Database Tools", "APIs", "File Operations", "Browser Automation", "External Services"]},
        {"title": "Agentic RAG", "topics": ["Retrieval", "Query Planning", "Query Rewriting", "Multi-step Retrieval", "Reranking", "Self-RAG", "Corrective RAG", "Adaptive RAG"]},
        {"title": "Planning & Reasoning", "topics": ["Task Decomposition", "Chain-of-Thought", "ReAct", "Reflection", "Self-Correction", "Planning Algorithms", "Reasoning Models"]},
        {"title": "Multi-Agent Systems", "topics": ["Agent-to-Agent Communication", "Specialized Agents", "Supervisor Agent", "Worker Agents", "Hierarchical Agents", "Debate / Collaboration", "Multi-Agent Coordination"]},
        {"title": "Agent Frameworks", "topics": ["LangGraph", "LangChain", "CrewAI", "AutoGen", "OpenAI Agents SDK", "Semantic Kernel"]},
        {"title": "Advanced Agentic AI", "topics": ["Autonomous Agents", "Long-Horizon Tasks", "Computer-Use Agents", "Coding Agents", "Browser Agents", "Multi-Agent Systems", "Agentic Workflows", "Agent-to-Agent Protocols", "MCP"]},
        {"title": "Agent Evaluation & Safety", "topics": ["Task Success Rate", "Tool-Use Accuracy", "Hallucination", "Agent Reliability", "Prompt Injection", "Tool Security", "Permission Management", "Human-in-the-Loop", "Agent Observability"]}
    ],
    "TRANSFORMER": [
        {"title": "Foundations", "topics": ["Neural Networks", "Sequence Modeling", "Tokenization", "Embeddings", "Positional Encoding", "Encoder–Decoder Architecture"]},
        {"title": "Attention", "topics": ["Attention Mechanism", "Query, Key, Value", "Scaled Dot-Product Attention", "Self-Attention", "Cross-Attention", "Multi-Head Attention", "Masked Attention"]},
        {"title": "Transformer Architecture", "topics": ["Encoder", "Decoder", "Feed-Forward Network", "Residual Connections", "Layer Normalization", "Position-wise FFN"]},
        {"title": "Major Transformer Models", "topics": ["BERT — Encoder-only", "GPT — Decoder-only", "T5 — Encoder–Decoder", "ViT — Vision Transformer", "CLIP — Vision + Language", "Whisper — Speech", "Modern LLM architectures"]},
        {"title": "Training", "topics": ["Pretraining", "Next-Token Prediction", "Masked Language Modeling", "Instruction Tuning", "Supervised Fine-Tuning", "RLHF", "DPO"]},
        {"title": "Transformer Optimization", "topics": ["KV Cache", "Flash Attention", "Quantization", "LoRA / QLoRA", "Mixture of Experts (MoE)", "Efficient Attention", "Distributed Training"]},
        {"title": "Advanced Transformers", "topics": ["Long-Context Transformers", "Multimodal Transformers", "Vision-Language Models", "Retrieval-Augmented Transformers", "Reasoning Models", "Agentic Transformers"]}
    ],
    "LLM": [
        {"title": "Foundations", "topics": ["Deep Learning", "Transformers", "Tokenization", "Embeddings", "Attention", "Context Window"]},
        {"title": "LLM Architecture", "topics": ["Encoder-only", "Decoder-only", "Encoder–Decoder", "GPT-style Architecture", "BERT-style Architecture", "Mixture of Experts (MoE)"]},
        {"title": "LLM Pretraining", "topics": ["Dataset Preparation", "Data Cleaning", "Tokenization", "Next-Token Prediction", "Pretraining", "Distributed Training", "GPU/TPU Training"]},
        {"title": "LLM Adaptation", "topics": ["Prompt Engineering", "In-Context Learning", "Instruction Tuning", "Supervised Fine-Tuning (SFT)", "LoRA", "QLoRA", "PEFT"]},
        {"title": "LLM Alignment", "topics": ["RLHF", "DPO", "Preference Optimization", "Safety Alignment", "Human Feedback"]},
        {"title": "LLM Application Engineering", "topics": ["Structured Output", "Function Calling", "Tool Use", "Embeddings", "Vector Databases", "Semantic Search", "RAG", "Hybrid Search", "Reranking"]},
        {"title": "LLM Agents", "topics": ["Agent Architecture", "Planning", "Reasoning", "Memory", "Tool Calling", "Agentic RAG", "Multi-Agent Systems", "MCP"]},
        {"title": "LLM Evaluation", "topics": ["Accuracy", "Factuality", "Hallucination", "Groundedness", "Reasoning Evaluation", "Safety Evaluation", "Benchmarking", "LLM-as-a-Judge"]},
        {"title": "LLM Optimization", "topics": ["Quantization", "KV Cache", "Flash Attention", "Speculative Decoding", "Batching", "Inference Optimization", "Model Compression"]},
        {"title": "Production", "topics": ["Model Serving", "API Deployment", "GPU Infrastructure", "Monitoring", "Observability", "Cost Optimization", "LLM Security"]}
    ],
    "NLP": [
        {"title": "NLP Foundations", "topics": ["Text preprocessing", "Tokenization", "Stopwords", "Stemming / Lemmatization", "Regular Expressions"]},
        {"title": "Text Representation", "topics": ["Bag of Words", "TF-IDF", "Word2Vec", "GloVe", "FastText", "Embeddings"]},
        {"title": "Classical NLP", "topics": ["Text Classification", "Sentiment Analysis", "Spam Detection", "NER", "POS Tagging", "Topic Modeling"]},
        {"title": "Sequence Models", "topics": ["RNN", "LSTM", "GRU", "Seq2Seq"]},
        {"title": "Attention & Transformers", "topics": ["Attention", "Self-Attention", "BERT", "GPT", "T5"]},
        {"title": "Modern NLP", "topics": ["LLMs", "RAG", "Fine-Tuning", "NLP Agents", "Multilingual NLP", "Text Generation", "Information Retrieval"]}
    ]
}

styles = {
    "ML": {"color": "from-blue-500 to-indigo-500"},
    "DL": {"color": "from-emerald-500 to-teal-500"},
    "RL": {"color": "from-rose-500 to-orange-500"},
    "GENAI": {"color": "from-fuchsia-500 to-rose-500"},
    "AGENTIC": {"color": "from-amber-500 to-yellow-500"},
    "TRANSFORMER": {"color": "from-indigo-500 to-purple-500"},
    "LLM": {"color": "from-cyan-500 to-blue-500"},
    "NLP": {"color": "from-teal-500 to-emerald-500"}
}

async def add_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM club_roadmaps"))

        for r_type, phases in roadmaps_data.items():
            for i, module in enumerate(phases):
                color = styles[r_type]["color"]
                icons = ["BookOpen", "Layers", "BarChart3", "Network", "Layers", "CheckCircle2", "Zap", "Sparkles", "Brain", "Code2"]
                icon = icons[i % len(icons)]
                
                phase_label = f"Week {i+1}" if r_type == "GENAI" else f"Phase {i+1}"
                duration_label = "1 Week" if r_type == "GENAI" else "TBD"

                roadmap = ClubRoadmap(
                    roadmap_type=r_type,
                    phase=phase_label,
                    title=module["title"],
                    duration=duration_label,
                    color=color,
                    icon_name=icon,
                    topics=json.dumps(module["topics"]),
                    order_no=i+1
                )
                session.add(roadmap)
        
        await session.commit()
        print("Successfully added all 8 roadmaps to the database!")

asyncio.run(add_data())
