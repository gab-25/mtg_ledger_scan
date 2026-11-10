import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fieldErrors } from "../actions";
import { ensureCsrf, login } from "../api/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PANEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import Field, { Errors } from "../components/Field";
import { Logo } from "../components/icons";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/**
 * Where to go after login: a path of this site, else the collection. The value is parsed as the browser would
 * (which drops tabs and newlines and reads backslashes as slashes), so "/\t/evil.com" can't lead off-site.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/";
  const url = new URL(next, location.origin);
  if (url.origin !== location.origin) return "/";
  return url.pathname + url.search + url.hash;
}

const outsideApp = (path: string) => /^\/(api|admin|static)(\/|$)/.test(path);

/** registration/login.html */
export default function LoginPage() {
  useDocumentTitle("Sign in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    ensureCsrf().catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err);
      return;
    }
    const next = safeNext(params.get("next"));
    if (outsideApp(next)) {
      window.location.assign(next);
      return;
    }
    queryClient.clear();
    navigate(next);
  }

  const generic = error && !fieldErrors(error, "non_field_errors") && !fieldErrors(error, "username")
    && !fieldErrors(error, "password") ? [(error as Error).message] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form method="post" className={cn(PANEL, "w-full max-w-[400px]")} onSubmit={submit}>
        <div className="flex items-center gap-3 text-foreground">
          <Logo />
          <span className="font-serif text-[22px] font-bold tracking-[.2px]">MTG Ledger</span>
        </div>
        <Errors errors={fieldErrors(error, "non_field_errors") ?? generic} />
        <div className="grid grid-cols-1 gap-[18px]">
          <Field label="Username" id="id_username" errors={fieldErrors(error, "username")}>
            <Input type="text" id="id_username" name="username" autoFocus autoCapitalize="none" autoComplete="username"
              maxLength={150} required value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="Password" id="id_password" errors={fieldErrors(error, "password")}>
            <Input type="password" id="id_password" name="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="primary">Sign in</Button>
      </form>
    </main>
  );
}
