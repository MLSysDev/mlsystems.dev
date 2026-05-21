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

export type Tool = {
  id: string;
  name: string;
  desc: string;
  tag: string;
  available: boolean;
};

export const TOOLS: Tool[] = [
  {
    id: 'throughput-calc',
    name: 'Throughput Calculator',
    desc: 'Estimate tokens/sec for any GPU + model + batch size combination.',
    tag: 'Live',
    available: true,
  },
  {
    id: 'attention-viz',
    name: 'Attention Visualizer',
    desc: 'Inspect attention patterns layer-by-layer for any HF model.',
    tag: 'Live',
    available: true,
  },
  {
    id: 'cost-calc',
    name: 'Inference Cost Calculator',
    desc: 'Compare provider pricing against self-hosting at realistic utilization.',
    tag: 'Live',
    available: true,
  },
  {
    id: 'model-card',
    name: 'Model Card Generator',
    desc: 'Generate a structured model card from a checkpoint and evaluation log.',
    tag: 'Beta',
    available: false,
  },
  {
    id: 'eval-harness',
    name: 'Eval Harness Playground',
    desc: 'Run focused evaluations against any inference endpoint and compare quality, latency, and cost.',
    tag: 'Beta',
    available: false,
  },
  {
    id: 'kernel-bench',
    name: 'Kernel Benchmark',
    desc: 'Compare Triton, CUDA, and PyTorch implementations across shapes and dtypes.',
    tag: 'Soon',
    available: false,
  },
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
