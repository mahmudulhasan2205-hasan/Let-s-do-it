import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";

process.env.ACCESS_TOKEN_SECRET = "test-access-token-secret";

const [{ default: videoRouter }, { User }, { Video }] = await Promise.all([
  import("../src/routes/video.routes.js"),
  import("../src/models/user.model.js"),
  import("../src/models/video.model.js"),
]);

const ownerId = "64a000000000000000000001";
const videoId = "64a000000000000000000002";
const accessToken = jwt.sign({ _id: ownerId }, process.env.ACCESS_TOKEN_SECRET);
const app = express();
app.use(express.json());
app.use("/videos", videoRouter);
app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({ message: error.message });
});

let server;
let endpoint;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  endpoint = `http://127.0.0.1:${server.address().port}/videos`;
});

after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
});

const request = (path, options = {}) =>
  fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

const withUserLookup = async (callback) => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: async () => ({ _id: ownerId }),
  });
  try {
    return await callback();
  } finally {
    User.findById = originalFindById;
  }
};

const authHeader = { Authorization: `Bearer ${accessToken}` };

test("rejects requests without an access token", async () => {
  const response = await request("/my-videos");

  assert.equal(response.status, 401);
});

test("returns 401 for malformed and expired access tokens", async () => {
  const tokens = [
    "not-a-valid-token",
    jwt.sign({ _id: ownerId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: -1 }),
  ];

  for (const token of tokens) {
    const response = await request("/my-videos", {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 401);
  }
});

test("returns 404 and scopes video updates to the authenticated owner", async () => {
  await withUserLookup(async () => {
    const originalFindOne = Video.findOne;
    let query;
    Video.findOne = (filter) => {
      query = filter;
      return null;
    };

    try {
      const response = await request(`/${videoId}`, {
        method: "PATCH",
        headers: authHeader,
        body: JSON.stringify({ title: "Unauthorized edit" }),
      });

      assert.equal(response.status, 404);
      assert.deepEqual(query, { _id: videoId, owner: ownerId });
    } finally {
      Video.findOne = originalFindOne;
    }
  });
});

test("rejects malformed video metadata instead of failing as a server error", async () => {
  await withUserLookup(async () => {
    const originalFindOne = Video.findOne;
    Video.findOne = () => ({
      title: "Current title",
      description: "Current description",
      save: async () => {},
    });

    try {
      for (const body of [
        { title: 42 },
        { title: "  " },
        { description: null },
        { description: "  " },
      ]) {
        const response = await request(`/${videoId}`, {
          method: "PATCH",
          headers: authHeader,
          body: JSON.stringify(body),
        });

        assert.equal(response.status, 400);
      }
    } finally {
      Video.findOne = originalFindOne;
    }
  });
});

test("updates metadata for the authenticated video owner", async () => {
  await withUserLookup(async () => {
    const originalFindOne = Video.findOne;
    const video = {
      _id: videoId,
      title: "Old title",
      description: "Old description",
      save: async () => {},
    };
    let query;
    Video.findOne = (filter) => {
      query = filter;
      return video;
    };

    try {
      const response = await request(`/${videoId}`, {
        method: "PATCH",
        headers: authHeader,
        body: JSON.stringify({ title: "  New title  ", description: "  New description  " }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(query, { _id: videoId, owner: ownerId });
      assert.equal(video.title, "New title");
      assert.equal(video.description, "New description");
    } finally {
      Video.findOne = originalFindOne;
    }
  });
});

test("returns 404 and scopes video deletion to the authenticated owner", async () => {
  await withUserLookup(async () => {
    const originalFindOneAndDelete = Video.findOneAndDelete;
    let query;
    Video.findOneAndDelete = (filter) => {
      query = filter;
      return null;
    };

    try {
      const response = await request(`/${videoId}`, {
        method: "DELETE",
        headers: authHeader,
      });

      assert.equal(response.status, 404);
      assert.deepEqual(query, { _id: videoId, owner: ownerId });
    } finally {
      Video.findOneAndDelete = originalFindOneAndDelete;
    }
  });
});

test("returns 404 and scopes publish changes to the authenticated owner", async () => {
  await withUserLookup(async () => {
    const originalFindOne = Video.findOne;
    let query;
    Video.findOne = (filter) => {
      query = filter;
      return null;
    };

    try {
      const response = await request(`/${videoId}/toggle-publish`, {
        method: "PATCH",
        headers: authHeader,
      });

      assert.equal(response.status, 404);
      assert.deepEqual(query, { _id: videoId, owner: ownerId });
    } finally {
      Video.findOne = originalFindOne;
    }
  });
});

test("toggles publish status for the authenticated video owner", async () => {
  await withUserLookup(async () => {
    const originalFindOne = Video.findOne;
    const video = {
      _id: videoId,
      isPublished: true,
      save: async () => {},
    };
    let query;
    Video.findOne = (filter) => {
      query = filter;
      return video;
    };

    try {
      const response = await request(`/${videoId}/toggle-publish`, {
        method: "PATCH",
        headers: authHeader,
      });

      assert.equal(response.status, 200);
      assert.deepEqual(query, { _id: videoId, owner: ownerId });
      assert.equal(video.isPublished, false);
    } finally {
      Video.findOne = originalFindOne;
    }
  });
});

test("scopes viewer analytics to videos owned by the authenticated user", async () => {
  await withUserLookup(async () => {
    const originalFind = Video.find;
    let query;
    Video.find = (filter) => {
      query = filter;
      return { select: async () => [] };
    };

    try {
      const response = await request("/viewers", {
        headers: authHeader,
      });

      assert.equal(response.status, 200);
      assert.deepEqual(query, { owner: ownerId, isPublished: true });
    } finally {
      Video.find = originalFind;
    }
  });
});
