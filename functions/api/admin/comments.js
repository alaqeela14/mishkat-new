export async function onRequest(context) {
    const { request, env } = context;

    // 1. التحقق من كلمة المرور المرسلة في هيدر الطلب
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return json({ error: 'Unauthorized' }, 401);
    }

    // 2. التعامل مع طلبات GET (جلب التعليقات)
    if (request.method === 'GET') {
        try {
            const { searchParams } = new URL(request.url);
            const status = searchParams.get('status') || 'pending'; // الافتراضي: pending
            const slug = searchParams.get('slug'); // فلترة اختيارية حسب المقال

            let query = "SELECT id, post_slug, author, body, created_at, status FROM comments WHERE status = ? AND deleted_at IS NULL";
            const params = [status];

            if (slug) {
                query += " AND post_slug = ?";
                params.push(slug);
            }

            query += " ORDER BY created_at DESC";

            const { results } = await env.DB.prepare(query).bind(...params).all();

            return json(results);
        } catch (e) {
            return json({ error: e.message }, 500);
        }
    }

    // 3. التعامل مع طلبات PUT (تحديث حالة تعليق)
    if (request.method === 'PUT') {
        try {
            const body = await request.json();
            const { id, status } = body; // status يجب أن يكون 'approved' أو 'spam'

            if (!id || !status) {
                return json({ error: 'id and status are required' }, 400);
            }
            if (!['approved', 'spam', 'pending'].includes(status)) {
                return json({ error: 'Invalid status' }, 400);
            }

            await env.DB.prepare(
                "UPDATE comments SET status = ? WHERE id = ?"
            ).bind(status, id).run();

            return json({ message: 'Comment updated successfully' });
        } catch (e) {
            return json({ error: e.message }, 500);
        }
    }

    // 4. التعامل مع طلبات DELETE (حذف تعليق)
    if (request.method === 'DELETE') {
        try {
            const { searchParams } = new URL(request.url);
            const id = searchParams.get('id');

            if (!id) {
                return json({ error: 'id is required' }, 400);
            }

            await env.DB.prepare(
                "UPDATE comments SET deleted_at = strftime('%s', 'now') WHERE id = ?"
            ).bind(id).run();

            return json({ message: 'Comment deleted successfully' });
        } catch (e) {
            return json({ error: e.message }, 500);
        }
    }

    return json({ error: 'Method not allowed' }, 405);
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
