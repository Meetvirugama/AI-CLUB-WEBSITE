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
}

export interface RoadmapDay {
  day: string;
  task: string;
}

export interface GenAiWeek {
  id: string;
  weekNumber: number;
  badge: string;
  title: string;
  description: string;
  deliverable: string;
  mission: string;
  topics: string[];
  buildTasks: string[];
  resources: RoadmapResource[];
  papers: RoadmapPaper[];
  definitionOfDone: string;
  dayPlan: RoadmapDay[];
}

export const GENAI_ROADMAP_META = {
  title: "GenAI + Agentic AI",
  subtitle: "8-Week Intensive Roadmap",
  tagline: "From LLM Internals to Autonomous Multi-Agent Production Systems",
  description:
    "A rigorous, engineering-first 8-week curriculum bridging foundational LLM internals, advanced RAG architectures, function calling, Model Context Protocol (MCP), LangGraph agent loops, multi-agent coordination, and production-grade safety & evaluation.",
  duration: "8 Weeks",
  projectsCount: 8,
  papersCount: 18,
};

export const GENAI_ROADMAP_WEEKS: GenAiWeek[] = [
  {
    id: "week1",
    weekNumber: 1,
    badge: "Week 01 · AI Awakening",
    title: "LLM Internals & Inference",
    description:
      "Understand what happens between your prompt and the model’s answer, from tokenization to next-token probabilities.",
    deliverable: "Deliverable: LLM Playground",
    mission:
      "Explain an LLM response path without treating the model as a black box.",
    topics: [
      "AI → ML → DL → Generative AI → LLMs; what each term means.",
      "Tokenization, token IDs, token budgets, context windows and why tokens are not exactly words.",
      "Embeddings and learned token representations; high-level distinction between token embeddings and retrieval embeddings.",
      "Transformer blocks: self-attention, multi-head attention, positional information, feed-forward layers and residual connections.",
      "Inference: logits → softmax probabilities → sampling; temperature, top-p, max output tokens and stop sequences.",
      "Base vs instruction-tuned models, hallucinations, knowledge limits, long-context failures and latency/cost.",
    ],
    buildTasks: [
      "Create a tiny chat playground with a system prompt, user input and response history.",
      "Expose model parameters; compare temperature/top-p settings on the same prompts.",
      "Log input/output token usage and handle empty input, timeouts and API errors.",
      "Write a one-page diagram from prompt → tokens → Transformer → logits → sampling → response.",
    ],
    resources: [
      {
        kind: "CampusX individual video · Orientation",
        title: "GenAI Roadmap for Beginners | End-to-End GenAI Course 2025",
        url: "https://www.youtube.com/watch?v=pSVk-5WemQ0",
        desc: "Watch for the GenAI learning map and how the course is organized. This is an orientation video, not a replacement for the Transformer paper or LLM-internals study.",
        isCampusX: true,
      },
      {
        kind: "Video · Priority",
        title: "Andrej Karpathy — Deep Dive into LLMs",
        url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
        desc: "Watch for tokenization, training/inference, model architecture and the overall LLM mental model. Take notes on the parts you can explain back.",
      },
      {
        kind: "Visual explainer · Read",
        title: "The Illustrated Transformer",
        url: "https://jalammar.github.io/illustrated-transformer/",
        desc: "Read the diagrams carefully, especially attention, encoder/decoder flow and positional information.",
      },
      {
        kind: "Video · API starter",
        title: "OpenAI API crash course",
        url: "https://www.youtube.com/watch?v=SaGrNyDCJA4",
        desc: "Use as an API orientation; verify current API patterns in official docs before coding.",
      },
      {
        kind: "Official docs",
        title: "OpenAI text generation guide & Production best practices",
        url: "https://platform.openai.com/docs/guides/text?api-mode=responses",
        desc: "Read request/response patterns, model behavior and basic production concerns.",
      },
      {
        kind: "Research paper · Core",
        title: "Attention Is All You Need",
        url: "https://arxiv.org/abs/1706.03762",
        desc: "Read abstract, introduction, Transformer architecture figure, attention and positional encoding sections. Focus on the motivation and block design.",
        isPaper: true,
      },
      {
        kind: "Research paper · Core",
        title: "Language Models are Few-Shot Learners",
        url: "https://arxiv.org/abs/2005.14165",
        desc: "Understand GPT-3, in-context learning, zero/few-shot evaluation and the difference between prompting and fine-tuning.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 1,
        title: "Attention Is All You Need",
        url: "https://arxiv.org/abs/1706.03762",
        notes: "Week 1 · Transformer, self-attention, multi-head attention, positional encoding.",
      },
      {
        number: 2,
        title: "Language Models are Few-Shot Learners",
        url: "https://arxiv.org/abs/2005.14165",
        notes: "Week 1 · GPT-3, zero/few-shot learning, in-context learning.",
      },
      {
        number: 3,
        title: "Lost in the Middle: How Language Models Use Long Contexts",
        url: "https://aclanthology.org/2024.tacl-1.9/",
        notes: "Week 1 / 4 · Long context, evidence position and context-window behavior.",
      },
    ],
    definitionOfDone:
      "Your playground runs locally, shows a response, supports multiple turns, handles an API failure gracefully and lets you compare at least three generation settings. Explain tokenization, attention and sampling in your own words.",
    dayPlan: [
      { day: "Day 1", task: "LLM pipeline and vocabulary" },
      { day: "Day 2", task: "Karpathy video + notes" },
      { day: "Day 3", task: "Transformer visual reading" },
      { day: "Day 4", task: "Read paper diagrams" },
      { day: "Day 5", task: "Build chat playground" },
      { day: "Day 6", task: "Sampling experiments" },
      { day: "Day 7", task: "Test, document, review" },
    ],
  },
  {
    id: "week2",
    weekNumber: 2,
    badge: "Week 02 · Prompt Battle",
    title: "Prompt Engineering & LLM APIs",
    description:
      "Control the model with clear instructions, reliable schemas and a repeatable evaluation loop.",
    deliverable: "Deliverable: AI Assistant",
    mission:
      "Same model + same task: improve the output through measurable prompt changes.",
    topics: [
      "Prompt anatomy: goal, context, instruction, constraints, examples and output format.",
      "Zero-shot, few-shot, role/context prompting, task decomposition and prompt versioning.",
      "System/developer/user instructions and conversation history; avoid relying on role labels as a security boundary.",
      "Structured outputs, JSON Schema, Pydantic validation and schema failure handling.",
      "Function/tool calling: model proposes a tool call; your application validates and executes it.",
      "Streaming, async requests, retries with backoff, timeouts, rate limits and token/cost tracking.",
      "Prompt evaluation: correctness, relevance, format validity, consistency and regression tests.",
    ],
    buildTasks: [
      "Implement a reusable LLM client wrapper with config separated from application logic.",
      "Build a structured-output assistant using Pydantic and validation/retry behavior.",
      "Add one safe tool (calculator or date converter) with explicit input validation.",
      "Create 20 test prompts and compare Prompt v1 vs v2 in a table.",
    ],
    resources: [
      {
        kind: "CampusX individual video · Course setup",
        title: "Generative AI using LangChain — Course Introduction",
        url: "https://www.youtube.com/watch?v=_3ezSpJw2E8",
        desc: "Watch the introduction to understand the course scope and how the LangChain lessons fit together. Then continue with prompt/API docs and implement your own LLM client.",
        isCampusX: true,
      },
      {
        kind: "Official guide · Priority",
        title: "Prompt engineering guide",
        url: "https://platform.openai.com/docs/guides/prompt-engineering",
        desc: "Read how to specify instructions, provide context, delimit input and define output requirements.",
      },
      {
        kind: "Official guide",
        title: "Structured Outputs & Function Calling",
        url: "https://platform.openai.com/docs/guides/structured-outputs",
        desc: "Understand schema-constrained responses and the application-side tool execution loop.",
      },
      {
        kind: "Official API docs",
        title: "Responses API migration guide",
        url: "https://platform.openai.com/docs/guides/migrate-to-responses",
        desc: "Use current API patterns and check the API documentation for the exact model/provider you choose.",
      },
      {
        kind: "Video · Async Python",
        title: "Corey Schafer — AsyncIO in Python",
        url: "https://www.youtube.com/watch?v=oAkLSJNr5zY",
        desc: "Focus on async/await, concurrency and when asynchronous I/O helps API-heavy applications.",
      },
      {
        kind: "Documentation",
        title: "Pydantic & Streaming responses",
        url: "https://docs.pydantic.dev/latest/",
        desc: "Read model validation, field constraints, serialization and streaming events.",
      },
      {
        kind: "Research paper",
        title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
        url: "https://arxiv.org/abs/2201.11903",
        desc: "Understand the paper’s prompting setup and results. Use reasoning prompts to improve task performance, not as proof that the model is correct.",
        isPaper: true,
      },
      {
        kind: "Research paper",
        title: "Self-Consistency Improves Chain of Thought Reasoning",
        url: "https://arxiv.org/abs/2203.11171",
        desc: "Study sampling multiple candidate solutions and aggregating answers; consider the added latency and cost.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 4,
        title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
        url: "https://arxiv.org/abs/2201.11903",
        notes: "Week 2 · Prompting and multi-step task performance.",
      },
      {
        number: 5,
        title: "Self-Consistency Improves Chain of Thought Reasoning",
        url: "https://arxiv.org/abs/2203.11171",
        notes: "Week 2 · Multiple sampled solutions and answer aggregation.",
      },
    ],
    definitionOfDone:
      "The assistant returns validated structured data, calls a tool only when needed, streams or handles async requests appropriately, and passes a small regression suite. Record failure cases and prompt changes.",
    dayPlan: [
      { day: "Day 1", task: "Prompt anatomy and examples" },
      { day: "Day 2", task: "Prompt v1/v2 experiments" },
      { day: "Day 3", task: "Structured output + Pydantic" },
      { day: "Day 4", task: "Function calling" },
      { day: "Day 5", task: "Async, streaming, retries" },
      { day: "Day 6", task: "Build assistant" },
      { day: "Day 7", task: "Regression tests and report" },
    ],
  },
  {
    id: "week3",
    weekNumber: 3,
    badge: "Week 03 · Talk to Your Data",
    title: "RAG Fundamentals & Vector Databases",
    description:
      "Give an LLM access to your documents and produce grounded answers with traceable sources.",
    deliverable: "Deliverable: PDF Q&A",
    mission:
      "Upload a PDF, ask a question, retrieve relevant evidence and cite the source in the answer.",
    topics: [
      "RAG pipeline: ingest → clean → chunk → embed → index → retrieve → augment → generate.",
      "Document loaders, PDF extraction, OCR awareness, metadata and source/page tracking.",
      "Chunk size, overlap, sentence/recursive/semantic chunking; evaluate rather than guess defaults.",
      "Embedding model choice, vector dimensions, cosine/dot-product/distance and embedding normalization.",
      "Top-k similarity search, metadata filtering, namespaces/collections and document updates/deletion.",
      "Qdrant concepts and PostgreSQL + pgvector; understand when to choose a vector database vs relational extension.",
      "Grounded response instructions, citations, no-answer behavior and retrieval debugging.",
    ],
    buildTasks: [
      "Ingest a small set of PDFs/notes with document title, page number and chunk ID metadata.",
      "Build one retrieval flow in Qdrant and a comparable flow in pgvector.",
      "Return answer + citations/snippets and abstain when the documents do not contain the answer.",
      "Test 20 questions: answerable, ambiguous, irrelevant and unanswerable.",
    ],
    resources: [
      {
        kind: "CampusX individual video · RAG ingestion",
        title: "Text Splitters in LangChain | Video 11",
        url: "https://www.youtube.com/watch?v=SEWS9P4ODmc",
        desc: "Watch when studying chunking. Compare length-based, structure-based and semantic splitting, then evaluate chunk size and overlap on your own documents.",
        isCampusX: true,
      },
      {
        kind: "Tutorial · Priority",
        title: "LangChain RAG tutorial",
        url: "https://python.langchain.com/docs/tutorials/rag/",
        desc: "Follow the end-to-end pattern, but understand each step instead of copying the tutorial blindly.",
      },
      {
        kind: "Video",
        title: "Sentence embeddings and semantic search",
        url: "https://www.youtube.com/watch?v=WS1uVMGhlWQ",
        desc: "Focus on how text is represented as vectors and why semantic similarity differs from exact keyword matching.",
      },
      {
        kind: "Official docs",
        title: "Qdrant tutorials & pgvector",
        url: "https://qdrant.tech/documentation/tutorials-basics/",
        desc: "Implement collections/points and PostgreSQL vector columns/indexes. Record setup, filtering, query and operational trade-offs.",
      },
      {
        kind: "Reference",
        title: "Weaviate quickstart & MTEB leaderboard",
        url: "https://docs.weaviate.io/weaviate/quickstart",
        desc: "Read the quickstart for awareness; use MTEB as a starting point for embedding-model comparisons, not as a universal winner list.",
      },
      {
        kind: "Research paper · Core",
        title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        url: "https://arxiv.org/abs/2005.11401",
        desc: "Understand the RAG motivation, retriever/generator combination and knowledge-intensive task evaluation.",
        isPaper: true,
      },
      {
        kind: "Research paper",
        title: "Dense Passage Retrieval for Open-Domain Question Answering",
        url: "https://aclanthology.org/2020.emnlp-main.550/",
        desc: "Read the dual-encoder retrieval idea and how dense retrieval is evaluated against sparse baselines.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 6,
        title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        url: "https://arxiv.org/abs/2005.11401",
        notes: "Week 3 · RAG motivation, retrieval and generation.",
      },
      {
        number: 7,
        title: "Dense Passage Retrieval for Open-Domain Question Answering",
        url: "https://aclanthology.org/2020.emnlp-main.550/",
        notes: "Week 3 · Dense retrieval, dual encoders, vector search.",
      },
    ],
    definitionOfDone:
      "Answers cite document/page evidence; you can inspect retrieved chunks; unknown questions do not trigger confident fabrication; Qdrant and pgvector results are compared on the same corpus and query set.",
    dayPlan: [
      { day: "Day 1", task: "RAG architecture and paper" },
      { day: "Day 2", task: "Document parsing and chunking" },
      { day: "Day 3", task: "Embeddings and vector search" },
      { day: "Day 4", task: "Qdrant implementation" },
      { day: "Day 5", task: "pgvector implementation" },
      { day: "Day 6", task: "PDF Q&A and citations" },
      { day: "Day 7", task: "Test and compare databases" },
    ],
  },
  {
    id: "week4",
    weekNumber: 4,
    badge: "Week 04 · Advanced RAG",
    title: "Hybrid Search, Reranking & Adaptive Retrieval",
    description:
      "Improve retrieval quality systematically; understand when to retrieve, how to transform a query and how to detect weak evidence.",
    deliverable: "Deliverable: Evaluated RAG",
    mission:
      "Establish a baseline, change one retrieval component at a time and demonstrate whether the change helps.",
    topics: [
      "Naive RAG vs Advanced RAG vs Modular RAG; map each to actual components.",
      "Lexical BM25 + dense vector search; Reciprocal Rank Fusion (RRF) and score fusion.",
      "Cross-encoder reranking: retrieve candidates first, then score query-document pairs.",
      "Query rewriting, multi-query retrieval/RAG-Fusion, HyDE and metadata-aware filtering.",
      "Parent-child retrieval, contextual chunks and long-context failure patterns.",
      "Corrective/adaptive RAG, Self-RAG and Agentic RAG as design patterns; do not assume agents always outperform simple pipelines.",
      "Metrics: Recall@K, Precision@K, MRR, nDCG@K, answer faithfulness, answer relevance, latency and cost.",
    ],
    buildTasks: [
      "Build a fixed benchmark of at least 30 queries with relevant document/chunk labels.",
      "Compare dense-only, BM25-only, hybrid and hybrid + reranker.",
      "Implement one query transformation (query rewriting or HyDE) and compare it with baseline.",
      "Report retrieval quality, answer quality, p50/p95 latency and cost; document failure examples.",
    ],
    resources: [
      {
        kind: "Video",
        title: "Advanced RAG techniques",
        url: "https://www.youtube.com/watch?v=_kpxLkH5vY0",
        desc: "Use as an overview of retrieval improvements; implement and benchmark each technique separately.",
      },
      {
        kind: "Video",
        title: "Hybrid search and reranking",
        url: "https://www.youtube.com/watch?v=XvKiTfd6Xvo",
        desc: "Focus on the division of labor between lexical search, vector retrieval and reranking.",
      },
      {
        kind: "Evaluation framework",
        title: "Ragas documentation",
        url: "https://docs.ragas.io/en/latest/",
        desc: "Learn evaluation datasets, metrics and judge-based evaluation. Validate automated scores with human review.",
      },
      {
        kind: "Database benchmark",
        title: "Qdrant vector database benchmark",
        url: "https://qdrant.tech/articles/vector-database-benchmark/",
        desc: "Read benchmark methodology and limitations; don't interpret one benchmark as a universal database ranking.",
      },
      {
        kind: "Research paper",
        title: "Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)",
        url: "https://aclanthology.org/2023.acl-long.99/",
        desc: "Understand hypothetical-document embeddings and why query expansion can help or introduce noise.",
        isPaper: true,
      },
      {
        kind: "Research paper · Optional deeper read",
        title: "RocketQA: An Optimized Training Approach to Dense Passage Retrieval",
        url: "https://aclanthology.org/2021.naacl-main.466/",
        desc: "Focus on dense retrieval training, hard negatives and retrieval quality rather than implementing training from scratch.",
        isPaper: true,
      },
      {
        kind: "Long-context paper",
        title: "Lost in the Middle: How Language Models Use Long Contexts",
        url: "https://aclanthology.org/2024.tacl-1.9/",
        desc: "Understand why evidence position and context length can affect use of retrieved material.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 3,
        title: "Lost in the Middle: How Language Models Use Long Contexts",
        url: "https://aclanthology.org/2024.tacl-1.9/",
        notes: "Week 1 / 4 · Long context, evidence position and context-window behavior.",
      },
      {
        number: 8,
        title: "Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)",
        url: "https://aclanthology.org/2023.acl-long.99/",
        notes: "Week 4 · Query transformation and hypothetical documents.",
      },
      {
        number: 9,
        title: "RocketQA: An Optimized Training Approach to Dense Passage Retrieval",
        url: "https://aclanthology.org/2021.naacl-main.466/",
        notes: "Week 4 · Dense retrieval training, hard negatives and ranking.",
      },
    ],
    definitionOfDone:
      "A reproducible benchmark report identifies which retrieval pipeline is best for your dataset, with both aggregate metrics and inspected failures. Keep the simplest design that meets your quality target.",
    dayPlan: [
      { day: "Day 1", task: "Baseline and dataset labels" },
      { day: "Day 2", task: "BM25 and hybrid fusion" },
      { day: "Day 3", task: "Reranking" },
      { day: "Day 4", task: "Query rewriting / HyDE" },
      { day: "Day 5", task: "Ragas + retrieval metrics" },
      { day: "Day 6", task: "Run experiments" },
      { day: "Day 7", task: "Results and error analysis" },
    ],
  },
  {
    id: "week5",
    weekNumber: 5,
    badge: "Week 05 · Tool Calling",
    title: "Function Calling, APIs & MCP",
    description:
      "Move from text-only chat to an assistant that can choose tools, request structured arguments and interact with external capabilities safely.",
    deliverable: "Deliverable: MCP Assistant",
    mission:
      "The model proposes an action, your application validates it, executes it and returns the result to the model.",
    topics: [
      "Tool schemas: name, purpose, parameter types, required fields, descriptions and validation.",
      "Tool-call loop: request → tool call → validate/authorize → execute → tool result → final response.",
      "Idempotency, timeouts, retries, error normalization, tool allowlists and maximum tool-call count.",
      "MCP concepts: host, client, server; tools, resources and prompts; local vs remote transport.",
      "Tool permission boundaries, secret handling, untrusted tool output and human approval for consequential actions.",
      "When to use direct function calling vs an MCP server; MCP is a protocol, not an agent by itself.",
    ],
    buildTasks: [
      "Implement calculator, local document search and one read-only public API tool.",
      "Build a minimal local MCP server and connect an MCP client to discover and invoke its tools.",
      "Validate every argument; test missing fields, invalid types, timeout and tool failure.",
      "Add an explicit approval boundary for any future write/destructive action.",
    ],
    resources: [
      {
        kind: "CampusX individual video · Tooling context",
        title: "Generative AI using LangChain — Course Introduction",
        url: "https://www.youtube.com/watch?v=_3ezSpJw2E8",
        desc: "Use this short orientation to place LangChain tools and agent lessons in the overall course. For implementation, prioritize official docs.",
        isCampusX: true,
      },
      {
        kind: "Official guide · Priority",
        title: "Function calling guide",
        url: "https://platform.openai.com/docs/guides/function-calling",
        desc: "Read tool definitions, arguments, tool results and the complete interaction loop.",
      },
      {
        kind: "Official MCP docs",
        title: "MCP introduction & documentation",
        url: "https://modelcontextprotocol.io/docs/getting-started/intro",
        desc: "Start with architecture and quickstart, then inspect server/client examples and security guidance.",
      },
      {
        kind: "Framework docs",
        title: "LangChain tool guides",
        url: "https://python.langchain.com/docs/how_to/#tools",
        desc: "Use this to compare a framework abstraction with a small direct implementation.",
      },
      {
        kind: "Research paper",
        title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
        url: "https://arxiv.org/abs/2302.04761",
        desc: "Read the motivation for tool use and how API calls can be integrated into language-model behavior.",
        isPaper: true,
      },
      {
        kind: "Research paper",
        title: "ReAct: Synergizing Reasoning and Acting in Language Models",
        url: "https://arxiv.org/abs/2210.03629",
        desc: "Study the observe/act loop and tool interaction. Treat traces as implementation records, not as a demand to expose private reasoning.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 10,
        title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
        url: "https://arxiv.org/abs/2302.04761",
        notes: "Week 5 · Tool use and API-call learning.",
      },
      {
        number: 11,
        title: "ReAct: Synergizing Reasoning and Acting in Language Models",
        url: "https://arxiv.org/abs/2210.03629",
        notes: "Week 5 / 6 · Agent loops, acting and observations.",
      },
    ],
    definitionOfDone:
      "Your assistant discovers or knows available tools, validates arguments, handles failures and never executes a tool just because untrusted content requested it. The MCP demo works end-to-end with at least two tools.",
    dayPlan: [
      { day: "Day 1", task: "Function-calling lifecycle" },
      { day: "Day 2", task: "Tool schemas and validation" },
      { day: "Day 3", task: "Error handling and permissions" },
      { day: "Day 4", task: "MCP architecture" },
      { day: "Day 5", task: "Build MCP server/client" },
      { day: "Day 6", task: "Integrate tools into assistant" },
      { day: "Day 7", task: "Security tests and docs" },
    ],
  },
  {
    id: "week6",
    weekNumber: 6,
    badge: "Week 06 · Agent Arena",
    title: "LangGraph, State, Memory & Agent Loops",
    description:
      "Build a bounded, stateful agent that can plan, act, observe, recover and return a verifiable result.",
    deliverable: "Deliverable: Personal AI Agent",
    mission:
      "Stop hard-coding every step; let a controlled workflow choose the next action while keeping state, limits and checkpoints explicit.",
    topics: [
      "Agent definition and distinction between a fixed workflow and a model-directed agent loop.",
      "LangGraph StateGraph, nodes, edges, conditional routing, typed state and reducers.",
      "Planner/executor, ReAct-style tool loop, bounded retries and stop conditions.",
      "Short-term state, thread IDs, checkpointing, persistence and user-approved long-term memory.",
      "Human-in-the-loop: interrupt before a sensitive tool action and resume after approval.",
      "Observability: traces, node inputs/outputs, latency, token use, tool failures and run outcomes.",
      "LangSmith tracing/evaluation; distinguish debug traces from end-user conversation output.",
    ],
    buildTasks: [
      "Implement a LangGraph workflow with planner, tool execution, result check and final response nodes.",
      "Add web search or a safe public data tool, RAG/file search and calculator.",
      "Persist state across a thread and resume from a checkpoint.",
      "Set maximum steps, timeout and tool permissions; add human approval for consequential actions.",
      "Trace at least 10 runs and identify where latency, tokens or failures occur.",
    ],
    resources: [
      {
        kind: "CampusX individual video · Core workflow concepts",
        title: "LangGraph Core Concepts | Agentic AI using LangGraph | Video 4",
        url: "https://www.youtube.com/watch?v=D5KhiCDM9XQ",
        desc: "Watch for nodes, edges, state, reducers, routing, parallelization and orchestrator-worker patterns. Recreate a small graph after watching; do not only take notes.",
        isCampusX: true,
      },
      {
        kind: "Official docs · Priority",
        title: "LangGraph overview",
        url: "https://docs.langchain.com/oss/python/langgraph/overview",
        desc: "Read graph state, nodes/edges, persistence and human-in-the-loop guides. Use current documentation because framework APIs evolve.",
      },
      {
        kind: "How-to guides",
        title: "LangGraph how-to guides & LangSmith observability",
        url: "https://langchain-ai.github.io/langgraph/how-tos/",
        desc: "Use docs to implement checkpointing, interrupts and trace inspection.",
      },
      {
        kind: "Research paper",
        title: "Generative Agents: Interactive Simulacra of Human Behavior",
        url: "https://arxiv.org/abs/2304.03442",
        desc: "Read memory, reflection and planning architecture. Separate simulation research from a practical production agent.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 11,
        title: "ReAct: Synergizing Reasoning and Acting in Language Models",
        url: "https://arxiv.org/abs/2210.03629",
        notes: "Week 5 / 6 · Agent loops, acting and observations.",
      },
      {
        number: 12,
        title: "Generative Agents: Interactive Simulacra of Human Behavior",
        url: "https://arxiv.org/abs/2304.03442",
        notes: "Week 6 · Memory, reflection and planning.",
      },
    ],
    definitionOfDone:
      "The agent can finish a small multi-step task with explicit state, traceable tool calls, bounded execution, checkpoint/resume and useful error recovery. It does not loop indefinitely or perform sensitive actions without authorization.",
    dayPlan: [
      { day: "Day 1", task: "Workflow vs agent" },
      { day: "Day 2", task: "Graph state and nodes" },
      { day: "Day 3", task: "Conditional edges and tools" },
      { day: "Day 4", task: "Checkpointing and threads" },
      { day: "Day 5", task: "Human approval and limits" },
      { day: "Day 6", task: "Tracing and evaluation" },
      { day: "Day 7", task: "Run, debug and document" },
    ],
  },
  {
    id: "week7",
    weekNumber: 7,
    badge: "Week 07 · Agent Wars",
    title: "Multi-Agent Systems & Coordination",
    description:
      "Decompose complex work into specialist roles, coordinate them through shared state and independently review the result.",
    deliverable: "Deliverable: Research System",
    mission:
      "Use multiple agents only where specialization or parallel work adds measurable value over one agent.",
    topics: [
      "Supervisor/router, specialist agents, reviewer/critic and final synthesis.",
      "Sequential vs parallel execution, delegation, shared state and message/result contracts.",
      "Researcher, analyst, coder and reviewer roles; keep role instructions narrow and non-overlapping.",
      "Conflict resolution, evidence comparison, duplicate work, agent handoff and termination.",
      "Multi-agent cost/latency, reliability, observability and failure propagation.",
      "Framework awareness: implement the main system in LangGraph; compare CrewAI and AutoGen conceptually.",
    ],
    buildTasks: [
      "Build a supervisor that routes a research request to researcher and analyst roles.",
      "Give each specialist a typed output contract, evidence/source fields and clear completion criteria.",
      "Run independent research/analysis in parallel where useful, then invoke a reviewer.",
      "Measure single-agent vs multi-agent quality, latency, tool calls and cost on the same tasks.",
      "Test disagreement, missing evidence, tool failure and a reviewer rejection/revision loop.",
    ],
    resources: [
      {
        kind: "CampusX individual video · Coordination foundation",
        title: "LangGraph Core Concepts | Agentic AI using LangGraph | Video 4",
        url: "https://www.youtube.com/watch?v=D5KhiCDM9XQ",
        desc: "Review routing, parallel execution and orchestrator-worker patterns before building supervisor and specialist agents. Extend the graph with explicit shared state and a reviewer.",
        isCampusX: true,
      },
      {
        kind: "Video · Agentic design",
        title: "Andrew Ng — Agentic Design Patterns",
        url: "https://www.youtube.com/watch?v=sal78ACtGTc",
        desc: "Focus on reflection, tool use, planning and multi-agent collaboration; distinguish patterns from framework-specific code.",
      },
      {
        kind: "Video · Framework overview",
        title: "CrewAI course / overview",
        url: "https://www.youtube.com/watch?v=sPzc6hMg7So",
        desc: "Use for role/task/crew mental models; do not migrate your entire implementation unless it solves a real need.",
      },
      {
        kind: "Official docs",
        title: "LangGraph multi-agent patterns & AutoGen AgentChat guide",
        url: "https://docs.langchain.com/oss/python/langgraph/multi-agent",
        desc: "Compare supervisor, handoff, team communication and orchestration approaches.",
      },
      {
        kind: "Research paper",
        title: "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
        url: "https://www.microsoft.com/en-us/research/publication/autogen-enabling-next-gen-llm-applications-via-multi-agent-conversation/",
        desc: "Read the communication framework, use cases and orchestration motivation.",
        isPaper: true,
      },
      {
        kind: "Research paper",
        title: "Mixture-of-Agents Enhances Large Language Model Capabilities",
        url: "https://arxiv.org/abs/2406.04692",
        desc: "Understand layered generation/aggregation and the cost-quality trade-off of combining multiple model outputs.",
        isPaper: true,
      },
    ],
    papers: [
      {
        number: 13,
        title: "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation",
        url: "https://www.microsoft.com/en-us/research/publication/autogen-enabling-next-gen-llm-applications-via-multi-agent-conversation/",
        notes: "Week 7 · Multi-agent communication, delegation and orchestration.",
      },
      {
        number: 14,
        title: "Mixture-of-Agents Enhances Large Language Model Capabilities",
        url: "https://arxiv.org/abs/2406.04692",
        notes: "Week 7 · Layered agents and aggregation.",
      },
    ],
    definitionOfDone:
      "A multi-agent research system produces a cited report with specialist outputs, an explicit review stage and a termination rule. The benchmark shows when multiple agents help and when they merely add cost.",
    dayPlan: [
      { day: "Day 1", task: "Multi-agent patterns" },
      { day: "Day 2", task: "Supervisor + contracts" },
      { day: "Day 3", task: "Specialist agents" },
      { day: "Day 4", task: "Parallel coordination" },
      { day: "Day 5", task: "Reviewer and conflict cases" },
      { day: "Day 6", task: "Compare with single agent" },
      { day: "Day 7", task: "Report and demo" },
    ],
  },
  {
    id: "week8",
    weekNumber: 8,
    badge: "Week 08 · Agent Arena",
    title: "Evaluation, Security, Production & Deployment",
    description:
      "Turn the prototype into a testable, observable and deployable application with clear limits and failure behavior.",
    deliverable: "Deliverable: Deployed Capstone",
    mission:
      "Make the system measurable and safe enough to demo reliably, not just impressive on one happy-path prompt.",
    topics: [
      "Golden evaluation set, expected answers, evidence labels, regression runs and human spot checks.",
      "RAG metrics: retrieval recall, faithfulness, answer relevance and citation correctness.",
      "Agent metrics: task success, tool correctness, steps per task, retries, latency and cost.",
      "Prompt injection, untrusted retrieved text, tool misuse, excessive agency and data exfiltration.",
      "Secrets management, authentication, authorization, rate limits, input validation and safe logging.",
      "FastAPI endpoints, environment variables, Docker, health checks, CI tests and deployment configuration.",
      "Cost/latency budgets, caching, model fallback, retries and graceful degradation.",
      "Document architecture, threat model, setup, limitations, evaluation results and known failure cases.",
    ],
    buildTasks: [
      "Create 30–50 representative evaluation tasks, including unanswerable and adversarial examples.",
      "Run RAG/agent evaluation and store results in a repeatable report.",
      "Test prompt injection in documents and tool output; enforce permissions and approvals in code.",
      "Expose the system via FastAPI, add tests and package with Docker.",
      "Deploy, add health checks, write README + architecture diagram + short demo script.",
    ],
    resources: [
      {
        kind: "CampusX individual video · Workflow recap",
        title: "LangGraph Core Concepts | Agentic AI using LangGraph | Video 4",
        url: "https://www.youtube.com/watch?v=D5KhiCDM9XQ",
        desc: "Revisit state and execution concepts only if needed. Spend most of this week on evaluation, security tests, observability, Docker and deployment.",
        isCampusX: true,
      },
      {
        kind: "Security · Priority",
        title: "OWASP Top 10 for LLM Applications",
        url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
        desc: "Review prompt injection, sensitive information disclosure, improper output handling, excessive agency and other relevant risks.",
      },
      {
        kind: "Evaluation",
        title: "LangSmith evaluation docs & Ragas",
        url: "https://docs.langchain.com/langsmith/evaluation",
        desc: "Build datasets, evaluators and repeatable experiments; inspect examples behind aggregate scores.",
      },
      {
        kind: "Agent benchmark paper",
        title: "AgentBench: Evaluating LLMs as Agents",
        url: "https://arxiv.org/abs/2308.03688",
        desc: "Understand why agent evaluation needs multi-step interactive tasks rather than only single-turn answer quality.",
        isPaper: true,
      },
      {
        kind: "Security research paper",
        title: "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions",
        url: "https://arxiv.org/abs/2404.13208",
        desc: "Study instruction priority and why systems need to distinguish trusted instructions from untrusted content.",
        isPaper: true,
      },
      {
        kind: "Security research paper",
        title: "AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents",
        url: "https://arxiv.org/abs/2406.13352",
        desc: "Read its threat model and evaluation approach for attacks/defenses involving tools and external content.",
        isPaper: true,
      },
      {
        kind: "Deployment docs",
        title: "FastAPI, Docker & MCP Security",
        url: "https://fastapi.tiangolo.com/",
        desc: "Use these to implement a clean API boundary, reproducible environment and safe tool access.",
      },
    ],
    papers: [
      {
        number: 15,
        title: "RAGAS: Automated Evaluation of Retrieval Augmented Generation",
        url: "https://arxiv.org/abs/2309.15217",
        notes: "Week 8 · Faithfulness, relevance and RAG answer quality.",
      },
      {
        number: 16,
        title: "AgentBench: Evaluating LLMs as Agents",
        url: "https://arxiv.org/abs/2308.03688",
        notes: "Week 8 · Interactive task success, planning and tool use.",
      },
      {
        number: 17,
        title: "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions",
        url: "https://arxiv.org/abs/2404.13208",
        notes: "Week 8 · Instruction priority and security.",
      },
      {
        number: 18,
        title: "AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents",
        url: "https://arxiv.org/abs/2406.13352",
        notes: "Week 8 · Agent security, prompt injection and defense evaluation.",
      },
    ],
    definitionOfDone:
      "A fresh machine can follow your README to run or deploy the project. The application has tests, documented evaluation scores, a threat model, safe tool permissions, health checks and known limitations.",
    dayPlan: [
      { day: "Day 1", task: "Golden test set and metrics" },
      { day: "Day 2", task: "RAG + agent evaluation" },
      { day: "Day 3", task: "Threat model and attacks" },
      { day: "Day 4", task: "Auth, limits and safe tools" },
      { day: "Day 5", task: "FastAPI and Docker" },
      { day: "Day 6", task: "Deploy and test" },
      { day: "Day 7", task: "Docs, demo and review" },
    ],
  },
];
