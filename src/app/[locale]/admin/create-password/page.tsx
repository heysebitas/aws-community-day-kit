"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMailto } from "@/components/ui/obfuscated-email";
import { localePath, idiomaDeRuta } from "@/lib/utils";

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center bg-surface-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-acento border-t-transparent" />
      </div>
    }>
      <CreatePasswordContent />
    </Suspense>
  );
}

/** `href` vacío significa «escribir al buzón de contacto». */
const REASONS: Record<string, { titulo: string; mensaje: string; cta: string; href: string }> = {
  not_found: {
    titulo: "not_found_title",
    mensaje: "not_found_message",
    cta: "not_found_cta",
    href: "",
  },
  expired: {
    titulo: "expired_title",
    mensaje: "expired_message",
    cta: "expired_cta",
    href: "",
  },
  used: {
    titulo: "used_title",
    mensaje: "used_message",
    cta: "used_cta",
    href: "/admin/login",
  },
};

function CreatePasswordContent() {
  const t = useTranslations("CreatePassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const pathname = usePathname();
  const mailto = useMailto();
  const locale = idiomaDeRuta(pathname);

  const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [invalidReason, setInvalidReason] = useState<string>("not_found");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidReason("not_found");
      setTokenStatus("invalid");
      return;
    }

    fetch(`/api/auth/validate-token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setTokenStatus("valid");
          setEmail(typeof data.email === "string" ? data.email : "");
        } else {
          setInvalidReason(data.reason ?? "not_found");
          setTokenStatus("invalid");
        }
      })
      .catch(() => {
        setInvalidReason("not_found");
        setTokenStatus("invalid");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError(t("short_password"));
      return;
    }
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/create-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      setTimeout(() => router.replace(localePath(locale, "/admin/login")), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (tokenStatus === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-acento border-t-transparent" />
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    const info = REASONS[invalidReason] ?? REASONS.not_found;
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface-900 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-red-500/30 bg-red-500/10">
            <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="dot-matrix m-0 text-2xl leading-none text-surface-50 sm:text-3xl">
            {t(info.titulo)}
          </h1>
          <p className="mt-2 font-mono text-sm leading-relaxed text-surface-400">{t(info.mensaje)}</p>
          <a
            href={info.href || mailto("general")}
            className="mt-6 inline-flex items-center bg-acento px-6 py-2.5 font-mono text-sm font-bold text-surface-900 transition-all hover:shadow-[0_0_20px_rgb(var(--tema-acento-rgb)_/_0.4)]"
          >
            {t(info.cta)}
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface-900 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-acento/10 text-acento">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="dot-matrix m-0 text-2xl leading-none text-surface-50 sm:text-3xl">
            {t("created_title")}
          </h1>
          <p className="mt-2 font-mono text-sm text-surface-400">{t("redirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/images/logos/aws-logo.svg"
            alt="AWS"
            width={80}
            height={48}
          />
          <h1 className="dot-matrix m-0 text-2xl leading-none text-surface-50 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-3 font-mono text-sm text-surface-400">
            {t("subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-2 border-surface-600 bg-surface-800 p-6">
          {/* El gestor de contraseñas necesita saber con qué cuenta asociar
              la contraseña nueva; el campo no se ve pero sí se guarda. */}
          <input type="email" name="username" autoComplete="username" hidden readOnly value={email} />
          <Input
            label={t("password_label")}
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password_ph")}
            required
          />
          <Input
            label={t("confirm_label")}
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("confirm_ph")}
            required
          />
          {error && (
            <div role="alert" className="border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-sm text-red-400">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
