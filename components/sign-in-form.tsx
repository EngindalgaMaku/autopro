"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Smartphone } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type FormState } from "@/app/(auth)/actions";

const DEMO_PASSWORD = "12345678";

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  const [email, setEmail] = useState(state.fields?.email ?? "");
  const [password, setPassword] = useState("");
  // Already inside the app there is nothing to download
  const [offerApk, setOfferApk] = useState(false);
  useEffect(() => setOfferApk(!Capacitor.isNativePlatform()), []);

  const signInDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    const form = new FormData();
    form.set("email", demoEmail);
    form.set("password", DEMO_PASSWORD);
    startTransition(() => action(form));
  };

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Giriş yap</h1>
      <p className="mt-1 text-muted">Atölyenize devam edin</p>
      <form action={action} className="mt-8 space-y-4">
        <Field label="E-posta">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Şifre">
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {state.error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Giriş yapılıyor…" : "Giriş yap"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-line bg-raised/40 p-3.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink">Hemen deneyin</span>
        </div>
        <p className="mt-1.5 text-muted">Dokununca giriş yapılır. Veriler her gece sıfırlanır, gerçek bilgi girmeyin.</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => signInDemo("demo@autopro.com")}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60"
          >
            Yönetici (demo@autopro.com)
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => signInDemo("ahmet@autopro.com")}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60"
          >
            Ahmet Usta
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => signInDemo("mehmet@autopro.com")}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60"
          >
            Mehmet Usta
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-accent-strong hover:text-accent-hover">
          Atölyenizi kaydedin
        </Link>
      </p>

      {offerApk && (
        <p className="mt-2 text-center text-sm">
          <a href="/AutoPro.apk" download className="inline-flex min-h-11 items-center gap-1.5 font-medium text-muted hover:text-ink">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Android APK İndir
          </a>
        </p>
      )}
    </>
  );
}
