import assert from "node:assert/strict";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { after, before, test } from "node:test";
import express from "express";
import { upload, validateUploadedFiles } from "../src/middlewares/multer.middlewares.js";

const app = express();
app.post(
  "/upload",
  upload.single("avatar"),
  validateUploadedFiles(["avatar"]),
  async (req, res) => {
    const storedPath = req.file.path;
    await rm(storedPath, { force: true });
    res.status(200).json({ outsidePublic: !storedPath.includes("/public/") });
  },
);
app.use((error, req, res, next) => {
  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : error.name === "MulterError"
      ? error.code === "LIMIT_FILE_SIZE" ? 413 : 400
      : 500;
  res.status(statusCode).json({ message: error.message });
});

let server;
let endpoint;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  endpoint = `http://127.0.0.1:${server.address().port}/upload`;
});

after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
});

const sendAvatar = (mimeType, bytes, filename = "avatar.png") => {
  const formData = new FormData();
  formData.append("avatar", new Blob([bytes], { type: mimeType }), filename);
  return fetch(endpoint, { method: "POST", body: formData });
};

test("accepts a supported image and stores it outside the public directory", async () => {
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  const response = await sendAvatar("image/png", pngHeader);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).outsidePublic, true);
});

test("rejects a file with an image MIME type but invalid image signature", async () => {
  const response = await sendAvatar("image/png", Buffer.from("not an image"));

  assert.equal(response.status, 400);
});

test("rejects images larger than 5 MB", async () => {
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const largeImage = Buffer.concat([pngHeader, Buffer.alloc(5 * 1024 * 1024)]);
  const response = await sendAvatar("image/png", largeImage);

  assert.equal(response.status, 413);
});

test("rejects unsupported image MIME types", async () => {
  const response = await sendAvatar("image/svg+xml", Buffer.from("<svg />"));

  assert.equal(response.status, 400);
});
