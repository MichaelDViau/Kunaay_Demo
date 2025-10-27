import cgi
import datetime as dt
import hashlib
import json
import os
import secrets
import shutil
import sqlite3
import string
import time
import urllib.parse
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
DB_PATH = DATA_DIR / "app.db"
SESSION_COOKIE = "session_id"
SESSION_TTL_SECONDS = 60 * 60 * 8  # 8 hours

SESSIONS = {}


def load_env():
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        with env_path.open() as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DATA_DIR.mkdir(exist_ok=True)
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL CHECK(category IN ('rental', 'sale')),
                summary TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS listing_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE
            )
            """
        )


ALLOWED_SLUG_CHARS = string.ascii_lowercase + string.digits + "-"


def slugify(value: str) -> str:
    value = value.strip().lower()
    result = []
    prev_dash = False
    for ch in value:
        if ch in ALLOWED_SLUG_CHARS:
            result.append(ch)
            prev_dash = False
        elif ch in string.whitespace or ch in {"_", "/", "\\"}:
            if not prev_dash:
                result.append("-")
                prev_dash = True
        else:
            continue
    slug = "".join(result).strip("-")
    return slug or secrets.token_hex(4)


def hash_password(password: str, salt_hex: str | None = None):
    if salt_hex is None:
        salt = os.urandom(16)
    else:
        salt = bytes.fromhex(salt_hex)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return salt.hex(), hashed.hex()


def verify_password(password: str, salt_hex: str, hash_hex: str) -> bool:
    salt = bytes.fromhex(salt_hex)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hashed.hex() == hash_hex


def ensure_default_admin():
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    with get_db() as conn:
        cur = conn.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cur.fetchone() is None:
            salt_hex, hash_hex = hash_password(password)
            conn.execute(
                "INSERT INTO users (username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)",
                (username, hash_hex, salt_hex, dt.datetime.utcnow().isoformat()),
            )


def ensure_sample_listings():
    with get_db() as conn:
        cur = conn.execute("SELECT COUNT(*) FROM listings")
        count = cur.fetchone()[0]
        if count:
            return
        seed_data = [
            {
                "title": "Casa Ricardo",
                "category": "sale",
                "summary": "A coastal retreat with private beach access and luxurious finishes.",
                "description": "Enjoy breathtaking ocean views from every room in Casa Ricardo. This spacious property features open-concept living areas, a chef's kitchen, and expansive outdoor spaces for entertaining.",
                "images": ["assets/img/photos/homereview01.jpg"],
            },
            {
                "title": "Casa Chukum",
                "category": "rental",
                "summary": "Modern villa surrounded by lush greenery, perfect for tranquil escapes.",
                "description": "Casa Chukum blends contemporary design with natural materials. Relax by the private pool or unwind in the rooftop lounge while soaking in jungle views.",
                "images": ["assets/img/photos/homereview02.jpg"],
            },
        ]
        for item in seed_data:
            now = dt.datetime.utcnow().isoformat()
            slug_base = slugify(item["title"])
            slug = slug_base
            suffix = 1
            while conn.execute("SELECT 1 FROM listings WHERE slug = ?", (slug,)).fetchone():
                slug = f"{slug_base}-{suffix}"
                suffix += 1
            cur = conn.execute(
                "INSERT INTO listings (title, slug, category, summary, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (item["title"], slug, item["category"], item["summary"], item["description"], now, now),
            )
            listing_id = cur.lastrowid
            for idx, image in enumerate(item["images"]):
                conn.execute(
                    "INSERT INTO listing_images (listing_id, filename, position) VALUES (?, ?, ?)",
                    (listing_id, image, idx),
                )


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    # Disable default logging to stderr except warnings
    def log_message(self, format, *args):
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed)
            return
        if parsed.path == "/admin" or parsed.path.startswith("/admin/"):
            # Serve admin SPA
            self.path = "/admin.html"
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_post(parsed)
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Unsupported POST target")

    def handle_api_get(self, parsed):
        path = parsed.path
        if path == "/api/listings":
            self.send_json(self.get_listings(parsed.query))
            return
        if path.startswith("/api/listings/"):
            slug = path.split("/", 3)[-1]
            listing = self.get_listing_by_slug(slug)
            if listing is None:
                self.send_json({"error": "Listing not found"}, status=HTTPStatus.NOT_FOUND)
            else:
                self.send_json(listing)
            return
        if path == "/api/session":
            user = self.get_current_user()
            if user:
                self.send_json({"authenticated": True, "username": user["username"]})
            else:
                self.send_json({"authenticated": False})
            return
        if path == "/api/admin/listings":
            user = self.require_auth()
            if not user:
                return
            self.send_json(self.get_listings(parsed.query, include_hidden=True))
            return
        self.send_json({"error": "Unknown endpoint"}, status=HTTPStatus.NOT_FOUND)

    def handle_api_post(self, parsed):
        path = parsed.path
        if path == "/api/login":
            self.handle_login()
            return
        if path == "/api/logout":
            self.handle_logout()
            return
        if path == "/api/admin/listings":
            user = self.require_auth()
            if not user:
                return
            self.create_listing()
            return
        if path.startswith("/api/admin/listings/") and path.endswith("/delete"):
            user = self.require_auth()
            if not user:
                return
            listing_id = path.split("/")[-2]
            self.delete_listing(listing_id)
            return
        self.send_json({"error": "Unknown endpoint"}, status=HTTPStatus.NOT_FOUND)

    def parse_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else b""
        if not body:
            return {}
        try:
            return json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def handle_login(self):
        payload = self.parse_json_body()
        if payload is None:
            self.send_json({"error": "Invalid JSON"}, status=HTTPStatus.BAD_REQUEST)
            return
        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""
        if not username or not password:
            self.send_json({"error": "Username and password are required"}, status=HTTPStatus.BAD_REQUEST)
            return
        with get_db() as conn:
            cur = conn.execute("SELECT id, username, password_hash, password_salt FROM users WHERE username = ?", (username,))
            row = cur.fetchone()
        if not row or not verify_password(password, row["password_salt"], row["password_hash"]):
            time.sleep(0.3)
            self.send_json({"error": "Invalid credentials"}, status=HTTPStatus.UNAUTHORIZED)
            return
        token = secrets.token_urlsafe(32)
        SESSIONS[token] = {
            "user_id": row["id"],
            "username": row["username"],
            "expires": time.time() + SESSION_TTL_SECONDS,
        }
        self.send_json({"success": True}, cookies={SESSION_COOKIE: token})

    def handle_logout(self):
        cookies = self.parse_cookies()
        session_id = cookies.get(SESSION_COOKIE)
        if session_id and session_id in SESSIONS:
            SESSIONS.pop(session_id, None)
        self.send_json({"success": True}, cookies={SESSION_COOKIE: ("", {"expires": "Thu, 01 Jan 1970 00:00:00 GMT", "path": "/"})})

    def create_listing(self):
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("multipart/form-data"):
            self.send_json({"error": "multipart/form-data required"}, status=HTTPStatus.BAD_REQUEST)
            return
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
                "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
            },
            keep_blank_values=True,
        )
        title = (form.getfirst("title", "").strip())
        category = (form.getfirst("category", "").strip().lower())
        summary = (form.getfirst("summary", "").strip())
        description = (form.getfirst("description", "").strip())
        if category not in {"rental", "sale"}:
            self.send_json({"error": "Category must be rental or sale"}, status=HTTPStatus.BAD_REQUEST)
            return
        if not title or not summary or not description:
            self.send_json({"error": "Title, summary, and description are required"}, status=HTTPStatus.BAD_REQUEST)
            return
        file_items = []
        if getattr(form, 'list', None):
            for field in form.list:
                if field.name == 'images' and getattr(field, 'filename', ''):
                    file_items.append(field)
        saved_files = []
        for item in file_items:
            filename = os.path.basename(item.filename)
            safe_name = f"{int(time.time()*1000)}_{secrets.token_hex(4)}_{filename}"
            destination = UPLOAD_DIR / safe_name
            destination.parent.mkdir(parents=True, exist_ok=True)
            item.file.seek(0)
            with destination.open("wb") as f:
                shutil.copyfileobj(item.file, f)
            saved_files.append(str(Path("uploads") / safe_name))
        now = dt.datetime.utcnow().isoformat()
        slug_base = slugify(title)
        with get_db() as conn:
            slug = slug_base
            suffix = 1
            while conn.execute("SELECT 1 FROM listings WHERE slug = ?", (slug,)).fetchone():
                slug = f"{slug_base}-{suffix}"
                suffix += 1
            cur = conn.execute(
                "INSERT INTO listings (title, slug, category, summary, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (title, slug, category, summary, description, now, now),
            )
            listing_id = cur.lastrowid
            for idx, path in enumerate(saved_files):
                conn.execute(
                    "INSERT INTO listing_images (listing_id, filename, position) VALUES (?, ?, ?)",
                    (listing_id, path, idx),
                )
        self.send_json({"success": True, "slug": slug}, status=HTTPStatus.CREATED)

    def delete_listing(self, listing_id):
        try:
            listing_id = int(listing_id)
        except ValueError:
            self.send_json({"error": "Invalid listing id"}, status=HTTPStatus.BAD_REQUEST)
            return
        with get_db() as conn:
            cur = conn.execute("SELECT id FROM listings WHERE id = ?", (listing_id,))
            row = cur.fetchone()
            if not row:
                self.send_json({"error": "Listing not found"}, status=HTTPStatus.NOT_FOUND)
                return
            image_rows = conn.execute(
                "SELECT filename FROM listing_images WHERE listing_id = ?",
                (listing_id,),
            ).fetchall()
            conn.execute("DELETE FROM listing_images WHERE listing_id = ?", (listing_id,))
            conn.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
        for img in image_rows:
            path = BASE_DIR / img["filename"]
            try:
                if path.is_file():
                    path.unlink()
            except Exception:
                pass
        self.send_json({"success": True})

    def get_listings(self, query_string, include_hidden=False):
        params = urllib.parse.parse_qs(query_string)
        category = params.get("type", [None])[0]
        limit = params.get("limit", [None])[0]
        limit_value = None
        if limit:
            try:
                limit_value = max(1, min(int(limit), 100))
            except ValueError:
                limit_value = None
        sql = "SELECT * FROM listings"
        args = []
        if category in {"rental", "sale"}:
            sql += " WHERE category = ?"
            args.append(category)
        sql += " ORDER BY created_at DESC"
        if limit_value:
            sql += " LIMIT ?"
            args.append(limit_value)
        with get_db() as conn:
            cur = conn.execute(sql, args)
            listings = [dict(row) for row in cur.fetchall()]
            for listing in listings:
                listing["images"] = [
                    img["filename"]
                    for img in conn.execute(
                        "SELECT filename FROM listing_images WHERE listing_id = ? ORDER BY position ASC",
                        (listing["id"],),
                    )
                ]
        return listings

    def get_listing_by_slug(self, slug):
        with get_db() as conn:
            cur = conn.execute("SELECT * FROM listings WHERE slug = ?", (slug,))
            row = cur.fetchone()
            if not row:
                return None
            listing = dict(row)
            listing["images"] = [
                img["filename"]
                for img in conn.execute(
                    "SELECT filename FROM listing_images WHERE listing_id = ? ORDER BY position ASC",
                    (listing["id"],),
                )
            ]
            return listing

    def parse_cookies(self):
        cookie_header = self.headers.get("Cookie")
        cookies = {}
        if not cookie_header:
            return cookies
        simple = SimpleCookie()
        simple.load(cookie_header)
        for key, morsel in simple.items():
            cookies[key] = morsel.value
        return cookies

    def get_current_user(self):
        cookies = self.parse_cookies()
        session_id = cookies.get(SESSION_COOKIE)
        if not session_id:
            return None
        session = SESSIONS.get(session_id)
        if not session:
            return None
        if session["expires"] < time.time():
            SESSIONS.pop(session_id, None)
            return None
        session["expires"] = time.time() + SESSION_TTL_SECONDS
        return session

    def require_auth(self):
        user = self.get_current_user()
        if not user:
            self.send_json({"error": "Authentication required"}, status=HTTPStatus.UNAUTHORIZED)
            return None
        return user

    def send_json(self, payload, status=HTTPStatus.OK, cookies=None):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        if cookies:
            for key, value in cookies.items():
                if isinstance(value, tuple):
                    val, attrs = value
                    cookie = SimpleCookie()
                    cookie[key] = val
                    for attr_key, attr_val in attrs.items():
                        cookie[key][attr_key] = attr_val
                    if 'path' not in attrs:
                        cookie[key]['path'] = '/'
                    if 'httponly' not in attrs:
                        cookie[key]['httponly'] = True
                    if 'samesite' not in attrs:
                        cookie[key]['samesite'] = 'Lax'
                    self.send_header("Set-Cookie", cookie.output(header="", sep="").strip())
                else:
                    cookie = SimpleCookie()
                    cookie[key] = value
                    cookie[key]["httponly"] = True
                    cookie[key]["path"] = "/"
                    cookie[key]["samesite"] = "Lax"
                    self.send_header("Set-Cookie", cookie.output(header="", sep="").strip())
        self.end_headers()
        self.wfile.write(data)


def run_server(host="0.0.0.0", port=8000):
    load_env()
    init_db()
    ensure_default_admin()
    ensure_sample_listings()
    httpd = HTTPServer((host, port), AppHandler)
    print(f"Server running on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server")


if __name__ == "__main__":
    run_server()
