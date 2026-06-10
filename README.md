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
