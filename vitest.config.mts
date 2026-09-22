import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Los archivos corren uno tras otro, no en paralelo.
    //
    // Varias pruebas escriben en la misma base (login, limitador, personas).
    // En paralelo se estorbaban, la preparación de una expiraba por el
    // bloqueo, y Vitest marcaba sus pruebas como "omitidas" con el resumen
    // en verde: 5 pruebas dejaban de proteger sin que nada tronara. El suite
    // tarda un par de segundos; no vale la pena el riesgo.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
});
