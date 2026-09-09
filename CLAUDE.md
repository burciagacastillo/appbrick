# AppBrick

App interna de **Grupo Brick** (Erick, Chihuahua): trámites, avances y costos de las
propiedades. Uso: Erick + un asistente, desde celular y laptop.

El contexto de negocio completo vive fuera de este repo, en
`C:\1-CLAUDE COWORK\1-BRICK Grupo Inmobiliario\Contexto_Maestro_Grupo_Brick.md`.
Leerlo antes de tomar decisiones de producto.

## La idea en una frase

Una **Propiedad** tiene un **expediente de 34 trámites**, una **bitácora de gastos**
(con quién pagó) y unos **actores**. Todo lo demás son vistas de eso.

## Stack

- Next.js 16 (App Router, Server Components) + TypeScript + Tailwind 4
- Prisma 7 sobre **SQLite** (`dev.db` en la raíz)
- Sin cliente JS: toda la interacción es `<form>` + Server Actions

## Decisiones tomadas y por qué

**SQLite, no Supabase (todavía).** Supabase exige que Erick cree la cuenta y
comparta llaves. Se eligió SQLite para no bloquear el arranque. La conexión está
aislada en `src/lib/db.ts` y `prisma.config.ts`: migrar es cambiar el adapter y el
`provider` del schema, nada más.

**Los PDFs no se suben a la app.** Decisión explícita de Erick: los archivos siguen
en carpetas de Windows. La app guarda `carpetaLocal` y, opcionalmente,
`carpetaDrive` (un link). *Tensión conocida:* con archivos locales el asistente no
los ve y Erick tampoco desde el celular. El puente propuesto es sincronizar la
carpeta a Drive y llenar `carpetaDrive`.

**Sin login todavía.** El modelo `Usuario` ya existe y `Tramite`/`Gasto` ya apuntan a
él, pero no hay autenticación. Va cuando se monte en la nube.

**SQLite no tiene enums.** Los catálogos de valores (etapas, estados, categorías)
viven en `src/lib/constants.ts` como uniones de TypeScript. Al pasar a Postgres se
pueden volver enums reales.

## El escáner de carpetas — la pieza clave

Erick ya nombraba sus archivos con una convención:

```
21a - Constancia de zonificacion Sierra la Escondida.pdf
 │└─ a = documento, b = orden de cobro, c = comprobante de pago
 └── número del catálogo (1-34)
```

`src/lib/escaner.ts` traduce esos nombres a estado de expediente. Reglas que
importan y que ya costaron un bug cada una:

- El `a/b/c` **solo** significa documento/orden/pago en los trámites municipales
  (20-24, los que tienen `requierePago`). En el 30 (escritura) `b` es la carátula,
  no una orden de cobro. Por eso `escanearCarpeta` recibe el set `conCicloDePago`.
- Solo se aceptan números 1-34 (catálogo) y 90-99 (extras). El patrón exige `" - "`
  con espacios para que `2026-08-31_Estado de cuenta.pdf` no se lea como trámite 202.
- Las marcas `(revisar)` en el nombre bajan el trámite a estado `revisar`.
- **En `notas` solo va lo que no se puede volver a deducir.** Las conclusiones
  derivadas (ej. "falta el comprobante") se calculan al pintar; si se guardaran,
  quedarían rancias en cuanto se resuelvan.

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run rescan     # re-escanea las carpetas y actualiza el expediente
npm run db:seed    # carga inicial (idempotente)
npm run db:studio  # ver la base a mano
```

`npm run rescan` **nunca baja de nivel** lo marcado a mano: solo sube
(falta → revisar → completo) y refresca el nombre del archivo. Así se puede marcar
algo como completo aunque el PDF no exista, sin que el escáner lo deshaga.

Evitar `npm run db:reset`: pide confirmación de Prisma y borra capturas reales.

## Convenciones

- **Todo en español**, incluido el código: nombres de modelos, campos, variables y
  comentarios. Es el vocabulario con el que Erick trabaja; traducirlo lo aleja.
- Dinero siempre en MXN, con el helper `mxn()`. Columnas de números con `.tabular`.
- Colores de marca: `brick-*` (navy #1F3864) y `gold-*`, los de sus presentaciones.
