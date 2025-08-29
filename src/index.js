export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers });

    // Signup endpoint
    if (
      url.pathname.startsWith("/campaign/") &&
      url.pathname.endsWith("/signup") &&
      request.method === "POST"
    ) {
      const parts = url.pathname.split("/");
      const campaign = parts[2];
      const formData = await request.formData();
      const email = formData.get("email");
      if (!email)
        return new Response("Missing email", { status: 400, headers });

      await env.DB.prepare(
        "INSERT INTO signups (campaign, email, ts) VALUES (?1, ?2, datetime('now'))"
      )
        .bind(campaign, email)
        .run();

      return new Response("Signup recorded", { headers });
    }

    // List endpoint (with secret auth)
    if (
      url.pathname.startsWith("/campaign/") &&
      url.pathname.endsWith("/list") &&
      request.method === "GET"
    ) {
      const parts = url.pathname.split("/");
      const campaign = parts[2];

      const auth = url.searchParams.get("secret");
      if (auth !== env.LIST_SECRET)
        return new Response("Unauthorized", { status: 401, headers });

      const { results } = await env.DB.prepare(
        "SELECT email FROM signups WHERE campaign = ?1 ORDER BY ts DESC"
      )
        .bind(campaign)
        .all();

      return new Response(JSON.stringify(results), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers });
  },

  async scheduled(event, env, ctx) {
    const { results } = await env.DB.prepare(
      "SELECT campaign, email FROM signups WHERE ts >= datetime('now', '-1 day') ORDER BY campaign, ts"
    ).all();

    if (results.length === 0) return;

    const grouped = {};
    for (const row of results) {
      if (!grouped[row.campaign]) grouped[row.campaign] = [];
      grouped[row.campaign].push(`- \`${row.email}\``);
    }

    let content = "";
    for (const [campaign, emails] of Object.entries(grouped)) {
      content += `\n**${campaign}**\n${emails.join("\n")}\n`;
    }

    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New email signups",
            description: content,
            color: 11772126,
          },
        ],
      }),
    });
  },
};
