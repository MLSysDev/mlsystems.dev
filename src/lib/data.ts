// Placeholder data for topics, threads, and tools.
// As the site grows: move threads into a real DB / forum, move topics into a CMS or just stay here.

export type Topic = {
  id: string;
  name: string;
  count: number;
  desc: string;
};

export const TOPICS: Topic[] = [
  { id: 'inference', name: 'Inference & Serving', count: 47, desc: 'vLLM, TGI, paged attention, continuous batching, speculative decoding.' },
  { id: 'training', name: 'Training Systems', count: 38, desc: 'Trainers, optimizers, recipes, debugging large runs.' },
  { id: 'architecture', name: 'Architecture', count: 29, desc: "Transformers, MoE, SSMs, hybrids, and what's next." },
  { id: 'distributed', name: 'Distributed Training', count: 31, desc: 'FSDP, tensor parallel, pipeline parallel, sequence parallel.' },
  { id: 'quantization', name: 'Quantization', count: 16, desc: 'PTQ, QAT, FP4, FP8, mixed precision, calibration.' },
  { id: 'rag', name: 'Retrieval & RAG', count: 24, desc: 'Embeddings, indexes, re-rankers, and pipeline systems.' },
  { id: 'multimodal', name: 'Multimodal & VLMs', count: 21, desc: 'Vision-language models, audio, video, world tokens.' },
  { id: 'world-models', name: 'World Models & Agents', count: 18, desc: 'Latent dynamics, planning, JEPA, embodied agents.' },
  { id: 'evals', name: 'Evaluation', count: 22, desc: 'Benchmarks, harnesses, contamination, signal vs noise.' },
  { id: 'mlops', name: 'MLOps & Deployment', count: 19, desc: 'Pipelines, monitoring, observability, regressions.' },
];

export type Thread = {
  id: string;
  title: string;
  author: string;
  replies: number;
  lastReply: string;
  category: string;
};

export const THREADS: Thread[] = [
  { id: 't1', title: 'Anyone shipping FP8 in production yet? Mixed bag here.', author: 'ana', replies: 47, lastReply: '12 min ago', category: 'Quantization' },
  { id: 't2', title: 'Why does my SFT degrade on long-context after merging adapters?', author: 'tom', replies: 23, lastReply: '1 hr ago', category: 'Training' },
  { id: 't3', title: 'Sparse attention papers worth reading — 2026 thread', author: 'lchen', replies: 89, lastReply: '2 hr ago', category: 'Architecture' },
  { id: 't4', title: 'vLLM 0.9.x — share your benchmarks', author: 'priya', replies: 31, lastReply: '4 hr ago', category: 'Inference' },
  { id: 't5', title: 'How are you handling KV cache offload to host memory?', author: 'mira', replies: 18, lastReply: '6 hr ago', category: 'Inference' },
  { id: 't6', title: 'Best practices for evaluating world models on offline data', author: 'felix', replies: 12, lastReply: '8 hr ago', category: 'World Models' },
];

export type Tool = {
  id: string;
  name: string;
  desc: string;
  tag: string;
  available: boolean;
};

export const TOOLS: Tool[] = [
  { id: 'attention-viz', name: 'Attention Visualizer', desc: 'Inspect attention patterns layer-by-layer for any HF model.', tag: 'Live', available: true },
  { id: 'throughput-calc', name: 'Throughput Calculator', desc: 'Estimate tokens/sec for any GPU + model + batch size combination.', tag: 'Live', available: true },
  { id: 'cost-calc', name: 'Inference Cost Calculator', desc: 'Compare provider pricing against self-hosting at realistic utilization.', tag: 'Live', available: true },
  { id: 'model-card', name: 'Model Card Generator', desc: 'Build a structured model card from a checkpoint and an eval log.', tag: 'Beta', available: false },
  { id: 'eval-harness', name: 'Eval Harness Playground', desc: 'Run a small set of evals against any endpoint, get a scorecard.', tag: 'Beta', available: false },
  { id: 'kernel-bench', name: 'Kernel Benchmark', desc: 'Side-by-side timings for Triton, CUDA, and PyTorch kernels.', tag: 'Soon', available: false },
];

// Helpers used in multiple places.
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
