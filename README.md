# AppBrick

App interna de Grupo Brick: en qué va cada trámite, cuánto llevas gastado y qué hay
que empujar hoy.

## Arrancarla

```bash
npm run dev
```

Y abres http://localhost:3000

## Las tres pantallas

**Tablero** — lo que abres en la mañana. Cuánto traes invertido, cuánto esperas de
vuelta, y la lista de *Qué empujar hoy*: los trámites vencidos, los que tienen orden
de cobro sin comprobante y los que quedaron marcados para revisar.

**Propiedades** — todas agrupadas por etapa del ciclo (prospecto → adquisición →
remodelación → en venta → en trámite → escriturando → concluida). Cada tarjeta trae
el avance del expediente y el margen estimado.

**Gastos** — en qué se va el dinero y la cuenta entre socios: quién ha puesto qué,
en total y por propiedad.

## Dentro de una propiedad

- **Expediente** — los 34 documentos en sus 8 bloques (A Vendedor, B Comprador,
  C Solicitudes, D Municipales, E Recibos, F Legal y valor, G Avalúo y crédito,
  H Trámites). Cada uno se marca con un toque: ✗ falta · ? revisar · ✓ completo ·
  — no aplica. Los municipales traen además los tres pasos **a** documento,
  **b** orden de cobro, **c** pagado. Al marcar documento + pagado, el trámite se
  cierra solo.
- **Gastos** — captura rápida con categoría, método y quién pagó. Contra el
  presupuesto de obra te muestra la desviación.
- **Datos** — valores de compra y venta, fechas, presupuesto y el link de Drive.

## Cuando metas documentos nuevos a una carpeta

```bash
npm run rescan
```

Lee los nombres de archivo (`21b - Orden de cobro...`) y actualiza el expediente
solo. Nunca deshace lo que marcaste a mano, y de paso te lista los archivos que
están sin numerar y por eso no cuentan.

## Estado actual

Cargadas las 4 propiedades pendientes, con el expediente deducido de tus carpetas:

| Propiedad | Archivos | Completos | Por revisar |
|---|---:|---:|---:|
| Nueva Fe (Jonathan) | 26 | 5 | 0 |
| Turmalina | 31 | 8 | 8 |
| Santiago Almada | 17 | 7 | 0 |
| Sierra la Escondida | 30 | 7 | 4 |

## Lo que todavía no tiene

- **Login.** Corre en tu máquina; cuando se suba a la nube se agrega.
- **Los PDFs.** Siguen en tus carpetas; la app lleva el estatus y la ruta.
- **Las 15 propiedades concluidas.** Se cargan cuando las quieras para histórico.
- **Flujo de efectivo.** Necesita fechas y montos capturados primero.
