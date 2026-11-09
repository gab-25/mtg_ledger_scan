import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import {
  changePassword, getAccount, removeToken, setToken, updateProfile, type Account, type Me,
} from "../api/account";
import Field, { Errors } from "../components/Field";
import PageState from "../components/PageState";
import { dateLong, naturaltime } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMe } from "../hooks/useMe";
import { signOut } from "../signOut";

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
      <header className="page-head">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Profile and settings</h1>
        </div>
      </header>

      <section className="profile-card" aria-label="Account summary">
        <span className="avatar avatar-lg" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
        <div className="profile-id">
          <div className="profile-name">{user.full_name || user.username}</div>
          <div className="sub mono">@{user.username}{user.is_staff && " · admin"}</div>
        </div>
        <dl className="facts profile-facts">
          <div><dt>Member since</dt><dd>{dateLong(user.date_joined)}</dd></div>
          <div><dt>Last login</dt><dd>{user.last_login ? naturaltime(user.last_login) : "—"}</dd></div>
        </dl>
      </section>

      <div className="detail-grid">
        <DetailsForm user={user} />
        <PasswordForm help={account.password_help} />
      </div>

      <CardTraderSection account={account} />

      <section className="section" aria-labelledby="session-title">
        <h2 id="session-title">Session</h2>
        <div className="connection connection-row">
          <div className="hint" style={{ flex: 1 }}>Sign out of MTG Ledger on this device.</div>
          <form method="post" onSubmit={(e) => { e.preventDefault(); signOut(); }}>
            <button type="submit" className="btn btn-danger">Log out</button>
          </form>
        </div>
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
    <form method="post" className="box" aria-labelledby="details-title" noValidate onSubmit={submit}>
      <h2 id="details-title">Personal details</h2>
      <Errors errors={errors("non_field_errors")} />
      <div className="form-grid">
        <Field label="First name" id="id_profile-first_name" errors={errors("first_name")}>
          <input type="text" name="first_name" id="id_profile-first_name" maxLength={150} value={fields.first_name}
            onChange={set("first_name")} />
        </Field>
        <Field label="Last name" id="id_profile-last_name" errors={errors("last_name")}>
          <input type="text" name="last_name" id="id_profile-last_name" maxLength={150} value={fields.last_name}
            onChange={set("last_name")} />
        </Field>
        <Field label="Email address" id="id_profile-email" errors={errors("email")} wide>
          <input type="email" name="email" id="id_profile-email" maxLength={254} value={fields.email} onChange={set("email")} />
        </Field>
        <div className="field wide">
          <label htmlFor="username">Username</label>
          <input type="text" id="username" value={user.username} readOnly aria-describedby="username-help" />
          <span className="help" id="username-help">Used to sign in. Ask an administrator to change it.</span>
        </div>
      </div>
      <div className="form-actions">
        <div className="group">
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>Save details</button>
        </div>
      </div>
    </form>
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
    <input type="password" name={name} id={`id_password-${name}`} autoComplete={autoComplete} value={fields[name]}
      onChange={set(name)} />
  );

  return (
    <form method="post" className="box" aria-labelledby="password-title" noValidate onSubmit={submit}>
      <h2 id="password-title">Password</h2>
      <Errors errors={errors("non_field_errors")} />
      <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
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
      <div className="form-actions">
        <div className="group">
          <button type="submit" className="btn" disabled={save.isPending}>Change password</button>
        </div>
      </div>
    </form>
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
    <section className="section" id="cardtrader" aria-labelledby="connections-title">
      <h2 id="connections-title">Connected services</h2>
      <div className="box">
        <div className="connection-head">
          <div>
            <div className="profile-name" style={{ fontSize: 22 }}>{cardtrader.name}</div>
            <div className="sub">
              Publishes your listings, imports orders and market prices.{" "}
              {cardtrader.last_sync ? `Last sync ${naturaltime(cardtrader.last_sync)}.` : "Never synced."}
            </div>
          </div>
          {cardtrader.token_saved ? (
            <span className="badge badge-ok"><span className="pill-dot" />Connected</span>
          ) : (
            <span className="badge badge-pending"><span className="pill-dot" />Not connected</span>
          )}
        </div>

        {shares && (
          <p className="hint" style={{ margin: 0 }}>
            As the administrator, your token is also used to load the card catalog and prices for every user, and to
            recognise their scanned cards.
          </p>
        )}

        <form method="post" className="inline-form" noValidate onSubmit={submit}>
          <Field label="CardTrader API token" id="id_cardtrader-token" errors={fieldErrors(connect.error, "token")}
            help="Found in your CardTrader profile settings, under API. It is checked with CardTrader before saving.">
            <input type="password" name="token" id="id_cardtrader-token" autoComplete="off" required value={token}
              onChange={(e) => setTokenValue(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={connect.isPending}>
            {cardtrader.token_saved ? "Replace token" : "Connect"}
          </button>
        </form>

        {cardtrader.token_saved && (
          <form method="post" className="connection-row" style={{ padding: 0 }} onSubmit={confirmRemove}>
            <span className="hint" style={{ flex: 1 }}>A token is saved. It is never shown again; replace it or remove it.</span>
            <button type="submit" className="btn btn-danger" disabled={remove.isPending}>Remove token</button>
          </form>
        )}
      </div>
    </section>
  );
}
