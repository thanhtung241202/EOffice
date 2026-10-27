– DATABASE  SQL SERVER============================================================================
-- THIẾT LẬP CỜ MÔI TRƯỜNG BẮT BUỘC CHO FILTERED INDEX TRONG SQL SERVER
-- ============================================================================
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


USE EOffice;
GO


-- ============================================================================
-- XÓA BẢNG CŨ NẾU TỒN TẠI (THEO THỨ TỰ RÀNG BUỘC PHỤ THUỘC TỪ DƯỚI LÊN)
-- ============================================================================
IF OBJECT_ID('dbo.submission_viewers', 'U') IS NOT NULL DROP TABLE dbo.submission_viewers;
IF OBJECT_ID('dbo.submission_comments', 'U') IS NOT NULL DROP TABLE dbo.submission_comments;
IF OBJECT_ID('dbo.attachments', 'U') IS NOT NULL DROP TABLE dbo.attachments;
IF OBJECT_ID('dbo.approval_steps', 'U') IS NOT NULL DROP TABLE dbo.approval_steps;
IF OBJECT_ID('dbo.submissions', 'U') IS NOT NULL DROP TABLE dbo.submissions;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO


-- ============================================================================
-- 1. BẢNG USERS (Người dùng & Quản trị tài khoản)
-- ============================================================================
CREATE TABLE users (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    department NVARCHAR(100) NOT NULL,
    job_title NVARCHAR(100) NOT NULL,
    
    -- Quản lý trạng thái và xóa mềm (Soft Delete)
    is_active BIT NOT NULL DEFAULT 1,       -- 1: Hoạt động, 0: Tạm khóa đăng nhập
    deleted_at DATETIMEOFFSET NULL,         -- NULL: Đang tồn tại, Có ngày: Đã bị xóa bởi Admin
    is_admin BIT NOT NULL DEFAULT 0,        -- 1: Quản trị viên hệ thống
    
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO


-- ============================================================================
-- 2. BẢNG SUBMISSIONS (Tờ trình)
-- ============================================================================
CREATE TABLE submissions (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    document_code NVARCHAR(50) NULL UNIQUE, -- Sinh tự động khi hoàn thành quy trình
    title NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    confidentiality VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    
    -- Vòng đời: DRAFT -> IN_PROGRESS -> (RETURNED <-> IN_PROGRESS) -> APPROVED / REJECTED
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    
    current_step_order INT NOT NULL DEFAULT 1, -- Vị trí bước hiện tại
    total_steps INT NOT NULL DEFAULT 1,        -- Tổng số bước trong quy trình
    
    created_by_id UNIQUEIDENTIFIER NOT NULL,   -- Người khởi tạo
    completed_at DATETIMEOFFSET NULL,          -- Thời điểm hoàn tất phê duyệt
    final_approver_id UNIQUEIDENTIFIER NULL,   -- Người duyệt bước cuối cùng
    
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),


    -- Ràng buộc khóa ngoại
    CONSTRAINT FK_submissions_creator FOREIGN KEY (created_by_id) 
        REFERENCES users(id),
    CONSTRAINT FK_submissions_final_approver FOREIGN KEY (final_approver_id) 
        REFERENCES users(id),


    -- Ràng buộc kiểm tra tính hợp lệ của giá trị (Enum Constraints)
    CONSTRAINT CK_submissions_confidentiality CHECK (confidentiality IN ('NORMAL', 'CONFIDENTIAL')),
    CONSTRAINT CK_submissions_priority CHECK (priority IN ('NORMAL', 'URGENT')),
    CONSTRAINT CK_submissions_status CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'RETURNED', 'APPROVED', 'REJECTED'))
);
GO


-- ============================================================================
-- 3. BẢNG APPROVAL_STEPS (Chuỗi N bước thẩm tra & phê duyệt)
-- ============================================================================
CREATE TABLE approval_steps (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    step_order INT NOT NULL,               -- Thứ tự bước: 1, 2, 3, 4, 5...
    approver_id UNIQUEIDENTIFIER NOT NULL, -- Người phụ trách xử lý bước này
    
    -- REVIEWER: Soát xét hồ sơ, thẩm định chuyên môn
    -- APPROVER: Có thẩm quyền ký duyệt / quyết định
    step_role VARCHAR(20) NOT NULL DEFAULT 'APPROVER',
    
    -- WAITING: Chưa đến lượt
    -- PENDING: Đang chờ xử lý
    -- PASSED: Đã đồng ý chuyển tiếp / Đã duyệt
    -- RETURNED: Đã trả về yêu cầu sửa đổi
    -- REJECTED: Bác bỏ hoàn toàn
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    
    action_date DATETIMEOFFSET NULL,       -- Mốc thời gian thực hiện thao tác
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),


    -- Xóa tờ trình thì tự động xóa chuỗi các bước liên quan (CASCADE)
    CONSTRAINT FK_approval_steps_submissions FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT FK_approval_steps_users FOREIGN KEY (approver_id) 
        REFERENCES users(id),


    CONSTRAINT CK_approval_steps_role CHECK (step_role IN ('REVIEWER', 'APPROVER')),
    CONSTRAINT CK_approval_steps_status CHECK (status IN ('WAITING', 'PENDING', 'PASSED', 'RETURNED', 'REJECTED')),
    
    -- Mỗi tờ trình chỉ có duy nhất 1 bản ghi ở một số thứ tự bước
    CONSTRAINT UQ_submission_step UNIQUE (submission_id, step_order)
);
GO


-- ============================================================================
-- 4. BẢNG SUBMISSION_COMMENTS (Thảo luận / Trao đổi / Lý do trả về)
-- ============================================================================
CREATE TABLE submission_comments (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),


    CONSTRAINT FK_comments_submissions FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT FK_comments_users FOREIGN KEY (user_id) 
        REFERENCES users(id)
);
GO


-- ============================================================================
-- 5. BẢNG ATTACHMENTS (Tệp đính kèm)
-- ============================================================================
CREATE TABLE attachments (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    file_name NVARCHAR(255) NOT NULL,
    file_path NVARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),


    CONSTRAINT FK_attachments_submissions FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) ON DELETE CASCADE
);
GO


-- ============================================================================
-- 6. BẢNG SUBMISSION_VIEWERS (Chia sẻ quyền chỉ đọc / Theo dõi / CC)
-- ============================================================================
CREATE TABLE submission_viewers (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    submission_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    shared_by_id UNIQUEIDENTIFIER NOT NULL, -- Ai là người thực hiện chia sẻ
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),


    CONSTRAINT FK_viewers_submissions FOREIGN KEY (submission_id) 
        REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT FK_viewers_users FOREIGN KEY (user_id) 
        REFERENCES users(id),
    CONSTRAINT FK_viewers_shared_by FOREIGN KEY (shared_by_id) 
        REFERENCES users(id),


    -- Đảm bảo 1 user không bị chia sẻ trùng lặp trên cùng 1 tờ trình
    CONSTRAINT UQ_submission_viewer UNIQUE (submission_id, user_id)
);
GO


-- ============================================================================
-- 7. TẠO CHỈ MỤC TỐI ƯU TRUY VẤN (INDEXES)
-- ============================================================================


-- 7.1. Hỗ trợ API: Danh sách người dùng khả dụng (loại bỏ user đã xóa mềm)
CREATE NONCLUSTERED INDEX IX_users_active_assignable
ON users (department, name)
INCLUDE (job_title)
WHERE deleted_at IS NULL AND is_active = 1;
GO


-- 7.2. Hỗ trợ API: Màn hình "Tờ trình của tôi"
CREATE NONCLUSTERED INDEX IX_submissions_created_by_id 
ON submissions (created_by_id, created_at DESC);
GO


-- 7.3. Hỗ trợ API: Màn hình tra cứu hồ sơ đã hoàn tất/lưu trữ
CREATE NONCLUSTERED INDEX IX_submissions_archived 
ON submissions (status, completed_at DESC)
WHERE status = 'APPROVED';
GO


-- 7.4. Hỗ trợ API: Màn hình "Việc cần tôi xử lý" (PENDING)
CREATE NONCLUSTERED INDEX IX_approval_steps_pending_tasks 
ON approval_steps (approver_id, status)
INCLUDE (submission_id, step_order, step_role);
GO


-- 7.5. Hỗ trợ API: Dựng Timeline chi tiết theo thứ tự các bước
CREATE NONCLUSTERED INDEX IX_approval_steps_timeline 
ON approval_steps (submission_id, step_order ASC);
GO


-- 7.6. Hỗ trợ API: Lịch sử thảo luận theo mốc thời gian
CREATE NONCLUSTERED INDEX IX_submission_comments_timeline 
ON submission_comments (submission_id, created_at ASC);
GO


-- 7.7. Hỗ trợ API: Màn hình "Tờ trình được chia sẻ với tôi"
CREATE NONCLUSTERED INDEX IX_submission_viewers_user 
ON submission_viewers (user_id, created_at DESC)
INCLUDE (submission_id, shared_by_id);
GO


DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name
FROM sys.key_constraints
WHERE type = 'UQ' AND parent_object_id = OBJECT_ID('submissions');

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE submissions DROP CONSTRAINT ' + @ConstraintName);
    PRINT 'Da xoa Unique Constraint cu: ' + @ConstraintName;
END
GO

-- 2. Tạo Unique Filtered Index chuẩn: Chỉ bắt trùng khi document_code IS NOT NULL
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_submissions_document_code' AND object_id = OBJECT_ID('submissions'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UQ_submissions_document_code
    ON submissions(document_code)
    WHERE document_code IS NOT NULL;
    
    PRINT 'Da tao Unique Filtered Index thanh cong!';
END
GO

USE EOffice;
GO

-- 1. Bổ sung cột deleted_at và deleted_by_id nếu chưa có
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('submissions') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE submissions
    ADD deleted_at DATETIMEOFFSET NULL,
        deleted_by_id UNIQUEIDENTIFIER NULL;
    PRINT 'Da them cot deleted_at vao submissions.';
END
GO

-- 2. Đánh Index phục vụ truy vấn
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_submissions_deleted_at' AND object_id = OBJECT_ID('submissions')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_submissions_deleted_at 
    ON submissions(deleted_at);
    PRINT 'Da tao Index IX_submissions_deleted_at.';
END
GO


IF OBJECT_ID('dbo.SubmissionCodeSeq', 'SO') IS NOT NULL
    DROP SEQUENCE dbo.SubmissionCodeSeq;
GO

CREATE SEQUENCE dbo.SubmissionCodeSeq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1;
GO

PRINT 'Da tao Sequence SubmissionCodeSeq (dang so nguyen khong gioi han) thanh cong!';

ALTER TABLE users ADD failed_attempts INT DEFAULT 0;
