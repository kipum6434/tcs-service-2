import { db } from '../common/db';

// ── Helpers ────────────────────────────────────────────────────────────
async function logEvent(
  ticketId: number,
  eventType: string,
  oldVal: object | null,
  newVal: object | null,
  performedBy: number,
  note?: string
) {
  await db.query(
    `INSERT INTO ticket_logs (ticket_id, event_type, old_value, new_value, performed_by, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [ticketId, eventType, JSON.stringify(oldVal), JSON.stringify(newVal), performedBy, note]
  );
}

async function notify(userId: number, ticketId: number, type: string, title: string, message: string) {
  await db.query(
    `INSERT INTO notifications (user_id, ticket_id, type, title, message)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, ticketId, type, title, message]
  );
}

// ── Status transition rules ────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new:         ['assigned', 'cancelled'],
  assigned:    ['in_progress', 'cancelled'],
  in_progress: ['waiting', 'done', 'cancelled'],
  waiting:     ['in_progress', 'cancelled'],
  done:        ['closed', 'in_progress'],
  closed:      [],
  cancelled:   [],
};

export function canTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Create Ticket ──────────────────────────────────────────────────────
export async function createTicket(data: {
  title: string;
  description: string;
  category_id: number;
  priority: string;
  customer_id: number;
  site_id?: number;
  owner_id: number;
  department_id: number;
  due_date: string;
  internal_note?: string;
  created_by: number;
}) {
  // Calculate SLA deadline from category
  const cat = await db.query('SELECT sla_hours FROM ticket_categories WHERE id = $1', [data.category_id]);
  const slaHours = cat.rows[0]?.sla_hours ?? 48;
  const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  const { rows } = await db.query(
    `INSERT INTO tickets
      (title, description, category_id, priority, status,
       customer_id, site_id, owner_id, department_id,
       due_date, sla_deadline, internal_note,
       created_by, assigned_by, assigned_at)
     VALUES ($1,$2,$3,$4,'assigned',$5,$6,$7,$8,$9,$10,$11,$12,$12,NOW())
     RETURNING *`,
    [
      data.title, data.description, data.category_id, data.priority,
      data.customer_id, data.site_id || null, data.owner_id, data.department_id,
      data.due_date, slaDeadline, data.internal_note || null,
      data.created_by,
    ]
  );

  const ticket = rows[0];
  await logEvent(ticket.id, 'TICKET_CREATED', null, ticket, data.created_by);
  await notify(data.owner_id, ticket.id, 'ASSIGNED', 'งานใหม่ถูก Assign ให้คุณ',
    `Ticket ${ticket.ticket_number}: ${ticket.title}`);
  return ticket;
}

// ── Get Tickets List ───────────────────────────────────────────────────
export async function getTickets(filters: {
  status?: string;
  priority?: string;
  owner_id?: number;
  category_id?: number;
  search?: string;
  page?: number;
  limit?: number;
  user_role?: string;
  user_id?: number;
}) {
  const { page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let p = 1;

  if (filters.status) { conditions.push(`t.status = $${p++}`); params.push(filters.status); }
  if (filters.priority) { conditions.push(`t.priority = $${p++}`); params.push(filters.priority); }
  if (filters.owner_id) { conditions.push(`t.owner_id = $${p++}`); params.push(filters.owner_id); }
  if (filters.category_id) { conditions.push(`t.category_id = $${p++}`); params.push(filters.category_id); }
  if (filters.search) {
    conditions.push(`(t.title ILIKE $${p} OR t.ticket_number ILIKE $${p} OR c.name ILIKE $${p})`);
    params.push(`%${filters.search}%`); p++;
  }
  // Technicians / service see only their tickets
  if (filters.user_role === 'technician') {
    conditions.push(`t.owner_id = $${p++}`); params.push(filters.user_id);
  }

  const where = conditions.join(' AND ');

  const countRes = await db.query(
    `SELECT COUNT(*) FROM tickets t JOIN customers c ON c.id = t.customer_id WHERE ${where}`,
    params
  );

  const { rows } = await db.query(
    `SELECT t.*, c.name AS customer_name, c.phone AS customer_phone,
            u.name AS owner_name, cat.name AS category_name,
            d.name AS department_name,
            CASE WHEN NOW() > t.sla_deadline AND t.status NOT IN ('closed','cancelled')
                 THEN true ELSE false END AS is_overdue_live
     FROM tickets t
     JOIN customers c    ON c.id   = t.customer_id
     JOIN ticket_categories cat ON cat.id = t.category_id
     LEFT JOIN users u   ON u.id   = t.owner_id
     LEFT JOIN departments d ON d.id = t.department_id
     WHERE ${where}
     ORDER BY
       CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                       WHEN 'medium' THEN 3 ELSE 4 END,
       t.due_date ASC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, limit, offset]
  );

  return { data: rows, total: parseInt(countRes.rows[0].count), page, limit };
}

// ── Get Single Ticket ──────────────────────────────────────────────────
export async function getTicketById(id: number) {
  const { rows } = await db.query(
    `SELECT t.*, c.name AS customer_name, c.phone AS customer_phone,
            c.email AS customer_email, c.line_id,
            u.name AS owner_name, cat.name AS category_name,
            d.name AS department_name, s.address AS site_address,
            s.system_size_kw, s.inverter_brand,
            cb.name AS created_by_name
     FROM tickets t
     JOIN customers c    ON c.id   = t.customer_id
     JOIN ticket_categories cat ON cat.id = t.category_id
     LEFT JOIN users u   ON u.id   = t.owner_id
     LEFT JOIN departments d ON d.id = t.department_id
     LEFT JOIN sites s   ON s.id   = t.site_id
     LEFT JOIN users cb  ON cb.id  = t.created_by
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

// ── Assign Ticket ──────────────────────────────────────────────────────
export async function assignTicket(
  ticketId: number,
  ownerId: number,
  departmentId: number,
  assignedBy: number
) {
  const old = await getTicketById(ticketId);
  if (!old) throw new Error('Ticket not found');

  const { rows } = await db.query(
    `UPDATE tickets
     SET owner_id = $1, department_id = $2,
         assigned_by = $3, assigned_at = NOW(),
         status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END,
         updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [ownerId, departmentId, assignedBy, ticketId]
  );

  await logEvent(ticketId, 'TICKET_ASSIGNED',
    { owner_id: old.owner_id }, { owner_id: ownerId }, assignedBy);
  await notify(ownerId, ticketId, 'ASSIGNED', 'งานถูก Assign ให้คุณ',
    `Ticket ${rows[0].ticket_number}: ${rows[0].title}`);
  return rows[0];
}

// ── Change Status ──────────────────────────────────────────────────────
export async function changeStatus(
  ticketId: number,
  newStatus: string,
  performedBy: number,
  opts: { comment?: string; waiting_reason?: string; waiting_eta?: string; done_note?: string }
) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new Error('Ticket not found');
  if (!canTransition(ticket.status, newStatus))
    throw new Error(`Cannot transition from '${ticket.status}' to '${newStatus}'`);

  if (newStatus === 'waiting' && !opts.waiting_reason)
    throw new Error('waiting_reason is required when setting status to waiting');
  if (newStatus === 'done' && !opts.done_note && !opts.comment)
    throw new Error('done_note or comment is required when setting status to done');

  const updates: string[] = ['status = $1', 'updated_at = NOW()'];
  const params: unknown[] = [newStatus];
  let p = 2;

  if (newStatus === 'waiting') {
    updates.push(`waiting_reason = $${p++}`, `waiting_eta = $${p++}`);
    params.push(opts.waiting_reason, opts.waiting_eta || null);
  }
  if (newStatus === 'done' && opts.done_note) {
    updates.push(`done_note = $${p++}`); params.push(opts.done_note);
  }
  if (newStatus === 'closed') {
    updates.push(`closed_by = $${p++}`, `closed_at = NOW()`);
    params.push(performedBy);
  }

  params.push(ticketId);
  const { rows } = await db.query(
    `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
    params
  );

  // Auto-add comment if provided
  if (opts.comment) {
    await db.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
       VALUES ($1,$2,$3,false)`,
      [ticketId, performedBy, opts.comment]
    );
  }

  await logEvent(ticketId, 'STATUS_CHANGED',
    { status: ticket.status }, { status: newStatus }, performedBy, opts.comment);

  // Notify owner if someone else changed status
  if (ticket.owner_id && ticket.owner_id !== performedBy) {
    await notify(ticket.owner_id, ticketId, 'STATUS_CHANGED',
      `Ticket อัปเดต: ${newStatus}`, `${ticket.ticket_number} เปลี่ยนสถานะเป็น ${newStatus}`);
  }

  return rows[0];
}

// ── Add Comment ────────────────────────────────────────────────────────
export async function addComment(
  ticketId: number,
  userId: number,
  content: string,
  isInternal: boolean
) {
  const { rows } = await db.query(
    `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
     VALUES ($1,$2,$3,$4)
     RETURNING *, (SELECT name FROM users WHERE id = $2) AS user_name`,
    [ticketId, userId, content, isInternal]
  );

  await logEvent(ticketId, 'COMMENT_ADDED', null,
    { content: content.slice(0, 100), is_internal: isInternal }, userId);

  // Notify owner
  const ticket = await getTicketById(ticketId);
  if (ticket?.owner_id && ticket.owner_id !== userId) {
    await notify(ticket.owner_id, ticketId, 'COMMENT', 'มี Comment ใหม่',
      `${ticket.ticket_number}: ${content.slice(0, 80)}`);
  }
  return rows[0];
}

// ── Get Comments ───────────────────────────────────────────────────────
export async function getComments(ticketId: number, includeInternal: boolean) {
  const { rows } = await db.query(
    `SELECT tc.*, u.name AS user_name, u.role AS user_role
     FROM ticket_comments tc JOIN users u ON u.id = tc.user_id
     WHERE tc.ticket_id = $1 ${includeInternal ? '' : "AND tc.is_internal = false"}
     ORDER BY tc.created_at ASC`,
    [ticketId]
  );
  return rows;
}

// ── Get Logs ───────────────────────────────────────────────────────────
export async function getLogs(ticketId: number) {
  const { rows } = await db.query(
    `SELECT tl.*, u.name AS performed_by_name
     FROM ticket_logs tl LEFT JOIN users u ON u.id = tl.performed_by
     WHERE tl.ticket_id = $1 ORDER BY tl.created_at DESC`,
    [ticketId]
  );
  return rows;
}

// ── Dashboard Summary ──────────────────────────────────────────────────
export async function getDashboard() {
  const { rows: summary } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'new')         AS new_count,
      COUNT(*) FILTER (WHERE status = 'assigned')     AS assigned_count,
      COUNT(*) FILTER (WHERE status = 'in_progress')  AS in_progress_count,
      COUNT(*) FILTER (WHERE status = 'waiting')      AS waiting_count,
      COUNT(*) FILTER (WHERE status = 'done')         AS done_count,
      COUNT(*) FILTER (WHERE status = 'closed')       AS closed_count,
      COUNT(*) FILTER (WHERE status NOT IN ('closed','cancelled')
                             AND NOW() > sla_deadline) AS overdue_count,
      COUNT(*)                                        AS total
    FROM tickets
  `);

  const { rows: byPriority } = await db.query(`
    SELECT priority, COUNT(*) AS count
    FROM tickets WHERE status NOT IN ('closed','cancelled')
    GROUP BY priority ORDER BY CASE priority
      WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
  `);

  const { rows: byCategory } = await db.query(`
    SELECT cat.name, COUNT(t.*) AS count
    FROM tickets t JOIN ticket_categories cat ON cat.id = t.category_id
    WHERE t.status NOT IN ('closed','cancelled')
    GROUP BY cat.name ORDER BY count DESC
  `);

  const { rows: overdueByOwner } = await db.query(`
    SELECT u.name AS owner, COUNT(*) AS overdue_count
    FROM tickets t JOIN users u ON u.id = t.owner_id
    WHERE t.status NOT IN ('closed','cancelled') AND NOW() > t.sla_deadline
    GROUP BY u.name ORDER BY overdue_count DESC LIMIT 10
  `);

  const { rows: recentTickets } = await db.query(`
    SELECT t.ticket_number, t.title, t.status, t.priority,
           c.name AS customer, t.due_date, t.created_at
    FROM tickets t JOIN customers c ON c.id = t.customer_id
    ORDER BY t.created_at DESC LIMIT 5
  `);

  return { summary: summary[0], byPriority, byCategory, overdueByOwner, recentTickets };
}
