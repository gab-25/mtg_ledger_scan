import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError } from "./api/client";
import type { Msg } from "./api/types";
import { useNotify } from "./notifications";

type Options<R> = { navigateTo?: string | ((result: R) => string | null) };

/**
 * A POST/PUT/DELETE of a page, like a Django form post: its messages are shown (on the next page when it
 * navigates), every query reloads (lists, sidebar counters), and errors become an error message, except
 * validation errors (`err.fields`), which the form shows next to its fields.
 */
export function useAction<A = void, R = unknown>(fn: (args: A) => Promise<R>, options?: Options<R>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notify = useNotify();
  return useMutation<R, Error, A>({
    mutationFn: fn,
    onSuccess: async (result) => {
      const to = typeof options?.navigateTo === "function" ? options.navigateTo(result) : options?.navigateTo;
      const messages = (result as { messages?: Msg[] } | undefined)?.messages ?? [];
      notify(messages, { afterNavigation: Boolean(to) });
      if (to) navigate(to);
      await queryClient.invalidateQueries();
    },
    onError: (err) => {
      if (!(err instanceof ApiError && err.fields)) notify([{ level: "error", text: err.message }]);
    },
  });
}

/** The messages of a field from a validation error. */
export function fieldErrors(err: unknown, field: string): string[] | undefined {
  return err instanceof ApiError ? err.fields?.[field] : undefined;
}
