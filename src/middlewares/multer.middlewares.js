import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const megabyte = 1024 * 1024;
const maxVideoBytes = 500 * megabyte;
const maxImageBytes = 5 * megabyte;
const tempDirectory = path.join(os.tmpdir(), "lets-do-it-uploads");

await mkdir(tempDirectory, { recursive: true, mode: 0o700 });

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoMimeTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const imageFields = new Set(["avatar", "coverImage", "thumbnail"]);

const storage = {
  _handleFile(req, file, callback) {
    const maxBytes = file.fieldname === "videoFile" ? maxVideoBytes : maxImageBytes;
    const extension = path.extname(file.originalname).toLowerCase();
    const filepath = path.join(tempDirectory, `${randomUUID()}${extension}`);
    let size = 0;

    const sizeLimiter = new Transform({
      transform(chunk, encoding, done) {
        size += chunk.length;
        if (size > maxBytes) {
          const error = new multer.MulterError("LIMIT_FILE_SIZE", file.fieldname);
          error.statusCode = 413;
          done(error);
          return;
        }
        done(null, chunk);
      },
    });

    pipeline(file.stream, sizeLimiter, createWriteStream(filepath, { flags: "wx" }))
      .then(() => callback(null, {
        destination: tempDirectory,
        filename: path.basename(filepath),
        path: filepath,
        size,
      }))
      .catch(async (error) => {
        try {
          await rm(filepath, { force: true });
        } catch (cleanupError) {
          error.cleanupError = cleanupError;
        }
        callback(error);
      });
  },

  _removeFile(req, file, callback) {
    rm(file.path, { force: true }).then(
      () => callback(null),
      callback,
    );
  },
};

const fileFilter = (req, file, callback) => {
  const allowedTypes = imageFields.has(file.fieldname)
    ? imageMimeTypes
    : file.fieldname === "videoFile"
      ? videoMimeTypes
      : null;

  if (!allowedTypes) {
    callback(new ApiError(400, "Unexpected upload field"));
    return;
  }

  if (!allowedTypes.has(file.mimetype)) {
    callback(new ApiError(400, `Unsupported file type for ${file.fieldname}`));
    return;
  }

  callback(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 3,
    fields: 10,
    parts: 13,
    fieldSize: 16 * 1024,
  },
});

const listUploadedFiles = (req) =>
  req.file ? [req.file] : Object.values(req.files || {}).flat();

const hasValidSignature = async (file) => {
  const handle = await open(file.path, "r");
  const header = Buffer.alloc(16);

  try {
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (imageFields.has(file.fieldname)) {
      return (
        (bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) ||
        (bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (bytesRead >= 12 && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP")
      );
    }

    return (
      (bytesRead >= 8 && header.toString("ascii", 4, 8) === "ftyp") ||
      (bytesRead >= 4 && header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
    );
  } finally {
    await handle.close();
  }
};

export const validateUploadedFiles = (requiredFields = []) => async (req, res, next) => {
  const files = listUploadedFiles(req);

  try {
    for (const field of requiredFields) {
      if (!files.some((file) => file.fieldname === field)) {
        throw new ApiError(400, `${field} file is required`);
      }
    }

    for (const file of files) {
      if (!(await hasValidSignature(file))) {
        throw new ApiError(400, `Invalid file contents for ${file.fieldname}`);
      }
    }

    next();
  } catch (error) {
    await Promise.all(files.map((file) => rm(file.path, { force: true })));
    next(error);
  }
};
