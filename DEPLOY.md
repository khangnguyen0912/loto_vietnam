# Hướng dẫn Deploy Lô tô Online

## 1. Deploy Server (Backend) lên Render.com (Miễn phí)

1.  **Đẩy code lên GitHub**:
    - Tạo repo mới trên GitHub.
    - Push toàn bộ code lên (bao gồm folder `server` và `client`).

2.  **Tạo Web Service trên Render**:
    - Vào [dashboard.render.com](https://dashboard.render.com) -> New -> Web Service.
    - Kết nối với repo GitHub vừa tạo.

3.  **Cấu hình**:
    - **Name**: `loto-server` (tùy ý).
    - **Region**: Singapore (cho gần VN).
    - **Root Directory**: `server` (Quan trọng: trỏ vào folder server).
    - **Environment**: Node.js.
    - **Build Command**: `npm install`.
    - **Start Command**: `node index.js`.
    - **Environment Variables** (Add Environment Variable):
        - `PORT`: `3000` (hoặc để Render tự cấp).
        - `CORS_ORIGIN`: `*` (để cho phép client connect).

4.  **Lấy URL Server**:
    - Sau khi deploy xong, copy URL (ví dụ: `https://loto-server.onrender.com`).

---

## 2. Deploy Client (Frontend) lên Vercel (Miễn phí)

1.  **Vào Vercel**:
    - [vercel.com](https://vercel.com) -> Add New -> Project.
    - Import repo GitHub của bạn.

2.  **Cấu hình**:
    - **Framework Preset**: Vite.
    - **Root Directory**: `client` (Edit -> chọn folder `client`).
    - **Build Command**: `npm run build`.
    - **Output Directory**: `dist`.

3.  **Sửa code kết nối Server**:
    - Trước khi deploy, cần sửa cứng URL server trong `client/src/App.jsx`.
    - Tìm dòng: `const socket = io('http://localhost:3000', ...)`
    - Đổi thành URL server Render: `const socket = io('https://loto-server.onrender.com', ...)`
    - *(Cách tốt hơn: Dùng biến môi trường `VITE_API_URL`)*.

4.  **Deploy**: Click Deploy.

## 3. Lưu ý quan trọng
- Server Render bản free sẽ "ngủ" sau 15 phút không dùng. Lần đầu vào lại sẽ mất khoảng 30-60s để khởi động lại.
- Web Speech API (giọng đọc) hoạt động tốt trên Chrome/Safari/Edge. Trên mobile có thể cần user tương tác (chạm màn hình) lần đầu mới đọc được.
