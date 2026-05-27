const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 3000;
const rootDir = __dirname;
const admissionsFile = path.join(rootDir, "admissions.csv");
const requiredFields = ["studentName", "parentName", "phone"];
const csvHeaders = [
  "Submitted At",
  "Student Name",
  "Parent / Guardian Name",
  "Phone Number",
  "Email",
  "Current Class",
  "Course",
  "Preferred Batch",
  "City / Area",
  "Message",
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".csv": "text/csv; charset=utf-8",
};

const ensureAdmissionsFile = () => {
  if (!fs.existsSync(admissionsFile)) {
    fs.writeFileSync(admissionsFile, `${csvHeaders.join(",")}\n`, "utf8");
  }
};

const csvCell = (value = "") => {
  const cleanValue = String(value).replace(/\r?\n/g, " ").trim();
  return `"${cleanValue.replace(/"/g, '""')}"`;
};

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
};

const readRequestBody = (request) => new Promise((resolve, reject) => {
  let body = "";

  request.on("data", (chunk) => {
    body += chunk;

    if (body.length > 1_000_000) {
      request.destroy();
      reject(new Error("Request is too large."));
    }
  });

  request.on("end", () => resolve(body));
  request.on("error", reject);
});

const saveAdmission = async (request, response) => {
  try {
    const body = await readRequestBody(request);
    const data = JSON.parse(body || "{}");
    const missingField = requiredFields.find((field) => !String(data[field] || "").trim());

    if (missingField) {
      sendJson(response, 400, { message: "Student name, guardian name, and phone number are required." });
      return;
    }

    if (!/^[0-9]{10}$/.test(String(data.phone || ""))) {
      sendJson(response, 400, { message: "Phone number must contain exactly 10 digits." });
      return;
    }

    ensureAdmissionsFile();

    const row = [
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      data.studentName,
      data.parentName,
      data.phone,
      data.email,
      data.classLevel,
      data.course,
      data.batch,
      data.city,
      data.message,
    ].map(csvCell).join(",");

    fs.appendFileSync(admissionsFile, `${row}\n`, "utf8");
    sendJson(response, 201, { message: "Admission saved successfully." });
  } catch (error) {
    sendJson(response, 500, { message: "Unable to save admission data." });
  }
};

const serveStaticFile = (request, response) => {
  const requestedUrl = new URL(request.url, `http://${request.headers.host}`);
  const safePath = requestedUrl.pathname === "/"
    ? "index.html"
    : decodeURIComponent(requestedUrl.pathname.slice(1));
  const filePath = path.resolve(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    response.end(data);
  });
};

ensureAdmissionsFile();

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/admissions") {
    saveAdmission(request, response);
    return;
  }

  if (request.method === "GET") {
    serveStaticFile(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`NMR Academy website running at http://localhost:${port}`);
  console.log(`Admission data file: ${admissionsFile}`);
});
