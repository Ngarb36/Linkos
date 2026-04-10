# Linkos 🔗

WhatsApp bot that receives links, classifies them with Claude AI, and saves them to a Notion database.

## How it works

1. Send any link to your WhatsApp (or a group the bot is in)
2. The bot detects the URL, classifies it (video / article / tutorial / documentation / tool / other)
3. The link is saved in your Notion database with title, summary, type, and source

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration** → give it a name (e.g. "Linkos")
3. Copy the **Internal Integration Token** → this is your `NOTION_TOKEN`

### 3. Create a Notion Database

Create a new **full-page database** in Notion with these properties:

| Property   | Type        |
|------------|-------------|
| Name       | Title       |
| URL        | URL         |
| Type       | Select      |
| Summary    | Text        |
| Source     | Text        |
| Added By   | Text        |
| Status     | Select      |
| Added At   | Date        |

Then **share the database** with your integration:
- Open the database → click `•••` → **Connections** → add your integration

Copy the **database ID** from the URL:
```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=...
```

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: restrict bot to these phone numbers (e.g. 972501234567)
ALLOWED_NUMBERS=
```

### 5. Run the bot

```bash
npm start
```

Scan the QR code with WhatsApp (**WhatsApp → Linked Devices → Link a Device**).

---

## Usage

Just send a link in a WhatsApp chat:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Or with a note:
```
https://css-tricks.com/flexbox-guide great flexbox reference
```

The bot will:
- React with ⏳ while processing
- React with ✅ and reply with the classification on success
- React with ❌ if something goes wrong

---

## Link types

| Type          | Examples                              |
|---------------|---------------------------------------|
| 🎬 Video      | YouTube, Vimeo, Loom, TikTok         |
| 📰 Article    | Blog posts, news, essays             |
| 📚 Tutorial   | How-to guides, coding walkthroughs   |
| 📖 Docs       | Official docs, API references        |
| 🛠️ Tool       | GitHub repos, online tools, apps     |
| 🔗 Other      | Everything else                       |

---

## Requirements

- Node.js 18+
- A WhatsApp account (personal or secondary number)
- Anthropic API key
- Notion account
