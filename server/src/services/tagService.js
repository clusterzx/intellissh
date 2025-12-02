const db = require('../db/database');

class TagService {
  async createTag(userId, tagData) {
    const name = tagData?.name ? tagData.name.trim() : '';

    if (!name) {
      throw new Error('Tag name is required');
    }

    const existing = await db.get(
      'SELECT id FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?)',
      [userId, name]
    );

    if (existing) {
      throw new Error('Tag with this name already exists');
    }

    const result = await db.run(
      `INSERT INTO tags (user_id, name, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, name]
    );

    return this.getTagById(result.id, userId);
  }

  async getTagsByUserId(userId) {
    const rows = await db.all(
      `SELECT t.id, t.name, t.created_at, t.updated_at, COUNT(st.session_id) AS sessionCount
       FROM tags t
       LEFT JOIN session_tags st ON st.tag_id = t.id
       WHERE t.user_id = ?
       GROUP BY t.id
       ORDER BY LOWER(t.name)`,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sessionCount: Number(row.sessionCount) || 0
    }));
  }

  async getTagById(tagId, userId) {
    const id = parseInt(tagId, 10);
    if (Number.isNaN(id) || id <= 0) {
      return null;
    }

    const tag = await db.get(
      'SELECT id, name, created_at, updated_at FROM tags WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    return tag || null;
  }

  async updateTag(tagId, userId, tagData) {
    const id = parseInt(tagId, 10);
    if (Number.isNaN(id) || id <= 0) {
      throw new Error('Invalid tag ID');
    }

    const existingTag = await this.getTagById(id, userId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    const name = tagData?.name ? tagData.name.trim() : '';
    if (!name) {
      throw new Error('Tag name is required');
    }

    const duplicate = await db.get(
      'SELECT id FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
      [userId, name, id]
    );

    if (duplicate) {
      throw new Error('Tag with this name already exists');
    }

    await db.run(
      'UPDATE tags SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [name, id, userId]
    );

    return this.getTagById(id, userId);
  }

  async deleteTag(tagId, userId) {
    const id = parseInt(tagId, 10);
    if (Number.isNaN(id) || id <= 0) {
      throw new Error('Invalid tag ID');
    }

    const existingTag = await this.getTagById(id, userId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    // Ensure tag relationships are removed before deleting the tag
    await db.run('DELETE FROM session_tags WHERE tag_id = ?', [id]);

    await db.run('DELETE FROM tags WHERE id = ? AND user_id = ?', [id, userId]);

    return { success: true };
  }

  async setSessionTags(sessionId, userId, tagIds) {
    if (!Array.isArray(tagIds)) {
      throw new Error('Tags must be provided as an array');
    }

    const cleanSessionId = parseInt(sessionId, 10);
    if (Number.isNaN(cleanSessionId)) {
      throw new Error('Invalid session ID');
    }

    const session = await db.get(
      'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
      [cleanSessionId, userId]
    );

    if (!session) {
      throw new Error('Session not found');
    }

    const parsedTagIds = tagIds.map(id => Number(id));

    if (parsedTagIds.some(id => Number.isNaN(id) || !Number.isInteger(id) || id <= 0)) {
      throw new Error('Invalid tag IDs provided');
    }

    const uniqueTagIds = Array.from(new Set(parsedTagIds));

    if (uniqueTagIds.length > 0) {
      const placeholders = uniqueTagIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT id FROM tags WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...uniqueTagIds]
      );

      if (rows.length !== uniqueTagIds.length) {
        throw new Error('One or more tags were not found');
      }
    }

    await db.run('DELETE FROM session_tags WHERE session_id = ?', [cleanSessionId]);

    for (const tagId of uniqueTagIds) {
      await db.run(
        'INSERT OR IGNORE INTO session_tags (session_id, tag_id) VALUES (?, ?)',
        [cleanSessionId, tagId]
      );
    }

    return this.getTagsForSession(cleanSessionId, userId);
  }

  async getTagsForSession(sessionId, userId) {
    const cleanSessionId = parseInt(sessionId, 10);
    if (Number.isNaN(cleanSessionId)) {
      return [];
    }

    const rows = await db.all(
      `SELECT t.id, t.name, t.created_at, t.updated_at
       FROM session_tags st
       INNER JOIN tags t ON t.id = st.tag_id
       INNER JOIN sessions s ON s.id = st.session_id
       WHERE st.session_id = ? AND s.user_id = ?
       ORDER BY LOWER(t.name)`,
      [cleanSessionId, userId]
    );

    return rows;
  }

  async getTagsForSessions(sessionIds, userId) {
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return {};
    }

    const numericIds = sessionIds
      .map(id => parseInt(id, 10))
      .filter(id => !Number.isNaN(id));

    if (numericIds.length === 0) {
      return {};
    }

    const placeholders = numericIds.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT st.session_id, t.id, t.name, t.created_at, t.updated_at
       FROM session_tags st
       INNER JOIN tags t ON t.id = st.tag_id
       INNER JOIN sessions s ON s.id = st.session_id
       WHERE s.user_id = ? AND st.session_id IN (${placeholders})
       ORDER BY st.session_id, LOWER(t.name)`,
      [userId, ...numericIds]
    );

    const tagMap = {};
    for (const row of rows) {
      if (!tagMap[row.session_id]) {
        tagMap[row.session_id] = [];
      }
      tagMap[row.session_id].push({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    }

    return tagMap;
  }
}

module.exports = new TagService();
