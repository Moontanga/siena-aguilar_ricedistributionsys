import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditLogs, users } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(viewer.role)) {
    return NextResponse.json({ error: 'You do not have permission to view data change history.' }, { status: 403 });
  }
  if (!db) return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
  const rawLimit = Number(req.nextUrl.searchParams.get('limit') || 200);
  const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, Math.floor(rawLimit))) : 200;
  const entityType = req.nextUrl.searchParams.get('entityType');
  try {
    let filters: any = entityType === 'payment'
      ? or(eq(auditLogs.action, 'payment_received'), eq(auditLogs.action, 'payment_edited'))
      : entityType
        ? eq(auditLogs.entityType, entityType)
        : undefined;
    const entityId = req.nextUrl.searchParams.get('entityId');
    if (entityId) {
      const entityFilter = eq(auditLogs.entityId, entityId);
      filters = filters ? and(filters, entityFilter) : entityFilter;
    }
    const rows = await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      currentUsername: users.username,
      currentName: users.name,
      currentRole: users.role,
    }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).where(filters).orderBy(desc(auditLogs.createdAt)).limit(limit);
    const history = rows.map((row: any) => {
      const details = row.details && typeof row.details === 'object' ? row.details : {};
      const actor = details.actor || {};
      return {
        id: row.id, userId: row.userId, action: row.action, entityType: row.entityType,
        entityId: row.entityId, details, ipAddress: row.ipAddress, createdAt: row.createdAt,
        actor: {
          username: actor.username || row.currentUsername || 'Unknown account',
          name: actor.name || row.currentName || '',
          role: actor.role || row.currentRole || 'unknown',
        },
      };
    });
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Data change history failed to load:', error);
    return NextResponse.json({ error: 'Unable to load data change history.' }, { status: 500 });
  }
}
