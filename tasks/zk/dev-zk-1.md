# Dev-ZK-1 — Camino B: nullifier + validatePrescription

8 PRs progresivas y secuenciales. Trabajás en un prototipo aislado hasta la PR 5, que es la única que depende de que Dev-ZK-2 haya mergeado su parte. No avances a la siguiente PR sin que yo confirme que la anterior está OK.

---

## PR 1 — Investigación del patrón de nullifier (sin código)

**Contexto**: arrancable desde el minuto uno, no depende de nada de Dev-ZK-2.
**Tarea**: investigar (sin escribir código de contrato todavía) el patrón de nullifier en Compact para prevenir doble uso, y cómo verificar pertenencia a una lista fija de médicos — consultá Kapa (MCP) y/o Midnight Expert.
**Devolver**: mostrame un resumen corto (2-3 párrafos) del patrón de nullifier elegido y de cómo pensás verificar la pertenencia a la lista, antes de escribir cualquier código.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 2 — Prototipo aislado de validatePrescription (lista mockeada propia)

**Contexto**: independiente del contrato principal — trabajás en un archivo separado para no pisar el trabajo de Dev-ZK-2.
**Tarea**: crear un archivo de prototipo separado del contrato principal, con un `validatePrescription` de prueba contra una lista de médicos mockeada por vos (2-3 valores inventados). Todavía sin nullifier ni vigencia.
**Devolver**: mostrame el diff antes de aplicar. Compilá el prototipo y confirmame que no hay errores.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 3 — Nullifier funcionando en el prototipo

**Contexto**: el prototipo de PR 2 ya valida contra la lista mockeada.
**Tarea**: sumar al prototipo la lógica de nullifier: calcularlo, verificar si ya existe, rechazar si existe, registrarlo si no existe.
**Devolver**: mostrame el diff antes de aplicar. Compilá y confirmame que no hay errores. Corré un test manual de los dos casos (nullifier nuevo → pasa; nullifier repetido → rechaza) y mostrame el resultado.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 4 — Verificación de vigencia (expiryDate) en el prototipo

**Contexto**: el prototipo ya tiene lista de médicos mockeada + nullifier funcionando (PR 3).
**Tarea**: sumar al prototipo la verificación de `expiryDate` con datos mockeados propios.
**Devolver**: mostrame el diff antes de aplicar. Compilá y confirmame que no hay errores. Corré los 3 casos de prueba (válido, vencido, nullifier repetido) y mostrame el resultado de cada uno.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 5 — 🔀 Integración con el contrato principal

**Contexto**: **esta PR depende de que Dev-ZK-2 haya mergeado a main la lista real de médicos y `registerPrescription` (su PR 4, confirmado explícitamente en su PR 5). No arranques esta PR antes de tener esa confirmación.**
**Tarea**: hacer pull de main, mergearlo a tu rama, mover tu `validatePrescription` ya validado (nullifier + vigencia) del prototipo al contrato principal, y reemplazar la lista de médicos mockeada por la lista real que armó Dev-ZK-2.
**Devolver**: mostrame el diff antes de aplicar.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 6 — Compilar el contrato integrado

**Contexto**: `validatePrescription` ya está movido al contrato principal (PR 5).
**Tarea**: compilar el contrato integrado completo y resolver cualquier conflicto de nombres o tipos que aparezca entre tu código y el de Dev-ZK-2.
**Devolver**: compilá y confirmame que no hay errores. Si hubo conflictos, mostrame qué resolviste y por qué.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 7 — Test end-to-end conjunto

**Contexto**: el contrato integrado ya compila (PR 6).
**Tarea**: escribir un test end-to-end que llame `registerPrescription` → `validatePrescription` (debe pasar) → `validatePrescription` de nuevo con el mismo nullifier (debe fallar).
**Devolver**: corré el test y mostrame el resultado de los tres pasos.

**No sigas con el siguiente paso sin que yo lo confirme.**

---

## PR 8 — Commit, push y PR final del contrato completo

**Contexto**: el test end-to-end ya pasa (PR 7).
**Tarea**: commitear los cambios, pushear la rama y abrir la PR final del contrato completo contra main.
**Devolver**: mostrame el mensaje de commit propuesto antes de commitear, y el link de la PR una vez abierta.

**No sigas con el siguiente paso sin que yo lo confirme.**
