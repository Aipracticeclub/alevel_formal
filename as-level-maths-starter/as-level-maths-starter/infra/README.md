# C: server and domain

Run the same Node.js app on an Alibaba Cloud Linux server. The GitHub repository stores the code; the server runs it.
This is a deployment starting point, not a server configured by this starter.

1. Install Node.js 24 and clone the team's repository into a dedicated folder, for example `/srv/club-web`.
2. Copy `.env.example` to `.env`. Keep `HOST=127.0.0.1` and `PORT=3000`; choose a database path on persistent local storage.
3. As the app's non-root service user, import the intended data using `npm run import -- path/to/questions.json`. The service user must be able to write to the storage directory.
4. Test with `npm start`, then configure a process manager or systemd service to restart it after failures and reboots. Use the project folder as the working directory and `npm start` as the command. Node's `.env` loading depends on that directory.
5. Point the domain's DNS record to the server IP. Put Nginx in front of `http://127.0.0.1:3000` and configure HTTPS for the domain. Proxy the entire site, including `/api/`, to the same app.
6. Allow public HTTP/HTTPS in the server firewall and Alibaba Cloud security group. Restrict SSH access; keep port 3000 private.
7. Verify the public homepage, search, answers, mobile layout, and `/api/health`. Follow any domain or hosting requirements applicable to your selected region before launch.

Example Nginx location inside your domain's server block (HTTPS certificate configuration is separate):

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Use a separate checkout, port, and database for testing. Never point a test server at the live database.
Keep `.env`, database files, certificates, and server credentials out of GitHub.
For a simple consistent backup, stop the app and any imports before copying the database file; then restart the app. SQLite's online backup tools are another option.
Before a release, record the current commit and back up the data. Test the new version first; deploy that reviewed commit.
Rolling back code may also require restoring compatible data after a schema change.
Automatic cloud deployment and migration automation are intentionally left for C to configure with F.
