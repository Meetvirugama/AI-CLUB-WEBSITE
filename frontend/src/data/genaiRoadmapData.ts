export interface RoadmapResource {
  kind: string;
  title: string;
  url: string;
  desc: string;
  isCampusX?: boolean;
  isPaper?: boolean;
}

export interface RoadmapPaper {
  number: number;
  title: string;
  url: string;
  notes: string;
  category?: string;
  venue?: string;
}

export interface RoadmapDay {
  day: string;
  task: string;
}

export interface GenAiWeek {
  id: string;
  weekNumber: number;
  stageNumber: number;
  stageName: string;
  badge: string;
  title: string;
  description: string;
  deliverable: string;
  deliverableName: string;
  mission: string;
  accentColor: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Capstone";
  estHours: string;
  techStack: string[];
  topics: string[];
  buildTasks: string[];
  resources: RoadmapResource[];
  papers: RoadmapPaper[];
  definitionOfDone: string;
  dayPlan: RoadmapDay[];
}

export interface RoadmapStage {
  number: number;
  title: string;
  subtitle: string;
  weeks: number[];
  color: string;
  description: string;
}

export const GENAI_ROADMAP_STAGES: RoadmapStage[] = [
  {
    number: 1,
    title: "Foundations & Architecture",
    subtitle: "Weeks 1 & 2",
    weeks: [1, 2],
    color: "#22e0ff",
    description: "Master tokenization, attention mechanisms, sampling logits, prompt engineering, structured outputs, and LLM APIs from first principles.",
  },
  {
    number: 2,
    title: "Retrieval & Grounding (RAG)",
    subtitle: "Weeks 3 & 4",
    weeks: [3, 4],
    color: "#3ef07a",
    description: "Build robust document ingestion pipelines, dense embeddings, vector databases (Qdrant & pgvector), hybrid BM25 search, reranking, and adaptive retrieval.",
  },
  {
    number: 3,
    title: "Tool Use & Single-Agent Loops",
    subtitle: "Weeks 5 & 6",
    weeks: [5, 6],
    color: "#ff9a2e",
    description: "Transform text-only models into active decision-makers with function calling, Model Context Protocol (MCP), LangGraph StateGraph, memory, and bounded agent loops.",
  },
  {
    number: 4,
    title: "Multi-Agent Systems & Production",
    subtitle: "Weeks 7 & 8",
    weeks: [7, 8],
    color: "#9a6bff",
    description: "Orchestrate specialized multi-agent teams, supervisor-worker routing, reflection loops, OWASP LLM security, regression evaluation, and containerized FastAPI deployment.",
  },
];

export const GENAI_ROADMAP_META = {
  title: "GenAI + Agentic AI",
  subtitle: "8-Week Intensive Study Roadmap",
  tagline: "From LLM Internals to Autonomous Multi-Agent Production Systems",
  description:
    "An engineering-first, 8-week curriculum bridging foundational LLM internals, advanced RAG architectures, function calling, Model Context Protocol (MCP), LangGraph agent loops, multi-agent coordination, and production-grade safety & evaluation.",
  duration: "8 Weeks",
  projectsCount: 8,
  papersCount: 18,
  totalTopics: 53,
  totalTasks: 33,
};

export const GENAI_ROADMAP_WEEKS: GenAiWeek[] = [
  {
    id: "week1",
    weekNumber: 1,
    stageNumber: 1,
    stageName: "Foundations & Architecture",
    badge: "Week 01 · AI Awakening",
    title: "LLM Internals & Inference",
    description:
      "Understand what happens between your prompt and the model’s answer, from tokenization to next-token probabilities.",
    deliverable: "Deliverable: LLM Playground",
    deliverableName: "Interactive LLM Playground",
    mission:
      "Explain an LLM response path without treating the model as a black box: from prompt string to token IDs, embeddings, Transformer self-attention, logits, and temperature sampling.",
    accentColor: "#22e0ff",
    difficulty: "Beginner",
    estHours: "12–15 hrs",
    techStack: ["Python", "Tiktoken / HuggingFace", "OpenAI / Claude API", "NumPy", "Gradio / Streamlit"],
    topics: [
      "AI → ML → DL → Generative AI → LLMs: architectural definitions and taxonomy.",
      "Tokenization, token IDs, BPE algorithms, token budgets, context windows, and token arithmetic.",
      "Learned token representations: token embeddings vs dense retrieval embeddings.",
      "Transformer blocks: self-attention, multi-head attention, Q/K/V matrices, feed-forward layers, and residual connections.",
      "Inference pipeline: logits → softmax probabilities → sampling strategies (temperature, top-p, top-k, stop sequences).",
      "Base vs instruction-tuned models, RLHF alignment, hallucinations, context-length degradation, and latency/cost trade-offs.",
    ],
    buildTasks: [
      "Create a multi-turn chat playground with customizable system prompt, user input, and context memory.",
      "Expose model hyperparameters: compare temperature, top-p, and max tokens side-by-side on identical prompts.",
      "Log input/output token usage per turn and handle edge cases (empty strings, timeouts, rate limits, API failures).",
      "Diagram the complete pipeline: Prompt → Tokenizer → Transformer Layers → Logits → Softmax → Sampling → Output.",
    ],
    resources: [
      {
        kind: "CampusX Individual Video · Orientation",
        title: "GenAI Roadmap for Beginners | End-to-End GenAI Course 2025",
        url: "https://www.youtube.com/watch?v=pSVk-5WemQ0",
        desc: "High-level orientation video mapping out the complete GenAI landscape and course layout.",
        isCampusX: true,
      },
      {
        kind: "Video · Must Watch",
        title: "Andrej Karpathy — Deep Dive into LLMs",
        url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
        desc: "Essential deep dive covering tokenization, pre-training, fine-tuning, inference mechanics, and the mental model of modern language models.",
      },
      {
        kind: "Visual Explainer · Interactive",
        title: "The Illustrated Transformer by Jay Alammar",
        url: "https://jalammar.github.io/illustrated-transformer/",
        desc: "Clear visual breakdowns of self-attention matrices, multi-head attention, encoder-decoder flow, and positional encodings.",
      },
      {
        kind: "Video · API Starter",
        title: "OpenAI API Crash Course",
        url: "https://www.youtube.com/watch?v=SaGrNyDCJA4",
        desc: "Hands-on walkthrough for authentic API client initialization, chat completions, and response parsing.",
      },
      {
        kind: "Official Documentation",
        title: "OpenAI Text Generation Guide & Best Practices",
        url: "https://platform.openai.com/docs/guides/text?api-mode=responses",
        desc: "Reference guides on request/response lifecycles, streaming responses, and production reliability.",
      },
    ],
    papers: [
      {
        number: 1,
        title: "Attention Is All You Need",
        url: "https://arxiv.org/abs/1706.03762",
        notes: "Seminal paper introducing Transformer architecture, self-attention, and positional encodings.",
        category: "Foundations",
        venue: "NeurIPS 2017",
      },
      {
        number: 2,
        title: "Language Models are Few-Shot Learners (GPT-3)",
        url: "https://arxiv.org/abs/2005.14165",
        notes: "Introduces GPT-3, zero/few-shot in-context learning, and scaling laws without gradient updates.",
        category: "Foundations",
        venue: "NeurIPS 2020",
      },
      {
        number: 3,
        title: "Lost in the Middle: How Language Models Use Long Contexts",
        url: "https://aclanthology.org/2024.tacl-1.9/",
        notes: "Reveals how retrieval performance and recall degrade when relevant evidence is in the middle of long contexts.",
        category: "Context Windows",
        venue: "TACL 2024",
      },
    ],
    definitionOfDone:
      "Your playground runs locally, displays streaming responses, manages conversation history, handles network errors gracefully, and allows dynamic parameter tweaking. You can explain self-attention and temperature sampling clearly.",
    dayPlan: [
      { day: "Day 1", task: "LLM pipeline taxonomy & vocabulary" },
      { day: "Day 2", task: "Karpathy deep dive & note synthesis" },
      { day: "Day 3", task: "Illustrated Transformer visual study" },
      { day: "Day 4", task: "Read Attention Is All You Need diagrams" },
      { day: "Day 5", task: "Build chat playground UI & API client" },
      { day: "Day 6", task: "Sampling experiments (temp/top-p/top-k)" },
      { day: "Day 7", task: "Code refactor, error handling, review" },
    ],
  },
  {
    id: "week2",
    weekNumber: 2,
    stageNumber: 1,
    stageName: "Foundations & Architecture",
    badge: "Week 02 · Prompt Battle",
    title: "Prompt Engineering & LLM APIs",
    description:
      "Control the model with clear instructions, reliable schemas and a repeatable evaluation loop.",
    deliverable: "Deliverable: AI Assistant",
    deliverableName: "Structured-Output Assistant",
    mission:
      "Same model + same task: improve output accuracy and format compliance from 60% to 95%+ through systematic prompt iteration and schema enforcement.",
    accentColor: "#3d6bff",
    difficulty: "Beginner",
    estHours: "12–15 hrs",
    techStack: ["Python", "Pydantic v2", "OpenAI / Anthropic SDK", "AsyncIO", "Tenacity / Backoff"],
    topics: [
      "Prompt anatomy: Persona, Context, Detailed Instructions, Constraints, Few-shot Examples, Delimiters, and Format Specification.",
      "Zero-shot vs Few-shot CoT (Chain-of-Thought), task decomposition, and role-based conditioning.",
      "System vs Developer vs User instruction boundaries; prompt versioning and mitigating unintended instruction overriding.",
      "Structured Outputs with JSON Schema, Pydantic model validation, parsing retries, and fallback strategies.",
      "Function / Tool Calling primitives: declaring schemas, parsing tool proposal payloads, and validating inputs.",
      "Production ergonomics: AsyncIO concurrency, SSE streaming, exponential backoff retries, and token accounting.",
      "Evaluation foundations: building small regression test suites to test prompt variations systematically.",
    ],
    buildTasks: [
      "Implement a modular LLM client wrapper cleanly separating model configuration, prompts, and application logic.",
      "Build a structured extraction assistant with Pydantic schemas, validation error capture, and auto-retry prompts.",
      "Add one safe application tool (e.g., unit converter or date calculator) with explicit input schema validation.",
      "Construct a 20-prompt evaluation test suite and document comparative performance between Prompt v1 and Prompt v2.",
    ],
    resources: [
      {
        kind: "CampusX Individual Video · Tooling Setup",
        title: "Generative AI using LangChain — Course Introduction",
        url: "https://www.youtube.com/watch?v=_3ezSpJw2E8",
        desc: "Course setup and overview of prompt management and framework integration.",
        isCampusX: true,
      },
      {
        kind: "Official Guide · Priority",
        title: "OpenAI Prompt Engineering Guide",
        url: "https://platform.openai.com/docs/guides/prompt-engineering",
        desc: "Industry-standard prompt strategies: explicit instructions, delimiter usage, few-shot examples, and output constraints.",
      },
      {
        kind: "Official Guide · Essential",
        title: "OpenAI Structured Outputs & Function Calling",
        url: "https://platform.openai.com/docs/guides/structured-outputs",
        desc: "Authoritative documentation for strict JSON Schema matching and tool-call lifecycle management.",
      },
      {
        kind: "Video · Python Concurrency",
        title: "Corey Schafer — AsyncIO in Python",
        url: "https://www.youtube.com/watch?v=oAkLSJNr5zY",
        desc: "Master async/await syntax and asynchronous task gathering for high-throughput LLM API integrations.",
      },
      {
        kind: "Documentation · Typing",
        title: "Pydantic v2 Documentation & Data Validation",
        url: "https://docs.pydantic.dev/latest/",
        desc: "Data modeling, schema generation, type coercion, and error handler configurations.",
      },
    ],
    papers: [
      {
        number: 4,
        title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
        url: "https://arxiv.org/abs/2201.11903",
        notes: "Demonstrates how intermediate reasoning steps dramatically improve multi-step logic and arithmetic.",
        category: "Prompting",
        venue: "NeurIPS 2022",
      },
      {
        number: 5,
        title: "Self-Consistency Improves Chain of Thought Reasoning",
        url: "https://arxiv.org/abs/2203.11171",
        notes: "Explores sampling diverse reasoning paths and majority voting to improve reasoning reliability.",
        category: "Reasoning",
        venue: "ICLR 2023",
      },
    ],
    definitionOfDone:
      "Your assistant reliably returns validated structured JSON schemas, executes tools safely, handles API errors and streaming cleanly, and achieves >90% pass rate on your 20-prompt test suite.",
    dayPlan: [
      { day: "Day 1", task: "Prompt anatomy, delimiters & zero-shot tests" },
      { day: "Day 2", task: "Few-shot examples & prompt iteration (v1 vs v2)" },
      { day: "Day 3", task: "Structured outputs with Pydantic v2 models" },
      { day: "Day 4", task: "Function calling loop & tool schema creation" },
      { day: "Day 5", task: "Async client, streaming & exponential backoff" },
      { day: "Day 6", task: "Build end-to-end assistant application" },
      { day: "Day 7", task: "Run regression suite & benchmark report" },
    ],
  },
  {
    id: "week3",
    weekNumber: 3,
    stageNumber: 2,
    stageName: "Retrieval & Grounding (RAG)",
    badge: "Week 03 · Talk to Your Data",
    title: "RAG Fundamentals & Vector Databases",
    description:
      "Give an LLM access to your documents and produce grounded answers with traceable sources.",
    deliverable: "Deliverable: PDF Q&A",
    deliverableName: "Grounded Document Q&A Engine",
    mission:
      "Upload complex PDFs, ask specific domain questions, retrieve accurate evidence passages, and provide answers that cite exact pages and snippets without hallucination.",
    accentColor: "#3ef07a",
    difficulty: "Intermediate",
    estHours: "14–16 hrs",
    techStack: ["Python", "Qdrant", "PostgreSQL + pgvector", "LangChain / LlamaIndex", "Sentence-Transformers"],
    topics: [
      "The full RAG lifecycle: Ingestion → Parsing → Cleaning → Chunking → Embedding → Indexing → Retrieval → Prompt Augmentation → Generation.",
      "Document parsing: handling PDF text extraction, column layouts, OCR awareness, and structural metadata.",
      "Chunking strategies: Fixed-size, Recursive Character splitting, Sentence-based splitting, and semantic chunking with overlap.",
      "Embedding models: dense vector spaces, cosine similarity, dot product, L2 distance, normalization, and MTEB benchmark trade-offs.",
      "Vector indexes & storage: HNSW indexing, inverted files, metadata payload filtering, and collections management.",
      "Comparing standalone vector engines (Qdrant) with relational extensions (PostgreSQL + pgvector).",
      "Grounded prompt templates: strict citation enforcement, evidence snippets, and polite refusal when documents do not contain the answer.",
    ],
    buildTasks: [
      "Ingest a document corpus (multiple PDFs/technical docs) with document title, page number, and chunk ID metadata.",
      "Implement a complete vector retrieval flow in Qdrant and a parallel flow in PostgreSQL with pgvector.",
      "Synthesize answers citing specific page numbers and document names; implement strict refusal prompts for out-of-domain questions.",
      "Evaluate both systems against 20 test queries: 10 answerable, 5 ambiguous, and 5 unanswerable out-of-domain queries.",
    ],
    resources: [
      {
        kind: "CampusX Individual Video · RAG Chunking",
        title: "Text Splitters in LangChain | Video 11",
        url: "https://www.youtube.com/watch?v=SEWS9P4ODmc",
        desc: "Practical exploration of character vs recursive vs token chunking strategies in document pipelines.",
        isCampusX: true,
      },
      {
        kind: "Official Tutorial · Priority",
        title: "LangChain End-to-End RAG Tutorial",
        url: "https://python.langchain.com/docs/tutorials/rag/",
        desc: "Step-by-step architecture guide for document loading, splitting, vector stores, and generation chains.",
      },
      {
        kind: "Video · Embeddings",
        title: "Sentence Embeddings and Semantic Search",
        url: "https://www.youtube.com/watch?v=WS1uVMGhlWQ",
        desc: "Understanding dense representations, similarity search, and why semantic similarity differs from keyword matching.",
      },
      {
        kind: "Official Database Docs",
        title: "Qdrant Tutorials & Basics Documentation",
        url: "https://qdrant.tech/documentation/tutorials-basics/",
        desc: "Setting up collections, payload indexing, filtering queries, and vector distance metrics in Qdrant.",
      },
      {
        kind: "Official Extension Docs",
        title: "pgvector: Open-source Vector Similarity Search for Postgres",
        url: "https://github.com/pgvector/pgvector",
        desc: "Creating vector columns, HNSW/IVFFlat indexes, and querying vectors directly with SQL.",
      },
    ],
    papers: [
      {
        number: 6,
        title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        url: "https://arxiv.org/abs/2005.11401",
        notes: "Foundational paper defining the RAG paradigm combining pre-trained parametric and non-parametric memory.",
        category: "RAG Foundations",
        venue: "NeurIPS 2020",
      },
      {
        number: 7,
        title: "Dense Passage Retrieval for Open-Domain Question Answering (DPR)",
        url: "https://aclanthology.org/2020.emnlp-main.550/",
        notes: "Demonstrates that dual-encoder dense retrieval outperforms traditional BM25 keyword matching on QA benchmarks.",
        category: "Dense Retrieval",
        venue: "EMNLP 2020",
      },
    ],
    definitionOfDone:
      "Given a 50+ page PDF, the system returns grounded answers with exact page citations within 1.5 seconds. The system cleanly declines to answer questions not present in the document corpus.",
    dayPlan: [
      { day: "Day 1", task: "RAG architecture & Lewis et al. paper study" },
      { day: "Day 2", task: "PDF parsing, text cleaning & chunking experiments" },
      { day: "Day 3", task: "Embedding generation & similarity metrics" },
      { day: "Day 4", task: "Qdrant collection setup & payload filtering" },
      { day: "Day 5", task: "PostgreSQL pgvector schema & HNSW indexing" },
      { day: "Day 6", task: "Citation prompt engineering & PDF Q&A UI" },
      { day: "Day 7", task: "Compare Qdrant vs pgvector latency & recall" },
    ],
  },
  {
    id: "week4",
    weekNumber: 4,
    stageNumber: 2,
    stageName: "Retrieval & Grounding (RAG)",
    badge: "Week 04 · Advanced RAG",
    title: "Hybrid Search, Reranking & Adaptive Retrieval",
    description:
      "Improve retrieval quality systematically; understand when to retrieve, how to transform a query and how to detect weak evidence.",
    deliverable: "Deliverable: Evaluated RAG",
    deliverableName: "Benchmarked Advanced RAG Pipeline",
    mission:
      "Establish an evaluation baseline, implement hybrid search (BM25 + Dense) with cross-encoder reranking and HyDE, and mathematically prove retrieval quality improvements using Ragas.",
    accentColor: "#ffe53d",
    difficulty: "Advanced",
    estHours: "15–18 hrs",
    techStack: ["Python", "BM25 (Rank-BM25)", "Cross-Encoder (Cohere/BGE)", "Ragas", "FastAPI"],
    topics: [
      "Naive RAG vs Advanced RAG vs Modular RAG: mapping bottlenecks and retrieval failure modes.",
      "Hybrid Search: combining sparse lexical search (BM25) with dense semantic search via Reciprocal Rank Fusion (RRF).",
      "Two-stage retrieval with cross-encoder rerankers: compute heavy, high-accuracy query-passage interaction scoring.",
      "Query transformations: Query Rewriting, Multi-Query expansion (RAG-Fusion), and Hypothetical Document Embeddings (HyDE).",
      "Hierarchical retrieval: parent-child chunking, sentence-window retrieval, and contextual document chunks.",
      "Adaptive RAG patterns: Corrective RAG (CRAG), Self-RAG, and routing queries to retrieval vs direct reasoning.",
      "Evaluation metrics: Retrieval Recall@K, Precision@K, MRR, nDCG@K, Answer Faithfulness, and Answer Relevance using Ragas.",
    ],
    buildTasks: [
      "Curate a fixed golden benchmark dataset of at least 30 domain queries with ground-truth chunk labels.",
      "Build comparative retrieval pipelines: 1) Dense-only, 2) BM25-only, 3) Hybrid RRF, and 4) Hybrid + Cross-Encoder Reranker.",
      "Implement HyDE (Hypothetical Document Embeddings) and benchmark its effect on vocabulary mismatch queries.",
      "Generate a comprehensive evaluation report measuring Recall@5, Answer Faithfulness, p50/p95 latency, and token cost across all pipelines.",
    ],
    resources: [
      {
        kind: "Video · Overview",
        title: "Advanced RAG Techniques & Architecture Patterns",
        url: "https://www.youtube.com/watch?v=_kpxLkH5vY0",
        desc: "Comprehensive tour of query transformations, re-ranking strategies, and evaluation feedback loops.",
      },
      {
        kind: "Video · Deep Dive",
        title: "Hybrid Search and Cross-Encoder Reranking",
        url: "https://www.youtube.com/watch?v=XvKiTfd6Xvo",
        desc: "Division of labor between sparse keyword search, dense embeddings, and cross-encoder score fusion.",
      },
      {
        kind: "Framework Documentation",
        title: "Ragas: Automated Evaluation of Retrieval Augmented Generation",
        url: "https://docs.ragas.io/en/latest/",
        desc: "Computing faithfulness, answer relevancy, context precision, and context recall with LLM judges.",
      },
      {
        kind: "Industry Benchmark",
        title: "Qdrant Vector Database Benchmark Methodology",
        url: "https://qdrant.tech/articles/vector-database-benchmark/",
        desc: "Understanding indexing throughput, search latency (p95/p99), and filtering performance trade-offs.",
      },
    ],
    papers: [
      {
        number: 8,
        title: "Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)",
        url: "https://aclanthology.org/2023.acl-long.99/",
        notes: "Uses LLM to hallucinate hypothetical documents before embedding for superior zero-shot retrieval.",
        category: "Query Transformation",
        venue: "ACL 2023",
      },
      {
        number: 9,
        title: "RocketQA: An Optimized Training Approach to Dense Passage Retrieval",
        url: "https://aclanthology.org/2021.naacl-main.466/",
        notes: "Addresses dual-encoder bottlenecks through cross-batch negatives and cross-encoder re-ranking supervision.",
        category: "Reranking",
        venue: "NAACL 2021",
      },
    ],
    definitionOfDone:
      "A reproducible benchmark report demonstrating quantifiable improvements in Recall@5 and Answer Faithfulness using Hybrid Search + Reranker over naive dense retrieval, with documented failure analysis.",
    dayPlan: [
      { day: "Day 1", task: "Curate 30-query test set with relevant chunk labels" },
      { day: "Day 2", task: "Implement BM25 lexical search & RRF score fusion" },
      { day: "Day 3", task: "Integrate BGE/Cohere cross-encoder reranking" },
      { day: "Day 4", task: "Implement HyDE query transformation pipeline" },
      { day: "Day 5", task: "Configure Ragas evaluation suite & automated scoring" },
      { day: "Day 6", task: "Execute matrix experiments across all 4 pipelines" },
      { day: "Day 7", task: "Analyze latency/cost trade-offs & publish findings" },
    ],
  },
  {
    id: "week5",
    weekNumber: 5,
    stageNumber: 3,
    stageName: "Tool Use & Single-Agent Loops",
    badge: "Week 05 · Tool Calling",
    title: "Function Calling, APIs & MCP",
    description:
      "Move from text-only chat to an assistant that can choose tools, request structured arguments and interact with external capabilities safely.",
    deliverable: "Deliverable: MCP Assistant",
    deliverableName: "Model Context Protocol (MCP) Server & Client",
    mission:
      "Build a tool-augmented assistant that autonomously discovers available tools, parses and validates parameters, safely interacts with real APIs via MCP, and handles errors and human approvals.",
    accentColor: "#ff9a2e",
    difficulty: "Intermediate",
    estHours: "14–16 hrs",
    techStack: ["Python", "Model Context Protocol (MCP)", "FastAPI / HTTPX", "Pydantic v2", "JSON Schema"],
    topics: [
      "Tool schemas: parameter typing, descriptions, required fields, constraints, and validation error capture.",
      "The tool execution loop: User Query → Model proposes Tool Call → App verifies permissions → App executes Tool → Tool Result returned to Model → Final Synthesis.",
      "Tool idempotency, execution timeouts, retries, error normalization, and maximum iteration guardrails.",
      "Model Context Protocol (MCP) architecture: Hosts, Clients, and Servers; Tools, Resources, and Prompts; Stdio vs SSE transports.",
      "Security boundaries: tool permission allowlists, secrets management, untrusted tool output sanitization, and human-in-the-loop approval.",
      "Architectural choice: when to implement direct function calling vs standardizing on an MCP server.",
    ],
    buildTasks: [
      "Implement three production-grade tools: 1) Math/expression evaluator, 2) Local file/document search, 3) Real public API consumer (e.g., live weather or finance).",
      "Build a compliant MCP server exposing tools and resources over stdio/SSE transports.",
      "Connect an MCP client application that dynamically discovers server capabilities and executes tool requests.",
      "Implement a strict human confirmation prompt for any destructive or high-impact actions (e.g., file deletion or write).",
    ],
    resources: [
      {
        kind: "Official Guide · Priority",
        title: "OpenAI Function Calling Guide & Execution Loop",
        url: "https://platform.openai.com/docs/guides/function-calling",
        desc: "Comprehensive manual on declaring functions, handling multi-tool calls, and managing execution cycles.",
      },
      {
        kind: "Official Protocol Docs · Essential",
        title: "Model Context Protocol (MCP) Quickstart & Specification",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
        desc: "Anthropic's open protocol standardizing how AI models interact with data repositories, development tools, and APIs.",
      },
      {
        kind: "Framework Documentation",
        title: "LangChain Tool Calling How-to Guides",
        url: "https://python.langchain.com/docs/how_to/#tools",
        desc: "Comparing library-level abstractions with raw protocol implementations.",
      },
    ],
    papers: [
      {
        number: 10,
        title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
        url: "https://arxiv.org/abs/2302.04761",
        notes: "Groundbreaking demonstration of language models learning when, how, and what API calls to invoke in text streams.",
        category: "Tool Learning",
        venue: "NeurIPS 2023",
      },
      {
        number: 11,
        title: "ReAct: Synergizing Reasoning and Acting in Language Models",
        url: "https://arxiv.org/abs/2210.03629",
        notes: "Establishes the foundational Thought → Action → Observation cycle underpinning modern AI agents.",
        category: "Agent Loops",
        venue: "ICLR 2023",
      },
    ],
    definitionOfDone:
      "Your assistant discovers tools via an MCP server, successfully executes tool calls with validated arguments, handles invalid input gracefully without crashing, and triggers a confirmation gate before sensitive actions.",
    dayPlan: [
      { day: "Day 1", task: "Function-calling lifecycle & schema validation" },
      { day: "Day 2", task: "Implement math, search & API tools with Pydantic" },
      { day: "Day 3", task: "Error normalization, timeouts & recursion limits" },
      { day: "Day 4", task: "Study MCP architecture, transports & protocol spec" },
      { day: "Day 5", task: "Build local MCP server & connect client host" },
      { day: "Day 6", task: "Integrate human approval gate for sensitive actions" },
      { day: "Day 7", task: "Security testing against injection in tool outputs" },
    ],
  },
  {
    id: "week6",
    weekNumber: 6,
    stageNumber: 3,
    stageName: "Tool Use & Single-Agent Loops",
    badge: "Week 06 · Agent Arena",
    title: "LangGraph, State, Memory & Agent Loops",
    description:
      "Build a bounded, stateful agent that can plan, act, observe, recover and return a verifiable result.",
    deliverable: "Deliverable: Personal AI Agent",
    deliverableName: "Stateful ReAct Agent with Persistence",
    mission:
      "Stop hard-coding fixed linear chains: create an autonomous yet bounded LangGraph agent with explicit typed state, short- and long-term memory, checkpoint resume, and tracing.",
    accentColor: "#ff4d6a",
    difficulty: "Advanced",
    estHours: "16–18 hrs",
    techStack: ["Python", "LangGraph", "LangChain Core", "LangSmith", "SQLite / Postgres Checkpointers"],
    topics: [
      "Defining autonomous AI agents: distinguishing fixed DAG workflows from dynamic model-directed loops.",
      "LangGraph fundamentals: StateGraph, Nodes, Edges, Conditional Edges, TypedDict State, and Reducers.",
      "The ReAct pattern in practice: Planner/Executor architectures, reasoning traces, and terminating stop conditions.",
      "State persistence & Memory: short-term thread state, thread IDs, SQLite/Postgres checkpointers, and user memory.",
      "Human-in-the-loop: pausing execution via interrupts before critical tool actions and resuming state seamlessly.",
      "Observability & Tracing: recording node inputs/outputs, token costs, execution latency, and error states using LangSmith.",
    ],
    buildTasks: [
      "Build a LangGraph workflow with Planner, Tool Executor, Verification, and Response Synthesizer nodes.",
      "Arm your agent with three distinct tools: Live Web Search, Document Knowledge Search, and Python Code Execution.",
      "Configure checkpoint persistence enabling multi-turn conversation memory across different session threads.",
      "Implement step-limit guardrails (max 8 steps), timeout boundaries, and an interrupt pause requiring user approval.",
      "Trace at least 15 real-world complex user workflows on LangSmith and profile node latency and token expenditure.",
    ],
    resources: [
      {
        kind: "CampusX Individual Video · Core Concepts",
        title: "LangGraph Core Concepts | Agentic AI using LangGraph | Video 4",
        url: "https://www.youtube.com/watch?v=D5KhiCDM9XQ",
        desc: "Essential walkthrough of StateGraph, nodes, edges, reducers, conditional routing, and graph execution.",
        isCampusX: true,
      },
      {
        kind: "Official Documentation · Priority",
        title: "LangGraph Overview, State & Persistence",
        url: "https://docs.langchain.com/oss/python/langgraph/overview",
        desc: "Authoritative architectural documentation for graphs, state management, checkpointers, and human interrupts.",
      },
      {
        kind: "Observability Documentation",
        title: "LangSmith Tracing and Observability Guide",
        url: "https://docs.langchain.com/langsmith/observability",
        desc: "Setting up trace collectors, debugging execution paths, and analyzing token costs per node.",
      },
    ],
    papers: [
      {
        number: 12,
        title: "Generative Agents: Interactive Simulacra of Human Behavior",
        url: "https://arxiv.org/abs/2304.03442",
        notes: "Introduces agent memory stream, reflection trees, and retrieval architectures for believable autonomous agents.",
        category: "Agent Memory",
        venue: "UIST 2023",
      },
    ],
    definitionOfDone:
      "Your agent autonomously solves multi-step research requests, dynamically chooses appropriate tools, persists session state across restarts, never enters infinite loops, and surfaces full LangSmith traces.",
    dayPlan: [
      { day: "Day 1", task: "Workflow vs Agent conceptual differences & graph theory" },
      { day: "Day 2", task: "Implement StateGraph, typed state & basic node reducers" },
      { day: "Day 3", task: "Build conditional edges and ReAct tool-call loop" },
      { day: "Day 4", task: "Configure SQLite checkpointer for multi-turn threads" },
      { day: "Day 5", task: "Add human interrupt gates and execution step limits" },
      { day: "Day 6", task: "Connect LangSmith telemetry and trace profiling" },
      { day: "Day 7", task: "Run stress tests against ambiguous/adversarial prompts" },
    ],
  },
  {
    id: "week7",
    weekNumber: 7,
    stageNumber: 4,
    stageName: "Multi-Agent Systems & Production",
    badge: "Week 07 · Agent Wars",
    title: "Multi-Agent Systems & Coordination",
    description:
      "Decompose complex work into specialist roles, coordinate them through shared state and independently review the result.",
    deliverable: "Deliverable: Research System",
    deliverableName: "Autonomous Multi-Agent Research Swarm",
    mission:
      "Decompose a deep research query across specialized autonomous agents (Supervisor, Researcher, Data Analyst, Reviewer/Critic), coordinate their state, and synthesize a cited dossier.",
    accentColor: "#f224c8",
    difficulty: "Advanced",
    estHours: "16–20 hrs",
    techStack: ["Python", "LangGraph Multi-Agent", "AutoGen", "CrewAI", "Pydantic"],
    topics: [
      "Multi-Agent design patterns: Supervisor Router, Peer-to-Peer Handoffs, Hierarchical Teams, and Debate/Critique loops.",
      "Sequential vs Parallel execution: delegating sub-tasks across worker agents and gathering results asynchronously.",
      "Agent specialization: designing narrow, unambiguous system prompts for Researcher, Analyst, Coder, and Critic roles.",
      "Conflict resolution and verification: handling contradictory findings, missing citations, and reviewer revision loops.",
      "Cost, latency, and failure propagation: recognizing when a multi-agent system provides genuine utility vs redundant cost overhead.",
      "Framework comparison: implementing production multi-agent systems in LangGraph while conceptually understanding AutoGen and CrewAI.",
    ],
    buildTasks: [
      "Build a Supervisor Router agent that decomposes an open-ended research inquiry into structured sub-tasks.",
      "Implement at least three specialist agents: 1) Web/Data Researcher, 2) Technical Analyst, and 3) Critical Reviewer.",
      "Implement parallel research execution for independent sub-topics with typed Pydantic output contracts.",
      "Add an automated Critic Reviewer node that inspects evidence quality and triggers revisions if citations are insufficient.",
      "Conduct a comparative benchmark measuring quality, latency, tool calls, and token cost between Single Agent vs Multi-Agent Swarm.",
    ],
    resources: [
      {
        kind: "CampusX Individual Video · Coordination",
        title: "LangGraph Core Concepts | Agentic AI using LangGraph | Video 4",
        url: "https://www.youtube.com/watch?v=D5KhiCDM9XQ",
        desc: "Revisit parallelization, routing, and orchestrator-worker graph designs.",
        isCampusX: true,
      },
      {
        kind: "Video · Industry Luminary",
        title: "Andrew Ng — Agentic Design Patterns",
        url: "https://www.youtube.com/watch?v=sal78ACtGTc",
        desc: "Foundational breakdown of Reflection, Tool Use, Planning, and Multi-Agent Collaboration design patterns.",
      },
      {
        kind: "Official Multi-Agent Docs",
        title: "LangGraph Multi-Agent Workflows & Architectures",
        url: "https://docs.langchain.com/oss/python/langgraph/multi-agent",
        desc: "Hierarchical agent teams, supervisor graphs, and multi-agent state coordination patterns.",
      },
      {
        kind: "Video · Framework",
        title: "CrewAI Multi-Agent Systems Overview",
        url: "https://www.youtube.com/watch?v=sPzc6hMg7So",
        desc: "Understanding CrewAI's Crew, Agent, and Task mental model for role-playing agents.",
      },
    ],
    papers: [
      {
        number: 13,
        title: "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
        url: "https://www.microsoft.com/en-us/research/publication/autogen-enabling-next-gen-llm-applications-via-multi-agent-conversation/",
        notes: "Microsoft's foundational multi-agent communication framework demonstrating cooperative problem solving.",
        category: "Multi-Agent",
        venue: "Microsoft Research 2023",
      },
      {
        number: 14,
        title: "Mixture-of-Agents Enhances Large Language Model Capabilities",
        url: "https://arxiv.org/abs/2406.04692",
        notes: "Introduces layered multi-agent generation where multiple models propose and aggregate high-quality outputs.",
        category: "Ensemble Agents",
        venue: "arXiv 2024",
      },
    ],
    definitionOfDone:
      "Given a broad topic (e.g. 'State of Solid-State Batteries in 2026'), your multi-agent team conducts parallel web research, analyzes findings, passes strict critic review, and generates a structured, cited markdown report.",
    dayPlan: [
      { day: "Day 1", task: "Multi-agent coordination patterns & topology selection" },
      { day: "Day 2", task: "Build Supervisor router node & task decomposition" },
      { day: "Day 3", task: "Develop Researcher and Technical Analyst specialist agents" },
      { day: "Day 4", task: "Implement parallel sub-graph execution in LangGraph" },
      { day: "Day 5", task: "Create Critic Reviewer node & iterative revision cycle" },
      { day: "Day 6", task: "Benchmark Multi-Agent vs Single-Agent on 5 research prompts" },
      { day: "Day 7", task: "Cost-latency optimization and comprehensive documentation" },
    ],
  },
  {
    id: "week8",
    weekNumber: 8,
    stageNumber: 4,
    stageName: "Multi-Agent Systems & Production",
    badge: "Week 08 · Agent Arena",
    title: "Evaluation, Security, Production & Deployment",
    description:
      "Turn the prototype into a testable, observable and deployable application with clear limits and failure behavior.",
    deliverable: "Deliverable: Deployed Capstone",
    deliverableName: "Hardened Production AI Microservice",
    mission:
      "Take your agentic system from a local prototype to a production-hardened microservice with automated regression evaluations, OWASP LLM security defenses, and Dockerized deployment.",
    accentColor: "#9a6bff",
    difficulty: "Capstone",
    estHours: "18–22 hrs",
    techStack: ["FastAPI", "Docker", "Pytest", "OWASP LLM Guardrails", "Prometheus / LangSmith", "Cloud Run / AWS"],
    topics: [
      "Golden evaluation test sets: synthetically generated test cases, adversarial edge cases, and human spot-check workflows.",
      "Comprehensive metrics: RAG metrics (Faithfulness, Relevance, Context Recall) and Agent metrics (Task Success Rate, Tool Precision, Step Efficiency).",
      "LLM Security (OWASP Top 10 for LLMs): direct/indirect prompt injection, untrusted tool content, excessive agency, and data exfiltration.",
      "Hardened application engineering: secret management, JWT auth, IP rate limiting, input sanitization, and safe audit logging.",
      "Production microservice architecture: FastAPI endpoints, async background workers, Docker containerization, health checks, and CI/CD pipelines.",
      "Cost and latency controls: semantic response caching, fallback model cascading, timeout budgets, and graceful degradation.",
      "Production documentation: threat modeling, system architecture diagrams, API schemas, and documented known failure modes.",
    ],
    buildTasks: [
      "Construct a 50-task golden evaluation test set including unanswerable questions and adversarial prompt injection attempts.",
      "Run automated RAG and Agent evaluation pipelines and generate a persistent Markdown regression scorecard.",
      "Implement defensive security guardrails in code: validate tool inputs, sanitize tool outputs, and block indirect injection payloads.",
      "Package the entire system into an optimized multi-stage Docker container exposed via production FastAPI endpoints.",
      "Deploy to cloud infrastructure with automated health checks, environment secrets, and comprehensive API documentation.",
    ],
    resources: [
      {
        kind: "Security Specification · Critical",
        title: "OWASP Top 10 for Large Language Model Applications",
        url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
        desc: "Essential security guide detailing prompt injection, sensitive data exposure, improper output handling, and excessive agency.",
      },
      {
        kind: "Evaluation Documentation",
        title: "LangSmith Evaluation & Dataset Benchmarking",
        url: "https://docs.langchain.com/langsmith/evaluation",
        desc: "Creating golden datasets, defining evaluators, and measuring regression across model and prompt changes.",
      },
      {
        kind: "Production Framework Docs",
        title: "FastAPI Production Deployment & Docker Guides",
        url: "https://fastapi.tiangolo.com/deployment/docker/",
        desc: "Containerizing high-performance asynchronous Python web services with health checks and worker pools.",
      },
    ],
    papers: [
      {
        number: 15,
        title: "RAGAS: Automated Evaluation of Retrieval Augmented Generation",
        url: "https://arxiv.org/abs/2309.15217",
        notes: "Establishes automated evaluation metrics for groundedness, answer relevancy, and context recall without ground truth.",
        category: "Evaluation",
        venue: "EACL 2024",
      },
      {
        number: 16,
        title: "AgentBench: Evaluating LLMs as Agents",
        url: "https://arxiv.org/abs/2308.03688",
        notes: "First comprehensive benchmark framework evaluating LLMs as autonomous agents across multi-turn environments.",
        category: "Agent Benchmark",
        venue: "ICLR 2024",
      },
      {
        number: 17,
        title: "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions",
        url: "https://arxiv.org/abs/2404.13208",
        notes: "OpenAI paper exploring how models can distinguish trusted system instructions from untrusted external content.",
        category: "Security",
        venue: "arXiv 2024",
      },
      {
        number: 18,
        title: "AgentDojo: Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses",
        url: "https://arxiv.org/abs/2406.13352",
        notes: "Security testbed analyzing attack vectors and practical defenses against prompt injections in tool-use agents.",
        category: "Security",
        venue: "NeurIPS 2024",
      },
    ],
    definitionOfDone:
      "A fresh environment can run your Docker container with a single command. The system passes all automated security and functional tests, logs traces to LangSmith, provides a health endpoint, and includes an architecture diagram with threat modeling.",
    dayPlan: [
      { day: "Day 1", task: "Curate 50-task golden evaluation dataset" },
      { day: "Day 2", task: "Run Ragas and AgentBench evaluation regression suites" },
      { day: "Day 3", task: "Implement prompt injection defenses & input sanitization" },
      { day: "Day 4", task: "Implement JWT auth, rate limits & secrets security" },
      { day: "Day 5", task: "Build FastAPI production endpoints & health checks" },
      { day: "Day 6", task: "Build optimized multi-stage Docker image & test" },
      { day: "Day 7", task: "Final deployment, documentation & capstone demo" },
    ],
  },
];
