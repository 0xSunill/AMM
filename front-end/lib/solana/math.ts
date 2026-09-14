/**
 * Safe bigint math for AMM calculations.
 * All token amounts are represented as bigint to avoid floating-point precision issues.
 * These functions mirror the on-chain Anchor program logic exactly.
 */

/**
 * Calculate swap output amount using constant-product formula.
 * Matches the on-chain logic:
 *   fee_amount = amount_in * fee_bps / 10000
 *   amount_in_after_fee = amount_in - fee_amount
 *   amount_out = (amount_in_after_fee * reserve_out) / (reserve_in + amount_in_after_fee)
 */
export function calculateSwapOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number
): { amountOut: bigint; fee: bigint } {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    return { amountOut: 0n, fee: 0n };
  }

  const fee = (amountIn * BigInt(feeBps)) / 10000n;
  const amountInAfterFee = amountIn - fee;

  const numerator = amountInAfterFee * reserveOut;
  const denominator = reserveIn + amountInAfterFee;

  if (denominator === 0n) {
    return { amountOut: 0n, fee };
  }

  const amountOut = numerator / denominator;
  return { amountOut, fee };
}

/**
 * Calculate price impact as a percentage.
 * Price impact = 1 - (amountOut / amountIn * reserveIn / reserveOut) in percentage
 * More intuitively: how much worse the effective price is vs the spot price.
 */
export function calculatePriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number
): number {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    return 0;
  }

  // Spot price: reserveOut / reserveIn
  // Effective price: amountOut / amountIn
  const { amountOut } = calculateSwapOutput(amountIn, reserveIn, reserveOut, feeBps);
  if (amountOut <= 0n) return 100;

  // Use high precision: multiply by 1e10 to get decimal precision
  const precision = 10_000_000_000n;
  const spotPrice = (reserveOut * precision) / reserveIn;
  const effectivePrice = (amountOut * precision) / amountIn;

  if (spotPrice === 0n) return 0;

  // Price impact = (spotPrice - effectivePrice) / spotPrice * 100
  const impactBps =
    Number((spotPrice - effectivePrice) * 10000n / spotPrice);

  return impactBps / 100; // Convert to percentage
}

/**
 * Calculate minimum received after slippage.
 */
export function calculateMinReceived(
  amountOut: bigint,
  slippageBps: number
): bigint {
  if (amountOut <= 0n) return 0n;
  const slippage = (amountOut * BigInt(slippageBps)) / 10000n;
  return amountOut - slippage;
}

/**
 * Calculate LP tokens to receive for initial deposit.
 * Matches: sqrt(amount_a * amount_b)
 */
export function calculateInitialLpTokens(
  amountA: bigint,
  amountB: bigint
): bigint {
  if (amountA <= 0n || amountB <= 0n) return 0n;
  return integerSqrt(amountA * amountB);
}

/**
 * Calculate LP tokens to receive for proportional deposit.
 * Matches: amount_a * lp_supply / reserve_a
 */
export function calculateProportionalLpTokens(
  amountA: bigint,
  reserveA: bigint,
  lpSupply: bigint
): bigint {
  if (amountA <= 0n || reserveA <= 0n || lpSupply <= 0n) return 0n;
  return (amountA * lpSupply) / reserveA;
}

/**
 * Calculate the required amount B for a proportional deposit given amount A.
 * amount_b = amount_a * reserve_b / reserve_a
 */
export function calculateProportionalAmountB(
  amountA: bigint,
  reserveA: bigint,
  reserveB: bigint
): bigint {
  if (amountA <= 0n || reserveA <= 0n || reserveB <= 0n) return 0n;
  return (amountA * reserveB) / reserveA;
}

/**
 * Calculate token amounts received when removing liquidity.
 * Matches on-chain:
 *   amount_a = lp_amount * reserve_a / total_lp_supply
 *   amount_b = lp_amount * reserve_b / total_lp_supply
 */
export function calculateRemoveLiquidityAmounts(
  lpAmount: bigint,
  reserveA: bigint,
  reserveB: bigint,
  totalLpSupply: bigint
): { amountA: bigint; amountB: bigint } {
  if (lpAmount <= 0n || totalLpSupply <= 0n) {
    return { amountA: 0n, amountB: 0n };
  }

  const amountA = (lpAmount * reserveA) / totalLpSupply;
  const amountB = (lpAmount * reserveB) / totalLpSupply;

  return { amountA, amountB };
}

/**
 * Validate that a liquidity deposit is proportional.
 * On-chain check: amount_a * reserve_b == amount_b * reserve_a
 */
export function isProportionalDeposit(
  amountA: bigint,
  amountB: bigint,
  reserveA: bigint,
  reserveB: bigint
): boolean {
  if (reserveA <= 0n || reserveB <= 0n) return true; // First deposit, any ratio
  return amountA * reserveB === amountB * reserveA;
}

/**
 * Integer square root using Newton's method.
 * Matches the Anchor program's integer_sqrt.
 */
export function integerSqrt(value: bigint): bigint {
  if (value <= 0n) return 0n;

  let x = value;
  let y = (x + value / x) / 2n;

  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }

  return x;
}

/**
 * Convert a raw token amount (bigint) to a human-readable decimal string.
 */
export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  maxDisplayDecimals?: number
): string {
  if (raw === 0n) return "0";

  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;

  if (remainder === 0n) return whole.toString();

  const remainderStr = remainder.toString().padStart(decimals, "0");
  const displayDecimals = maxDisplayDecimals ?? decimals;
  const trimmed = remainderStr.slice(0, displayDecimals).replace(/0+$/, "");

  if (trimmed === "") return whole.toString();
  return `${whole}.${trimmed}`;
}

/**
 * Parse a human-readable decimal string to a raw token amount (bigint).
 */
export function parseTokenAmount(display: string, decimals: number): bigint {
  if (!display || display === "" || display === ".") return 0n;

  const parts = display.split(".");
  const wholePart = parts[0] || "0";
  let fracPart = parts[1] || "";

  // Truncate fractional part to max decimals
  if (fracPart.length > decimals) {
    fracPart = fracPart.slice(0, decimals);
  }

  // Pad fractional part to full decimals
  fracPart = fracPart.padEnd(decimals, "0");

  const raw = BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(fracPart);
  return raw;
}

/**
 * Calculate exchange rate as a floating-point number for display.
 */
export function calculateExchangeRate(
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number
): number {
  if (reserveA <= 0n || reserveB <= 0n) return 0;

  // Normalize to same scale
  const precision = 10n ** 18n;
  const normalizedA = reserveA * precision / (10n ** BigInt(decimalsA));
  const normalizedB = reserveB * precision / (10n ** BigInt(decimalsB));

  return Number(normalizedB) / Number(normalizedA);
}
