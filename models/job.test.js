"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require('./job');
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", () => {
  const newJob = {
    title: 'new title',
    salary: 100000,
    equity: 0.5,
    companyHandle: 'c1'
  };

  test("works", async () => {
    // returns correct job object
    const job = await Job.create(newJob);
    expect(job).toEqual({
      ...newJob,
      equity: '' + newJob.equity,
      id: expect.any(Number)
    });

    // adds job data to db
    const result = await db.query(`
      SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE title = $1
    `, [job.title]);

    expect(result.rows).toEqual([job]);
  });

  test("bad request if company does not exist", async () =>{
    try {
      await Job.create({
        title: 'new title',
        salary: 100000,
        equity: 0.5,
        companyHandle: 'nonexistant'
      });
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */
describe("findAll", () => {
  test("works: no filter", async () => {
    const jobs = await Job.findAll();
    
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j1',
        salary: 90000,
        equity: '0',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j2',
        salary: 50000,
        equity: '0.1',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j3',
        salary: 70000,
        equity: '0.3',
        companyHandle: 'c3'
      },
    ]);
  });
});
/************************************** filterBy */

describe("filterBy", () => {
  test("filtering by title returns all jobs with matching title (case-insensitive)", async () => {
    const jobs = await Job.filterBy({ title: '1' });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j1',
        salary: 90000,
        equity: '0',
        companyHandle: 'c1'
      }
    ]);
  });

  test("filtering by minSalary returns all jobs with at least minSalary", async () => {
    const jobs = await Job.filterBy({ minSalary: 80000 });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j1',
        salary: 90000,
        equity: '0',
        companyHandle: 'c1'
      },
    ]);
  });

  test("filtering by hasEquity=true returns all jobs that provide a non-zero equity", async () => {
    const jobs = await Job.filterBy({ hasEquity: true });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j2',
        salary: 50000,
        equity: '0.1',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j3',
        salary: 70000,
        equity: '0.3',
        companyHandle: 'c3'
      },
    ]);
  });

  test("filtering by hasEquity=false returns all jobs regardless of equity", async () => {
    const jobs = await Job.filterBy({ hasEquity: false });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j1',
        salary: 90000,
        equity: '0',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j2',
        salary: 50000,
        equity: '0.1',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j3',
        salary: 70000,
        equity: '0.3',
        companyHandle: 'c3'
      },
    ]);
  });

  test("filtering by invalid criteria throws an error", async () => {
    try {
      await Job.filterBy({ invalidCriterion: 'invalid' });
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("filtering with both valid and invalid criteria ignores invalid criteria and returns jobs that meet the valid criteria", async () => {
    const jobs = await Job.filterBy({ 
      hasEquity: true, 
      invalid: 'invalid' 
    });

    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j2',
        salary: 50000,
        equity: '0.1',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j3',
        salary: 70000,
        equity: '0.3',
        companyHandle: 'c3'
      },
    ]);
  });

  test("returns no jobs if no jobs match criteria", async () => {
    const jobs = await Job.filterBy({ title: 'does not exist' });
    expect(jobs).toEqual([]);
  });

  test("applying multiply filters returns the correct results", async () => {
    const jobs = await Job.filterBy({ title: 'j', hasEquity: true });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 'j2',
        salary: 50000,
        equity: '0.1',
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: 'j3',
        salary: 70000,
        equity: '0.3',
        companyHandle: 'c3'
      },
    ]);
  });
});

/************************************** get */
describe ("get", () => {
  test("works", async () => {
    // get job id
    const idResult = await db.query(`
      SELECT id
      FROM jobs
      WHERE title = 'j1'
    `);

    const { id } = idResult.rows[0];
    
    const job = await Job.get(id);

    expect(job).toEqual({
      id,
      title: 'j1',
      salary: 90000,
      equity: '0',
      companyHandle: 'c1'
    });

  });

  test("not found if no such job", async () => {
    try {
      await Job.get(0);
    } catch (err) {
      expect (err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", () => {
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

  const updateData = {
    title: "new title",
    salary: 123456,
    equity: 0.123
  };

  test("works", async () => {
    const job = await Job.update(j1ID, updateData)

    expect(job).toEqual({
      id: j1ID,
      title: "new title",
      salary: 123456,
      equity: '0.123',
      companyHandle: 'c1',
    });

    const jobResult = await db.query(`
      SELECT id, title, salary, equity, company_handle 
      FROM jobs
      WHERE id = $1
    `, [j1ID]);

    expect(jobResult.rows).toEqual([
      {
        id: j1ID,
        title: "new title",
        salary: 123456,
        equity: '0.123',
        company_handle: 'c1'
      }
    ]);

  });

  test("works: null fields", async () => {
    const updateDataSetNulls = {
      title: "new title",
      salary: null,
      equity: null
    };

    const job = await Job.update(j1ID, updateDataSetNulls);

    expect(job).toEqual({
      id: j1ID,
      companyHandle: 'c1',
      ...updateDataSetNulls
    });

    const jobResult = await db.query(`
      SELECT id, title, salary, equity, company_handle
      FROM jobs
      WHERE id = $1
    `, [j1ID]);

    expect(jobResult.rows).toEqual([
      {
        id: j1ID,
        title: "new title",
        salary: null,
        equity: null,
        company_handle: 'c1'
      }
    ]);
  });

  test("not found if no such job", async () => {
    try {
      await Job.update(0, { title: "new title" });
    } catch (err) {
      expect (err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async () => {
    try {
      await Job.update(j1ID, {});
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", () => {
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

  test("works", async () => {
    await Job.remove(j1ID);

    const result = await db.query(`
      SELECT id
      FROM jobs
      WHERE id = $1
    `, [j1ID]);

    expect(result.rows.length).toEqual(0);
  });

  test("not found if no such job", async () => {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  })
})