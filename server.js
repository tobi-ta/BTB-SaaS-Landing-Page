const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;
const submissionsDir = path.join(root, "data");
const submissionsFile = path.join(submissionsDir, "applications.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function resolvePath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const absolutePath = path.normalize(path.join(root, cleanPath));

  if (!absolutePath.startsWith(root)) {
    return null;
  }

  return absolutePath;
}

function ensureSubmissionStore() {
  if (!fs.existsSync(submissionsDir)) {
    fs.mkdirSync(submissionsDir, { recursive: true });
  }

  if (!fs.existsSync(submissionsFile)) {
    fs.writeFileSync(submissionsFile, "[]", "utf8");
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/apply") {
    readRequestBody(request)
      .then((body) => {
        let payload;

        try {
          payload = JSON.parse(body || "{}");
        } catch (error) {
          sendJson(response, 400, { error: "Invalid request body." });
          return;
        }

        const requiredFields = ["name", "email", "company", "revenue_stage", "pain_point", "desired_outcome"];
        const missingField = requiredFields.find((field) => !String(payload[field] || "").trim());

        if (missingField) {
          sendJson(response, 400, { error: `Missing required field: ${missingField}` });
          return;
        }

        ensureSubmissionStore();

        const existing = JSON.parse(fs.readFileSync(submissionsFile, "utf8"));
        existing.push({
          ...payload,
          submitted_at: new Date().toISOString(),
        });
        fs.writeFileSync(submissionsFile, JSON.stringify(existing, null, 2), "utf8");

        sendJson(response, 200, { ok: true });
      })
      .catch(() => {
        sendJson(response, 500, { error: "Unable to save the application." });
      });

    return;
  }

  const requestedPath = resolvePath(request.url.split("?")[0]);

  if (!requestedPath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.readFile(requestedPath, (error, file) => {
    if (error) {
      const fallbackPath = path.join(root, "index.html");

      fs.readFile(fallbackPath, (fallbackError, fallbackFile) => {
        if (fallbackError) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not found");
          return;
        }

        response.writeHead(200, { "Content-Type": mimeTypes[".html"] });
        response.end(fallbackFile);
      });

      return;
    }

    const ext = path.extname(requestedPath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(file);
  });
});

server.listen(port, () => {
  console.log(`BTB landing page running at http://localhost:${port}`);
});
