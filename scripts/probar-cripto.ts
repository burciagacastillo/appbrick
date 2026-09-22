// Prueba rápida del cifrado de credenciales. Correr: npx tsx scripts/probar-cripto.ts
import "dotenv/config";
import { cifrar, descifrar, generarToken, tokensIguales } from "../src/lib/cripto";

const secreto = "MiPassInfonavit123!";

const guardado = cifrar(secreto);
console.log("En la base se vería así :", guardado.slice(0, 44) + "...");
console.log("Descifra correctamente  :", descifrar(guardado) === secreto ? "SÍ" : "NO");

// Cifrar dos veces el mismo texto debe dar resultados distintos (IV aleatorio).
console.log(
  "Dos cifrados son distintos:",
  cifrar(secreto) !== cifrar(secreto) ? "SÍ" : "NO — mal"
);

// Si alguien altera el texto cifrado en la base, debe explotar, no mentir.
try {
  descifrar(guardado.slice(0, -4) + "AAAA");
  console.log("Detecta alteración      : NO — aceptó datos alterados");
} catch {
  console.log("Detecta alteración      : SÍ");
}

const t = generarToken();
console.log("Token de invitación     :", t.length, "caracteres");
console.log("Compara tokens          :", tokensIguales(t, t) && !tokensIguales(t, generarToken()) ? "OK" : "mal");
