# tasks/zk/ — Plan de PRs para el contrato Compact

Documentos de planificación para **Dev-ZK-1** y **Dev-ZK-2**, basados en `CONTEXTO.md`. Son solo texto — todavía no hay código de contrato escrito.

- [`dev-zk-1.md`](./dev-zk-1.md) — 8 PRs, Camino B.
- [`dev-zk-2.md`](./dev-zk-2.md) — 6 PRs, Camino A.

## Roles reales (no lo deduzcas del nombre del archivo)

- **Dev-ZK-1** → **Camino B**: nullifier + `validatePrescription`.
- **Dev-ZK-2** → **Camino A**: estructura del contrato + `registerPrescription`.

El nombre del archivo (`dev-zk-1.md` / `dev-zk-2.md`) identifica a la persona, no al camino — no asumir que "1" es "estructura" solo porque va primero en la numeración.

## Cómo usar estos documentos

1. Cada dev abre su propio archivo (`dev-zk-1.md` o `dev-zk-2.md`).
2. Se pega **una PR a la vez** como prompt nuevo a Claude Code — no el archivo entero.
3. Claude Code hace únicamente lo que esa PR pide, y devuelve lo indicado (diff, resultado de compilar, resultado de test, etc.).
4. El dev revisa y confirma (o pide ajustes) antes de pegar la siguiente PR como prompt nuevo.
5. Regla dura: **si el contrato no compila, no se avanza** a la PR siguiente. La descalificación automática del hackathon es por contrato que no compila (ver sección 1 de CONTEXTO.md) — no vale la pena arriesgarlo por avanzar rápido.

## Independencia entre devs

Todos los pasos son independientes entre los dos **excepto el punto de integración**: la PR 5 (🔀) de Dev-ZK-1 depende de que Dev-ZK-2 haya completado su PR 4 (merge a main) y confirmado explícitamente su PR 5 (🔔 aviso).

```
Dev-ZK-2 (Camino A):
  PR1 ──▶ PR2 ──▶ PR3 ──▶ PR4 ──▶ PR5 🔔 ──▶ PR6 (opcional, backend)
 (struct)  (lista   (register-  (merge   (avisa que
            médicos)  Prescrip-  a main)  ya está en
                      tion)               main)
                                    │
                                    │  (única dependencia de todo el plan)
                                    ▼
Dev-ZK-1 (Camino B):
  PR1 ──▶ PR2 ──▶ PR3 ──▶ PR4 ──▶ PR5 🔀 ──▶ PR6 ──▶ PR7 ──▶ PR8
 (investi-  (prototipo (nullifier  (vigencia   (integra    (compila  (test    (commit,
  gación,    aislado,   en el       en el       con main,   contrato  end-to-  push, PR
  sin        lista      prototipo)  prototipo)  reemplaza   integra-  end)     final)
  código)    mockeada)                          mock por    do)
                                                 lista real)
```

- **Dev-ZK-2 PR1-PR4**: autónomo, arranca ya, no depende de nada de Dev-ZK-1.
- **Dev-ZK-2 PR5 (🔔)**: paso explícito de confirmación — no asumir que "ya está en main" sin avisarlo.
- **Dev-ZK-2 PR6**: opcional, en paralelo, no bloquea ni bloquea nada del Camino B.
- **Dev-ZK-1 PR1-PR4**: autónomo, arranca ya en un prototipo aislado con lista de médicos mockeada propia.
- **Dev-ZK-1 PR5 (🔀)**: único bloqueo de todo el plan — espera la confirmación de la PR 4-5 de Dev-ZK-2.
- **Dev-ZK-1 PR6-PR8**: dependen solo de la propia PR 5, no de nada nuevo de Dev-ZK-2.
