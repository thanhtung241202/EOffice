# EOffice – Hệ thống quản lý và phê duyệt tờ trình điện tử

## 1. Giới thiệu

EOffice là hệ thống hỗ trợ quản lý, luân chuyển và phê duyệt tờ trình điện tử trong tổ chức. Hệ thống cho phép người dùng tạo tờ trình, theo dõi trạng thái xử lý, thực hiện các bước xét duyệt và nhận thông báo về quá trình xử lý hồ sơ.

Dự án được xây dựng theo mô hình Frontend – Backend, sử dụng React cho giao diện người dùng, Node.js và Express để xây dựng API, SQL Server để lưu trữ dữ liệu.

### Mục tiêu

- Số hóa quy trình tạo và phê duyệt tờ trình.
- Quản lý người dùng và phân quyền theo vai trò.
- Hỗ trợ luân chuyển tờ trình qua các bước xét duyệt.
- Theo dõi trạng thái và lịch sử xử lý tờ trình.
- Quản lý người được xem tờ trình và các thông tin liên quan.
- Hỗ trợ quản trị tài khoản và cơ cấu tổ chức.

## 2. Công nghệ sử dụng

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- Fetch API hoặc thư viện gọi API theo cấu hình thực tế của dự án.

### Backend

- Node.js
- Express.js
- JSON Web Token (JWT)
- bcryptjs
- mssql

### Database

- Microsoft SQL Server
- T-SQL

### Công cụ phát triển

- Visual Studio Code
- SQL Server Management Studio (SSMS)
- Git và GitHub

## 3. Cấu trúc dự án

Cấu trúc tổng quát của dự án:

```text
EOffice/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   │   └── user.model.js
│   ├── routes/
│   ├── services/
│   │   └── auth.service.js
│   ├── tests/
│   │   └── nonFunctional.test.js
│   ├── scripts/
│   │   └── createAdmin.js
│   ├── .env
│   ├── package.json
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── database.sql
└── README.md
```

> Cấu trúc trên mang tính tham khảo. Tên thư mục hoặc file có thể khác tùy theo phiên bản hiện tại của dự án.

## 4. Yêu cầu hệ thống

Trước khi cài đặt, cần chuẩn bị:

- Node.js và npm.
- Microsoft SQL Server.
- SQL Server Management Studio (SSMS) để quản lý database.
- Visual Studio Code hoặc trình soạn thảo mã nguồn tương đương.
- Git nếu cần quản lý phiên bản bằng GitHub.

Đảm bảo SQL Server đang hoạt động và có thể kết nối đến instance được cấu hình trong Backend.

## 5. Cài đặt cơ sở dữ liệu

### Bước 1. Tạo database

Mở SQL Server Management Studio và kết nối đến SQL Server instance đang sử dụng.

Tạo database có tên:

```sql
CREATE DATABASE EOffice;
GO
```

Nếu database `EOffice` đã tồn tại, không cần tạo lại.

### Bước 2. Chạy file database.sql

Mở file `database.sql` trong SSMS.

Kiểm tra câu lệnh:

```sql
USE EOffice;
GO
```

Chọn đúng database `EOffice`, sau đó thực thi toàn bộ script để tạo các bảng, ràng buộc và chỉ mục cần thiết.

Các bảng chính trong cấu trúc database gồm:

- `users`: thông tin người dùng, tài khoản và quyền quản trị.
- `submissions`: thông tin tờ trình.
- `approval_steps`: các bước xét duyệt.
- `submission_comments`: nội dung trao đổi, nhận xét liên quan đến tờ trình.
- `attachments`: thông tin tệp đính kèm.
- `submission_viewers`: thông tin người được chia sẻ quyền xem tờ trình.

Tên và cấu trúc chi tiết cần đối chiếu với file `database.sql` hiện tại.

**Lưu ý quan trọng:** Script khởi tạo database có thể chứa các lệnh xóa và tạo lại bảng. Không chạy lại script trên database đang có dữ liệu quan trọng nếu chưa sao lưu và kiểm tra các lệnh `DROP TABLE`.

### Bước 3. Kiểm tra database

Có thể kiểm tra danh sách bảng bằng câu lệnh:

```sql
USE EOffice;
GO

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

Đảm bảo các bảng cần thiết đã được tạo thành công trước khi khởi chạy Backend.

## 6. Cấu hình Backend

### Bước 1. Cài đặt thư viện

Mở Terminal trong Visual Studio Code:

```powershell
cd D:\EOffice\backend
npm install
```

### Bước 2. Cấu hình biến môi trường

Tạo file `.env` trong thư mục `backend` nếu chưa có.

Ví dụ cấu hình:

```env
DB_USER=sa
DB_PASSWORD=YOUR_SQL_SERVER_PASSWORD
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h
```

Thay `YOUR_SQL_SERVER_PASSWORD` bằng mật khẩu SQL Server thực tế và `YOUR_LONG_RANDOM_SECRET` bằng một chuỗi bí mật đủ mạnh.

Không sử dụng nguyên văn các giá trị mẫu ở trên.

Trong file `backend/config/db.js`, cấu hình hiện tại sử dụng:

- Server: `ADMIN-PC`
- Instance: `SQLEXPRESS`
- Database: `EOffice`
- Cổng kết nối: theo cấu hình SQL Server hiện tại.

Nếu tên máy hoặc instance trên máy triển khai khác với cấu hình hiện tại, cần cập nhật `db.js` cho phù hợp.

**Lưu ý:** Cấu hình `user` và `password` trong `db.js` hiện sử dụng tài khoản SQL Server, mặc định `sa` nếu chưa có `DB_USER`. Hãy bảo đảm thông tin xác thực khớp với chế độ đăng nhập đang bật trên SQL Server.

### Bước 3. Khởi chạy Backend

Kiểm tra các script được khai báo trong `backend/package.json`:

```powershell
npm run
```

Sau đó chạy script khởi động phù hợp với dự án, ví dụ:

```powershell
npm run dev
```

Nếu dự án không khai báo script `dev`, sử dụng script đã được định nghĩa trong `package.json`.

Khi kết nối thành công, Backend sẽ hiển thị thông báo tương tự:

```text
[Database] Đã kết nối thành công vào EOffice
```

Giữ Terminal Backend hoạt động trong khi sử dụng ứng dụng.

## 7. Tạo tài khoản Admin ban đầu

Nếu database chưa có tài khoản quản trị, có thể tạo tài khoản Admin bằng script riêng.

### Bước 1. Chuẩn bị script

Đặt file tạo tài khoản tại:

```text
backend/scripts/createAdmin.js
```

Script cần sử dụng kết nối database hiện tại và băm mật khẩu bằng `bcryptjs` trước khi lưu vào SQL Server.

### Bước 2. Chạy script

Từ thư mục Backend:

```powershell
node scripts/createAdmin.js
```

Sử dụng email và mật khẩu đã cấu hình trong script.

### Bước 3. Kiểm tra tài khoản

Trong SSMS, chạy:

```sql
SELECT
    id,
    name,
    email,
    is_admin,
    is_active,
    deleted_at,
    failed_attempts
FROM dbo.users
WHERE email = N'admin@eoffice.vn';
```

Thay `admin@eoffice.vn` bằng email thực tế đã sử dụng.

Đối với tài khoản Admin có thể đăng nhập, các điều kiện cơ bản gồm:

- `is_admin = 1`
- `is_active = 1`
- `deleted_at IS NULL`
- Mật khẩu được lưu dưới dạng bcrypt hash hợp lệ.

Không lưu mật khẩu dạng văn bản thuần trong database. Không đưa mật khẩu thật hoặc file `.env` lên GitHub.

## 8. Cài đặt và chạy Frontend

Mở Terminal thứ hai trong Visual Studio Code:

```powershell
cd D:\EOffice\frontend
npm install
```

Khởi chạy ứng dụng:

```powershell
npm run dev
```

Với cấu hình Vite hiện tại, giao diện có thể được truy cập tại:

```text
http://localhost:5173
```

Nếu Vite hiển thị địa chỉ khác trong Terminal, hãy truy cập địa chỉ được cung cấp.

Đảm bảo Frontend gọi đúng địa chỉ API của Backend. Nếu dự án sử dụng API tại `http://localhost:5000/api`, cần kiểm tra cấu hình API trong mã nguồn Frontend để bảo đảm khớp với cổng Backend thực tế.

## 9. Các chức năng chính

### 9.1. Xác thực và tài khoản

- Đăng nhập bằng email và mật khẩu.
- Xác thực mật khẩu bằng bcrypt.
- Phát hành JWT khi đăng nhập thành công.
- Kiểm tra trạng thái hoạt động của tài khoản.
- Khóa tài khoản khi nhập sai mật khẩu đủ số lần quy định.
- Đặt lại số lần đăng nhập sai khi đăng nhập thành công.

### 9.2. Quản lý người dùng

- Xem danh sách người dùng.
- Tìm kiếm theo thông tin người dùng.
- Lọc theo phòng ban và trạng thái.
- Cập nhật thông tin người dùng.
- Phân quyền quản trị.
- Khóa, mở khóa, xóa mềm và khôi phục tài khoản.
- Cấp lại mật khẩu cho người dùng.

### 9.3. Quản lý tờ trình

- Tạo và theo dõi tờ trình.
- Quản lý các bước phê duyệt.
- Lưu thông tin trao đổi, nhận xét.
- Quản lý tệp đính kèm.
- Chia sẻ quyền xem tờ trình.
- Theo dõi trạng thái xử lý.

### 9.4. Thông báo

Hệ thống có thể sử dụng các loại thông báo tương ứng với sự kiện trong quy trình, chẳng hạn:

- `ASSIGNED`: được giao xử lý.
- `APPROVED`: được phê duyệt.
- `RETURNED`: được trả lại để bổ sung hoặc chỉnh sửa.
- `REJECTED`: bị từ chối.
- `SHARED`: được chia sẻ quyền xem.

Cách hiển thị, lưu trữ và phân phối thông báo phụ thuộc vào phần triển khai thực tế của dự án.

## 10. Kiểm thử

### 10.1. Kiểm tra kết nối database

Khởi động Backend và xác nhận không có lỗi kết nối SQL Server.

Nếu kết nối thất bại, kiểm tra:

- SQL Server service và instance `SQLEXPRESS`.
- Tên server và database.
- Tài khoản, mật khẩu kết nối.
- Cấu hình TCP/IP hoặc cổng kết nối nếu cần.
- File `.env` và `backend/config/db.js`.

### 10.2. Kiểm tra đăng nhập

Thực hiện các trường hợp:

- Đăng nhập với tài khoản và mật khẩu đúng.
- Đăng nhập với mật khẩu sai.
- Đăng nhập bằng tài khoản bị khóa.
- Đăng nhập bằng tài khoản đã xóa mềm.
- Kiểm tra JWT được trả về khi đăng nhập thành công.
- Kiểm tra quyền Admin và quyền người dùng thông thường.

### 10.3. Kiểm tra quản lý người dùng

Kiểm tra các chức năng tìm kiếm, lọc, cập nhật thông tin, khóa/mở khóa, xóa mềm, khôi phục và cấp lại mật khẩu.

### 10.4. Kiểm thử phi chức năng

Dự án có file kiểm thử:

```text
backend/tests/nonFunctional.test.js
```

Có thể chạy riêng file này bằng lệnh:

```powershell
cd D:\EOffice\backend
npx jest tests/nonFunctional.test.js --runInBand
```

Lệnh trên áp dụng nếu dự án đang sử dụng Jest và đã cài đặt các thư viện cần thiết. Nếu dự án sử dụng framework kiểm thử khác hoặc cấu hình riêng, hãy kiểm tra `package.json` để sử dụng lệnh tương ứng.

## 11. Xử lý lỗi thường gặp

### Lỗi kết nối SQL Server

Kiểm tra tên server, instance, thông tin xác thực, trạng thái SQL Server và cấu hình TCP/IP.

### Lỗi đăng nhập không thành công

Kiểm tra email, mật khẩu, `password_hash`, `is_active`, `deleted_at` và `failed_attempts`.

### Không thấy giao diện quản trị

Kiểm tra `is_admin` trong database, thông tin quyền trong JWT, middleware xác thực và logic phân quyền của Frontend.

### Frontend không gọi được API

Kiểm tra Backend có đang chạy không, địa chỉ API, cổng kết nối và cấu hình CORS nếu có.

### Không chạy được lệnh kiểm thử

Kiểm tra script trong `package.json`, thư viện kiểm thử đã cài đặt và đường dẫn file test.

## 12. Bảo mật và lưu ý triển khai

- Không lưu mật khẩu dưới dạng văn bản thuần.
- Không chia sẻ JWT secret hoặc thông tin kết nối database.
- Không đưa file `.env` lên GitHub.
- Không sử dụng mật khẩu mẫu trong môi trường thật.
- Không chạy script xóa và tạo lại bảng trên database đang sử dụng mà chưa sao lưu.
- Hạn chế sử dụng tài khoản SQL Server `sa` cho môi trường triển khai; ưu tiên tài khoản có quyền tối thiểu cần thiết.
- Kiểm tra quyền truy cập API ở Backend, không chỉ dựa vào việc ẩn nút hoặc trang trên Frontend.
- Sao lưu database trước khi thực hiện các thay đổi lớn.

## 13. Tác giả và thông tin dự án

**Tên dự án:** EOffice

**Mục đích:** Xây dựng hệ thống quản lý và phê duyệt tờ trình điện tử.

**Công nghệ chính:** React, Vite, Node.js, Express.js, SQL Server, JWT và bcryptjs.

**Thư mục dự án:** `D:\EOffice`

---

*README này mô tả cấu trúc và cách chạy dự án theo thông tin hiện có. Trước khi sử dụng làm tài liệu bàn giao chính thức, cần đối chiếu các lệnh khởi chạy, API, cấu trúc thư mục và bộ kiểm thử với mã nguồn thực tế.*
