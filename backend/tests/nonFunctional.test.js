// backend/tests/nonFunctional.test.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { poolPromise, sql } = require('../config/db');
const app = require('../server');

const API_URL = app;

describe('KIỂM THỬ PHI CHỨC NĂNG HỆ THỐNG EOFFICE (AUTOMATED TESTING)', () => {
  const testAccount = {
    email: 'admin.system@eoffice.vn',
    correctPass: 'Admin@123',
    wrongPass: 'SaiMatKhau@999'
  };

  let pool;
  let testUserId;
  let authToken = '';

  beforeAll(async () => {
    pool = await poolPromise;
    const res = await pool
      .request()
      .input('email', sql.VarChar(255), testAccount.email)
      .query('SELECT id, is_active FROM users WHERE email = @email');
    if (res.recordset.length > 0) {
      testUserId = res.recordset[0].id;
    }
  });

  afterEach(async () => {
    // Đảm bảo tài khoản luôn được kích hoạt lại sau mỗi test case
    if (testUserId && pool) {
      await pool
        .request()
        .input('id', sql.UniqueIdentifier, testUserId)
        .query('UPDATE users SET is_active = 1 WHERE id = @id');
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.close();
    }
  });

  // TC_NFR_04: Bảo mật lưu trữ mật khẩu
  test('TC_NFR_04 [Bảo mật]: Mật khẩu người dùng phải được mã hóa chuẩn bcrypt một chiều', async () => {
    const result = await pool
      .request()
      .input('email', sql.VarChar(255), testAccount.email)
      .query('SELECT password_hash FROM users WHERE email = @email');

    expect(result.recordset.length).toBeGreaterThan(0);
    const hash = result.recordset[0].password_hash;
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);

    const isMatch = await bcrypt.compare(testAccount.correctPass, hash);
    expect(isMatch).toBe(true);
  });

  // TC_NFR_01: Hiệu năng API Đăng nhập
  test('TC_NFR_01 [Hiệu năng]: Thời gian phản hồi API Đăng nhập phải dưới 2 giây', async () => {
    const startTime = Date.now();
    const res = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: testAccount.email,
        password: testAccount.correctPass
      });
    const duration = Date.now() - startTime;

    console.log(`\n    ⏱️ Thời gian phản hồi API Login: ${duration}ms`);
    expect([200, 201]).toContain(res.statusCode);
    expect(duration).toBeLessThan(2000);

    // Lưu lại token dùng cho các test case cần xác thực
    authToken = res.body?.token || res.body?.data?.token || '';
  });

  // TC_NFR_02: Hiệu năng tải danh sách tờ trình
  test('TC_NFR_02 [Hiệu năng]: Thời gian tải danh sách tờ trình phải dưới 1 giây', async () => {
    const startTime = Date.now();
    const req = request(API_URL).get('/api/submissions/pending');

    if (authToken) {
      req.set('Authorization', `Bearer ${authToken}`);
    }
    req.set('x-user-id', testUserId || 'C52C6B21-FC39-4333-8434-9ED18FD89147');

    const res = await req;
    const duration = Date.now() - startTime;

    console.log(`\n    ⏱️ Thời gian phản hồi danh sách tờ trình: ${duration}ms`);
    expect([200, 304]).toContain(res.statusCode);
    expect(duration).toBeLessThan(1000);
  });

  // TC_NFR_03: Bảo mật chống Brute-force & Khóa tài khoản
  test('TC_NFR_03 [Bảo mật]: Tự động khóa tài khoản khi nhập sai mật khẩu 3 lần liên tiếp', async () => {
    // Lần 1: Sai mật khẩu -> 401
    const res1 = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: testAccount.email, password: testAccount.wrongPass });
    expect(res1.statusCode).toBe(401);

    // Lần 2: Sai mật khẩu -> 401
    const res2 = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: testAccount.email, password: testAccount.wrongPass });
    expect(res2.statusCode).toBe(401);

    // Lần 3: Sai mật khẩu -> Hệ thống khóa tài khoản (trả về 401 hoặc 403 Forbidden)
    const res3 = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: testAccount.email, password: testAccount.wrongPass });
    expect([401, 403]).toContain(res3.statusCode);

    // Kiểm tra trực tiếp trong CSDL xem is_active đã thành 0 chưa
    const userCheck = await pool
      .request()
      .input('id', sql.UniqueIdentifier, testUserId)
      .query('SELECT is_active FROM users WHERE id = @id');

    const isLockedInDb = userCheck.recordset[0]?.is_active === false || userCheck.recordset[0]?.is_active === 0;

    // Lần 4: Thử đăng nhập lại bằng mật khẩu ĐÚNG -> Bị từ chối vì tài khoản đã bị khóa
    const res4 = await request(API_URL)
      .post('/api/auth/login')
      .send({ email: testAccount.email, password: testAccount.correctPass });

    const message = (res4.body?.error || res4.body?.message || '').toLowerCase();
    const isLockedResponse = res4.statusCode === 403 || message.includes('khóa') || message.includes('inactive');

    expect(isLockedInDb || isLockedResponse).toBe(true);
  });
});