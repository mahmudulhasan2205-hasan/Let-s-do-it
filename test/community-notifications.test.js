import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";

process.env.ACCESS_TOKEN_SECRET = "test-access-token-secret";

const [
  { default: notificationRouter },
  { default: tweetRouter },
  { User },
  { Notification },
  { Subscription },
  { Tweet },
] = await Promise.all([
  import("../src/routes/notification.routes.js"),
  import("../src/routes/tweet.routes.js"),
  import("../src/models/user.model.js"),
  import("../src/models/notification.model.js"),
  import("../src/models/subscription.model.js"),
  import("../src/models/tweet.model.js"),
]);

const userId = "64a000000000000000000001";
const followedCreatorId = "64a000000000000000000002";
const notificationId = "64a000000000000000000003";
const accessToken = jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET);
const app = express();
app.use(express.json());
app.use("/notifications", notificationRouter);
app.use("/tweets", tweetRouter);
app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({ message: error.message });
});

let server;
let endpoint;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  endpoint = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
});

const authHeaders = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

const queryWithResult = (result) => {
  const query = {
    select: () => query,
    populate: () => query,
    sort: () => query,
    limit: () => query,
    lean: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

const withUserLookup = async (callback) => {
  const originalFindById = User.findById;
  User.findById = () => ({ select: async () => ({ _id: userId }) });
  try {
    return await callback();
  } finally {
    User.findById = originalFindById;
  }
};

test("notification feed is scoped to the signed-in user and includes unread count", async () => {
  await withUserLookup(async () => {
    const originalFind = Notification.find;
    const originalCount = Notification.countDocuments;
    const rows = [{ _id: notificationId, recipient: userId }];
    let query;
    Notification.find = (filter) => {
      query = filter;
      return queryWithResult(rows);
    };
    Notification.countDocuments = async (filter) => {
      assert.deepEqual(filter, { recipient: userId, readAt: null });
      return 1;
    };

    try {
      const response = await fetch(`${endpoint}/notifications`, { headers: authHeaders });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(query, { recipient: userId });
      assert.deepEqual(body.data.notifications, rows);
      assert.equal(body.data.unreadCount, 1);
    } finally {
      Notification.find = originalFind;
      Notification.countDocuments = originalCount;
    }
  });
});

test("mark-read cannot update another user's notification", async () => {
  await withUserLookup(async () => {
    const originalFindOneAndUpdate = Notification.findOneAndUpdate;
    let query;
    Notification.findOneAndUpdate = async (filter) => {
      query = filter;
      return null;
    };

    try {
      const response = await fetch(`${endpoint}/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: authHeaders,
      });

      assert.equal(response.status, 404);
      assert.deepEqual(query, { _id: notificationId, recipient: userId });
    } finally {
      Notification.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });
});

test("community feed contains only the user's posts and followed creators' posts", async () => {
  await withUserLookup(async () => {
    const originals = { subscriptions: Subscription.find, tweets: Tweet.find };
    const post = { _id: "post-1", owner: { _id: followedCreatorId }, content: "Update" };
    let filter;
    Subscription.find = () => queryWithResult([{ channel: followedCreatorId }]);
    Tweet.find = (query) => {
      filter = query;
      return queryWithResult([post]);
    };

    try {
      const response = await fetch(`${endpoint}/tweets/feed`, { headers: authHeaders });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(filter, { owner: { $in: [userId, followedCreatorId] } });
      assert.deepEqual(body.data, [post]);
    } finally {
      Subscription.find = originals.subscriptions;
      Tweet.find = originals.tweets;
    }
  });
});

test("community posts are limited to 500 characters", async () => {
  await withUserLookup(async () => {
    const response = await fetch(`${endpoint}/tweets`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ content: "x".repeat(501) }),
    });

    assert.equal(response.status, 400);
  });
});
