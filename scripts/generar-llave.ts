// Genera la llave de cifrado para las credenciales de Infonavit.
//   npm run llave
//
// Se copia al .env como APPBRICK_LLAVE_CIFRADO. Si se pierde, las contraseñas
// ya guardadas quedan irrecuperables — y así debe ser.
import { randomBytes } from "node:crypto";

const llave = randomBytes(48).toString("base64");

console.log("\nPega esta línea en tu .env (y NUNCA la subas a git):\n");
console.log(`APPBRICK_LLAVE_CIFRADO="${llave}"\n`);
