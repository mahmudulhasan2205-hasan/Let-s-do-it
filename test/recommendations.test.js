import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";

process.env.ACCESS_TOKEN_SECRET = "test-access-token-secret";

const [{ default: videoRouter }, { User }, { Video }, { Like }, { Subscription }] =
  await Promise.all([
    import("../src/routes/video.routes.js"),
    import("../src/models/user.model.js"),
    import("../src/models/video.model.js"),
    import("../src/models/like.model.js"),
    import("../src/models/subscription.model.js"),
  ]);

const userId = "64a000000000000000000001";
const likedCreatorId = "64a000000000000000000002";
const subscribedCreatorId = "64a000000000000000000003";
const watchedCreatorId = "64a000000000000000000004";
const likedVideoId = "64a000000000000000000005";
const watchedVideoId = "64a000000000000000000006";
const accessToken = jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET);
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
  endpoint = `http://127.0.0.1:${server.address().port}/videos/recommended`;
});

after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
});

const makeQuery = (result, onLimit = () => {}) => {
  const query = {
    select: () => query,
    sort: () => query,
    limit: (limit) => {
      onLimit(limit);
      return query;
    },
    populate: () => query,
    lean: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

const makeVideo = (id, owner, title) => ({
  _id: id,
  owner: { _id: owner, username: title.toLowerCase(), fullName: title },
  title,
  views: 10,
  createdAt: new Date(),
});

test("provides recent and popular published videos to signed-out visitors", async () => {
  const originalFind = Video.find;
  const candidate = makeVideo("64a000000000000000000007", likedCreatorId, "Explore");
  const filters = [];
  const requestedLimits = [];
  Video.find = (filter) => {
    filters.push(filter);
    return makeQuery([candidate], (limit) => requestedLimits.push(limit));
  };

  try {
    const response = await fetch(`${endpoint}?limit=999&search=music.mix`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.personalized, false);
    assert.deepEqual(body.data.videos.map((video) => video._id), [candidate._id]);
    assert.equal(filters.length, 2);
    assert.ok(filters.every((filter) => filter.isPublished === true));
    assert.ok(filters.every((filter) => filter.title.$regex === "music\\.mix"));
    assert.deepEqual(requestedLimits, [100, 100]);
  } finally {
    Video.find = originalFind;
  }
});

test("rejects ambiguous repeated search parameters", async () => {
  const response = await fetch(`${endpoint}?search=one&search=two`);

  assert.equal(response.status, 400);
});

test("ranks followed and liked creators while keeping watched videos in recommendations", async () => {
  const originals = {
    findUser: User.findById,
    findVideos: Video.find,
    findLikes: Like.find,
    findSubscriptions: Subscription.find,
  };
  const likedPick = makeVideo("64a000000000000000000008", likedCreatorId, "Liked creator");
  const subscribedPick = makeVideo("64a000000000000000000009", subscribedCreatorId, "Subscribed creator");
  const watchedPick = makeVideo("64a000000000000000000010", watchedCreatorId, "Watched creator");
  const previouslyWatched = makeVideo(watchedVideoId, watchedCreatorId, "Previously watched");
  const candidateGroups = [likedPick, subscribedPick, watchedPick, previouslyWatched];
  const candidateFilters = [];

  User.findById = () => ({
    select: (selection) => selection === "watchHistory"
      ? makeQuery({ watchHistory: [watchedVideoId] })
      : Promise.resolve({ _id: userId }),
  });
  Like.find = () => makeQuery([{ video: likedVideoId }]);
  Subscription.find = () => makeQuery([{ channel: subscribedCreatorId }]);
  Video.find = (filter) => {
    if (filter._id?.$in) {
      return makeQuery([
        { _id: likedVideoId, owner: likedCreatorId },
        { _id: watchedVideoId, owner: watchedCreatorId },
      ]);
    }

    candidateFilters.push(filter);
    return makeQuery(candidateGroups);
  };

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.personalized, true);
    assert.deepEqual(body.data.videos.slice(0, 2).map((video) => video._id), [likedPick._id, subscribedPick._id]);
    assert.ok(body.data.videos.some((video) => video._id === watchedVideoId));
    assert.equal(candidateFilters.length, 3);
    assert.ok(candidateFilters.every((filter) => filter.owner?.$ne === userId || filter.owner?.$in));
    assert.ok(candidateFilters.every((filter) => !filter._id?.$nin?.includes(watchedVideoId)));
  } finally {
    User.findById = originals.findUser;
    Video.find = originals.findVideos;
    Like.find = originals.findLikes;
    Subscription.find = originals.findSubscriptions;
  }
});
