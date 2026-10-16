# Zynocta Cyber Academy

A dark-blue cybersecurity learning library built with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express, and optional Supabase Storage/PostgreSQL**. Visitors can browse published notes and read PDFs in an in-page viewer. Only the authenticated administrator can upload, unpublish, or delete notes.

## Features

- Public homepage and public read-only learning library.
- Private administrator sign-in with bcrypt-hashed password and server-side session.
- PDF upload (100 MB default limit), title, subject, and description.
- Publish/unpublish and delete controls.
- PDF content is served through an application route, not a public uploads folder.
- PDF.js canvas viewer with page navigation and zoom; no download button is presented.
- Local mode for easy Windows development, with persistent JSON metadata and local PDF files.
- Optional Supabase private Storage + PostgreSQL mode.
- Helmet security headers, login rate limiting, file signature checks, upload limits, and HTTP-only session cookies.

> **Important limitation:** A browser viewer cannot guarantee that content cannot be copied. Screenshots, browser tools, or recording can still capture displayed pages. The app hides ordinary download controls and protects the file route, but it is not DRM.

## Requirements

- Node.js 20 or later (LTS recommended)
- npm (installed with Node.js)
- VS Code (recommended)

## Run locally on Windows

1. Extract `zynocta-cyber-academy.zip` to a folder you can find easily.
2. Open VS Code → **File → Open Folder** → select `zynocta-cyber-academy`.
3. In VS Code, select **Terminal → New Terminal**.
4. Copy `.env.example` to a new file named `.env`.
5. Edit `.env` and set a private admin email and a strong password (at least 12 characters). For example:

   ```env
   NODE_ENV=development
   PORT=3000
   SESSION_SECRET=put-a-long-random-secret-here-at-least-32-characters
   STORAGE_MODE=local
   ADMIN_NAME=Academy Administrator
   ADMIN_EMAIL=your-private-email@example.com
   ADMIN_PASSWORD=choose-a-unique-strong-password-123!
   ```

   Do not use the example credentials on an internet-facing server.
6. Install dependencies:

   ```bash
   npm install
   ```

7. Start the server:

   ```bash
   npm run dev
   ```

8. Open `http://localhost:3000` in your browser.
9. To upload notes, open `http://localhost:3000/admin.html` and sign in with the credentials from `.env`.
10. Choose a PDF, enter its title and subject, and click **Upload learning material**. It will appear on the public homepage after upload.

The first startup creates the initial admin record if no admin exists. The local database is stored in `data/db.json` and PDF files in `uploads/`. Do not delete these folders if you want to keep your materials. They are excluded from source control by `.gitignore`.

## Common commands

```bash
npm run dev       # local development with auto-restart
npm start         # start server normally
npm run check     # syntax checks
npm test          # automated tests
```

## Supabase cloud setup (optional)

Local mode is the default and needs no Supabase account. To use cloud database/storage:

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/migrations/001_initial_schema.sql`.
3. In **Project Settings → API**, copy the Project URL and service-role/secret key. Keep the service key server-side only.
4. Set these variables in `.env`:

   ```env
   STORAGE_MODE=supabase
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
   SUPABASE_BUCKET=academy-pdfs
   ADMIN_EMAIL=your-private-email@example.com
   ADMIN_PASSWORD=your-unique-strong-password-at-least-12-chars
   SESSION_SECRET=your-long-random-secret-at-least-32-characters
   ```

5. Restart the server. It will create the private `academy-pdfs` bucket if it does not already exist. PDFs and metadata will be stored in Supabase. The Express server uses the service key and RLS remains enabled with no public table policies.

**Admin identity:** This project uses its own server-side admin credential record, separate from Supabase Auth. The first admin is created from the environment variables on first startup. Never expose the service key or admin password in browser code.

## Production deployment checklist

This project is packaged for local use and can be configured for deployment, but it is not automatically deployed. Before exposing it to the internet:

- Use Supabase mode and run the SQL migration.
- Set `NODE_ENV=production`, `APP_BASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the hosting provider's secret settings.
- Set `DATABASE_URL` to a PostgreSQL connection string with permission to create/use the `user_sessions` table. `connect-pg-simple` creates the session table on startup.
- Ensure the hosting platform supports Node.js and persistent environment configuration. Local file storage may be ephemeral on serverless hosts; use Supabase mode instead.
- Use HTTPS. The session cookie is marked `Secure` in production.
- Rotate any credentials that were accidentally shared.
- Back up Supabase and test recovery.
- Add monitoring and a retention policy appropriate to your deployment.

Do not run production mode without `DATABASE_URL`; the server intentionally refuses to start because in-memory sessions are not suitable for production.

## Privacy and PDF viewing

The homepage and notes metadata are public by design. The admin routes require a session. In local mode, PDF bytes live in `uploads/`, which is not served as a static directory. In Supabase mode, the bucket is private and file bytes are fetched by the server. The PDF viewer renders pages to a canvas and does not show a download button. This is a deterrent, not a guarantee against screenshots or copying.

## Project structure

```text
public/                 HTML, CSS, browser JavaScript
server/                 Express server, routes, middleware, storage service
supabase/migrations/    Database schema and security settings
scripts/                Admin/setup utilities
data/                   Local JSON metadata (created/used in local mode)
uploads/                Local PDF storage (created/used in local mode)
tests/                  Automated tests
```

## Troubleshooting

- **`npm` is not recognized:** Install Node.js LTS from https://nodejs.org/ and restart VS Code.
- **Port 3000 is busy:** Set `PORT=3001` in `.env`, restart, and open `http://localhost:3001`.
- **Admin login fails:** Confirm `.env` values and restart the server. The initial admin record is created once; changing `ADMIN_PASSWORD` later does not automatically overwrite the stored hash.
- **PDF.js fails to load:** Run `npm install` and restart the server. The app serves PDF.js from `node_modules/pdfjs-dist/build`.
- **Supabase schema error:** Confirm the migration was run in the same project as `SUPABASE_URL`.
- **Supabase upload fails:** Confirm the server-only key is correct, the bucket is private, and the bucket file-size limit permits your PDF.

## License

Private project for Zynocta Cyber Academy. Update the license terms before redistributing.
