/**
 * Minimal in-memory stand-in for a Mongoose Model, used ONLY under
 * NODE_ENV=test in this sandbox because network policy here blocks
 * mongodb-memory-server's binary download (fastdl.mongodb.org returns
 * 403 via the egress proxy). It implements just enough of the Mongoose
 * query API surface (find/findOne/findById/create/findOneAndUpdate/
 * updateOne/updateMany/countDocuments/.select/.sort/.populate, plus
 * document.save()) for this codebase's service-layer calls to run
 * unmodified against it.
 *
 * In a real environment (local dev, CI, staging, production) this file
 * is never loaded -- the actual Mongoose models + a real MongoDB /
 * MongoDB Atlas connection are used instead. This is a test-only shim,
 * not a replacement for integration testing against real MongoDB.
 */
const crypto = require("crypto");

function genId() {
  return crypto.randomBytes(12).toString("hex");
}

function get(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function set(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function matches(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = get(doc, key);
    if (expected === null) return actual === null || actual === undefined;
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$ne" in expected) return actual !== expected.$ne;
      if ("$in" in expected) {
        const options = expected.$in;
        return Array.isArray(options) && options.some((opt) => String(opt) === String(actual));
      }
      if ("$regex" in expected) {
        const flags = expected.$options || "";
        const re = new RegExp(expected.$regex, flags);
        return typeof actual === "string" && re.test(actual);
      }
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    return String(actual) === String(expected);
  });
}

function applyUpdate(doc, update) {
  if (update.$set) {
    Object.entries(update.$set).forEach(([k, v]) => set(doc, k, v));
  }
  if (update.$addToSet) {
    Object.entries(update.$addToSet).forEach(([k, v]) => {
      const arr = get(doc, k) || [];
      if (!arr.some((item) => String(item) === String(v))) arr.push(v);
      set(doc, k, arr);
    });
  }
  if (update.$pull) {
    Object.entries(update.$pull).forEach(([k, v]) => {
      const arr = get(doc, k) || [];
      set(doc, k, arr.filter((item) => String(item) !== String(v)));
    });
  }
  const plainKeys = Object.keys(update).filter((k) => !k.startsWith("$"));
  plainKeys.forEach((k) => set(doc, k, update[k]));
  doc.updatedAt = new Date();
}

/** Removes fields not visible under the given selection, on a *copy*.
 * Uses structuredClone (not JSON round-tripping) so Date fields like
 * expiresAt/lastActivityDate survive as real Date instances, matching
 * what Mongoose documents actually hand back to service code. */
function stripHidden(doc, hiddenFields, explicitlySelected) {
  const clone = structuredClone(doc);
  hiddenFields.forEach((field) => {
    if (!explicitlySelected.includes(field)) {
      const parts = field.split(".");
      let cur = clone;
      for (let i = 0; i < parts.length - 1; i += 1) {
        if (cur[parts[i]] == null) return;
        cur = cur[parts[i]];
      }
      delete cur[parts[parts.length - 1]];
    }
  });
  return clone;
}

/** Wraps a plain (already field-filtered) object so it behaves enough
 * like a Mongoose document: .save() merges whatever fields are currently
 * present on this object back onto the live store record (so hidden
 * fields that were never selected, and therefore never present here,
 * are preserved rather than wiped out). */
function wrapDoc(store, filteredDoc, options) {
  const doc = { ...filteredDoc };
  Object.defineProperty(doc, "save", {
    enumerable: false,
    value: async function save() {
      const current = store.get(String(doc._id)) || {};
      const merged = { ...current, ...doc, updatedAt: new Date() };
      store.set(String(doc._id), merged);
      return doc;
    },
  });
  Object.defineProperty(doc, "toObject", {
    enumerable: false,
    value: function toObject() {
      return { ...doc };
    },
  });
  Object.defineProperty(doc, "toJSON", {
    enumerable: false,
    value: function toJSON() {
      const obj = { ...doc };
      if (options.toJSON) return options.toJSON(obj);
      return obj;
    },
  });
  return doc;
}

function createQuery(getResultFn, hiddenFields, toJSON, store) {
  let selected = [];
  let skipN = 0;
  let limitN = null;
  const query = {
    select(fieldsStr) {
      selected = fieldsStr
        .split(" ")
        .filter(Boolean)
        .map((f) => (f.startsWith("+") ? f.slice(1) : f));
      return query;
    },
    sort() {
      return query;
    },
    populate() {
      return query; // relationships aren't traversed in the fake
    },
    skip(n) {
      skipN = n;
      return query;
    },
    limit(n) {
      limitN = n;
      return query;
    },
    then(resolve, reject) {
      try {
        let result = getResultFn();
        const build = (d) => (d ? wrapDoc(store, stripHidden(d, hiddenFields, selected), { toJSON }) : d);
        if (Array.isArray(result)) {
          if (skipN) result = result.slice(skipN);
          if (limitN !== null) result = result.slice(0, limitN);
        }
        const finalResult = Array.isArray(result) ? result.map(build) : build(result);
        resolve(finalResult);
      } catch (err) {
        reject(err);
      }
    },
  };
  return query;
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override !== undefined ? override : base;
  }
  if (typeof base === "object" && base !== null && typeof override === "object" && override !== null) {
    const result = { ...base };
    Object.keys(override).forEach((key) => {
      result[key] = deepMerge(base[key], override[key]);
    });
    return result;
  }
  return override !== undefined ? override : base;
}

function createInMemoryModel({ uniqueFields = [], hiddenFields = [], toJSON, defaults = {} } = {}) {
  const store = new Map();

  function checkUnique(doc, ignoreId) {
    for (const field of uniqueFields) {
      const val = get(doc, field);
      if (val === undefined) continue;
      for (const existing of store.values()) {
        if (ignoreId && String(existing._id) === String(ignoreId)) continue;
        if (String(get(existing, field)) === String(val)) {
          const err = new Error(`Duplicate value for ${field}`);
          err.code = 11000;
          err.keyPattern = { [field]: 1 };
          throw err;
        }
      }
    }
  }

  const model = {
    async create(input) {
      const now = new Date();
      const merged = deepMerge(defaults, input);
      const raw = { _id: genId(), createdAt: now, updatedAt: now, ...merged };
      checkUnique(raw);
      store.set(String(raw._id), raw);
      return wrapDoc(store, stripHidden(raw, hiddenFields, []), { toJSON });
    },
    find(filter = {}) {
      return createQuery(
        () => Array.from(store.values()).filter((d) => matches(d, filter)),
        hiddenFields,
        toJSON,
        store
      );
    },
    findOne(filter = {}) {
      return createQuery(
        () => Array.from(store.values()).find((d) => matches(d, filter)) || null,
        hiddenFields,
        toJSON,
        store
      );
    },
    findById(id) {
      return createQuery(() => store.get(String(id)) || null, hiddenFields, toJSON, store);
    },
    async findByIdAndUpdate(id, update, opts = {}) {
      const doc = store.get(String(id));
      if (!doc) return null;
      applyUpdate(doc, update);
      store.set(String(id), doc);
      return opts.new === false ? null : wrapDoc(store, stripHidden(doc, hiddenFields, []), { toJSON });
    },
    async findOneAndUpdate(filter, update, opts = {}) {
      const doc = Array.from(store.values()).find((d) => matches(d, filter));
      if (!doc) return null;
      checkUnique({ ...doc, ...(update.$set || {}) }, doc._id);
      applyUpdate(doc, update);
      store.set(String(doc._id), doc);
      return opts.new === false ? null : wrapDoc(store, stripHidden(doc, hiddenFields, []), { toJSON });
    },
    async updateOne(filter, update) {
      const doc = Array.from(store.values()).find((d) => matches(d, filter));
      if (!doc) return { matchedCount: 0 };
      applyUpdate(doc, update);
      store.set(String(doc._id), doc);
      return { matchedCount: 1 };
    },
    async updateMany(filter, update) {
      const docs = Array.from(store.values()).filter((d) => matches(d, filter));
      docs.forEach((doc) => {
        applyUpdate(doc, update);
        store.set(String(doc._id), doc);
      });
      return { matchedCount: docs.length };
    },
    async countDocuments(filter = {}) {
      return Array.from(store.values()).filter((d) => matches(d, filter)).length;
    },
    async deleteOne(filter = {}) {
      const doc = Array.from(store.values()).find((d) => matches(d, filter));
      if (!doc) return { deletedCount: 0 };
      store.delete(String(doc._id));
      return { deletedCount: 1 };
    },
    async deleteMany(filter) {
      if (!filter || Object.keys(filter).length === 0) {
        store.clear();
        return;
      }
      const toDelete = Array.from(store.values()).filter((d) => matches(d, filter));
      toDelete.forEach((d) => store.delete(String(d._id)));
    },
    __store: store,
  };

  return model;
}

module.exports = { createInMemoryModel };
