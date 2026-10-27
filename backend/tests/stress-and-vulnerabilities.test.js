// tests/stress-and-vulnerabilities.test.js
const request = require('supertest');
const app = require('../server');

describe('=== KIỂM THỬ KHẮC NGHIỆT: RÀ SOÁT LỖ HỔNG & ĐIỂM YẾU HỆ THỐNG ===', () => {
  let adminToken = '';
  let adminUser = null;
  let normalUserToken = '';
  let normalUser = null;
  let victimDraftId = '';
  let finishedSubmissionId = '';

  beforeAll(async () => {
    // 1. Đăng nhập Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.system@eoffice.vn', password: 'Admin@123' });
    adminToken = adminLogin.body.token;
    adminUser = adminLogin.body.user;

    // 2. Tạo một User thường để test phân quyền chéo (IDOR)
    const email = `attacker.${Date.now()}@eoffice.vn`;
    const createUserRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nguyen Van Hack',
        email,
        password: 'Admin@123',
        department: 'Phòng IT',
        job_title: 'Attacker',
        is_admin: false
      });

    normalUser = createUserRes.body.data || createUserRes.body;
    
    // Login User thường
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Admin@123' });
    normalUserToken = userLogin.body.token;
  });

  // --------------------------------------------------------------------------
  // LỖ HỔNG 1: IDOR & BẢO MẬT DỮ LIỆU CHÉO (HORIZONTAL PRIVILEGE ESCALATION)
  // --------------------------------------------------------------------------
  describe('Lỗ hổng 1: Kiểm soát sở hữu tài nguyên (IDOR)', () => {
    test('SETUP: Admin tạo một tờ trình nháp (DRAFT)', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Bản nháp cơ mật của Admin',
          content: 'Kế hoạch tái cấu trúc bí mật',
          category: 'Kỹ thuật - CNTT',
          status: 'DRAFT',
          steps: [{ approver_id: adminUser.id, step_role: 'APPROVER' }]
        });

      expect(res.statusCode).toBe(201);
      victimDraftId = typeof res.body.submission_id === 'object' 
        ? res.body.submission_id.submission_id 
        : res.body.submission_id;
    });

    test('PEN_TEST_01: User thường KHÔNG ĐƯỢC PHÉP xóa bản nháp của Admin', async () => {
      const res = await request(app)
        .delete(`/api/submissions/${victimDraftId}`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      // Nếu hệ thống trả về 200 -> LỖ HỔNG NGHIÊM TRỌNG (Ai cũng xóa được bài của người khác)
      // Hệ thống chuẩn phải trả về 403 Forbidden hoặc 404
      expect(res.statusCode).toBe(403);
    });

    test('PEN_TEST_02: User thường KHÔNG ĐƯỢC PHÉP publish bản nháp của Admin', async () => {
      const res = await request(app)
        .post(`/api/submissions/${victimDraftId}/publish`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      // Phải chặn không cho người khác publish hộ
      expect(res.statusCode).toBe(403);
    });
  });

  // --------------------------------------------------------------------------
  // LỖ HỔNG 2: DUYỆT ĐỒNG THỜI & TRANH CHẤP DỮ LIỆU (RACE CONDITIONS)
  // --------------------------------------------------------------------------
  describe('Lỗ hổng 2: Tranh chấp dữ liệu khi click đúp (Race Condition)', () => {
    let raceSubId = '';

    test('SETUP: Tạo tờ trình cần duyệt', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Tờ trình test Race Condition',
          content: 'Test bấm duyệt nhiều lần cùng lúc',
          category: 'Đề xuất mua sắm',
          status: 'IN_PROGRESS',
          steps: [{ approver_id: adminUser.id, step_role: 'APPROVER' }]
        });
      raceSubId = typeof res.body.submission_id === 'object' 
        ? res.body.submission_id.submission_id 
        : res.body.submission_id;
    });

    test('PEN_TEST_03: Gửi đồng thời 5 request APPROVE cùng một mili-giây', async () => {
      // Giả lập người dùng bấm nút liên tục hoặc mạng chập chờn gửi 5 request song song
      const requests = Array.from({ length: 5 }).map(() =>
        request(app)
          .post(`/api/submissions/${raceSubId}/action`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ action: 'APPROVE', comment: 'Duyệt song song' })
      );

      const responses = await Promise.all(requests);

      // Phân tích kết quả: Chỉ DUY NHẤT 1 request được thành công (200)
      // 4 request còn lại phải bị từ chối (400 hoặc 409 Conflict) vì hồ sơ đã xong
      const successCount = responses.filter(r => r.statusCode === 200).length;
      
      // NẾU CẢ 5 CÙNG TRẢ VỀ 200 -> Hệ thống chưa khóa dòng (Locking) triệt để!
      expect(successCount).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // LỖ HỔNG 3: TRẠNG THÁI ZOMBIE (THAO TÁC TRÊN HỒ SƠ ĐÃ ĐÓNG)
  // --------------------------------------------------------------------------
  describe('Lỗ hổng 3: Thao tác trên hồ sơ đã đóng (Zombie Action)', () => {
    test('SETUP: Tạo và hoàn tất hồ sơ', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Hồ sơ kết thúc',
          content: 'Hồ sơ này sẽ bị từ chối ngay lập tức',
          category: 'Kỹ thuật - CNTT',
          status: 'IN_PROGRESS',
          steps: [{ approver_id: adminUser.id, step_role: 'APPROVER' }]
        });
      finishedSubmissionId = typeof res.body.submission_id === 'object' 
        ? res.body.submission_id.submission_id 
        : res.body.submission_id;

      // Từ chối hồ sơ
      await request(app)
        .post(`/api/submissions/${finishedSubmissionId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'REJECT', comment: 'Từ chối dứt khoát' });
    });

    test('PEN_TEST_04: Hồ sơ đã REJECTED thì không được phép gửi hành động duyệt APPROVE nữa', async () => {
      const res = await request(app)
        .post(`/api/submissions/${finishedSubmissionId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'APPROVE', comment: 'Cố tình duyệt hồ sơ đã chết' });

      // Phải trả về lỗi 400 Bad Request
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/không thể|kết thúc|trạng thái/i);
    });
  });

  // --------------------------------------------------------------------------
  // LỖ HỔNG 4: GIỚI HẠN BIÊN CỦA CƠ SỞ DỮ LIỆU (DATABASE OVERFLOW & XSS)
  // --------------------------------------------------------------------------
  describe('Lỗ hổng 4: Kiểm soát độ dài trường và Injection', () => {
    test('PEN_TEST_05: Tiêu đề vượt quá độ dài NVARCHAR(255) phải bị chặn ở Validator (Không làm crash DB)', async () => {
      const hugeTitle = 'A'.repeat(500); // 500 ký tự
      const res = await request(app)
        .post('/api/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: hugeTitle,
          content: 'Nội dung kiểm tra tràn bộ đệm',
          category: 'Kỹ thuật - CNTT',
          steps: [{ approver_id: adminUser.id, step_role: 'APPROVER' }]
        });

      // Nếu trả về 500: Nghĩa là Database bị lỗi crash chuỗi "String or binary data would be truncated"
      // Hệ thống chuẩn phải chặn bằng Validator ở Service/Controller và trả về 400
      expect(res.statusCode).toBe(400);
    });
  });
});