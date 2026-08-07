# Dev-ZK-2 — Camino A: estructura del contrato + registerPrescription

6 PRs progresivas y secuenciales. Todo tu camino es autónomo — no dependés de nada de Dev-ZK-1. Vos sos quien desbloquea la integración de Dev-ZK-1 (su PR 5). No avances a la siguiente PR sin que yo confirme que la anterior está OK.

---

## PR 1 — Struct de receta

**Contexto**: el contrato Compact todavía no existe.
**Tarea**: definir el tipo/struct de receta (`commitment`, `drugCode`, `expiryDate`) en el contrato. Sin lógica todavía, solo el tipo.
**Devolver**: mostrame el diff antes de aplicar. Compilá y confirmame que no hay errores.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 2 — Lista de médicos hardcodeada en el ledger

**Contexto**: ya existe el struct de receta (PR 1).
**Tarea**: agregar al ledger la lista fija hardcodeada de 3-5 médicos de prueba (ver sección 7 de CONTEXTO.md), en una parte clara del archivo, con un comentario indicando que Dev-ZK-1 la va a necesitar para `validatePrescription`.
**Devolver**: mostrame el diff antes de aplicar. Compilá y confirmame que no hay errores.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 3 — Implementar registerPrescription

**Contexto**: ya existen el struct de receta y la lista de médicos (PR 2).
**Tarea**: implementar el circuito `registerPrescription(commitment, drugCode, expiryDate)`.
**Devolver**: mostrame el diff antes de aplicar. Compilá y confirmame que no hay errores. Corré un test simple que verifique que el commitment quedó guardado en el ledger y mostrame el resultado.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 4 — Commit, push y merge a main

**Contexto**: `registerPrescription` ya compila y el test pasa (PR 3).
**Tarea**: commitear los cambios, pushear la rama y abrir la PR a main. Mergear solo una vez que compile y el test pase.
**Devolver**: mostrame el mensaje de commit propuesto antes de commitear, el link de la PR, y confirmame cuando esté mergeada a main.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 5 — 🔔 Aviso: lista de médicos + registerPrescription ya en main

**Contexto**: PR 4 ya está mergeada a main.
**Tarea**: no hay código nuevo acá — es un paso explícito de confirmación, no algo para asumir. Verificá contra main que la lista de médicos y `registerPrescription` están efectivamente ahí.
**Devolver**: confirmame explícitamente "lista de médicos y registerPrescription están en main". **Este es el punto que desbloquea la PR 5 (🔀 integración) de Dev-ZK-1** — avisale a tu compañero cuando lo confirmes.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 6 — (Opcional) Conectar el contrato al backend

**Contexto**: puede hacerse en paralelo con el resto, o mientras se espera que Dev-ZK-1 termine su integración — no bloquea ni es bloqueada por nada del Camino B.
**Tarea**: crear el wrapper `contract.service.ts` en el backend, con la función `registrarReceta(...)` que llama a `registerPrescription` desde Node (ver sección 5.5 de CONTEXTO.md).
**Devolver**: mostrame el diff antes de aplicar. Confirmame que compila/tipa correctamente en TypeScript.

**No sigas con el siguiente paso sin que yo lo confirme.**
