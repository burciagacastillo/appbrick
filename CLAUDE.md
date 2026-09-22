# AppBrick

App de **Grupo Brick** (Erick, Chihuahua). Desde el 22 de septiembre de 2026 dejó
de ser solo interna: va a publicarse.

El contexto de negocio completo vive fuera de este repo, en
`C:\1-CLAUDE COWORK\1-BRICK Grupo Inmobiliario\Contexto_Maestro_Grupo_Brick.md`.
Leerlo antes de tomar decisiones de producto.

## Tres caras, tres públicos

| Ruta | Quién | Qué ve |
|---|---|---|
| `src/app/(interno)/` | admin (Erick) y ayudante | Todo / solo documentos de sus propiedades |
| `src/app/subir/[token]/` | comprador o vendedor | **Solo sus documentos.** Sin cuenta, entra por link |
| `src/app/casas/` | cualquiera | Catálogo público, botón de WhatsApp |
| `src/app/entrar/` | admin y ayudante | Login |

**El layout raíz no tiene menú a propósito.** El menú interno vive en
`(interno)/layout.tsx` y solo ahí. Si se sube al raíz, el comprador termina
viendo links a tu tablero de costos — ya pasó una vez.

## La idea en una frase

Una **Propiedad** tiene un **expediente de 34 trámites**, una **bitácora de gastos**
(con quién pagó), unos **actores**, y ahora también una **ficha pública**.

## Stack

- Next.js 16 (App Router, Server Components) + TypeScript + Tailwind 4
- Prisma 7 sobre **SQLite** (`dev.db` en la raíz)
- Archivos en `almacen/` (fuera de git). Un solo componente de cliente:
  `subir-form.tsx`, y existe porque el invitado sube fotos con señal mala.

## Permisos

`src/lib/permisos.ts` es la puerta. `exigirAdmin()` en cada página de admin,
`exigirSesion()` donde entra el ayudante, y `puedeVerPropiedad()` en las rutas
que entregan archivos.

**Cada página pide su permiso por su cuenta.** El layout de `(interno)` también
corta el paso, pero un layout de Next no es una garantía de seguridad: no se
ejecuta en todas las formas de llegar a una página. Por eso las funciones
devuelven la sesión — para que la página necesite ese valor y no se pueda
"olvidar" de pedirlo.

El ayudante arranca **sin acceso a nada** y se le asignan propiedades en
`/equipo`. El acceso puede tener fecha de vencimiento.

## Las tres reglas que no se rompen

**1. Nada confidencial sale a la cara pública.** `src/lib/publico.ts` tiene una
**lista blanca**: enumera qué campos pueden salir. Lo que no esté escrito ahí no
sale, aunque se agregue al modelo después. Nunca pasar una `Propiedad` completa a
una página pública — el mismo objeto carga el precio de venta y tu margen.

**2. Toda ruta de archivo se valida.** Como suben terceros por link, un nombre
como `../../.env` escribiría fuera del almacén. `limpiarNombre()` y
`resolverDentroDelAlmacen()` en `src/lib/almacen.ts` son la defensa; no rodearlas.

**3. Cada acción sobre datos personales se registra.** `src/lib/bitacora.ts`.
Hay INE, CURP y actas de terceros en la base: el registro es lo que respalda a
Erick si alguien reclama.

## Decisiones tomadas y por qué

**Los documentos SÍ se almacenan** (revertido el 22/09/2026). Antes vivían solo en
carpetas de Windows.

**Contraseñas de Infonavit: cifradas, no en claro.** Erick decidió guardarlas
después de que se le expuso el riesgo. AES-256-GCM en `src/lib/cripto.ts`, llave en
`APPBRICK_LLAVE_CIFRADO`. *Límite real:* la app tiene que poder descifrar, así que
quien entre como admin las ve. **Al publicar, la cuenta de admin necesita segundo
factor** — es lo que sostiene todo lo demás.

**El invitado entra sin cuenta.** El token del link ES la credencial: por eso se
puede revocar, expira a los 60 días, y crear una invitación nueva revoca las
anteriores (si no, un link viejo reenviado por WhatsApp sirve para siempre).

**Aviso de privacidad antes de subir.** LFPDPPP. Se guarda `avisoAceptadoEn` para
poder probar el consentimiento con fecha.

**Chatbot en dos fases.** Fase 1 (hecha en el diseño): botón `wa.me` con mensaje
prellenado, sin infraestructura. Fase 2: WhatsApp Business API, que requiere
aprobación de Meta y cobra por conversación. `fichaParaBot()` ya genera el contexto
que el bot va a consumir — y como sale de la ficha pública, el bot no puede
contestar con un dato confidencial: no lo tiene.

**SQLite, no Supabase (todavía).** La conexión está aislada en `src/lib/db.ts` y
`prisma.config.ts`. Migrar = cambiar el adapter y el `provider`. El almacén de
archivos está igual de aislado en `src/lib/almacen.ts`.

**SQLite no tiene enums.** Los catálogos de valores viven en
`src/lib/constants.ts` como uniones de TypeScript.

## El escáner de carpetas

Erick ya nombraba sus archivos con una convención, y la app la respeta incluso
cuando el archivo lo sube un comprador desde su celular
(`nombrarConConvencion()`):

```
21a - Constancia de zonificacion Sierra la Escondida.pdf
 │└─ a = documento, b = orden de cobro, c = comprobante de pago
 └── número del catálogo (1-34)
```

Reglas que ya costaron un bug cada una:

- El `a/b/c` **solo** significa documento/orden/pago en los municipales (20-24,
  los que tienen `requierePago`). En el 30 (escritura) `b` es la carátula.
- Solo se aceptan números 1-34 y 90-99 (extras). El patrón exige `" - "` con
  espacios para que `2026-08-31_Estado de cuenta.pdf` no se lea como trámite 202.
- **En `notas` solo va lo que no se puede volver a deducir.** Las conclusiones
  derivadas se calculan al pintar; guardadas quedan rancias.
- `limpiarNombre()` colapsa espacios dobles: quitar la `/` de
  "INE / identificación" dejaba un hueco.

## El catálogo de 34

Numeración confirmada por Erick: **1 = Poder, 2 = INE**. Vive en
`prisma/catalogo.ts`, que es fuente de verdad — re-sembrar siempre deja la base
igual al archivo. Banderas que importan:

- `loSubeInvitado` — lo sube el comprador o el vendedor (14 de 34)
- `esDato` — no es archivo, se captura en campos: NSS y las dos referencias
- `vigenciaDias` — recibos y avalúos caducan; una escritura no
- `ayudaInvitado` — la explicación en lenguaje llano para alguien que nunca
  ha tramitado un crédito

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run rescan     # re-escanea las carpetas y actualiza el expediente
npm run db:seed    # carga inicial (idempotente)
npm run llave      # genera la llave de cifrado
npx tsx scripts/ver-estado.ts       # radiografía: documentos, bitácora, invitaciones
npx tsx scripts/invitacion-demo.ts  # crea una invitación de prueba
npx tsx scripts/probar-cripto.ts    # verifica el cifrado
```

`npm run rescan` **nunca baja de nivel** lo marcado a mano. Evitar
`npm run db:reset`: pide confirmación de Prisma y borra capturas reales.

## Convenciones

- **Todo en español**, incluido el código. Es el vocabulario con el que Erick
  trabaja; traducirlo lo aleja.
- Dinero en MXN con el helper `mxn()`. Columnas de números con `.tabular`.
- Colores de marca: `brick-*` (navy #1F3864) y `gold-*`.
- Server Actions en `src/acciones/`, fuera del árbol de rutas.

## Pendiente

- **Segundo factor para el admin. Bloquea publicar.** Esa cuenta descifra las
  contraseñas de Infonavit; su contraseña sola no basta.
- Campos en la UI: estado civil, régimen matrimonial, empleo, notaría,
  referencias, saldo del crédito del vendedor. Ya están en el modelo.
- Chatbot fase 2 (WhatsApp Business API).
- Migrar a Supabase (base y almacén) al publicar.
- Marca de agua en descargas del ayudante. Hoy queda registrado quién bajó qué,
  que es el disuasivo real — una marca de agua la vence una captura de pantalla.
