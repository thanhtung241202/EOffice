require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { poolPromise } = require('./config/db');
const submissionRoutes = require('./routes/submission.routes');
const app = express();
const attachmentRoutes = require('./routes/attachment.route');
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Kiểm tra kết nối cơ sở dữ liệu và trả về trạng thái
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/submissions', submissionRoutes);
app.use('/api', attachmentRoutes);
app.get('/health', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT DB_NAME() AS current_db, COUNT(*) AS tables_count FROM sys.tables');
    return res.status(200).json({ status: 'UP', data: result.recordset[0] });
  } catch (err) {
    return res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

poolPromise.then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Dang chay tai http://localhost:${PORT}`);
    console.log(`[Health Check] http://localhost:${PORT}/health`);
  });
});