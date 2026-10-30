"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, type FormState } from "@/app/(auth)/actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Giriş yap</h1>
      <p className="mt-1 text-muted">Atölyenize devam edin</p>
      <form action={action} className="mt-8 space-y-4">
        <Field label="E-posta">
          <Input name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
        </Field>
        <Field label="Şifre">
          <Input name="password" type="password" autoComplete="current-password" required />
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
      <p className="mt-6 text-center text-sm text-muted">
        Hesabınız yok mu?{" "}
        <Link href="/kayit" className="font-semibold text-accent hover:text-accent-hover">
          Atölyenizi kaydedin
        </Link>
      </p>
    </>
  );
}
