"use strict";

const path = require("path");
const mkdir = require("mkdirp").sync;

const DbService = require("moleculer-db");

module.exports = function (collection) {
  // Make data folder directory
  mkdir(path.resolve("./data"));

  return {
    mixins: [DbService],
    adapter: new DbService.MemoryAdapter({
      filename: `./data/${collection}.db`,
    }),
  };
};
