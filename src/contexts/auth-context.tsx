"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Permiso } from "@/lib/permisos";
import { idiomaDeRuta } from "@/lib/utils";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "organizer" | "volunteer" | "badges";
  /**
   * Qué secciones del panel puede tocar. Sólo cuenta para los organizadores;
   * vacío quiere decir «todas» (ver `nivelDe` en @/lib/permisos).
   */
  permisos?: Permiso[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** La sesión se cerró porque se abrió en otro dispositivo: el login lo avisa. */
  sesionTomada: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  sesionTomada: false,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

/** Un fallo de la API con su cuerpo `{ code, error }`, para que quien lo atrape lo traduzca. */
export class ErrorApi extends Error {
  constructor(readonly datos: { code?: string; error?: string; requestId?: string }) {
    super(datos.error ?? "Error");
  }
}

export function useAuth() {
  return useContext(AuthContext);
}

const SESSION_CHECK_INTERVAL = 10_000; // 10s

/**
 * `inicial` es la sesión que el servidor ya leyó de la cookie: con ella el
 * primer pintado no espera a `/api/auth/me`. Sin ella (o `null`) se pregunta
 * a la API, como siempre.
 */
export function AuthProvider({ children, inicial }: { children: React.ReactNode; inicial?: AuthUser | null }) {
  const [user, setUser] = useState<AuthUser | null>(inicial ?? null);
  const [loading, setLoading] = useState(!inicial);
  const [sesionTomada, setSesionTomada] = useState(false);
  const primeraVez = useRef(true);
  const router = useRouter();
  const pathname = usePathname();
  const wasAuthenticated = useRef(!!inicial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        wasAuthenticated.current = true;
      } else {
        const hadUser = wasAuthenticated.current;
        if (hadUser) setSesionTomada(true);
        setUser(null);
        wasAuthenticated.current = false;

        // If the user WAS authenticated and now isn't, redirect to login
        if (hadUser) {
          const locale = idiomaDeRuta(pathname);
          router.replace(`/${locale}/admin/login?aviso=sesion`);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [router, pathname]);

  // Initial check
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      if (inicial) return;
    }
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `inicial` sólo cuenta en el primer montaje
  }, [refresh]);

  // Periodic session validation — detects when another device takes over
  useEffect(() => {
    if (!user) return;

    const comprobar = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          setSesionTomada(true);
          setUser(null);
          wasAuthenticated.current = false;
          const locale = idiomaDeRuta(pathname);
          router.replace(`/${locale}/admin/login?aviso=sesion`);
        }
      } catch {
        // Network error — don't log out, just skip
      }
    };

    // Con la pestaña oculta no se consulta: la tablet de la puerta en segundo
    // plano no tiene por qué despertar la radio. Al volver se comprueba ya.
    let interval: ReturnType<typeof setInterval> | undefined;
    const arrancar = () => {
      if (interval === undefined) interval = setInterval(comprobar, SESSION_CHECK_INTERVAL);
    };
    const parar = () => {
      clearInterval(interval);
      interval = undefined;
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") return parar();
      void comprobar();
      arrancar();
    };
    if (document.visibilityState !== "hidden") arrancar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      parar();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [user, router, pathname]);

  const login = async (email: string, password: string, captchaToken?: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ErrorApi(data);
    setSesionTomada(false);
    setUser(data.user);
    wasAuthenticated.current = true;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    wasAuthenticated.current = false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, sesionTomada }}>
      {children}
    </AuthContext.Provider>
  );
}
