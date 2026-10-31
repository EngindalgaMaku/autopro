"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type FormState } from "@/app/(auth)/actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  const [email, setEmail] = useState(state.fields?.email ?? "");
  const [password, setPassword] = useState("");

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("12345678");
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
          <span className="font-semibold text-ink">Demo Hesaplar</span>
          <span className="text-muted">Şifre: 12345678</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fillDemo("demo@autopro.com")}
            className="rounded-lg bg-surface px-2.5 py-1 text-xs text-muted hover:text-ink hover:border-line border border-transparent transition-colors"
          >
            Yönetici (demo@autopro.com)
          </button>
          <button
            type="button"
            onClick={() => fillDemo("ahmet@autopro.com")}
            className="rounded-lg bg-surface px-2.5 py-1 text-xs text-muted hover:text-ink hover:border-line border border-transparent transition-colors"
          >
            Ahmet Usta
          </button>
          <button
            type="button"
            onClick={() => fillDemo("mehmet@autopro.com")}
            className="rounded-lg bg-surface px-2.5 py-1 text-xs text-muted hover:text-ink hover:border-line border border-transparent transition-colors"
          >
            Mehmet Usta
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-accent hover:text-accent-hover">
          Atölyenizi kaydedin
        </Link>
      </p>
    </>
  );
}
