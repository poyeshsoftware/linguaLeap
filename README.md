# LingualLeap — Open Language Learning Playground

I originally built this app to practice languages for myself and then decided to open it up so anyone can clone, learn,
and tweak it. It’s intentionally simple but production‑minded, with a clean Next.js setup and a few opinionated choices
for DX.

> If this helped you, a ⭐ on the repo goes a long way!

---

## ✨ What’s inside

- **Next.js 15 (App Router)** + **TypeScript** + **Tailwind** + **shadcn/ui**
- **AI features (Genkit + Google AI / Gemini)**
    - Conversational **Tutor**
    - **Grammar** check & short explanations
    - **Refinement** / rewriting suggestions
    - **Translations**
- **Text‑to‑Speech (Azure Speech)** endpoint for audio playback
- Minimal, composable components and utilities so you can extend quickly

---

## 🚀 Quick start

### 1) Clone and install

```bash
git clone <YOUR_REPO_URL>.git
cd <YOUR_REPO_FOLDER>
# choose your favorite:
pnpm install   # or
npm install    # or
yarn
```

### 2) Create your environment file

Create a `.env.local` in the project root (Next.js loads this automatically).

<details>
<summary>.env.local example</summary>

```dotenv
# --- Azure Speech (Text-to-Speech) ---
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=westeurope   # e.g., westeurope, eastus, etc.
AZURE_SPEECH_DEFAULT_VOICE=en-US-JennyNeural  # optional

# --- Google AI / Gemini (pick one of these integration paths) ---
# If using Google AI Studio API key (server-side calls):
GOOGLE_API_KEY=your_google_ai_studio_api_key

# If using Vertex AI via service account, you might rely on ADC (Application Default Credentials):
# GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-service-account.json
# GCLOUD_PROJECT=your-gcp-project-id
# GOOGLE_CLOUD_PROJECT=your-gcp-project-id

# --- App settings (optional) ---
NEXT_PUBLIC_APP_NAME=LingualLeap
```

</details>

> Notes
> - **Azure Speech:** Create a Speech resource in the Azure portal, copy the **Key** and **Region**, and pick a voice (
    e.g., `en-US-JennyNeural`, `de-DE-KatjaNeural`).
> - **Gemini:** Either use **Google AI Studio** (`GOOGLE_API_KEY`) or **Vertex AI** with service account credentials.
    Configure Genkit to use the provider you prefer.

### 3) Run the app

```bash
pnpm dev    # or npm run dev, or yarn dev
```

Open http://localhost:3000 and you’re in 🎉

---

## 🧠 How it works

### High-level architecture

- **UI:** Next.js App Router pages (`/app`) with Tailwind + shadcn/ui components.
- **AI flows (Genkit + Gemini):** Server-side utilities that call Gemini for tutor chat, grammar checks, refinements,
  and translations.
- **Audio:** A **Next.js Route Handler** at `/api/tts` that proxies requests to **Azure Speech** and returns generated
  audio (stream or base64 depending on your implementation).

### TTS API (server)

`POST /api/tts`

**Body (JSON):**

```json
{
  "text": "Hallo! Wie geht's dir?",
  "lang": "de-DE",
  "voice": "de-DE-KatjaNeural",
  "rate": "1.1"
  // optional speed multiplier or SSML rate value
}
```

**Response:** audio data (e.g., `audio/mpeg`). You can keep it simple and return a Buffer/stream or respond with a data
URL—choose what fits your player.

> Tip: If you need per-language defaults, set a small mapping in the route handler (e.g., `de-DE` →
`de-DE-KatjaNeural`).

---

## 🗂️ Suggested directory structure

```
.
├─ app/
│  ├─ (marketing)/…            # optional landing routes
│  ├─ learn/…                  # main learning experience
│  ├─ api/
│  │  └─ tts/route.ts          # Azure Speech TTS handler
│  └─ page.tsx                 # home
├─ components/                 # UI components (cards, chat, forms, etc.)
├─ lib/                        # AI flows, adapters, helpers
│  ├─ ai/
│  │  ├─ tutor.ts              # conversational tutor flow
│  │  ├─ grammar.ts            # grammar check flow
│  │  ├─ refine.ts             # rewriting/refinement flow
│  │  └─ translate.ts          # translation flow
│  ├─ tts.ts                   # tiny client util that calls /api/tts
│  └─ types.ts                 # shared types
├─ public/                     # images, icons, (optional) audio samples
├─ styles/                     # globals.css, tailwind config imports
├─ .env.local.example          # sample env (optional)
├─ next.config.js(ts)          # Next.js config
├─ tailwind.config.ts          # Tailwind setup
└─ README.md
```

---

## 🧪 Scripts

```bash
# Dev
pnpm dev

# Build & run
pnpm build
pnpm start

# Lint & type-check
pnpm lint
pnpm typecheck
```

(Replace `pnpm` with `npm run` or `yarn` if that’s your preference.)

---

## 🧩 Extending the app

- **Add new “skills”**: Create a new Genkit flow in `lib/ai/` (e.g., `summarize.ts`) and wire a UI surface for it.
- **Swap providers**: You can replace Gemini with another LLM by introducing a new adapter. Keep the call sites in
  `lib/ai/` to isolate provider concerns.
- **Persist sessions**: Add a database (e.g., Postgres + Prisma) to store chat turns, progress, vocab lists, etc.
- **Auth**: Drop in NextAuth/Auth.js to personalize experiences per user.

---

## 🐛 Troubleshooting

- **Audio doesn’t play**: Check `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, and confirm the **voice** supports your
  `lang` (region/locale matters). Inspect Network tab for `/api/tts` response type.
- **AI calls fail**: Confirm `GOOGLE_API_KEY` or Vertex AI credentials. Ensure the server-side code avoids exposing keys
  to the browser.
- **Edge vs Node runtimes**: If you run route handlers on the Edge runtime, some SDKs may not work. Prefer
  `export const runtime = "nodejs"` in route handlers that use native modules/SDKs.

---

## 🛣️ Roadmap (ideas)

- Spaced‑repetition vocabulary drills
- CEFR‑aligned goals & progress tracking
- Inline grammar hints while chatting
- Voice input (STT) & listening exercises
- Multi‑language voice presets and per‑user defaults

---

## 🤝 Contributing

PRs and issues are welcome! If you ship a new flow or language preset, please add docs/snippets so others can benefit.

1. Fork the repo
2. Create a feature branch (`feat/<name>`)
3. Commit with clear messages
4. Open a PR with context and screenshots/video if relevant

---

## 📜 License

MIT — see `LICENSE`. You’re free to clone, modify, and build on top of this. Attribution appreciated but not required.

---

## 🙌 Why public?

I built this for my own language progress and made it public so others can clone it, learn from it, and make it their
own. If you build something cool with it, I’d love to hear about it!

