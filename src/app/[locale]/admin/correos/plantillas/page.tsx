"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, RotateCcw, Save, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/admin/confirm";
import { usePrompt } from "@/components/admin/prompt";
import { usePermiso } from "@/hooks/use-permiso";
import {
  Aviso, Cargando, HardButton, PageHead, Panel, SectionHead,
} from "@/components/admin/ui";
import { GRUPOS_VARIABLE, VARIABLES, variablesUsadas } from "@/emails/bloques";
import { cn } from "@/lib/utils";
import { EditorBloques } from "../_editor-bloques";
import { Vista } from "../_vista";
import { ListaPlantillas, Volver, usePlantillas, type Plantilla } from "../_compartido";
import { PAIS } from "@/config";

/** Escribir los correos. */

type Borrador = Pick<Plantilla, "nombre" | "descripcion" | "asunto" | "preview" | "bloques">;

const CAMPO =
  "w-full border-2 border-surface-600 bg-surface-900 px-3 py-2 font-mono text-sm " +
  "text-surface-100 placeholder:text-surface-400 outline-none transition-colors focus:border-acento";

export default function PlantillasPage() {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { prompt, dialog: dialogoTexto } = usePrompt();
  const { puedeEditar, puedeBorrar, soloLectura } = usePermiso("correos");

  const { plantillas, setPlantillas, cargando, error, cargar } = usePlantillas();
  const [slug, setSlug] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [sucio, setSucio] = useState(false);

  /** Lo que se está editando, separado de la lista hasta que se guarda. */
  const [borrador, setBorrador] = useState<Borrador | null>(null);

  const actual = useMemo(() => plantillas.find((p) => p.slug === slug) ?? null, [plantillas, slug]);

  useEffect(() => {
    if (!slug && plantillas.length) setSlug(plantillas[0].slug);
  }, [plantillas, slug]);

  useEffect(() => { if (error) toast("No se pudieron cargar las plantillas", "error"); }, [error, toast]);

  // Al cambiar de plantilla se recarga el borrador con lo suyo.
  useEffect(() => {
    if (!actual) return;
    setBorrador({
      nombre: actual.nombre,
      descripcion: actual.descripcion,
      asunto: actual.asunto,
      preview: actual.preview,
      bloques: actual.bloques,
    });
    setSucio(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual?.slug]);

  /** Qué variables menciona el texto. */
  const usadas = useMemo(
    () => (borrador ? variablesUsadas(borrador.bloques, borrador.asunto, borrador.preview) : new Set<string>()),
    [borrador],
  );

  const editar = (campos: Partial<Borrador>) => {
    setBorrador((b) => (b ? { ...b, ...campos } : b));
    setSucio(true);
  };

  // ── Acciones ────────────────────────────────────────────────────────────
  async function guardar() {
    if (!actual || !borrador) return;
    setGuardando(true);
    try {
      const r = await fetch(`/api/admin/email-templates/${actual.slug}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(borrador),
      });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { plantilla: Plantilla };
      setPlantillas((ps) => ps.map((p) => (p.slug === d.plantilla.slug ? d.plantilla : p)));
      setSucio(false);
      toast("Guardado. Es lo que se enviará desde ahora.", "success");
    } catch {
      toast("No se pudo guardar", "error");
    } finally { setGuardando(false); }
  }

  async function crear(copiarDe?: string) {
    const origen = copiarDe ? plantillas.find((p) => p.slug === copiarDe) : null;

    const nombre = await prompt({
      title: origen ? "Duplicar plantilla" : "Nueva plantilla",
      message: origen
        ? `Se copia el contenido de «${origen.nombre}». La copia es tuya: se puede editar, mandar a un grupo y borrar.`
        : "Empieza en blanco. A quién se le manda se decide en Campañas.",
      initial: origen ? `${origen.nombre} (copia)` : "",
      placeholder: "Recordatorio de la semana previa",
      confirmLabel: origen ? "Duplicar" : "Crear",
      maxLength: 120,
      // Se avisa acá y no después del 400 del servidor.
      validar: (v) =>
        plantillas.some((p) => p.nombre.toLowerCase() === v.toLowerCase())
          ? "Ya hay una plantilla con ese nombre."
          : null,
    });
    if (!nombre) return;

    setCreando(true);
    try {
      const r = await fetch("/api/admin/email-templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, copiarDe }),
      });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { plantilla: Plantilla };
      await cargar();
      setSlug(d.plantilla.slug);
      toast("Plantilla creada", "success");
    } catch {
      toast("No se pudo crear", "error");
    } finally { setCreando(false); }
  }

  async function borrarORestaurar() {
    if (!actual) return;
    const ok = await confirm({
      title: actual.deSistema ? "Volver al texto de fábrica" : "Borrar la plantilla",
      message: actual.deSistema
        ? `«${actual.nombre}» vuelve a su contenido original. Se pierde lo que hayas escrito.`
        : `Se borra «${actual.nombre}». No se puede deshacer.`,
      confirmLabel: actual.deSistema ? "Restaurar" : "Borrar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const r = await fetch(`/api/admin/email-templates/${actual.slug}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { restaurada?: boolean };
      if (!d.restaurada) setSlug(null);
      await cargar();
      toast(d.restaurada ? "Restaurada" : "Borrada", "success");
    } catch {
      toast("No se pudo completar", "error");
    }
  }

  if (cargando) return <Cargando />;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHead
        title="correos"
        actions={
          <>
            <HardButton tone="ghost" icon={creando ? Loader2 : Plus}
              onClick={() => void crear()} disabled={creando || !puedeEditar}>
              Nueva
            </HardButton>
            {actual && puedeEditar && (
              <HardButton tone="ghost" icon={Copy}
                onClick={() => void crear(actual.slug)} disabled={creando}>
                Duplicar ésta
              </HardButton>
            )}
          </>
        }
      />


      <Volver donde="Plantillas" />

      {soloLectura && (
        <Aviso tone="info" className="mb-4">
          Tienes esta sección en sólo lectura: puedes leer los correos, pero no editarlos.
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Las plantillas ──────────────────────────────────────────── */}
        <aside>
          <SectionHead title="plantillas" />
          <div className="mt-2">
            <ListaPlantillas
              plantillas={plantillas}
              slug={slug}
              onElegir={setSlug}
              pie="El candado marca las que vienen con el sistema. Unas las dispara el código y otras las mandas tú, pero ninguna se borra: hay código que las busca por su clave."
            />
          </div>
        </aside>

        {/* ── El editor ───────────────────────────────────────────────── */}
        {actual && borrador ? (
          <div className="flex min-w-0 flex-col gap-4">
            {actual.bloqueada && (
              <Aviso tone="info">
                Esta plantilla está bloqueada: su contenido vive en el código y la siembra lo vuelve
                a escribir en cada arranque. Dice algo que no se puede equivocar, por eso no se edita
                desde acá. Para cambiarla hay que tocar <code>src/emails/semilla.ts</code>.
              </Aviso>
            )}
            <Panel>
              <div className="flex flex-col gap-2.5">
                {!actual.deSistema && (
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">Nombre</span>
                    <input className={CAMPO} value={borrador.nombre}
                      onChange={(e) => editar({ nombre: e.target.value })} />
                  </label>
                )}
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">Asunto</span>
                  <input className={CAMPO} value={borrador.asunto} readOnly={actual.bloqueada}
                    onChange={(e) => editar({ asunto: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-surface-400">
                    Vista previa en la bandeja
                  </span>
                  <input className={CAMPO} value={borrador.preview} readOnly={actual.bloqueada}
                    onChange={(e) => editar({ preview: e.target.value })} />
                  <span className="font-mono text-[10px] text-surface-300">
                    La línea gris que sale junto al asunto en la bandeja de entrada.
                  </span>
                </label>
              </div>
            </Panel>

            <SectionHead title="el cuerpo" />
            {actual.bloqueada ? (
              <Panel>
                <p className="m-0 font-mono text-[11px] leading-relaxed text-surface-300">
                  El cuerpo de esta plantilla está fijado en el código. Lo que va a recibir la gente
                  se ve en la vista previa de al lado.
                </p>
              </Panel>
            ) : (
              <EditorBloques bloques={borrador.bloques} onChange={(bloques) => editar({ bloques })} />
            )}

            <Panel label="variables">
              <p className="m-0 mb-3 font-mono text-[11px] leading-relaxed text-surface-300">
                Escríbelas entre llaves en cualquier texto, incluido el asunto. Se cambian por los datos
                de cada persona al enviar; las que no tengan valor desaparecen en vez de quedar a la vista,
                y un botón cuyo enlace se queda vacío no sale.
              </p>

              {/* Agrupadas: son veintitrés y en una lista seguida no se
                  distingue lo que es de la persona de lo que es un enlace
                  configurable. Las que ya están en uso se marcan. */}
              <div className="flex flex-col gap-2.5">
                {GRUPOS_VARIABLE.map((grupo) => (
                  <div key={grupo}>
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-surface-400">
                      {grupo}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIABLES.filter((v) => v.grupo === grupo).map((v) => (
                        <span key={v.clave} title={v.explica}
                          className={cn(
                            "border-2 px-2 py-0.5 font-mono text-[11px]",
                            usadas.has(v.clave)
                              ? "border-acento bg-acento/10 text-acento"
                              : "border-surface-600 text-surface-300",
                          )}>
                          {`{${v.clave}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="m-0 mt-3 border-t-2 border-surface-600 pt-2 font-mono text-[10px] leading-relaxed text-surface-300">
                Los de «enlaces del panel» se configuran en Configuración del evento. Si uno está
                vacío, el botón que lo use desaparece del correo.
              </p>
            </Panel>

            <Panel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <HardButton icon={guardando ? Loader2 : Save} onClick={() => void guardar()}
                  disabled={guardando || !sucio || !puedeEditar || actual.bloqueada}>
                  {guardando ? "Guardando…" : sucio ? "Guardar" : "Sin cambios"}
                </HardButton>
                <HardButton tone="ghost" icon={actual.deSistema ? RotateCcw : Trash2}
                  onClick={() => void borrarORestaurar()}
                  disabled={actual.bloqueada || (actual.deSistema ? !puedeEditar : !puedeBorrar)}>
                  {actual.deSistema ? "Texto de fábrica" : "Borrar"}
                </HardButton>
              </div>
              {actual.actualizadaPor && (
                <p className="m-0 mt-2.5 font-mono text-[11px] text-surface-400">
                  Última edición: {actual.actualizadaPor} ·{" "}
                  {new Date(actual.updatedAt).toLocaleDateString(PAIS.locale, {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </Panel>
          </div>
        ) : (
          <Aviso tone="info">Elige una plantilla de la lista.</Aviso>
        )}

        {/* ── La vista previa ─────────────────────────────────────────── */}
        <div className="min-w-0">
          {borrador && (
            <Vista
              bloques={borrador.bloques}
              preview={borrador.preview}
              asunto={borrador.asunto}
              usa={usadas}
            />
          )}
        </div>
      </div>

      {dialog}
      {dialogoTexto}
    </div>
  );
}
