import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { Msg } from "./api/types";

export type { Msg };

/** Like django.contrib.messages: shown on this page, or after a redirect when afterNavigation is set. */
type Entry = Msg & { id: number; navigations: number };
type Notify = (msgs: Msg[], opts?: { afterNavigation?: boolean }) => void;

const NotifyContext = createContext<Notify>(() => {});
const EntriesContext = createContext<Entry[]>([]);

let nextId = 1;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const location = useLocation();
  const first = useRef(true);

  // Each navigation uses up one "navigation" of every message; a message with none left goes away.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setEntries((list) => list.filter((m) => m.navigations > 0).map((m) => ({ ...m, navigations: m.navigations - 1 })));
  }, [location.key]);

  const notify = useCallback<Notify>((msgs, opts) => {
    const navigations = opts?.afterNavigation ? 1 : 0;
    setEntries((list) => [...list, ...msgs.map((m) => ({ ...m, id: nextId++, navigations }))]);
  }, []);

  return (
    <NotifyContext.Provider value={notify}>
      <EntriesContext.Provider value={entries}>{children}</EntriesContext.Provider>
    </NotifyContext.Provider>
  );
}

export const useNotify = () => useContext(NotifyContext);

/** The message list of base.html. */
export function Messages() {
  const entries = useContext(EntriesContext);
  if (!entries.length) return null;
  return (
    <ul className="messages" role="status">
      {entries.map((m) => (
        <li key={m.id} className={`message ${m.level}`}>
          {m.text}
        </li>
      ))}
    </ul>
  );
}
