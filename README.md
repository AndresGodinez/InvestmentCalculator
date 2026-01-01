# InvestmentCalculator

[![CI](https://github.com/agodinez/InvestmentCalculator/actions/workflows/ci.yml/badge.svg)](https://github.com/agodinez/InvestmentCalculator/actions/workflows/ci.yml)

Calculadora web para simular **interés compuesto** y estimar el **crecimiento de una inversión** por día/semana/mes.

Incluye un cálculo específico tipo **SOFIPO** donde el capital se divide en dos bloques con diferentes tasas:

- **Bloque A**: hasta un límite (p. ej. 10,000) con una tasa anual.
- **Bloque B**: el excedente del límite con otra tasa anual.

## Funcionalidad

- **Cálculo por bloques (A/B)** con tasas independientes.
- **Proyección** por día, semana y mes.
- **Resumen** con balance final e interés ganado.
- **Pruebas unitarias** (Vitest) para validar el dominio.
- **CI** que valida lint, formato, types y build.

## Stack

- **Vue 3** + **Vite**
- **TypeScript**
- **Vitest** (unit tests)
- **ESLint** + **Prettier**

## Requisitos

- **Node.js**: `v22.15.0` (recomendado)

## Instalación

```sh
npm ci
```

## Uso

### Desarrollo

```sh
npm run dev
```

### Build (producción)

```sh
npm run build
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Levanta el servidor de desarrollo con Vite |
| `npm run build` | Type-check + build de producción |
| `npm run type-check` | Revisa tipos con `vue-tsc` |
| `npm run test:unit` | Ejecuta pruebas unitarias con Vitest |
| `npm run lint` | Ejecuta ESLint (con `--fix` y cache) |
| `npm run format` | Formatea archivos con Prettier (write) |
| `npm run format:check` | Verifica formato con Prettier (check) |

## CI

El workflow de GitHub Actions (`.github/workflows/ci.yml`) corre en cada `push`/`pull_request` a `main` y ejecuta:

- `npm ci`
- `npm run lint`
- `npm run format:check`
- `npm run type-check`
- `npm run test:unit`
- `npm run build`

## Notas

- Los cálculos del dominio redondean a **2 decimales** (estilo “dinero”) para reportar resultados.
