// tests/eoffice.test.js
const request = require('supertest');
const app = require('../server');

describe('=== BỘ KIỂM THỬ TOÀN DIỆN HỆ THỐNG EOFFICE ===', () => {
  let adminToken = '';
  let adminUser = null;
  let testSubmissionId = '';
  let returnSubId = '';
  let sampleUserId = '';

  // --------------------------------------------------------------------------
  // PHẦN 1: XÁC THỰC, PHÂN QUYỀN & BẢO MẬT BIÊN (AUTH & SECURITY)
  // --------------------------------------------------------------------------
  describe('1. Kiểm thử Xác thực & Phân quyền', () => {
    test('AUTH_01: Chặn đăng nhập khi bỏ trống email hoặc mật khẩu', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('AUTH_02: Chặn đăng nhập với email không tồn tại trong hệ thống', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound.user@eoffice.vn',
          password: 'Password123@'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/không chính xác/i);
    });

    test('AUTH_03: Chặn đăng nhập khi nhập sai mật khẩu', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin.system@eoffice.vn',
          password: 'WrongPassword@2026'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/không chính xác/i);
    });

    test('AUTH_04: Đăng nhập thành công với tài khoản Quản trị viên (Admin)', async () => {
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

      adminToken = res.body.token;
      adminUser = res.body.user;
    });

    test('AUTH_05: Chặn truy cập API khi không gửi kèm Authorization Token', async () => {
      const res = await request(app).get('/api/submissions/pending');
      expect(res.statusCode).toBe(401);
    });

    test('AUTH_06: Chặn truy cập khi gửi Token rác hoặc chữ ký bị giả mạo', async () => {
      const res = await request(app)
        .get('/api/submissions/pending')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidtoken');
      expect(res.statusCode).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // PHẦN 2: QUẢN TRỊ NHÂN SỰ & CƠ CẤU TỔ CHỨC
  // --------------------------------------------------------------------------
  describe('2. Kiểm thử Quản trị Người dùng & Cơ cấu Tổ chức', () => {
    test('USER_01: Admin tạo nhân sự mới thành công', async () => {
      const email = `test.staff.${Date.now()}@eoffice.vn`;
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nhân Viên Kiểm Thử',
          email,
          password: 'Admin@123',
          department: 'Phòng IT',
          job_title: 'Tester',
          is_admin: false
        });

      expect([200, 201]).toContain(res.statusCode);
      const created = res.body.data || res.body;
      sampleUserId = created.id;
      expect(sampleUserId).toBeDefined();
    });

    test('USER_02: Lấy danh sách nhân sự có áp dụng bộ lọc', async () => {
      const res = await request(app)
        .get('/api/users?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    test('USER_03: Lấy cơ cấu tổ chức phòng ban (Organization Structure)', async () => {
      const res = await request(app)
        .get('/api/users/organization')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const payload = res.body.data || res.body;
      expect(payload).toHaveProperty('departments');
      expect(payload).toHaveProperty('members');
    });
  });

  // --------------------------------------------------------------------------
  // PHẦN 3: QUY TRÌNH TỜ TRÌNH & PHÊ DUYỆT (WORKFLOW)
  // --------------------------------------------------------------------------
  describe('3. Kiểm thử Luồng Quy trình Tờ trình & Phê duyệt', () => {
    test('SUB_01: Chặn tạo tờ trình khi thiếu tiêu đề hoặc nội dung', async () => {
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

    test('SUB_02: Chặn tạo tờ trình khi danh sách bước duyệt rỗng', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Đề xuất nâng cấp thiết bị',
          content: 'Kính gửi ban giám đốc xem xét.',
          category: 'Kỹ thuật - CNTT',
          steps: []
        });

      expect(res.statusCode).toBe(400);
    });

    test('SUB_03: Tạo thành công tờ trình quy trình phê duyệt', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình mua sắm máy chủ kiểm thử 2026',
          content: 'Đề xuất mua máy chủ chuyên dụng cho kiểm thử tự động.',
          category: 'Đề xuất mua sắm',
          priority: 'URGENT',
          confidentiality: 'NORMAL',
          status: 'IN_PROGRESS',
          steps: [
            { approver_id: adminUser.id, step_role: 'APPROVER' }
          ]
        });

      expect(res.statusCode).toBe(201);
      testSubmissionId = typeof res.body.submission_id === 'object'
        ? res.body.submission_id.submission_id
        : res.body.submission_id;

      expect(testSubmissionId).toBeDefined();
    });

    test('SUB_04: Danh sách Pending chứa tờ trình vừa tạo', async () => {
      const res = await request(app)
        .get('/api/submissions/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const list = Array.isArray(res.body)
        ? res.body
        : (Array.isArray(res.body.data) ? res.body.data : res.body.data?.data) || [];

      const found = list.find(s => String(s.id || s.submission_id).toLowerCase() === String(testSubmissionId).toLowerCase());
      expect(found).toBeDefined();
    });

    test('SUB_05: Lấy thông tin chi tiết tờ trình kèm danh sách bước duyệt', async () => {
      const res = await request(app)
        .get(`/api/submissions/${testSubmissionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('submission');
      expect(res.body).toHaveProperty('approval_steps');
      expect(res.body.submission.id.toLowerCase()).toBe(testSubmissionId.toLowerCase());
      expect(res.body.approval_steps.length).toBeGreaterThan(0);
    });

    test('SUB_06: Phê duyệt (APPROVE) hoàn tất chu trình', async () => {
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
          comment: 'Phê duyệt hoàn tất chu trình.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${testSubmissionId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('APPROVED');
      expect(sub.document_code).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // PHẦN 4: NGOẠI LỆ NGHIỆP VỤ - TRẢ VỀ (RETURN) & NỘP LẠI (RESUBMIT)
  // --------------------------------------------------------------------------
  describe('4. Kiểm thử Ngoại lệ: Trả về (RETURN), Nộp lại (RESUBMIT) & Từ chối (REJECT)', () => {
    test('FLOW_01: Tạo tờ trình thử nghiệm luồng ngoại lệ', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình xin cấp kinh phí tổ chức sự kiện',
          content: 'Dự toán 50.000.000 VNĐ.',
          category: 'Tài chính - Kế toán',
          steps: [{ approver_id: adminUser.id, step_role: 'APPROVER' }]
        });

      expect(res.statusCode).toBe(201);
      returnSubId = typeof res.body.submission_id === 'object'
        ? res.body.submission_id.submission_id
        : res.body.submission_id;
    });

    test('FLOW_02: Chặn Trả về (RETURN) nếu không nhập ý kiến / lý do', async () => {
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

    test('FLOW_03: Trả về thành công khi có đầy đủ lý do', async () => {
      const res = await request(app)
        .post(`/api/submissions/${returnSubId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'RETURN',
          comment: 'Thiếu bảng báo giá chi tiết của nhà cung cấp.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${returnSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('RETURNED');
    });

    test('FLOW_04: Người tạo chỉnh sửa và nộp lại hồ sơ (Resubmit)', async () => {
      const res = await request(app)
        .put(`/api/submissions/${returnSubId}/resubmit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình xin cấp kinh phí (Đã bổ sung báo giá)',
          content: 'Dự toán 50.000.000 VNĐ kèm 3 bản báo giá.',
          category: 'Tài chính - Kế toán',
          priority: 'NORMAL',
          confidentiality: 'NORMAL',
          resubmit_comment: 'Đã bổ sung báo giá chi tiết.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${returnSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('IN_PROGRESS');
    });

    test('FLOW_05: Từ chối hồ sơ (REJECT) dừng toàn bộ tiến trình', async () => {
      const res = await request(app)
        .post(`/api/submissions/${returnSubId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'REJECT',
          comment: 'Không đủ ngân sách quý này.'
        });

      expect(res.statusCode).toBe(200);

      const detailRes = await request(app)
        .get(`/api/submissions/${returnSubId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const sub = detailRes.body.submission || detailRes.body;
      expect(sub.status).toBe('REJECTED');
    });
  });

  // --------------------------------------------------------------------------
  // PHẦN 5: CHIA SẺ & TÌM KIẾM (SHARING & SEARCH)
  // --------------------------------------------------------------------------
  describe('5. Kiểm thử Tính năng Bổ trợ: Chia sẻ & Tìm kiếm', () => {
    test('EXTRA_01: Chặn tự chia sẻ tờ trình cho chính mình', async () => {
      const res = await request(app)
        .post(`/api/submissions/${testSubmissionId}/share`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipient_email: adminUser.email,
          message: 'Tự chia sẻ cho mình'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/chính mình/i);
    });

    test('EXTRA_02: Tìm kiếm tờ trình theo từ khóa hợp lệ', async () => {
      const res = await request(app)
        .get('/api/submissions/search?q=máy chủ')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      const results = res.body.data || res.body;
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // PHẦN 6: VÒNG ĐỜI TÀI KHOẢN (ACCOUNT LIFECYCLE)
  // --------------------------------------------------------------------------
  describe('6. Kiểm thử Vòng đời Tài khoản: Khóa tài khoản & Xóa mềm', () => {
    test('LIFECYCLE_01: Khóa tài khoản nhân sự (toggleActive)', async () => {
      const res = await request(app)
        .patch(`/api/users/${sampleUserId}/toggle-active`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('LIFECYCLE_02: Xóa mềm tài khoản nhân sự (Soft Delete)', async () => {
      const res = await request(app)
        .delete(`/api/users/${sampleUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('LIFECYCLE_03: Khôi phục tài khoản đã xóa mềm (Restore)', async () => {
      const res = await request(app)
        .patch(`/api/users/${sampleUserId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });
});