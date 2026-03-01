import { useState, useCallback, useMemo } from "react";
import { useGame } from "../lib/gameContext";
import { CRASH } from "../lib/constants";

interface UseBetInputOptions {
  /** Minimum bet in cents, defaults to CRASH.MIN_BET */
  minBet?: number;
  /** Maximum bet in cents, defaults to CRASH.MAX_BET */
  maxBet?: number;
  /** Initial bet in cents, defaults to 100 (1.00) */
  initialBet?: number;
}

interface UseBetInputReturn {
  /** Current bet amount in cents */
  betAmount: number;
  /** Display string for the bet amount (e.g., "1.00") */
  betDisplay: string;
  /** Raw input string the user is typing */
  inputValue: string;
  /** Set bet from a raw input string */
  setInputValue: (value: string) => void;
  /** Set bet amount directly in cents */
  setBetAmount: (cents: number) => void;
  /** Halve the current bet */
  half: () => void;
  /** Double the current bet */
  double: () => void;
  /** Set bet to max (user balance or maxBet, whichever is lower) */
  max: () => void;
  /** Set bet to the minimum */
  min: () => void;
  /** Whether the current bet is valid */
  isValid: boolean;
  /** Validation error message if any */
  error: string | null;
  /** The minimum bet in cents */
  minBet: number;
  /** The maximum bet in cents */
  maxBet: number;
  /** Effective max (min of maxBet and balance) */
  effectiveMax: number;
}

/**
 * Hook for managing bet input state with half/double/max controls
 * and min/max validation.
 */
export function useBetInput(options: UseBetInputOptions = {}): UseBetInputReturn {
  const {
    minBet = CRASH.MIN_BET,
    maxBet = CRASH.MAX_BET,
    initialBet = 100,
  } = options;

  const { state } = useGame();
  const balance = state.user?.balance ?? 0;

  const [betAmount, setBetAmountRaw] = useState(initialBet);
  const [inputValue, setInputValueRaw] = useState(
    (initialBet / 100).toFixed(2),
  );

  const effectiveMax = useMemo(
    () => Math.min(maxBet, balance),
    [maxBet, balance],
  );

  const clamp = useCallback(
    (cents: number) => Math.max(minBet, Math.min(effectiveMax, cents)),
    [minBet, effectiveMax],
  );

  const setBetAmount = useCallback(
    (cents: number) => {
      const clamped = clamp(cents);
      setBetAmountRaw(clamped);
      setInputValueRaw((clamped / 100).toFixed(2));
    },
    [clamp],
  );

  const setInputValue = useCallback(
    (value: string) => {
      // Allow empty or partial input while typing
      setInputValueRaw(value);

      // Parse the value
      const cleaned = value.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        const cents = Math.round(num * 100);
        setBetAmountRaw(cents);
      }
    },
    [],
  );

  const half = useCallback(() => {
    setBetAmount(Math.max(minBet, Math.floor(betAmount / 2)));
  }, [betAmount, minBet, setBetAmount]);

  const double = useCallback(() => {
    setBetAmount(Math.min(effectiveMax, betAmount * 2));
  }, [betAmount, effectiveMax, setBetAmount]);

  const max = useCallback(() => {
    setBetAmount(effectiveMax);
  }, [effectiveMax, setBetAmount]);

  const min = useCallback(() => {
    setBetAmount(minBet);
  }, [minBet, setBetAmount]);

  const betDisplay = (betAmount / 100).toFixed(2);

  const error = useMemo(() => {
    if (betAmount < minBet) return `Minimum bet is ${(minBet / 100).toFixed(2)}`;
    if (betAmount > maxBet) return `Maximum bet is ${(maxBet / 100).toFixed(2)}`;
    if (betAmount > balance) return "Insufficient balance";
    return null;
  }, [betAmount, minBet, maxBet, balance]);

  const isValid = error === null && betAmount >= minBet;

  return {
    betAmount,
    betDisplay,
    inputValue,
    setInputValue,
    setBetAmount,
    half,
    double,
    max,
    min,
    isValid,
    error,
    minBet,
    maxBet,
    effectiveMax,
  };
}
