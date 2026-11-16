"use client";

import { useEffect } from "react";

/** Congela el fondo mientras hay algo abierto encima. */

let abiertos = 0;
let soltar: (() => void) | null = null;

function cerrar() {
  if (abiertos++ > 0) return;

  const html = document.documentElement;
  const body = document.body;
  const y = window.scrollY;
  // Al quitar la barra de desplazamiento la página se ensancha y todo salta
  // unos píxeles a la derecha. Se compensa con relleno del mismo ancho.
  const barra = window.innerWidth - html.clientWidth;

  const antes = {
    htmlOverflow: html.style.overflow,
    htmlScrollBehavior: html.style.scrollBehavior,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };

  html.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${y}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.overflow = "hidden";
  if (barra > 0) body.style.paddingRight = `${barra}px`;

  soltar = () => {
    /*
     * `scroll-behavior: auto` antes de devolver la página a su sitio: el `smooth`
     * del `<html>` también anima un `scrollTo` hecho desde código, y al cerrar un
     * modal se vería un salto al principio y una carrera de vuelta.
     */
    html.style.scrollBehavior = "auto";

    html.style.overflow = antes.htmlOverflow;
    body.style.position = antes.position;
    body.style.top = antes.top;
    body.style.left = antes.left;
    body.style.right = antes.right;
    body.style.overflow = antes.overflow;
    body.style.paddingRight = antes.paddingRight;

    window.scrollTo(0, y);

    html.style.scrollBehavior = antes.htmlScrollBehavior;
  };
}

function abrir() {
  if (abiertos === 0) return;
  if (--abiertos > 0) return;
  soltar?.();
  soltar = null;
}

/** Mientras `activo` sea verdadero, el fondo no se mueve. */
export function useScrollLock(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    cerrar();
    return abrir;
  }, [activo]);
}
