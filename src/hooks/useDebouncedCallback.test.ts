import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedCallback } from "./useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs once, with the last arguments, after the calls pause", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    result.current("a");
    vi.advanceTimersByTime(200);
    result.current("ab");
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledExactlyOnceWith("ab");
  });

  it("calls the latest callback, and keeps the same function across renders", () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 300), { initialProps: { fn: first } });
    const debounced = result.current;
    debounced(1);
    rerender({ fn: latest });
    expect(result.current).toBe(debounced);
    vi.advanceTimersByTime(300);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("cancel drops the pending call", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    result.current();
    result.current.cancel();
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });

  it("drops the pending call on unmount", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 300));
    result.current();
    act(() => unmount());
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });
});
