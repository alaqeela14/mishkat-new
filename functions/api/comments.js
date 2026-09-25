export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'GET') {
        try {
            const { searchParams } = new URL(request.url);
            const slug = searchParams.get('slug');
            if (!slug) return json({ error: 'slug required' }, 400);
            const { results } = await env.DB.prepare(
                "SELECT id, author, body, created_at FROM comments WHERE post_slug = ? AND status = 'approved' AND deleted_at IS NULL ORDER BY created_at DESC"
            ).bind(slug).all();
            return json(results);
        } catch (e) {
            return json({ error: e.message }, 500);
        }
    }

    if (request.method === 'POST') {
        try {
            const body = await request.json();
            const { post_slug, author, body: text } = body;
            if (!post_slug || !author || !text) return json({ error: 'missing fields' }, 400);
            if (text.length > 2000 || author.length > 60) return json({ error: 'too long' }, 400);
            await env.DB.prepare(
                "INSERT INTO comments (post_slug, author, body, status) VALUES (?, ?, ?, 'pending')"
            ).bind(post_slug, author, text).run();
            return json({ message: 'ok' }, 201);
        } catch (e) {
            return json({ error: e.message }, 500);
        }
    }
    return json({ error: 'method not allowed' }, 405);
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
