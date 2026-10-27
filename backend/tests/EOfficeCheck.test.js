// tests/eoffice.test.js
const request = require('supertest');
const app = require('../server');

describe('=== BỘ KIỂM THỬ TOÀN DIỆN HỆ THỐNG EOFFICE (THEO TEST CASES BÁO CÁO) ===', () => {
  let adminToken = '';
  let adminUser = null;
  let sampleUserId = '';
  let testSubmissionId = '';
  let returnSubId = '';

  // ==========================================================================
  // BẢNG 6.1: NHÓM XÁC THỰC & PHÂN QUYỀN (TC_AUTH)
  // ==========================================================================
  describe('Bảng 6.1: Kiểm thử Xác thực & Phân quyền', () => {
    test('TC_AUTH_01: Đăng nhập tài khoản hợp lệ thành công', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.system@eoffice.vn',
          password: 'Admin@123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.is_admin).toBe(true);

      // Lưu lại token và thông tin admin cho các ca kiểm thử sau
      adminToken = res.body.token;
      adminUser = res.body.user;
    });

    test('TC_AUTH_02: Đăng nhập sai mật khẩu', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.system@eoffice.vn',
          password: 'SaiMatKhau@123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/không chính xác/i);
    });

    test('TC_AUTH_03: Bỏ trống email hoặc mật khẩu khi đăng nhập', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: ''
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('TC_AUTH_04: Chặn truy cập API khi không có Authorization Token', async () => {
      const res = await request(app)
        .get('/api/submissions/pending');

      expect(res.statusCode).toBe(401);
    });

    test('TC_AUTH_05: Chặn truy cập khi gửi Token không hợp lệ / giả mạo', async () => {
      const res = await request(app)
        .get('/api/submissions/pending')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidtoken');

      expect(res.statusCode).toBe(403);
    });

    test('TC_AUTH_06: Kiểm tra tính hợp lệ của cấu trúc trả về cho phiên Web', async () => {
      // Giả lập request từ giao diện Web xác thực thông tin tài khoản
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.system@eoffice.vn',
          password: 'Admin@123'
        });

      expect(res.statusCode).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(20);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email');
    });
  });

  // ==========================================================================
  // BẢNG 6.2: NHÓM QUY TRÌNH LUỒNG PHÊ DUYỆT (TC_SUB & TC_FLOW)
  // ==========================================================================
  describe('Bảng 6.2: Kiểm thử Luồng Quy trình Phê duyệt Tờ trình', () => {
    test('TC_SUB_01: Chặn tạo tờ trình khi thiếu thông tin bắt buộc', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          content: '',
          category: 'Kỹ thuật - CNTT'
        });

      expect(res.statusCode).toBe(400);
    });

    test('TC_SUB_02: Tạo tờ trình bằng API kèm phân bổ luồng duyệt', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình kiểm thử tự động quy trình phê duyệt',
          content: 'Nội dung kiểm thử tự động lưu lượng phê duyệt và cấp mã văn bản.',
          category: 'Đề xuất mua sắm',
          priority: 'NORMAL',
          confidentiality: 'NORMAL',
          status: 'IN_PROGRESS',
          steps: [
            {
              approver_id: adminUser.id,
              step_role: 'APPROVER'
            }
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('submission_id');

      testSubmissionId = typeof res.body.submission_id === 'object'
        ? res.body.submission_id.submission_id
        : res.body.submission_id;

      expect(testSubmissionId).toBeDefined();
    });

    test('TC_SUB_03: Kiểm tra danh sách việc cần xử lý (Pending List) chứa tờ trình mới', async () => {
      const res = await request(app)
        .get('/api/submissions/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const tasks = Array.isArray(res.body)
        ? res.body
        : (Array.isArray(res.body?.data) ? res.body.data : res.body?.data?.data) || [];

      expect(Array.isArray(tasks)).toBe(true);

      const found = tasks.find(item =>
        String(item.id || item.submission_id).toLowerCase() === String(testSubmissionId).toLowerCase()
      );
      expect(found).toBeDefined();
    });

    test('TC_SUB_04: Lấy thông tin chi tiết tờ trình kèm danh sách bước duyệt', async () => {
      const res = await request(app)
        .get(`/api/submissions/${testSubmissionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('submission');
      expect(res.body).toHaveProperty('approval_steps');
      expect(res.body.submission.id.toLowerCase()).toBe(testSubmissionId.toLowerCase());
      expect(res.body.approval_steps.length).toBeGreaterThan(0);
    });

    test('TC_SUB_05: Ký duyệt hoàn tất chu trình và cấp mã số hiệu (APPROVE)', async () => {
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
          comment: 'Phê duyệt hoàn tất hồ sơ qua bộ kiểm thử tự động.'
        });

      expect(res.statusCode).toBe(200);

      // Xác minh trạng thái và mã văn bản trong DB
      const detailRes = await request(app)
        .get(`/api/submissions/${testSubmissionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('APPROVED');
      expect(sub.document_code).toBeDefined();
    });

    test('TC_SUB_06: Thiết lập tờ trình mẫu để kiểm thử luồng ngoại lệ (RETURN/RESUBMIT/REJECT)', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình kiểm thử luồng trả về và nộp lại',
          content: 'Nội dung tờ trình chờ duyệt để xử lý ngoại lệ.',
          category: 'Tài chính - Kế toán',
          status: 'IN_PROGRESS',
          steps: [
            {
              approver_id: adminUser.id,
              step_role: 'APPROVER'
            }
          ]
        });

      expect(res.statusCode).toBe(201);
      returnSubId = typeof res.body.submission_id === 'object'
        ? res.body.submission_id.submission_id
        : res.body.submission_id;

      expect(returnSubId).toBeDefined();
    });

    test('TC_SUB_07: Chặn hành động Trả về (RETURN) nếu không nhập lý do', async () => {
      const res = await request(app)
        .post(`/api/submissions/${returnSubId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'RETURN',
          comment: ''
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/bắt buộc|lý do/i);
    });

    test('TC_SUB_08: Trả về thành công khi có đầy đủ lý do (Chuyển sang RETURNED)', async () => {
      const res = await request(app)
        .post(`/api/submissions/${returnSubId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'RETURN',
          comment: 'Yêu cầu làm rõ dự toán chi tiết các hạng mục.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${returnSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('RETURNED');
    });

    test('TC_SUB_09: Người tạo chỉnh sửa và nộp lại hồ sơ thành công (Resubmit)', async () => {
      const res = await request(app)
        .put(`/api/submissions/${returnSubId}/resubmit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình kiểm thử luồng trả về (Đã giải trình và cập nhật)',
          content: 'Nội dung bổ sung chi tiết dự toán chi phí.',
          category: 'Tài chính - Kế toán',
          priority: 'NORMAL',
          confidentiality: 'NORMAL',
          resubmit_comment: 'Đã cập nhật bảng giải trình theo yêu cầu của người duyệt.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${returnSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('IN_PROGRESS');
    });

    test('TC_SUB_10: Từ chối hồ sơ (REJECT) - Dừng toàn bộ tiến trình', async () => {
      const res = await request(app)
        .post(`/api/submissions/${returnSubId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'REJECT',
          comment: 'Ngân sách không phê duyệt hạng mục này.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${returnSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('REJECTED');
    });
  });

  // ==========================================================================
  // BẢNG 6.3: NHÓM QUẢN TRỊ & TÍNH NĂNG BỔ TRỢ (TC_ADMIN & TC_EXTRA)
  // ==========================================================================
  describe('Bảng 6.3: Kiểm thử Quản trị & Tính năng Bổ trợ', () => {
    test('TC_ADMIN_01: Lấy danh sách nhân sự có bộ lọc thành công', async () => {
      const res = await request(app)
        .get('/api/users?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    test('TC_ADMIN_02: Tạo mới một nhân sự mẫu phục vụ kiểm thử vòng đời tài khoản', async () => {
      const email = `nhanvien.test.${Date.now()}@eoffice.vn`;
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nhân Viên Kiểm Thử Lifecycle',
          email,
          department: 'Phòng Hành chính',
          job_title: 'Chuyên viên',
          is_admin: false
        });

      expect([200, 201]).toContain(res.statusCode);
      const created = res.body.data || res.body;
      sampleUserId = created.id;
      expect(sampleUserId).toBeDefined();
    });

    test('TC_ADMIN_03: Khóa tài khoản nhân viên (toggleActive -> inactive)', async () => {
      const res = await request(app)
        .patch(`/api/users/${sampleUserId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('TC_ADMIN_04: Xóa mềm tài khoản nhân viên (Soft Delete)', async () => {
      const res = await request(app)
        .delete(`/api/users/${sampleUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('TC_ADMIN_05: Khôi phục lại tài khoản đã xóa mềm (Restore)', async () => {
      const res = await request(app)
        .patch(`/api/users/${sampleUserId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('TC_EXTRA_01: Chặn tự chia sẻ tờ trình cho chính mình', async () => {
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/share`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_email: adminUser.email,
          message: 'Tự chia sẻ văn bản cho bản thân'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/chính mình/i);
    });

    test('TC_EXTRA_02: Tìm kiếm tờ trình theo từ khóa hợp lệ', async () => {
      const res = await request(app)
        .get('/api/submissions/search?q=quy trình')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const results = res.body.data || res.body;
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});