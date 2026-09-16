import { describe, expect, it } from 'vitest';
import {
  chinchillaTokensT,
  formatSci,
  gpuHours,
  impliedMfu,
  tokensPerParam,
  trainingFlops,
  wallClockDays,
} from './compute';

describe('training compute math', () => {
  it('reproduces the Llama 3 405B budget from the paper (3.8e25 FLOPs)', () => {
    const flops = trainingFlops(405, 15.6);
    expect(flops / 3.8e25).toBeCloseTo(1, 1);
  });

  it('converts 405B compute to hours at an assumed 34.6% utilization', () => {
    const hours = gpuHours(trainingFlops(405, 15.6), 989, 0.346);
    expect(hours / 30.84e6).toBeCloseTo(1, 1);
  });

  it('calculates the BF16 reference ratio from Llama 2 reported hours', () => {
    const mfu = impliedMfu(trainingFlops(70, 2.0), 312, 1_720_320);
    expect(mfu).toBeGreaterThan(0.4);
    expect(mfu).toBeLessThan(0.47);
  });

  it('inverts GPU-hour accounting without treating the inferred ratio as a measurement', () => {
    const flops = trainingFlops(37, 14.8);
    const mfu = impliedMfu(flops, 989, 2_664_000);
    expect(mfu).toBeGreaterThan(0.3);
    expect(mfu).toBeLessThan(0.4);
    const days = wallClockDays(gpuHours(flops, 989, mfu), 2048);
    expect(days / (14.8 * 3.7)).toBeCloseTo(1, 1);
  });

  it('gives Chinchilla 70B its 1.4T tokens', () => {
    expect(chinchillaTokensT(70)).toBeCloseTo(1.4, 5);
    expect(tokensPerParam(70, 1.4)).toBeCloseTo(20, 5);
  });

  it('keeps the 20x token budget positive and exact across the parameter slider range', () => {
    for (let params = 1; params <= 1000; params++) {
      const tokens = chinchillaTokensT(params);
      expect(tokens).toBeGreaterThanOrEqual(0.01);
      expect(tokens).toBeLessThanOrEqual(30);
      expect(tokensPerParam(params, tokens)).toBeCloseTo(20, 10);
    }
    expect(chinchillaTokensT(1)).toBe(0.02);
    expect(chinchillaTokensT(3)).toBe(0.06);
  });

  it('converts a hand-calculated compute budget into GPU hours', () => {
    // 1B parameters and 1T tokens = 6e21 FLOPs.
    // 100 TFLOPS at 50% supplies 5e13 FLOPs/s: 120M seconds.
    expect(trainingFlops(1, 1)).toBe(6e21);
    expect(gpuHours(6e21, 100, 0.5)).toBeCloseTo(33333.333333, 5);
  });

  it('halves time with double utilization or double GPUs, holding other inputs fixed', () => {
    const work = trainingFlops(70, 1.4);
    const hours = gpuHours(work, 989, 0.4);
    expect(gpuHours(work, 989, 0.2)).toBeCloseTo(hours * 2);
    expect(wallClockDays(hours, 2048)).toBe(wallClockDays(hours, 1024) / 2);
  });

  it('distinguishes the full reported 405B hours from the 54-day snapshot', () => {
    expect(wallClockDays(30_840_000, 16_384)).toBeCloseTo(78.4302, 4);
  });

  it('spreads GPU-hours across the cluster', () => {
    expect(wallClockDays(24_000, 1000)).toBe(1);
  });

  it('formats scientific notation', () => {
    expect(formatSci(3.79e25)).toEqual({ mantissa: '3.79', exponent: 25 });
    expect(formatSci(0)).toEqual({ mantissa: '0', exponent: 0 });
  });
});
