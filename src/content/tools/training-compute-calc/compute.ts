// Peak dense BF16 tensor-core throughput from NVIDIA datasheets (no 2:4 sparsity).
export const GPU_PEAK = {
  a100: { name: 'A100 80GB', tflops: 312 },
  h100: { name: 'H100 SXM', tflops: 989 },
  h200: { name: 'H200 SXM', tflops: 989 },
  b200: { name: 'B200', tflops: 2250 },
} as const;
export type GpuKey = keyof typeof GPU_PEAK;

// Hoffmann et al. (Chinchilla, 2022): compute-optimal training uses ~20 tokens per parameter.
export const CHINCHILLA_TOKENS_PER_PARAM = 20;

// Kaplan et al. (2020): forward + backward ≈ 6 FLOPs per parameter per token.
export function trainingFlops(paramsB: number, tokensT: number): number {
  return 6 * paramsB * 1e9 * tokensT * 1e12;
}

export function chinchillaTokensT(paramsB: number): number {
  return (paramsB * 1e9 * CHINCHILLA_TOKENS_PER_PARAM) / 1e12;
}

export function tokensPerParam(paramsB: number, tokensT: number): number {
  return (tokensT * 1e12) / (paramsB * 1e9);
}

export function gpuHours(flops: number, peakTflops: number, mfu: number): number {
  return flops / (peakTflops * 1e12 * mfu) / 3600;
}

export function wallClockDays(totalGpuHours: number, gpuCount: number): number {
  return totalGpuHours / gpuCount / 24;
}

// MFU as defined in the PaLM paper: achieved model FLOPs over peak hardware FLOPs.
export function impliedMfu(flops: number, peakTflops: number, reportedGpuHours: number): number {
  return flops / (peakTflops * 1e12 * reportedGpuHours * 3600);
}

export function formatSci(n: number): { mantissa: string; exponent: number } {
  if (!isFinite(n) || n <= 0) return { mantissa: '0', exponent: 0 };
  const exponent = Math.floor(Math.log10(n));
  const mantissa = n / 10 ** exponent;
  return { mantissa: mantissa.toFixed(2), exponent };
}

export function formatCompact(n: number): string {
  if (!isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
