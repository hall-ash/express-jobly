// setup for routes tests

"use strict";

const _ = require('lodash');
const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const { createToken } = require("../helpers/tokens");
const Job = require("../models/job.js");

async function commonBeforeAll() {
  // clear data in tables
  const tables = ['companies', 'users', 'jobs', 'applications'];
  // noinspection SqlWithoutWhere
  await Promise.all(tables.map(t => db.query(`DELETE FROM ${t}`)));

  // create test companies and users
  const numToCreate = 3;
  await Promise.all(_.range(1, numToCreate + 1).reduce((acc, n) => {
    acc.push(Company.create({
      handle: `c${n}`,
      name: `C${n}`,
      numEmployees: n,
      description: `Desc${n}`,
      logoUrl: `http://c${n}.img`
    }));
    acc.push(User.register({
      username: `u${n}`,
      firstName: `U${n}F`,
      lastName: `U${n}L`,
      email: `user${n}@user.com`,
      password: `password${n}`,
      isAdmin: n % 2 === 0 ? true : false,
    }));
    return acc;
  }, []));

  // create test jobs
  const [j1, j2, j3] = await Promise.all(_.range(1, numToCreate + 1).reduce((acc, n) => {
    acc.push(Job.create({
      title: `j${n}`,
      salary: n,
      equity: n / 10,
      companyHandle: `c1`
    }));
    return acc;
  }, []));

  // apply u1 for j1
  // apply u2 for j1, j2
  const jobs = await Promise.all([
    User.applyForJob('u1', j1.id),
    User.applyForJob('u2', j1.id),
    User.applyForJob('u2', j2.id),
  ]);

}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

const u1Token = createToken({ username: "u1", isAdmin: false });
const adminToken = createToken({ username: "u2", isAdmin: true });


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
};
