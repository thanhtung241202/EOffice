// models/notification.model.js
const { sql } = require('../config/db');

const NotificationModel = {
  // 1. Ghi thông báo mới (hỗ trợ cả transaction lẫn pool)
  async create({ user_id, submission_id, action_by_id = null, title, content, type }, poolOrTransaction) {
    const request = new sql.Request(poolOrTransaction);
    await request
      .input('user_id', sql.UniqueIdentifier, user_id)
      .input('submission_id', sql.UniqueIdentifier, submission_id)
      .input('action_by_id', sql.UniqueIdentifier, action_by_id)
      .input('title', sql.NVarChar(255), title)
      .input('content', sql.NVarChar(500), content)
      .input('type', sql.VarChar(30), type)
      .query(`
        INSERT INTO notifications (
          id, user_id, submission_id, action_by_id, title, content, type, is_read, created_at
        )
        VALUES (
          NEWID(), @user_id, @submission_id, @action_by_id, @title, @content, @type, 0, SYSDATETIMEOFFSET()
        );
      `);
  },

  // 2. Lấy 20 thông báo gần nhất của user (kèm tên người tác động và mã tờ trình)
  async getByUser(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT TOP 20
          n.id,
          n.submission_id,
          n.title,
          n.content,
          n.type,
          n.is_read,
          n.created_at,
          n.action_by_id,
          actor.name AS action_by_name,
          actor.job_title AS action_by_job_title,
          s.document_code
        FROM notifications n
        INNER JOIN submissions s ON n.submission_id = s.id
        LEFT JOIN users actor ON n.action_by_id = actor.id
        WHERE n.user_id = @user_id
          AND s.deleted_at IS NULL
        ORDER BY n.created_at DESC;
      `);
    return result.recordset;
  },

  // 3. Đếm số lượng thông báo chưa đọc (hiển thị số badge đỏ)
  async countUnread(userId, pool) {
    const request = pool.request();
    const result = await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(1) AS unread_count
        FROM notifications n
        INNER JOIN submissions s ON n.submission_id = s.id
        WHERE n.user_id = @user_id 
          AND n.is_read = 0
          AND s.deleted_at IS NULL;
      `);
    return result.recordset[0]?.unread_count || 0;
  },

  // 4. Đánh dấu 1 thông báo cụ thể là đã đọc
  async markAsRead(id, userId, pool) {
    const request = pool.request();
    await request
      .input('id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE notifications 
        SET is_read = 1 
        WHERE id = @id AND user_id = @user_id;
      `);
  },

  // 5. Đánh dấu tất cả thông báo của user là đã đọc
  async markAllAsRead(userId, pool) {
    const request = pool.request();
    await request
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE notifications 
        SET is_read = 1 
        WHERE user_id = @user_id AND is_read = 0;
      `);
  }
};

module.exports = NotificationModel;