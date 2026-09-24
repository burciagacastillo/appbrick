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
| `propiedades/[id]?tab=personas` | **solo admin** | NSS, contraseñas de Infonavit, referencias |
| `src/app/subir/[token]/` | comprador o vendedor | **Solo sus documentos.** Sin cuenta, entra por link |
| `src/app/casas/` | cualquiera | Catálogo público, botón de WhatsApp |
| `src/app/entrar/` | admin y ayudante | Login |

**El layout raíz no tiene menú a propósito.** El menú interno vive en
`(interno)/layout.tsx` y solo ahí. Si se sube al raíz, el comprador termina
viendo links a tu tablero de costos — ya pasó una vez.

## La idea en una frase

Una **Propiedad** tiene un **expediente de 42 trámites** (del 34 al 42, los del cónyuge, solo si aplican), una **bitácora de gastos**
(con quién pagó), unos **actores**, y ahora también una **ficha pública**.

## Stack

- Next.js 16 (App Router, Server Components) + TypeScript + Tailwind 4
- Prisma 7 sobre **Postgres**: local con `npm run db:local` (`prisma dev`),
  publicada en **Supabase**. Migraciones en `prisma/migrations/`.
- Publicada en **Vercel** (plan gratis, decisión de Erick sabiendo que sus
  términos prohíben uso comercial; pasar a Pro no toca el código).
- Archivos en `almacen/` (fuera de git). Componentes de cliente solo donde
  hace falta estado en el navegador: formularios con respuesta
  (`formularios.tsx`, `subir-form.tsx`), el menú (`navegacion.tsx`, para
  marcar la pestaña activa) y la gráfica de egresos.

## Trámites que son dato, no archivo

Tres del catálogo (13 NSS y contraseña, 18 y 19 referencias) llevan
`esDato: true`. No se suben: se capturan en la pestaña **Personas**, y su
estado lo pone `sincronizarTramitesDeDatos()` según exista el dato. La UI
del expediente no les muestra botón de subir — pedirles un PDF era pedir algo
que no existe.

Ese automatismo **no pisa** lo que marcaste como "no aplica": tu decisión manda.

## Contraseñas de Infonavit: el camino completo

Guardar → `cifrar()` en `guardarPersona`, y en bitácora.
Ver → `revelarPassword`, la **única** función que saca un secreto en claro:
exige admin, se invoca solo al pedirlo, y cada consulta queda registrada.
La contraseña **nunca viaja con la página**, solo cuando se pide.

**Ojo con los componentes de cliente:** todo lo que reciben viaja al
navegador. Hasta el 24/09/2026 las pestañas Personas y Publicar recibían la
propiedad completa, con la contraseña cifrada (y en Publicar, NSS y dinero).
Ahora `sinContrasenas()` en la página de la propiedad la cambia por una marca
("guardada") y Publicar recibe solo los campos de la ficha pública. Nunca
pasarle una `Propiedad` o `Persona` entera a un componente con "use client".

**Agregar persona** pide de una vez, para comprador y vendedor, NSS, crédito,
estado civil (régimen y cónyuge si es casado), CURP y RFC. Si la persona ya
existía, solo llena lo que venga: un campo vacío no borra lo guardado. El
vendedor también tiene NSS y crédito (el suyo, por liquidar); antes su ficha
no los mostraba y **guardarla borraba su número de crédito**.

Si el campo llega vacío al guardar, se conserva la que estaba: si no, editar
el teléfono la borraría sin avisar.

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

**Las rutas de `api/` no pasan por las páginas**, así que no heredan el
"activa tu segundo factor" de `exigirAdmin()`. Cada una revisa por su cuenta
`exige2fa() && !mfaVerificado` (hasta el 23/09/2026 la de documentos no lo
hacía: la contraseña sola bajaba documentos antes de activar el 2FA).
`/api/foto` entrega fotos de casas sin publicar solo al admin y con
`no-store`; las publicadas, a cualquiera con caché larga.

## Pruebas

`npm test` — 183 pruebas sobre lo que no se puede dejar sin red:

| Archivo | Qué protege |
|---|---|
| `almacen.test.ts` | Que no se escriba fuera del almacén y que un HTML disfrazado de foto se rechace |
| `escaner.test.ts` | Los tres bugs reales del escáner, como regresión |
| `publico.test.ts` | Que ningún dato confidencial salga a internet |
| `cripto.test.ts` | Cifrado, subllaves y hashing de contraseñas |
| `limitador.test.ts` | El freno de fuerza bruta |
| `acciones/sesion.test.ts` | Login contra la base real, incluido el bloqueo |
| `acciones/personas.test.ts` | Que la contraseña llegue CIFRADA a la columna, y los trámites de dato |
| `egresos.test.ts` | La gráfica de /gastos: meses en UTC (un gasto del día 1 no se brinca al mes anterior) y meses vacíos en cero |
| `subida.test.ts` | Que la sala de espera (`_entrantes/`) no sirva para pedir el archivo de otro, y que un documento no se duplique |
| `paquetes.test.ts` | El paquete del avalúo: orden del valuador, sin rechazados, solo el "a" en municipales, y que un PDF dañado no tumbe el paquete |
| `slug.test.ts` | Que el id de una propiedad nueva no choque con otra ni con `/propiedades/nueva` |
| `buscar-expediente.test.ts` | El buscador de la ficha con los nombres reales: "zoni", "constancias de zonificacion", "30"; y que "Bonificación" ya no exista |
| `conyuge.test.ts` | Documentos del cónyuge: se abren si es casado, se cierran si no, nunca se cierra lo que ya avanzó, y el link no pide lo que no aplica |

Escribirlas encontró **tres bugs de verdad**: el limitador borraba su propio
contador y nunca frenaba; el esquema de login rechazaba correos internos
(`maria@brick.local`) dejando fuera al equipo; y `"use client"` había quedado
en la segunda línea de un componente, que deja de ser de cliente en silencio.

## Las tres reglas que no se rompen

**0. Los archivos se identifican por sus BYTES, nunca por lo que declara quien
los sube.** `src/lib/tipos-archivo.ts`. El `type` de un File lo controla el
atacante: un .html con JavaScript etiquetado `image/jpeg`, servido `inline`,
correría en nuestro origen con la sesión del admin. Al servirlos tampoco se
confía en lo guardado, y van con `sandbox` y `nosniff`. Publicada, la app
revisa permiso y bitácora y luego redirige a un link de Supabase que caduca
en 60 s (Vercel no deja salir más de 4.5 MB): el archivo se abre en el
dominio de Supabase, nunca en el nuestro.

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

**Postgres, una conexión por servidor.** `DATABASE_POOL_MAX` vale 1 por
defecto. En Vercel cada petición puede ser un servidor nuevo y todos comparten
el límite de Supabase. Y el Postgres local de `prisma dev` **solo acepta una
conexión en total**: si tienes `npm run dev` prendido mientras corres
`npm test`, las pruebas fallan con "Server has closed the connection". Apaga
uno. Por lo mismo, las pruebas usan el `db` compartido, nunca `crearPrisma()`.

**Dos direcciones de base en Supabase.** `DATABASE_URL` = Transaction pooler
(6543), la usa la app. `DIRECT_URL` = Session pooler (5432), la usan las
migraciones. No la "Direct connection": en el plan gratis es solo IPv6.

**El almacén elige destino solo** (`src/lib/almacen.ts`): Supabase Storage si
hay `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, si no la carpeta local.
Publicada en Vercel sin Supabase, **se niega a guardar** en vez de escribir en
un disco que se borra solo. Las rutas se guardan siempre con `/`
(`rutaSegura()`), aunque se generen en Windows.

**Los links de invitación** salen de `urlPublica()`: `APPBRICK_URL` si existe,
si no la dirección de PRODUCCIÓN de Vercel (no la de cada despliegue, que
cambia y rompería los links ya enviados).

**Catálogos de valores como texto, no enums.** Validados con Zod. Volverlos
enums exigiría una migración cada vez que agregues una categoría de gasto.

## El escáner de carpetas

Erick ya nombraba sus archivos con una convención, y la app la respeta incluso
cuando el archivo lo sube un comprador desde su celular
(`nombrarConConvencion()`):

```
21a - Constancia de zonificacion Sierra la Escondida.pdf
 │└─ a = documento, b = orden de cobro, c = comprobante de pago
 └── número del catálogo (1-42)
```

Reglas que ya costaron un bug cada una:

- El `a/b/c` **solo** significa documento/orden/pago en los municipales (20-24,
  los que tienen `requierePago`). En el 30 (escritura) `b` es la carátula.
- Solo se aceptan números 1-42 y 90-99 (extras). El patrón exige `" - "` con
  espacios para que `2026-08-31_Estado de cuenta.pdf` no se lea como trámite 202.
- **En `notas` solo va lo que no se puede volver a deducir.** Las conclusiones
  derivadas se calculan al pintar; guardadas quedan rancias.
- `limpiarNombre()` colapsa espacios dobles: quitar la `/` de
  "INE / identificación" dejaba un hueco.

## Subir documentos (comprador y admin)

Los dos caminos usan la misma zona (`components/zona-subida.tsx`) y el mismo
módulo del servidor (`lib/subida.ts`). Los permisos NO viven ahí: cada acción
valida primero quién sube y a qué trámite.

**Tres topes que ya mordieron:**

- Next corta los formularios en **1 MB** si no se configura. Una foto de
  celular pesa 3-5. `next.config.ts` lo sube a 21 MB (para tu computadora).
- Vercel gratis corta cualquier petición en **4.5 MB**, se configure lo que se
  configure. Por eso, publicada, el archivo va **directo a Supabase** con un
  permiso de un solo uso (`prepararSubidaDirecta`) a `_entrantes/<azar>`, y
  después el servidor lo lee, lo valida por sus bytes y lo acomoda.
  `esRutaEntrante()` es la puerta: solo acepta esas rutas aleatorias.
- Las fotos se **achican en el celular** (2400 px, JPEG) antes de subir.

Si la subida directa falla y el archivo mide menos de 4 MB, se manda por el
formulario. `npm run prod:verificar` prueba la subida directa sin llaves,
igual que el navegador.

Lo que sube el comprador entra "pendiente" (a Revisar); lo que subes tú entra
ya aprobado y avanza el trámite (documento, orden de cobro o pago según el
a/b/c). El ayudante no sube: solo ve y descarga.

Pendiente menor: si alguien sube a `_entrantes/` y cierra la pantalla antes
de confirmar, el archivo se queda ahí. No es visible para nadie; se puede
limpiar a mano en Supabase de vez en cuando.

**Topes por quién sube:** comprador y vendedor 20 MB; Erick 50 MB (escrituras;
es también el máximo por archivo de Supabase gratis). Las fotos se achican con
una escalera de calidad (2400 px → 1280 px) hasta quedar debajo de 2.5 MB, sin
preguntar: dejar que el comprador elija "calidad baja" produce INE ilegibles.
Las fotos del catálogo se suben de una en una por lo mismo.

## Paquetes (pestaña Paquetes)

Varios documentos del expediente en UN PDF, en el orden exacto que los pide
quien los recibe. Definidos en `src/lib/paquetes.ts` (`PAQUETES`); el primero
es el del **avalúo**, en el orden del valuador que dictó Erick el 23/09/2026:
16 → 8, 9, 10 (comprador) → 2, 3, 4 (vendedor) → 25, 26, 27 → 20 → 29 → 30 → 23.
Otro paquete (notaría, Infonavit) es otra entrada en esa lista.

`armarPaquete()` elige qué va en cada lugar: nunca rechazados, solo el "a" en
municipales, aprobados antes que pendientes, varias hojas en orden de subida.
`/api/paquete/[propiedadId]/[paquete]` los une con `pdf-lib` (fotos en hoja
carta), guarda el resultado en `propiedades/<id>/paquetes/` y lo entrega por
link temporal. Solo admin, con bitácora.

## Alta de propiedades

Desde la app: **Propiedades → Nueva propiedad** (o **Crear** arriba). Pide lo
básico y crea la propiedad con todos sus trámites en "falta" en una sola
operación. El id sale del nombre (`idUnico()` en `lib/slug.ts`) porque es la
liga de sus páginas; si choca se le agrega `-2`, y nunca puede ser `nueva`
(taparía la página de alta). `prod:sembrar` sigue sirviendo para las que
vienen de tus carpetas de Windows.

## Fases de una propiedad

Definidas por Erick el 23/09/2026 en `ETAPAS` (`lib/constants.ts`): adquisición,
remodelación, proceso de venta, con cliente, trámite, firma, espera de firma
Infonavit, espera de pago, entrega, concluida. Más "prospecto" y "cancelada",
fuera del camino. **Los `id` ya guardados no se renombran** aunque cambie la
etiqueta (`escriturando` se lee "En firma"): renombrar obliga a migrar datos.
Solo `concluida` y `cancelada` tienen lógica atada. La ficha de la propiedad
tiene la línea de fases: un toque la mueve y queda en bitácora.

## La ficha de una propiedad (desde el 24/09/2026)

Pedido de Erick: que sea MUY fácil desde que entra. De arriba abajo:

1. **Datos clave** (`components/datos-clave.tsx`): comprador y vendedor con
   NSS y número de crédito, cada uno con botón de copiar, y la **nota rápida**
   (el mismo campo `notas` de la pestaña Datos) también con copiar. La persona
   completa trae la contraseña de Infonavit cifrada: a los componentes de
   cliente solo se les pasa el texto que copian.
2. **Buscador** (`lib/buscar-expediente.ts`): filtra los trámites por pedazos
   de palabra sin acentos y abre el archivo. La lógica vive fuera del
   componente para poder probarla; quita acentos por código de carácter, no
   con un regex de `\u` (ver la memoria de escapes).
3. Línea de fases, números, pestañas.

**Expediente mínimo:** nombre, está / no está (✗ ? ✓ —), Abrir y Subir.
Se quitaron "Detalles" (responsable, fecha límite, costo), la línea de dónde
se tramita y el aviso "está en tu computadora". El comentario solo aparece
con "?" (revisar): `guardarNotaTramite`. Los campos quitados siguen en la base.

## El catálogo de 42

El 34 "Bonificación" se quitó el 24/09/2026: fue un error de dictado (lo que
Erick quería es la constancia de zonificación, que ya es el 21). La migración
`20260924000000_quitar_tramite_34` primero **desliga** los documentos
(Documento → Tramite es ON DELETE CASCADE: borrar el trámite los borraría) y
luego borra — filtrando por NOMBRE, porque el número 34 se reutilizó.

**Documentos del cónyuge (34-42)**, regla de Erick del 24/09/2026: si el
vendedor o el comprador es **casado, sea cual sea el régimen**, se piden los
de su cónyuge. 34-37 cónyuge del vendedor (INE, CURP, constancia fiscal, acta
de nacimiento); 38 acta de matrimonio del comprador; 39-42 su cónyuge. El acta
del vendedor sigue siendo el 6. Van en el bloque de cada lado (A / B) para que
cada quien los suba desde su link.

`src/lib/conyuge.ts` los abre y cierra solo según el estado civil capturado en
Personas (`sincronizarConyuge`, llamado al guardar/vincular/desvincular una
persona, al invitar y al crear la propiedad). "Cerrado" = `no_aplica`: el
expediente y el buscador los esconden y `tramitesDelInvitado()` no se los pide
al link. **Nunca cierra lo que ya tiene archivo o avanzó.** Unión libre cuenta
como no casado. La migración `20260924010000_documentos_conyuge` los crea en
producción con los mismos textos que `catalogo.ts`.

En la UI, "bienes mancomunados" se lee **Sociedad conyugal** (así le dice
Erick); el id guardado sigue siendo `bienes_mancomunados`.

Numeración confirmada por Erick: **1 = Poder, 2 = INE**. Vive en
`prisma/catalogo.ts`, que es fuente de verdad — re-sembrar siempre deja la base
igual al archivo. Banderas que importan:

- `loSubeInvitado` — lo sube el comprador o el vendedor (23 de 42)
- `esDato` — no es archivo, se captura en campos: NSS y las dos referencias
- `vigenciaDias` — recibos y avalúos caducan; una escritura no
- `ayudaInvitado` — la explicación en lenguaje llano para alguien que nunca
  ha tramitado un crédito

## Publicar

Vercel corre `vercel-build` en cada publicación: `prisma migrate deploy &&
next build`. Si una migración falla, la versión rota no se publica.

Desde la computadora de Erick, contra producción (lee `.env.produccion`, que
gana sobre `.env`, y se niega si apunta a localhost):

```bash
npm run prod:verificar   # revisa todo; lo más importante: que el bucket sea PRIVADO
npm run prod:migrar      # tablas
npm run prod:sembrar     # catálogo de trámites + las propiedades de sus carpetas
npm run prod:usuario     # su cuenta
```

`produccion.ejemplo.env` es la plantilla (sin secretos, sí va en git).

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm test           # las 183 pruebas
npm run lint       # cero avisos; mantenerlo así
npm run usuario    # alta de admin o ayudante (la contraseña la teclea él)
npm run rescan     # re-escanea las carpetas y actualiza el expediente
npm run db:seed    # carga inicial (idempotente)
npm run llave      # genera la llave de cifrado
npm run db:local   # levanta el Postgres local (si `npm test` dice ECONNREFUSED)
npm run db:migrar  # crea una migración nueva tras cambiar schema.prisma
npm run estado     # radiografía: documentos, bitácora, invitaciones
```

`scripts/operacion/` son las que se usan de verdad; `scripts/diagnostico/`
solo leen. `npm run rescan` **nunca baja de nivel** lo marcado a mano.

## Validación de entrada

Todo formulario pasa por un esquema de Zod en `src/lib/esquemas.ts`. Los
Server Actions son endpoints públicos: el `required` del HTML no protege nada,
cualquiera con sesión puede mandar un FormData armado a mano.

- `validar()` devuelve el error para enseñárselo al usuario.
- `validarOTronar()` lanza, para formularios donde un dato inválido solo puede
  venir de una petición manipulada.

## Convenciones

- **Todo en español**, incluido el código. Es el vocabulario con el que Erick
  trabaja; traducirlo lo aleja.
- Dinero en MXN con el helper `mxn()`. Columnas de números con `.tabular`.
- Colores de marca: `brick-*` (navy #1F3864) y `gold-*`.
- Server Actions en `src/acciones/`, fuera del árbol de rutas.

## Diseño (desde el 23/09/2026)

**Solo modo claro**, estilo Apple/Linear. Antes el fondo seguía al modo
oscuro de Windows y las tarjetas no: se veía "oscuro y saturado".
`globals.css` desactiva la variante `dark:` — no volver a agregarla.

- Tokens en `@theme` de `globals.css`: `tinta` (#0F172A), `tenue` (#64748B),
  `linea`, `fondo` (#F3F4F6), `acento` (#2563EB, **solo** para resaltar un
  dato en una gráfica), `rounded-tarjeta` (20px), `shadow-suave`.
- Todo lo repetido vive en `src/components/ui.tsx`: `Card`, `Stat` (número en
  negro + `insignia` que carga el tono), `Encabezado`, `Vacio` (con `icono` y
  `titulo` es el estado vacío grande), `MenuAcciones`, y las clases
  `BOTON_PRIMARIO` (negro sólido), `BOTON_SECUNDARIO`, `BOTON_EXITO`.
- Íconos: `lucide-react`, trazo 1.5–1.75.
- Las insignias de % solo muestran números que salen de datos reales
  (margen sobre inversión, cambio contra el mes pasado). Nada de "crecimientos"
  decorativos.
- Menú lateral + barra superior con buscador (`/buscar`, solo admin; el
  ayudante busca en `/ayudante`) y botón **Crear**.

## Pendiente

- **Piloto con una operación real** antes de publicar. Todo lo probado hasta
  hoy lo probó quien sabe cómo funciona; falta un comprador de verdad.

- El driver de Supabase Storage no se ha probado contra un proyecto real
  todavía: `npm run prod:verificar` hace una escritura/lectura/borrado real
  y es la primera prueba.
- Chatbot fase 2 (WhatsApp Business API).
- Migrar a Supabase (base y almacén) al publicar.
- Marca de agua en descargas del ayudante. Hoy queda registrado quién bajó qué,
  que es el disuasivo real — una marca de agua la vence una captura de pantalla.
