# Courriel

A simple email collector Cloudflare Worker for popup newsletters.  
Written(?) in JS, August 2025.  
Released under the [MIT License](./LICENSE).  
Made by [Kewbish](https://kewbi.sh).

## Features

- **POST** `/campaign/:name/signup`: use the following HTML form.

```html
<form
  action="https://courriel.username.workers.dev/campaign/campaignname/signup"
  method="POST"
>
  <input type="email" name="email" required />
  <button type="submit">Sign Up</button>
</form>
```

- **GET** `/campaign/:name/list?secret=cueillette`: fetch all signups for a campaign (JSON, auth-protected).
- **Daily cron (6AM PT)**: lists signups from the last 24H, grouped by campaign, to Discord.
- CORS enabled for cross-origin forms.

## Setup

First, set up the secrets and databases used:

```bash
npx wrangler d1 create signups-db
npx wrangler d1 execute signups-db --command "
 CREATE TABLE signups (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   campaign TEXT NOT NULL,
   email TEXT NOT NULL,
   ts TEXT NOT NULL
 );
"
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put LIST_SECRET
```

In `wrangler.toml`, update the database binding:

```toml
[[d1_databases]]
binding = "DB"
database_name = "signups-db"
database_id = "<id>"
```

To deploy:

```bash
npx wrangler deploy
```
