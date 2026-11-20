"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Turnstile, type TurnstileHandle } from "@/components/ui/turnstile";
import { ErrorApi, useAuth } from "@/contexts/auth-context";
import { textoDeError } from "@/lib/errores-cliente";
import { useHydrated } from "@/hooks/use-hydrated";
import { DotHeading } from "@/components/ui/dot-heading";
import { normalizeEmail } from "@/lib/normalize";
import { cn, idiomaDeRuta } from "@/lib/utils";
import { localePath } from "@/lib/utils";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export function LoginForm() {
  const t = useTranslations("Login");
  const tf = useTranslations("Forms");
  const tErr = useTranslations("Errores");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<TurnstileHandle>(null);
  // El widget de Turnstile necesita el DOM montado para inicializarse.
  const captchaMounted = useHydrated() && !!siteKey;
  const { user, login } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = idiomaDeRuta(pathname);

  // Si ya hay sesión, salir del login (el server component también redirige).
  useEffect(() => {
    if (user) router.replace(localePath(locale, "/admin"));
  }, [user, router, locale]);

  // Un escáner que recibió 401 manda aquí con ?aviso=sesion.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("aviso") === "sesion") setError(t("aviso_sesion"));
  }, [t]);

  /**
   * Se valida al salir del campo y no en cada tecla: avisar mientras la persona
   * todavía escribe la dirección es ruido, porque está incompleta por
   * definición.
   */
  const checkEmail = () => {
    if (!email.trim()) return setEmailError("");
    const r = normalizeEmail(email);
    setEmailError(r.ok ? "" : r.reason ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (siteKey && !captchaToken) return;

    // Se comprueba también acá: el servidor valida igual, pero atajarlo antes
    // ahorra un viaje y gasta un captcha menos.
    const checked = normalizeEmail(email);
    if (!checked.ok) {
      setEmailError(checked.reason ?? "");
      return;
    }

    setError("");
    setEmailError("");
    setLoading(true);
    try {
      await login(checked.value, password, captchaToken);
      router.replace(localePath(locale, "/admin"));
      // loading se queda en true mientras Next navega
    } catch (err) {
      setError(err instanceof ErrorApi ? textoDeError(tErr, err.datos, tErr("error_interno")) : tErr("sin_conexion"));
      setCaptchaToken("");
      captchaRef.current?.reset();
      setLoading(false);
    }
  };

  // El botón sólo se habilita cuando hay algo que enviar: uno habilitado promete
  // algo que no va a pasar, y cada intento gasta un token de captcha.
  const emailOk = email.trim().length > 0 && normalizeEmail(email).ok;
  const canSubmit = emailOk && password.length > 0 && (!siteKey || !!captchaToken) && !loading;

  const handleCaptchaVerify = useCallback((token: string) => setCaptchaToken(token), []);
  const handleCaptchaError = useCallback(() => {
    setError(t("captcha_error"));
    setCaptchaToken("");
  }, [t]);

  const fieldClass =
    "w-full border-2 border-tinta/35 bg-white/55 px-4 py-3 font-mono text-sm text-tinta " +
    "placeholder:text-tinta/70 transition-all " +
    "focus:-translate-y-px focus:border-tinta focus:bg-white " +
    "focus:shadow-[3px_3px_0_0_rgba(0,0,0,0.3)]";

  return (
    <main className="form-block flex min-h-svh flex-col bg-acento pt-20">
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <DotHeading as="h1" tone="block" variant="inverted">
              {t("heading")}
            </DotHeading>
          </div>

          <form
            suppressHydrationWarning
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 border-2 border-tinta bg-acento/40 p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.28)]"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="font-mono text-sm font-semibold text-tinta">
                {t("email_label")} <span className="text-acento-profundo">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                  // Tambien se limpia el error del servidor: si no, un
                  // "Credenciales invalidas" de un intento anterior se queda en
                  // pantalla mientras corriges el correo y parece que el envio
                  // fallo de nuevo.
                  if (error) setError("");
                }}
                onBlur={checkEmail}
                placeholder={t("email_ph")}
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "login-email-error" : undefined}
                className={cn(fieldClass, emailError && "border-error bg-error/10")}
              />
              {emailError && (
                <p id="login-email-error" className="m-0 font-mono text-xs text-error">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="font-mono text-sm font-semibold text-tinta">
                {t("password_label")} <span className="text-acento-profundo">*</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={t("password_ph")}
                  required
                  className={cn(fieldClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  // `aria-pressed` en vez de cambiar el nombre del botón: así el
                  // lector de pantalla anuncia el estado sin que la etiqueta baile.
                  aria-pressed={showPassword}
                  aria-label={t("show_password")}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-tinta/70 transition-colors hover:text-tinta"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sin alto reservado: con `interaction-only` el widget no ocupa
                lugar salvo que Cloudflare pida el desafío, y reservar 78px
                dejaría un hueco vacío en el formulario de casi todo el mundo. */}
            <div className="flex items-center justify-center">
              {captchaMounted ? (
                <Turnstile
                  ref={captchaRef}
                  siteKey={siteKey}
                  theme="light"
                  appearance="interaction-only"
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  onExpire={() => setCaptchaToken("")}
                />
              ) : null}
            </div>

            {error && (
              <p role="alert" className="m-0 border-2 border-error bg-error/10 px-4 py-3 font-mono text-sm text-error">
                {error}
              </p>
            )}

            {siteKey && !captchaToken && !error && (
              // El widget es invisible, asi que sin esta linea el boton
              // apagado no tiene explicacion a la vista.
              <p className="m-0 text-center font-mono text-xs text-tinta/70">
                {tf("captcha_checking")}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-hard w-full px-6 py-3.5 font-mono text-sm"
            >
              {loading ? t("submitting") : t("submit")}
            </button>
          </form>
        </div>
      </div>

      {/* Cinta al pie, igual que en los formularios públicos */}
      <div className="overflow-hidden border-t-2 border-tinta/25" aria-hidden="true">
        <div className="flex w-max items-center" style={{ animation: "marquee 36s linear infinite" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "dot-matrix whitespace-nowrap px-6 py-2.5 text-base leading-none sm:text-lg",
                i % 2 === 1 ? "bg-tinta text-acento" : "text-tinta",
              )}
            >
              {t("marquee")}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
