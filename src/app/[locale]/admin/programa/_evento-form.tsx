"use client";

import { useEffect, useState } from "react";
import { Mic2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/components/ui/toast";
import { rangoValido } from "@/lib/agenda-conflictos";
import { Aviso, HardButton } from "@/components/admin/ui";
import { keynotes } from "@evento/keynotes";
import type { Keynote } from "@/config/contenido";
import { TRACKS } from "@/data/session-tracks";
import {
  FORM_VACIO, IDIOMA_OPCIONES, MODALIDAD_OPCIONES, NIVEL_OPCIONES, TIPOS,
  type BloqueAgenda, type FormBloque, type Salon, type SpeakerAceptado, type TipoBloque,
} from "./_shared";
import { PAIS } from "@/config";

/** El formulario de un bloque del programa. */

const OPCIONES_TRACK = TRACKS.map(({ value, label }) => ({ value, label }));

export function EventoForm({
  abierto,
  editando,
  preseleccion,
  salones,
  speakers,
  onClose,
  onSaved,
}: {
  abierto: boolean;
  /** El bloque que se está editando, o `null` para crear uno. */
  editando: BloqueAgenda | null;
  /** Un speaker que viene de «por agendar»: abre en modo sesión y ya elegido. */
  preseleccion: SpeakerAceptado | null;
  salones: Salon[];
  speakers: SpeakerAceptado[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<TipoBloque>("free");
  const [form, setForm] = useState<FormBloque>(FORM_VACIO);
  const [speakerId, setSpeakerId] = useState("");
  const [salonId, setSalonId] = useState("");
  const [keynoteIdx, setKeynoteIdx] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const set = <K extends keyof FormBloque>(k: K, v: FormBloque[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const aplicarSpeaker = (sp: SpeakerAceptado) => {
    setSpeakerId(sp.id);
    setForm((f) => ({
      ...f,
      title: sp.talkTitle,
      description: sp.talkAbstract || "",
      track: sp.track || "general",
      level: (["100", "200", "300", "400"].includes(sp.audienceLevel) ? sp.audienceLevel : "") as FormBloque["level"],
      language: (["es", "en", "bilingual"].includes(sp.language) ? sp.language : "es") as FormBloque["language"],
      speaker: sp.name,
      speakerSlug: sp.slug,
      sessionType: "presencial",
    }));
  };

  const aplicarKeynote = (kn: Keynote) => {
    setForm((f) => ({
      ...f,
      title: kn.tituloCharla || "Keynote",
      speaker: `${kn.nombre} ${kn.apellido}`,
      speakerSlug: "",
      description: [kn.cargo, kn.empresa].filter(Boolean).join(" · "),
      track: "general",
      level: "",
      sessionType: "presencial",
    }));
  };

  // Al abrir se decide en qué modo arranca y con qué datos.
  useEffect(() => {
    if (!abierto) return;

    if (editando) {
      setTipo(editando.speakerId ? "session" : "free");
      setSpeakerId(editando.speakerId || "");
      setSalonId(editando.roomId || salones.find((r) => r.name === editando.room)?.id || "");
      setForm({
        title: editando.title,
        speaker: editando.speaker,
        speakerSlug: editando.speakerSlug || "",
        description: editando.description,
        startTime: editando.startTime,
        endTime: editando.endTime,
        room: editando.room,
        track: editando.track,
        order: editando.order,
        sessionType: editando.sessionType || "presencial",
        level: editando.level || "",
        language: editando.language || "es",
        cta: editando.cta || "",
        imageUrl: editando.imageUrl || "",
        cardImageUrl: editando.cardImageUrl || "",
      });
      return;
    }

    setForm(FORM_VACIO);
    setSalonId("");
    if (preseleccion) {
      setTipo("session");
      aplicarSpeaker(preseleccion);
    } else {
      setTipo("free");
      setSpeakerId("");
    }
    // `salones` sólo se lee para resolver el id del salón al editar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, editando, preseleccion]);

  const editandoSesion = !!editando?.speakerId;
  const nuevo = !editando;

  const elegirSalon = (id: string) => {
    setSalonId(id);
    const r = salones.find((x) => x.id === id);
    if (r) set("room", r.name);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();

    // Se podía guardar un bloque de 12:00 a 11:00 y la pantalla lo enseñaba
    // tan tranquila. Se para acá, que es donde la persona puede corregirlo.
    if (!rangoValido(form.startTime, form.endTime)) {
      toast("La hora de fin tiene que ser posterior a la de inicio", "error");
      return;
    }

    setGuardando(true);
    try {
      const esSesionNueva = tipo === "session" && nuevo;
      /**
       * `roomId` va siempre, vacío incluido: así el servidor distingue «no cambiar
       * la sala» de «soltarla».
       */
      const cuerpo = {
        ...form,
        roomId: salonId,
        ...(esSesionNueva && speakerId ? { speakerId } : {}),
        ...(editando?.speakerId ? { speakerId: editando.speakerId } : {}),
      };

      const res = await fetch(editando ? `/api/agenda/${editando._id}` : "/api/agenda", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "No se pudo guardar", "error");
        return;
      }
      toast(editando ? "Bloque actualizado" : "Bloque creado", "success");
      onSaved();
    } catch {
      toast("No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  /** El par de horas, que es igual en los tres modos. */
  const horas = (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Hora de inicio" required type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
        <Input label="Hora de fin" required type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
      </div>
      <p className="m-0 mt-1.5 font-mono text-[11px] text-surface-300">
        Hora de {PAIS.nombre}.
      </p>
    </div>
  );

  /** El desplegable de salón. */
  const salon = () => (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-sm text-surface-200">Salón *</span>
      {salones.length > 0 ? (
        <select
          value={salonId}
          onChange={(e) => elegirSalon(e.target.value)}
          required
          className="min-h-11 w-full border-2 border-surface-600 bg-surface-900 px-4 py-2.5 font-mono text-sm text-surface-100 outline-hidden transition-colors focus:border-acento"
        >
          <option value="">— Elige un salón —</option>
          {salones.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}{r.capacity ? ` (cap. ${r.capacity})` : ""}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={form.room}
          onChange={(e) => set("room", e.target.value)}
          required
          placeholder="Ej. Auditorio principal"
          className="min-h-11 w-full border-2 border-surface-600 bg-surface-900 px-4 py-2.5 font-mono text-sm text-surface-100 placeholder:text-surface-400 outline-hidden focus:border-acento"
        />
      )}
      {salones.length === 0 && (
        <span className="font-mono text-[11px] text-surface-300">
          No hay salones creados. Puedes escribir el nombre a mano o crearlos en la pestaña «salones».
        </span>
      )}
    </label>
  );

  return (
    <Modal
      open={abierto}
      onClose={() => !guardando && onClose()}
      title={editando ? (editandoSesion ? "Editar sesión" : "Editar bloque") : "Nuevo bloque"}
      size="lg"
    >
      {/* Qué tipo de bloque, sólo al crear */}
      {nuevo && (
        <div className="mb-5 grid grid-cols-3 gap-1.5 border-2 border-surface-600 bg-surface-800 p-1.5">
          {TIPOS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTipo(key);
                if (key === "keynote" && keynotes.length > 0) {
                  setKeynoteIdx(0);
                  aplicarKeynote(keynotes[0]);
                }
              }}
              className={`flex min-h-11 items-center justify-center gap-2 border-2 px-2 py-2 font-mono text-xs font-bold transition-all ${
                tipo === key
                  ? "border-acento bg-acento text-surface-900"
                  : "border-transparent text-surface-200 hover:border-surface-600 hover:bg-surface-700/40"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={guardar} className="flex flex-col gap-4">
        {/* ── Sesión ─────────────────────────────────────────────────────── */}
        {tipo === "session" && nuevo && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-sm text-surface-200">Speaker aceptado *</span>
              <select
                value={speakerId}
                onChange={(e) => {
                  const sp = speakers.find((s) => s.id === e.target.value);
                  if (sp) aplicarSpeaker(sp);
                  else setSpeakerId(e.target.value);
                }}
                required
                className="min-h-11 w-full border-2 border-surface-600 bg-surface-900 px-4 py-2.5 font-mono text-sm text-surface-100 outline-hidden transition-colors focus:border-acento"
              >
                <option value="">— Elige un speaker —</option>
                {speakers.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}{sp.talkTitle ? ` — ${sp.talkTitle.slice(0, 50)}${sp.talkTitle.length > 50 ? "…" : ""}` : ""}
                  </option>
                ))}
              </select>
              {speakers.length === 0 && (
                <span className="font-mono text-[11px] text-surface-300">
                  No hay nadie en estado «Aceptado» para agendar.
                </span>
              )}
            </label>

            {salon()}
            {horas}

            {speakerId && (
              <Aviso tone="info" className="mb-0">
                Se rellenó desde su ficha: <strong className="text-surface-100">{form.title || "sin título"}</strong>.
                {" "}Track, nivel e idioma salen de ahí también.
              </Aviso>
            )}
          </>
        )}

        {/* ── Keynote ────────────────────────────────────────────────────── */}
        {tipo === "keynote" && nuevo && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-sm text-surface-200">Keynote *</span>
              <select
                value={keynoteIdx}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setKeynoteIdx(i);
                  if (keynotes[i]) aplicarKeynote(keynotes[i]);
                }}
                className="min-h-11 w-full border-2 border-surface-600 bg-surface-900 px-4 py-2.5 font-mono text-sm text-surface-100 outline-hidden transition-colors focus:border-acento"
              >
                {keynotes.map((kn, i) => (
                  <option key={i} value={i}>
                    {kn.nombre} {kn.apellido}{kn.empresa ? ` — ${kn.empresa}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {salon()}
            {horas}

            <Aviso tone="warn" className="mb-0">
              Se rellenó desde la lista de keynotes: <strong className="text-surface-100">{form.title}</strong>
              {form.speaker ? ` · ${form.speaker}` : ""}.
            </Aviso>
          </>
        )}

        {/* ── Bloque libre, y edición de cualquiera de los tres ───────────── */}
        {(tipo === "free" || editando) && (
          <>
            {editandoSesion && (
              <Aviso tone="info" className="mb-0">
                <Mic2 className="mr-1 inline h-3 w-3" />
                Está vinculado a un speaker: al cambiar la hora o la sala, su ficha se actualiza sola.
              </Aviso>
            )}

            <Input label="Título" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej. Café y networking" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Nombre de quien lo da" value={form.speaker} onChange={(e) => set("speaker", e.target.value)} placeholder="Opcional" />
              <Input label="Enlace a su perfil" value={form.speakerSlug} onChange={(e) => set("speakerSlug", e.target.value)} placeholder="ej. maria-rodriguez" />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-sm text-surface-200">Descripción</span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="De qué va este bloque."
                className="w-full resize-none border-2 border-surface-600 bg-surface-900 px-4 py-3 font-mono text-sm text-surface-100 placeholder:text-surface-400 outline-hidden transition-colors focus:border-acento"
              />
            </label>

            {horas}
            {salon()}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select label="Modalidad" options={MODALIDAD_OPCIONES} value={form.sessionType} onChange={(v) => set("sessionType", v as FormBloque["sessionType"])} />
              <Select label="Nivel" options={NIVEL_OPCIONES} value={form.level} onChange={(v) => set("level", v as FormBloque["level"])} />
              <Select label="Idioma" options={IDIOMA_OPCIONES} value={form.language} onChange={(v) => set("language", v as FormBloque["language"])} />
            </div>

            <Select label="Track" options={OPCIONES_TRACK} value={form.track} onChange={(v) => set("track", v)} />

            <Input label="Enlace del botón (opcional)" value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="https://…" />
          </>
        )}

        {/* Imágenes: sólo para lo que no es una sesión de speaker */}
        {(tipo === "keynote" || tipo === "free" || editando) && !editandoSesion && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageUpload label="Imagen en la agenda" value={form.imageUrl} onChange={(u) => set("imageUrl", u)} folder="agenda" aspectRatio="square" />
            <ImageUpload label="Imagen del detalle" value={form.cardImageUrl} onChange={(u) => set("cardImageUrl", u)} folder="agenda" aspectRatio="wide" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t-2 border-surface-600 pt-4 sm:flex sm:justify-end">
          <HardButton tone="ghost" onClick={onClose} disabled={guardando}>Cancelar</HardButton>
          <HardButton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear bloque"}
          </HardButton>
        </div>
      </form>
    </Modal>
  );
}
