// Site taxonomy + playground tool registry.
// Article counts are computed from the posts collection at build time — see
// countPostsByTopic() below.

export type Topic = {
  id: string;
  name: string;
  desc: string;
};

export const TOPICS: Topic[] = [
  {
    id: 'inference',
    name: 'Inference & Serving',
    desc: 'vLLM, TGI, paged attention, continuous batching, speculative decoding.',
  },
  {
    id: 'training',
    name: 'Training Systems',
    desc: 'Trainers, optimizers, recipes, debugging large runs.',
  },
  {
    id: 'architecture',
    name: 'Architecture',
    desc: "Transformers, MoE, SSMs, hybrids, and what's next.",
  },
  {
    id: 'distributed',
    name: 'Distributed Training',
    desc: 'FSDP, tensor parallel, pipeline parallel, sequence parallel.',
  },
  {
    id: 'quantization',
    name: 'Quantization',
    desc: 'PTQ, QAT, FP4, FP8, mixed precision, calibration.',
  },
  {
    id: 'rag',
    name: 'Retrieval & RAG',
    desc: 'Embeddings, indexes, re-rankers, and pipeline systems.',
  },
  {
    id: 'multimodal',
    name: 'Models',
    desc: 'LLMs, VLMs, multimodal systems, capabilities, and model behavior.',
  },
  {
    id: 'agents',
    name: 'Agents',
    desc: 'Planning, tool use, multi-agent systems, memory, and orchestration.',
  },
  {
    id: 'evals',
    name: 'Evaluation',
    desc: 'Benchmarks, harnesses, contamination, signal vs noise.',
  },
  {
    id: 'mlops',
    name: 'MLOps & Deployment',
    desc: 'Pipelines, monitoring, observability, regressions.',
  },
];

// Canonical topic IDs — the single source of truth for the taxonomy.
// Used to validate post frontmatter (see src/content/config.ts).
export const TOPIC_IDS = TOPICS.map((t) => t.id) as [string, ...string[]];

const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** Canonical display name for a topic ID; falls back to the ID if unknown. */
export function topicName(id: string): string {
  return TOPIC_BY_ID.get(id)?.name ?? id;
}

/** URL-safe slug for a free-text tag (e.g. "KV-cache" → "kv-cache"). */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function countPostsByTopic<T extends { data: { topicId: string } }>(
  posts: T[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of TOPICS) counts[t.id] = 0;
  for (const p of posts) {
    if (counts[p.data.topicId] !== undefined) counts[p.data.topicId]++;
  }
  return counts;
}

export type ExternalToolCategory =
  | 'Tokenization'
  | 'Memory & VRAM'
  | 'Architecture'
  | 'Training & Scaling';

export type ExternalTool = {
  name: string;
  source: string;
  desc: string;
  href: string;
  category: ExternalToolCategory;
};

export const EXTERNAL_TOOLS: ExternalTool[] = [
  {
    name: 'The Tokenizer Playground',
    source: 'Xenova · Hugging Face',
    desc: 'Compare how GPT-4, LLaMA, Mistral, Qwen, Gemma, and others tokenize the same text — side by side, in the browser.',
    href: 'https://huggingface.co/spaces/Xenova/the-tokenizer-playground',
    category: 'Tokenization',
  },
  {
    name: 'Tiktokenizer',
    source: 'dqbd',
    desc: 'OpenAI-focused tokenizer playground. Visualize cl100k, o200k, and legacy encodings with per-token highlights.',
    href: 'https://tiktokenizer.vercel.app/',
    category: 'Tokenization',
  },
  {
    name: 'LLM Model VRAM Calculator',
    source: 'NyxKrage · Hugging Face',
    desc: 'Widely-referenced inference VRAM estimator for popular open-source models with quantization and context-length sliders.',
    href: 'https://huggingface.co/spaces/NyxKrage/LLM-Model-VRAM-Calculator',
    category: 'Memory & VRAM',
  },
  {
    name: 'APXML VRAM Calculator',
    source: 'APXML',
    desc: 'Inference-focused VRAM calculator covering Nvidia GPUs and Apple Silicon. Good for picking hardware for a target model.',
    href: 'https://apxml.com/tools/vram-calculator',
    category: 'Memory & VRAM',
  },
  {
    name: 'LLM Visualization',
    source: 'Brendan Bycroft',
    desc: 'A 3D, animated walk through the entire forward pass of GPT-2 nano, layer by layer. The clearest mental model of how a transformer works.',
    href: 'https://bbycroft.net/llm',
    category: 'Architecture',
  },
  {
    name: 'Chinchilla Scaling Calculator',
    source: 'Nathan Godey',
    desc: 'Plug in a compute budget, get the compute-optimal model and data size per Hoffmann et al. 2022. Charts the iso-loss surface too.',
    href: 'https://nathangodey.github.io/posts/scaling/',
    category: 'Training & Scaling',
  },
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function sortPostsByDate<T extends { id: string; data: { date: Date } }>(
  a: T,
  b: T,
): number {
  const d = +b.data.date - +a.data.date;
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

export function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
