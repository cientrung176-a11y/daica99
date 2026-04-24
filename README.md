# ĐẠI CA 99 BẮC NINH

Phần mềm quản lý thiết bị phòng khám — Desktop Online (Electron + React + Node.js + PostgreSQL).

## Yêu cầu

- **Node.js** >= 18
- **PostgreSQL** >= 14 (chạy tại `localhost:5432`)
- **npm** >= 9

## Cài đặt

```bash
# 1. Tạo database PostgreSQL
psql -U postgres -c "CREATE DATABASE daica99;"

# 2. Cài dependencies (từ thư mục gốc)
npm install

# 3. Cài dependencies cho từng app
cd apps/server && npm install && cd ../..
cd apps/desktop && npm install && cd ../..

# 4. Chạy migration + seed
cd apps/server
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

## Tài khoản mặc định

| Tài khoản  | Mật khẩu   | Vai trò        |
| ---------- | ----------- | -------------- |
| `admin`    | `Admin@123` | Quản trị viên  |
| `kythuat`  | `Tech@123`  | Kỹ thuật viên  |
| `xem`      | `View@123`  | Chỉ xem        |

## Chạy dev

```bash
# Terminal 1 — Server
cd apps/server
npm run dev

# Terminal 2 — Desktop (Electron + Vite)
cd apps/desktop
npm run dev
```

- Server: http://localhost:4000
- Desktop Vite: http://localhost:5173

## Build file .exe

```bash
cd apps/desktop
npm run build
```

File cài đặt nằm trong `apps/desktop/release/`.

## Deploy server online

1. Đưa `apps/server` lên VPS
2. Cài PostgreSQL, cập nhật `DATABASE_URL` trong `.env`
3. `npm install && npx prisma migrate deploy && npx prisma db seed`
4. `npm start` (hoặc dùng PM2: `pm2 start dist/index.js --name daica99`)
5. Cập nhật `CLIENT_ORIGIN` trong `.env` cho domain thật
6. Desktop: đổi URL server trong **Cài đặt**

## Cấu trúc

```
apps/
  server/         # Backend (Express + Prisma + Socket.IO)
  desktop/        # Frontend (Electron + React + Vite + Tailwind)
```
