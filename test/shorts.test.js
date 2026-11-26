import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import { Video } from "../src/models/video.model.js";
import { isValidShortDuration } from "../src/utils/videoValidation.js";
import videoRouter from "../src/routes/video.routes.js";

const app = express();
app.use("/videos", videoRouter);
app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({ message: error.message });
});

let server;
let endpoint;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  endpoint = `http://127.0.0.1:${server.address().port}/videos/shorts`;
});

after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
});

test("accepts short durations from above zero through 60 seconds", () => {
  assert.equal(isValidShortDuration(0.5), true);
  assert.equal(isValidShortDuration(60), true);
  assert.equal(isValidShortDuration(60.01), false);
  assert.equal(isValidShortDuration(0), false);
  assert.equal(isValidShortDuration(Number.NaN), false);
});

test("lists only published short videos and caps requested page size", async () => {
  const originalFind = Video.find;
  const shortVideo = { _id: "short-1", isShort: true };
  let queryFilter;
  let requestedLimit;
  let requestedSort;
  let requestedPopulation;

  Video.find = (filter) => {
    queryFilter = filter;
    const query = {
      populate: (fields) => {
        requestedPopulation = fields;
        return query;
      },
      sort: (sort) => {
        requestedSort = sort;
        return query;
      },
      limit: (limit) => {
        requestedLimit = limit;
        return Promise.resolve([shortVideo]);
      },
    };
    return query;
  };

  try {
    const response = await fetch(`${endpoint}?limit=999`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(queryFilter, { isPublished: true, isShort: true });
    assert.equal(requestedLimit, 50);
    assert.deepEqual(requestedSort, { views: -1, createdAt: -1 });
    assert.equal(requestedPopulation, "owner");
    assert.deepEqual(body.data.videos, [shortVideo]);
  } finally {
    Video.find = originalFind;
  }
});

test("new videos default to standard video format", () => {
  assert.equal(Video.schema.path("isShort").defaultValue, false);
});
