# Kunaay Real Estate Platform

Kunaay Real Estate curates vacation rentals and property sales throughout the Riviera Maya. This repository now includes a lightweight Python backend plus an admin panel so non-technical collaborators can publish listings without touching code.

## Highlights

- **Dynamic listings** – Rental and sale cards on `index.html`, `rentals.html`, and `sales.html` are rendered from live listing data served by the backend.
- **Auto-generated detail pages** – Each property has a permalink at `listing.html?slug=<listing-slug>` with long-form descriptions and image galleries.
- **Browser-based admin panel** – Visit `/admin` to log in, add listings (with photo uploads), and remove outdated entries instantly.
- **Zero external dependencies** – The backend runs entirely on the Python standard library and SQLite, making local development straightforward even in restricted environments.

## Quick start on macOS with VS Code

1. **Install Python 3 (one-time setup).**
   - Check whether it is already installed: open the Terminal app and run `python3 --version`.
   - If you see an error, install Python from [python.org/downloads](https://www.python.org/downloads/) or with Homebrew (`brew install python`).

2. **Open the project in VS Code.**
   - Launch VS Code, choose **File → Open Folder…**, and select the project directory.

3. **Open the built-in terminal.**
   - Go to **View → Terminal**. A panel appears at the bottom of VS Code.

4. **(Optional) Create a virtual environment for dependencies.**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

5. **Copy the example environment file.**
   ```bash
   cp .env.example .env
   ```
   - You can keep the default username (`admin`) and password (`admin123`) while testing. Update them later before deploying.

6. **Start the backend server.**
   ```bash
   python3 server.py
   ```
   - Leave this terminal window running; it keeps the site alive at [http://localhost:8000](http://localhost:8000).

7. **View the site and admin panel.**
   - Open your web browser and go to `http://localhost:8000/` to see the public listings.
   - Visit `http://localhost:8000/admin`, sign in with the credentials from `.env`, and create or delete listings. Changes appear instantly.

> 💡 If VS Code shows `python3: command not found`, ensure Python 3 is installed and added to your `PATH`. After installing, close and reopen VS Code so it picks up the updated environment.

## Getting started on other platforms

1. **Create a virtual environment (optional but recommended):**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
   - Windows PowerShell: `py -m venv .venv` followed by `.venv\Scripts\Activate.ps1`

2. **Configure credentials:**
   - Copy `.env.example` to `.env` and update `ADMIN_PASSWORD` (and `ADMIN_USERNAME` if needed).
   - The default credentials are `admin` / `admin123` for first run.

3. **Launch the backend server:**
   ```bash
   python3 server.py
   ```
   - Windows: `py server.py`
   The server starts on [http://localhost:8000](http://localhost:8000). Static pages and API endpoints are available from the same origin.

   > 💡 If your terminal reports `python: command not found`, use `python3` (macOS/Linux) or `py` (Windows). Many modern systems ship only the `python3` alias by default.

4. **Seed data:**
   - On first run the database is created automatically with two sample listings (one rental and one sale) so the site has content immediately.

## Admin workflow

1. Navigate to `http://localhost:8000/admin`.
2. Sign in with the admin credentials.
3. Use the **Add a new listing** form to set the title, category, short summary, full description, and optional photo uploads. Supported categories are `rental` and `sale`.
4. Click **Create listing** – the property appears instantly on the homepage, category page, and gains its own detail page.
5. Use the **Delete** action to retire listings; all associated uploads are removed from disk.

## Front-end behavior

- The homepage shows featured rentals and sales by requesting `/api/listings?type=rental&limit=3` and `/api/listings?type=sale&limit=3`.
- `rentals.html` and `sales.html` request all listings of their respective categories.
- `listing.html` reads a `slug` query parameter and fetches `/api/listings/<slug>` to populate the detail view.

## API summary

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/listings` | `GET` | Returns all listings (filter with `type` and `limit` query parameters). |
| `/api/listings/<slug>` | `GET` | Returns a single listing with image paths. |
| `/api/login` | `POST` | Authenticates an admin user. |
| `/api/logout` | `POST` | Ends the current admin session. |
| `/api/admin/listings` | `GET` | Returns all listings (auth required). |
| `/api/admin/listings` | `POST` | Creates a listing from `multipart/form-data` (auth required). |
| `/api/admin/listings/<id>/delete` | `POST` | Deletes a listing and its uploads (auth required). |

Session cookies are HTTP-only and expire after eight hours of inactivity.

## Data storage

- SQLite database file: `data/app.db` (ignored by Git).
- Uploaded images: `uploads/` (ignored by Git).
- Seeded assets reference existing photos in `assets/img/photos/`.

## Security notes

- Always update the default admin password before deploying.
- Serve the application behind HTTPS in production for secure credential transmission.
- Consider rotating session secrets and enhancing password policies before going live.

## License

This project remains under the MIT License. See `LICENSE` for details.
