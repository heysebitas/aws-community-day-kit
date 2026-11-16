"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ENLACES, GRUPOS_ENLACE } from "@/data/enlaces";

/** Los enlaces operativos, editables. */
export function EditorEnlaces() {
  const { toast } = useToast();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);

  useEffect(() => {
    fetch("/api/event-config")
      .then((r) => r.json())
      .then((d) => {
        setValores((d.enlaces ?? {}) as Record<string, string>);
        setCargado(true);
      })
      .catch(() => setCargado(true));
  }, []);

  const editar = (clave: string, v: string) => {
    setValores((x) => ({ ...x, [clave]: v }));
    setSucio(true);
  };

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch("/api/event-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enlaces: valores }),
      });
      if (!r.ok) throw new Error();
      setSucio(false);
      toast("Enlaces guardados. Los correos los toman desde ya.", "success");
    } catch {
      toast("No se pudieron guardar", "error");
    } finally {
      setGuardando(false);
    }
  }

  if (!cargado) {
    return <Loader2 className="h-4 w-4 animate-spin text-surface-400" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-mono text-[11px] leading-relaxed text-surface-300">
        Los enlaces que van dentro de los correos. Se escriben en una plantilla como variable
        —<code className="text-acento">{"{grupoWhatsapp}"}</code>— y se resuelven al enviar.
        Si dejas uno vacío, el botón que lo usa <strong className="text-surface-100">no sale</strong> en
        vez de salir roto.
      </p>

      {GRUPOS_ENLACE.map((grupo) => (
        <div key={grupo} className="flex flex-col gap-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">{grupo}</span>

          {ENLACES.filter((e) => e.grupo === grupo).map((e) => {
            const v = valores[e.clave] ?? "";
            const raro = v.length > 0 && !/^https?:\/\//.test(v);
            return (
              <label key={e.clave} className="flex flex-col gap-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-xs font-semibold text-surface-100">{e.etiqueta}</span>
                  {e.variable && (
                    <span className="border-2 border-surface-600 px-1.5 font-mono text-[10px] text-acento">
                      {`{${e.variable}}`}
                    </span>
                  )}
                </span>
                <input
                  value={v}
                  placeholder={e.ejemplo ?? "https://…"}
                  onChange={(ev) => editar(e.clave, ev.target.value)}
                  className="min-h-11 w-full border-2 border-surface-600 bg-surface-900 px-3 py-2 font-mono text-sm text-surface-100 placeholder:text-surface-500 outline-none transition-colors focus:border-acento"
                />
                <span className="font-mono text-[10px] leading-relaxed text-surface-400">{e.explica}</span>
                {raro && (
                  <span className="font-mono text-[10px] text-amber-300">
                    No empieza por https:// — comprueba que sea el enlace completo.
                  </span>
                )}
              </label>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando || !sucio}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start border-2 border-acento bg-acento px-4 py-2 font-mono text-xs font-bold text-surface-900 disabled:opacity-50"
      >
        {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {guardando ? "Guardando…" : sucio ? "Guardar enlaces" : "Sin cambios"}
      </button>

      <p className="m-0 flex items-start gap-1.5 font-mono text-[10px] leading-relaxed text-surface-500">
        <Link2 className="mt-0.5 h-3 w-3 shrink-0" />
        La transmisión, las fotos y las grabaciones se editan arriba, con el resto del sitio:
        son los mismos enlaces que enseña la portada, y tener dos copias llevaría a que la web
        y el correo dijeran cosas distintas.
      </p>
    </div>
  );
}
