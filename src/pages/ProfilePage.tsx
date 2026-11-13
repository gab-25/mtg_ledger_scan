import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import {
  changePassword, getAccount, getToken, removeToken, setToken, updateProfile, type Account, type Me,
} from "../api/account";
import Field, { Errors } from "../components/Field";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUTTON_GROUP, DETAIL_GRID, FACTS, FORM_ACTIONS, FORM_GRID, H2, HINT, SECTION, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import PageState from "../components/PageState";
import { dateLong, naturaltime } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMe } from "../hooks/useMe";
import { signOut } from "../signOut";

const PROFILE_NAME = "font-serif text-[26px] font-semibold";

/** accounts/profile.html */
export default function ProfilePage() {
  useDocumentTitle("Profile");
  const me = useMe();
  const account = useQuery({ queryKey: ["account"], queryFn: getAccount });
  if (!me.data || !account.data) return <PageState error={me.error ?? account.error} />;
  return <Profile me={me.data} account={account.data} />;
}

function Profile({ me: { user }, account }: { me: Me; account: Account }) {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <>
      <PageHead eyebrow="Account" title="Profile and settings" />

      <section className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-card p-6" aria-label="Account summary">
        <span
          className="inline-flex size-16 flex-none items-center justify-center rounded-full bg-gold-bg font-serif text-[26px] font-bold text-gold"
          aria-hidden="true"
        >
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-[1_1_200px]">
          <div className={PROFILE_NAME}>{user.full_name || user.username}</div>
          <div className={cn(SUB, "font-mono")}>@{user.username}{user.is_staff && " · admin"}</div>
        </div>
        <dl className={cn(FACTS, "flex-[1_1_280px]")}>
          <div><dt>Member since</dt><dd>{dateLong(user.date_joined)}</dd></div>
          <div><dt>Last login</dt><dd>{user.last_login ? naturaltime(user.last_login) : "—"}</dd></div>
        </dl>
      </section>

      <div className={DETAIL_GRID}>
        <DetailsForm user={user} />
        <PasswordForm help={account.password_help} />
      </div>

      <CardTraderSection account={account} />

      <section className={SECTION} aria-labelledby="session-title">
        <h2 id="session-title" className={H2}>Session</h2>
        <Card className="flex-row flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className={cn(HINT, "flex-[1_1_200px]")}>Sign out of MTG Ledger on this device.</div>
          <form method="post" className="m-0" onSubmit={(e) => { e.preventDefault(); signOut(); }}>
            <Button type="submit" variant="danger">Log out</Button>
          </form>
        </Card>
      </section>
    </>
  );
}

function DetailsForm({ user }: { user: Me["user"] }) {
  const [fields, setFields] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email });
  const save = useAction(updateProfile);
  const errors = (name: string) => fieldErrors(save.error, name);
  const set = (name: keyof typeof fields) => (e: { target: { value: string } }) => setFields({ ...fields, [name]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(fields);
  }

  return (
    <Card asChild>
    <form method="post" aria-labelledby="details-title" noValidate onSubmit={submit}>
      <CardTitle id="details-title">Personal details</CardTitle>
      <Errors errors={errors("non_field_errors")} />
      <div className={FORM_GRID}>
        <Field label="First name" id="id_profile-first_name" errors={errors("first_name")}>
          <Input type="text" name="first_name" id="id_profile-first_name" maxLength={150} value={fields.first_name}
            onChange={set("first_name")} />
        </Field>
        <Field label="Last name" id="id_profile-last_name" errors={errors("last_name")}>
          <Input type="text" name="last_name" id="id_profile-last_name" maxLength={150} value={fields.last_name}
            onChange={set("last_name")} />
        </Field>
        <Field label="Email address" id="id_profile-email" errors={errors("email")} wide>
          <Input type="email" name="email" id="id_profile-email" maxLength={254} value={fields.email} onChange={set("email")} />
        </Field>
        <div className="col-span-full flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input type="text" id="username" value={user.username} readOnly aria-describedby="username-help" />
          <span className="text-xs text-muted-foreground" id="username-help">Used to sign in. Ask an administrator to change it.</span>
        </div>
      </div>
      <div className={FORM_ACTIONS}>
        <div className={BUTTON_GROUP}>
          <Button type="submit" variant="primary" disabled={save.isPending}>Save details</Button>
        </div>
      </div>
    </form>
    </Card>
  );
}

const NO_PASSWORDS = { old_password: "", new_password1: "", new_password2: "" };

function PasswordForm({ help }: { help: string[] }) {
  const [fields, setFields] = useState(NO_PASSWORDS);
  const save = useAction(changePassword);
  const errors = (name: string) => fieldErrors(save.error, name);
  const set = (name: keyof typeof fields) => (e: { target: { value: string } }) => setFields({ ...fields, [name]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(fields, { onSuccess: () => setFields(NO_PASSWORDS) });
  }

  const input = (name: keyof typeof fields, autoComplete: string) => (
    <Input type="password" name={name} id={`id_password-${name}`} autoComplete={autoComplete} value={fields[name]}
      onChange={set(name)} />
  );

  return (
    <Card asChild>
    <form method="post" aria-labelledby="password-title" noValidate onSubmit={submit}>
      <CardTitle id="password-title">Password</CardTitle>
      <Errors errors={errors("non_field_errors")} />
      <div className="grid grid-cols-1 gap-[18px]">
        <Field label="Old password" id="id_password-old_password" errors={errors("old_password")}>
          {input("old_password", "current-password")}
        </Field>
        <Field label="New password" id="id_password-new_password1" errors={errors("new_password1")}
          help={<ul>{help.map((h) => <li key={h}>{h}</li>)}</ul>}>
          {input("new_password1", "new-password")}
        </Field>
        <Field label="New password confirmation" id="id_password-new_password2" errors={errors("new_password2")}
          help="Enter the same password as before, for verification.">
          {input("new_password2", "new-password")}
        </Field>
      </div>
      <div className={FORM_ACTIONS}>
        <div className={BUTTON_GROUP}>
          <Button type="submit" disabled={save.isPending}>Change password</Button>
        </div>
      </div>
    </form>
    </Card>
  );
}

function CardTraderSection({ account }: { account: Account }) {
  const { cardtrader, shares_token: shares } = account;
  const [token, setTokenValue] = useState("");
  const connect = useAction(setToken);
  const remove = useAction(() => removeToken());

  function submit(e: FormEvent) {
    e.preventDefault();
    connect.mutate(token, { onSuccess: () => setTokenValue("") });
  }

  function confirmRemove(e: FormEvent) {
    e.preventDefault();
    const question = shares
      ? "Disconnect CardTrader? Catalog, prices and scanning will stop for everyone until a new token is added."
      : "Disconnect CardTrader? Publishing and syncing will stop until a new token is added.";
    if (window.confirm(question)) remove.mutate();
  }

  return (
    <section className={SECTION} id="cardtrader" aria-labelledby="connections-title">
      <h2 id="connections-title" className={H2}>Connected services</h2>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn(PROFILE_NAME, "text-[22px]")}>{cardtrader.name}</div>
            <div className={SUB}>
              Publishes your listings, imports orders and market prices.{" "}
              {cardtrader.last_sync ? `Last sync ${naturaltime(cardtrader.last_sync)}.` : "Never synced."}
            </div>
          </div>
          {cardtrader.token_saved ? (
            <Badge variant="ok"><span className="size-2 rounded-full bg-current" aria-hidden="true" />Connected</Badge>
          ) : (
            <Badge variant="pending"><span className="size-2 rounded-full bg-current" aria-hidden="true" />Not connected</Badge>
          )}
        </div>

        {shares && (
          <p className={cn(HINT, "m-0")}>
            As the administrator, your token is also used to load the card catalog and prices for every user, and to
            recognise their scanned cards.
          </p>
        )}

        <form method="post" className="m-0 flex flex-wrap items-start gap-2.5" noValidate onSubmit={submit}>
          <div className="flex-[1_1_200px]">
          <Field label="CardTrader API token" id="id_cardtrader-token" errors={fieldErrors(connect.error, "token")}
            help="Found in your CardTrader profile settings, under API. It is checked with CardTrader before saving.">
            <Input type="password" name="token" id="id_cardtrader-token" autoComplete="off" required value={token}
              onChange={(e) => setTokenValue(e.target.value)} />
          </Field>
          </div>
          <Button type="submit" variant="primary" className="mt-[26px]" disabled={connect.isPending}>
            {cardtrader.token_saved ? "Replace token" : "Connect"}
          </Button>
        </form>

        {cardtrader.token_saved && (
          <>
            <SavedToken key={connect.submittedAt} />
            <form method="post" className="m-0 flex flex-wrap items-center justify-between gap-4" onSubmit={confirmRemove}>
              <span className={cn(HINT, "flex-1")}>A token is saved. Show or copy it, replace it or remove it.</span>
              <Button type="submit" variant="danger" disabled={remove.isPending}>Remove token</Button>
            </form>
          </>
        )}
      </Card>
    </section>
  );
}

/** The saved token, masked until "Show"; it is fetched only when shown or copied (a new key after a replace drops it). */
function SavedToken() {
  const [token, setToken] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (token !== null) return token;
    setError(null);
    try {
      const { token: value } = await getToken();
      setToken(value);
      return value;
    } catch {
      setError("The token could not be loaded.");
      return null;
    }
  }

  async function toggle() {
    if (shown) return setShown(false);
    if ((await load()) !== null) setShown(true);
  }

  async function copy() {
    const value = await load();
    if (value === null) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The token could not be copied.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-md border border-line-2 bg-background py-1 pr-1 pl-3">
        <span aria-label="Saved token" className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
          title={shown && token ? token : undefined}>
          {shown && token ? token : "••••••••••••••••"}
        </span>
        <Button type="button" size="sm" variant="ghost" className="flex-none" onClick={toggle}>
          {shown ? "Hide" : "Show"}
        </Button>
        <Button type="button" size="sm" className="flex-none" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Errors errors={error ? [error] : undefined} />
    </div>
  );
}
