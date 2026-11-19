import "server-only";

/**
 * Cola de trabajos en el proceso: lo lento (un PDF, un correo) sale de la
 * petición sin dejar que mil altas a la vez lo hagan todas al mismo tiempo.
 *
 * Va en memoria: si el proceso muere, lo pendiente se pierde. Por eso quien
 * encola anota su propio estado en la base (p. ej. `emailStatus: "pending"`) y
 * el panel puede reenviar lo que no salió.
 */

export interface OpcionesCola {
  /** Trabajos corriendo a la vez. */
  concurrencia: number;
  /** Pendientes máximos; pasado esto el trabajo corre en línea, como sin cola. */
  tope: number;
  /** Veces que se intenta un trabajo que lanza. */
  intentos: number;
  /** Espera antes del reintento k: `esperaMs * 2^(k-1)`. */
  esperaMs: number;
}

export class Cola {
  private pendientes: (() => void)[] = [];
  private activos = 0;
  private vacia: (() => void)[] = [];

  constructor(private readonly o: OpcionesCola) {}

  /**
   * Encola `tarea`. La promesa se cumple cuando termina (o agota sus intentos);
   * nunca se rechaza: nadie espera el resultado de un correo en segundo plano.
   * Con la cola llena corre ya, en línea.
   */
  encolar(tarea: () => Promise<void>, etiqueta = "tarea"): Promise<void> {
    const correr = () => this.conReintentos(tarea, etiqueta);
    if (this.pendientes.length >= this.o.tope) return correr();
    return new Promise<void>((fin) => {
      this.pendientes.push(() => {
        this.activos++;
        void correr().finally(() => {
          this.activos--;
          fin();
          this.avanzar();
        });
      });
      this.avanzar();
    });
  }

  private avanzar() {
    while (this.activos < this.o.concurrencia && this.pendientes.length) this.pendientes.shift()!();
    if (!this.activos && !this.pendientes.length) this.vacia.splice(0).forEach((f) => f());
  }

  private async conReintentos(tarea: () => Promise<void>, etiqueta: string): Promise<void> {
    for (let n = 1; ; n++) {
      try {
        await tarea();
        return;
      } catch (e) {
        if (n >= this.o.intentos) {
          console.error(`[cola] ${etiqueta} falló tras ${n} intentos:`, (e as Error).message);
          return;
        }
        await new Promise((r) => setTimeout(r, this.o.esperaMs * 2 ** (n - 1)));
      }
    }
  }

  /** Se cumple cuando no queda nada corriendo ni pendiente. */
  esperarVacia(): Promise<void> {
    if (!this.activos && !this.pendientes.length) return Promise.resolve();
    return new Promise((r) => this.vacia.push(r));
  }

  get tamano() {
    return { activos: this.activos, pendientes: this.pendientes.length };
  }
}

export const cola = new Cola({
  concurrencia: 2,
  tope: 500,
  intentos: 3,
  esperaMs: Number(process.env.COLA_ESPERA_MS ?? 2000),
});

export const esperarCola = () => cola.esperarVacia();
