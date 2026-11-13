import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError } from "./api/client";
import type { Msg } from "./api/types";
import { useNotify } from "./notifications";

type Options<R> = {
  navigateTo?: string | ((result: R) => string | null);
  /** The caller navigates itself on success (e.g. a dialog in the URL closing): the messages outlive it. */
  navigates?: boolean;
};

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
    mutationFn: (args: A) => fn(args), // only the args: React Query passes a context too
    onSuccess: async (result) => {
      const to = typeof options?.navigateTo === "function" ? options.navigateTo(result) : options?.navigateTo;
      const messages = (result as { messages?: Msg[] } | undefined)?.messages ?? [];
      notify(messages, { afterNavigation: Boolean(to) || Boolean(options?.navigates) });
      if (to) navigate(to);
      // Like the redirect to the same page: the messages are at the top. A dialog keeps the list behind it in place.
      else if (!options?.navigates) window.scrollTo(0, 0);
      await queryClient.invalidateQueries();
    },
    onError: (err) => {
      if (!(err instanceof ApiError && err.fields)) {
        notify([{ level: "error", text: err.message }]);
        if (!options?.navigates) window.scrollTo(0, 0); // a dialog repeats its errors inside
      }
    },
  });
}

/** The messages of a field from a validation error. */
export function fieldErrors(err: unknown, field: string): string[] | undefined {
  return err instanceof ApiError ? err.fields?.[field] : undefined;
}
