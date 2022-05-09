"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

const ROUTE = '/jobs';

/************************************** POST /jobs */

describe("POST / jobs", function () {
  const newJob = {
    title: "new",
    salary: 123456,
    equity: 0.123,
    companyHandle: 'c1'
  };

  test("authorized for admins", async function () {
    const resp = await request(app)
        .post(ROUTE)
        .send(newJob)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        ...newJob,
        equity: '0.123',
        id: expect.any(Number)
      },
    });
  });

  test("returns 401 unauthorized for non-admin users", async function () {
    const resp = await request(app)
        .post(ROUTE)
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("returns 401 unauthorized for anons", async function () {
    const resp = await request(app)
        .post(ROUTE)
        .send(newJob)
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post(ROUTE)
        .send({
          title: "new",
          salary: 100000,
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post(ROUTE)
        .send({
          ...newJob,
          salary: "abc",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get(ROUTE);
    expect(resp.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 1,
              equity: '0.1',
              companyHandle: 'c1'
            },
            {
              id: expect.any(Number),
              title: "j2",
              salary: 2,
              equity: '0.2',
              companyHandle: 'c1'
            },
            {
              id: expect.any(Number),
              title: "j3",
              salary: 3,
              equity: '0.3',
              companyHandle: 'c1'
            },
          ],
    });
  });

  test("gets list of jobs filtered by title", async () => {
    const res = await request(app).get(ROUTE)
                      .query({ title: '1'});
    
    expect(res.body).toEqual({
      jobs :
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 1,
              equity: '0.1',
              companyHandle: 'c1'
            },
          ]
    });

    expect(res.statusCode).toEqual(200);
  });

  test("gets list of jobs filtered by hasEquity=true", async () => {
    // add job to db with no equity
    await db.query(`
      INSERT INTO jobs
      (title, salary, equity, company_handle)
      VALUES ('j4', 4, 0, 'c1')
    `);
    
    const res = await request(app).get(ROUTE)
                      .query({ hasEquity: true });
    
    expect(res.body).toEqual({
      jobs :
          [
            {
              id: expect.any(Number),
              title: "j1",
              salary: 1,
              equity: '0.1',
              companyHandle: 'c1'
            },
            {
              id: expect.any(Number),
              title: "j2",
              salary: 2,
              equity: '0.2',
              companyHandle: 'c1'
            },
            {
              id: expect.any(Number),
              title: "j3",
              salary: 3,
              equity: '0.3',
              companyHandle: 'c1'
            },
          ]
    });

    expect(res.body.jobs).not.toContain({
      id: expect.any(Number),
      title: "j4",
      salary: 4,
      equity: '0.0',
      companyHandle: 'c1'
    })

    expect(res.statusCode).toEqual(200);
  });

  test("gets list of jobs filtered by title and minSalary", async () => {
    const res = await request(app).get(ROUTE)
                      .query({ title: 'j', minSalary: 2 });
    
    expect(res.body).toEqual({
      jobs:
          [
            {
              id: expect.any(Number),
              title: "j2",
              salary: 2,
              equity: '0.2',
              companyHandle: 'c1'
            },
            {
              id: expect.any(Number),
              title: "j3",
              salary: 3,
              equity: '0.3',
              companyHandle: 'c1'
            },
          ],
    });

    expect(res.statusCode).toEqual(200);
  });

  test("returns 400 error if criteria are invalid", async () => {
    const res = await request(app).get(ROUTE)
                      .query({ invalid: 'invalid'});

    expect(res.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get(ROUTE)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  let j1ID;
  beforeEach(async () => {
    // get job id
    const idResult = await db.query(`
      SELECT id
      FROM jobs
      WHERE title = 'j1'
    `);

    j1ID = idResult.rows[0].id;
  });
  
  test("works for anon", async function () {
    const resp = await request(app).get(`${ROUTE}/${j1ID}`);
    expect(resp.body).toEqual({
      job: {
        id: j1ID,
        title: "j1",
        salary: 1,
        equity: '0.1',
        companyHandle: 'c1'
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`${ROUTE}/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  let j1ID;
  beforeEach(async () => {
    // get job id
    const idResult = await db.query(`
      SELECT id
      FROM jobs
      WHERE title = 'j1'
    `);

    j1ID = idResult.rows[0].id;
  });

  test("authorized for admins", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/${j1ID}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${adminToken}`);

    expect(resp.body).toEqual({
      job: {
        id: j1ID,
        title: "j1-new",
        salary: 1,
        equity: '0.1',
        companyHandle: 'c1'
      },
    });
  });
  
  test("returns 401 unauthorized for non-admin users", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/${j1ID}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/${j1ID}`)
        .send({
          title: "j1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/0`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/${j1ID}`)
        .send({
          id: 0,
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on companyHandle change attempt", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/${j1ID}`)
        .send({
          companyHandle: 'new handle',
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`${ROUTE}/${j1ID}`)
        .send({
          salary: "not-a-salary",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  
  let j1ID;
  beforeEach(async () => {
    // get job id
    const idResult = await db.query(`
      SELECT id
      FROM jobs
      WHERE title = 'j1'
    `);

    j1ID = idResult.rows[0].id;
  });

  test("authorized for admins", async function () {
    const resp = await request(app)
        .delete(`${ROUTE}/${j1ID}`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: `${j1ID}` });
  });

  test("returns 401 unathorized for non-admin users", async function () {
    const resp = await request(app)
        .delete(`${ROUTE}/${j1ID}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`${ROUTE}/${j1ID}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`${ROUTE}/0`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
