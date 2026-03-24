const { User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { parse } = require('@fast-csv/parse');
const { Readable } = require('stream');
const bcrypt = require('bcrypt');

const VALID_ROLES = ['student', 'instructor', 'admin'];

class ImportController {
  /**
   * POST /api/admin/users/import
   * Accepts multipart CSV file with columns: full_name, email, password, role, phone
   */
  static async importUsers(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      }

      const results = { created: 0, skipped: 0, errors: [] };
      const rows = [];

      // Parse CSV from buffer
      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file.buffer);
        stream
          .pipe(parse({ headers: true, trim: true, skipEmptyLines: true }))
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      if (rows.length === 0) {
        return res.status(400).json({ success: false, message: 'CSV file is empty or has no data rows' });
      }

      if (rows.length > 500) {
        return res.status(400).json({ success: false, message: 'Maximum 500 users per import' });
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2; // +2 because line 1 is header

        const { full_name, email, password, role, phone } = row;

        // Validate required fields
        if (!full_name || !email || !password) {
          results.errors.push({ line: lineNum, email: email || '—', reason: 'Missing required field (full_name, email, or password)' });
          continue;
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push({ line: lineNum, email, reason: 'Invalid email format' });
          continue;
        }

        // Validate role
        const userRole = role && VALID_ROLES.includes(role.toLowerCase()) ? role.toLowerCase() : 'student';

        // Check duplicate email
        const existing = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existing) {
          results.skipped++;
          continue;
        }

        // Create user
        try {
          const passwordHash = await bcrypt.hash(password, 10);
          await User.create({
            full_name: full_name.trim(),
            email: email.toLowerCase().trim(),
            password_hash: passwordHash,
            role: userRole,
            phone: phone ? phone.trim() : null,
            is_active: true,
            email_verified: true,
            registration_status: 'active',
          });
          results.created++;
        } catch (createErr) {
          results.errors.push({ line: lineNum, email, reason: createErr.message });
        }
      }

      logger.info(`[Admin Import] ${results.created} users created, ${results.skipped} skipped, ${results.errors.length} errors — by admin ${req.user.id}`);

      return ApiResponse.success(res, {
        total_rows: rows.length,
        created: results.created,
        skipped: results.skipped,
        errors: results.errors,
      }, `Import complete: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ImportController;
