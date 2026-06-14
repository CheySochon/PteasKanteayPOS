## Front-end (Next.js + TypeScript)

npx create-next-app@latest web --src-dir --yes

## Back-end (Express.js + TypeScript)

mkdir api
cd api
npm init -y
npm install express
npm install --save-dev typescript tsx @types/node @types/express
npx tsc --init

## Database (Prisma ORM + PostgreSQL) in Express.js app

cd api
npm install prisma @types/pg --save-dev
npm install @prisma/client @prisma/adapter-pg pg dotenv
npx prisma
npx prisma init --datasource-provider postgresql --output ../src/generated/prisma
npx prisma migrate dev --name init
npx prisma generate

## Auth

cd api
npm install bcrypt jsonwebtoken cookie-parser
npm install -D @types/bcrypt @types/jsonwebtoken @types/cookie-parser

## Prettier + ESLint

cd api
npm install -D prettier eslint @eslint/js typescript-eslint eslint-plugin-n eslint-config-prettier

## Clean dist

cd api
npm install -D rimraf

## Core security + Observability middlewares

cd api
npm install cors helmet morgan express-rate-limit
npm install -D @types/cors @types/morgan

## Validations

cd api
npm install zod

## Tests

cd api
npm install -D vitest @vitest/coverage-v8 supertest
npm install -D @types/supertest

## WebSocket (Socket.IO)

cd api
npm install socket.io

cd web
npm install socket.io-client

## Charts

cd web
npm install chart.js react-chartjs-2

## Icons

cd web
npm install lucide-react
