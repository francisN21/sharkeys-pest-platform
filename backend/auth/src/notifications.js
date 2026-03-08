async function createNotification(client, args) {
  const {
    userId,
    kind,
    title,
    body = null,
    bookingId = null,
    bookingPublicId = null,
    messageId = null,
    metadata = {},
  } = args;

  if (!userId || !kind || !title) return null;

  const r = await client.query(
    `
    INSERT INTO notifications (
      user_id,
      kind,
      title,
      body,
      booking_id,
      booking_public_id,
      message_id,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    RETURNING id, user_id, kind, title, body, booking_id, booking_public_id, message_id, metadata, read_at, created_at
    `,
    [
      userId,
      kind,
      title,
      body,
      bookingId,
      bookingPublicId,
      messageId,
      JSON.stringify(metadata || {}),
    ]
  );

  return r.rows[0] ?? null;
}

async function createNotifications(client, items) {
  const created = [];

  for (const item of Array.isArray(items) ? items : []) {
    const row = await createNotification(client, item);
    if (row) created.push(row);
  }

  return created;
}

module.exports = {
  createNotification,
  createNotifications,
};