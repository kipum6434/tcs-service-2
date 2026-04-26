import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../common/auth.middleware';
import * as svc from './tickets.service';
import { db } from '../common/db';

const router = Router();
router.use(authenticate);

// ── GET /api/tickets ───────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await svc.getTickets({
      status:      req.query.status as string,
      priority:    req.query.priority as string,
      owner_id:    req.query.owner_id ? +req.query.owner_id : undefined,
      category_id: req.query.category_id ? +req.query.category_id : undefined,
      search:      req.query.search as string,
      page:        req.query.page ? +req.query.page : 1,
      limit:       req.query.limit ? +req.query.limit : 20,
      user_role:   req.user!.role,
      user_id:     req.user!.id,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tickets ──────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const { title, description, category_id, priority, customer_id,
          site_id, owner_id, department_id, due_date, internal_note } = req.body;

  if (!title || !description || !category_id || !customer_id || !owner_id || !department_id || !due_date)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const ticket = await svc.createTicket({
      title, description, category_id: +category_id, priority: priority || 'medium',
      customer_id: +customer_id, site_id: site_id ? +site_id : undefined,
      owner_id: +owner_id, department_id: +department_id,
      due_date, internal_note, created_by: req.user!.id,
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tickets/dashboard ─────────────────────────────────────────
router.get('/dashboard', requireRole('admin','manager','viewer'), async (_req: Request, res: Response) => {
  try {
    res.json(await svc.getDashboard());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tickets/categories ────────────────────────────────────────
router.get('/categories', async (_req: Request, res: Response) => {
  const { rows } = await db.query('SELECT * FROM ticket_categories ORDER BY id');
  res.json(rows);
});

// ── GET /api/tickets/:id ───────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const ticket = await svc.getTicketById(+req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// ── PATCH /api/tickets/:id ─────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const allowed = ['title','description','priority','due_date','internal_note'];
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let p = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = $${p++}`);
        params.push(req.body[key]);
      }
    }
    if (sets.length === 1) return res.status(400).json({ error: 'No updatable fields' });
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, params
    );
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tickets/:id/assign ───────────────────────────────────────
router.post('/:id/assign', requireRole('admin','manager','customer_service'), async (req: Request, res: Response) => {
  const { owner_id, department_id } = req.body;
  if (!owner_id || !department_id) return res.status(400).json({ error: 'owner_id and department_id required' });
  try {
    res.json(await svc.assignTicket(+req.params.id, +owner_id, +department_id, req.user!.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/tickets/:id/status ───────────────────────────────────────
router.post('/:id/status', async (req: Request, res: Response) => {
  const { status, comment, waiting_reason, waiting_eta, done_note } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  try {
    res.json(await svc.changeStatus(+req.params.id, status, req.user!.id,
      { comment, waiting_reason, waiting_eta, done_note }));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/tickets/:id/comments ─────────────────────────────────────
router.get('/:id/comments', async (req: Request, res: Response) => {
  const isStaff = ['admin','manager','customer_service','document_staff','service_team','technician']
    .includes(req.user!.role);
  res.json(await svc.getComments(+req.params.id, isStaff));
});

// ── POST /api/tickets/:id/comments ────────────────────────────────────
router.post('/:id/comments', async (req: Request, res: Response) => {
  const { content, is_internal = false } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    res.status(201).json(await svc.addComment(+req.params.id, req.user!.id, content, is_internal));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tickets/:id/logs ──────────────────────────────────────────
router.get('/:id/logs', requireRole('admin','manager'), async (req: Request, res: Response) => {
  res.json(await svc.getLogs(+req.params.id));
});

// ── GET /api/tickets/:id/notifications (user's unread) ────────────────
router.get('/notifications/mine', async (req: Request, res: Response) => {
  const { rows } = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1 AND is_read = false
     ORDER BY created_at DESC LIMIT 20`,
    [req.user!.id]
  );
  res.json(rows);
});

// ── PATCH /api/notifications/:id/read ─────────────────────────────────
router.patch('/notifications/:nid/read', async (req: Request, res: Response) => {
  await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [req.params.nid, req.user!.id]);
  res.json({ ok: true });
});

export default router;
