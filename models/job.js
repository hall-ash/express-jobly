"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate, sqlForFilterBy } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {

  static get publicFields() {
    return 'id, title, salary, equity, company_handle AS "companyHandle"';
  }

  /**
   * Create a job from data, update db, return new job data.
   * 
   * data format: { title, salary, equity, companyHandle }
   * 
   * Returns { id, title, salary, equity, companyHandle }
   * 
   */
  static async create({ title, salary, equity, companyHandle }) {
    
    // check if company exists
    const companyResult = await db.query(`
      SELECT handle
      FROM companies
      WHERE handle = $1
    `, [companyHandle]);

    if (companyResult.rows.length === 0) throw new BadRequestError(`No company: ${companyHandle}`);

    // company exists, add job to db
    const jobResult = await db.query(
      `INSERT INTO jobs
       (title, salary, equity, company_handle)
       VALUES ($1, $2, $3, $4)
       RETURNING ${Job.publicFields}`,
      [
        title,
        salary,
        equity,
        companyHandle,
      ]
    );
    const job = jobResult.rows[0];

    return job;
  }

  /**
   * Find all jobs.
   * 
   * Returns [{ title, salary, equity, companyHandle }, ...]
   */
  static async findAll() {

    const jobResults = await db.query(`
      SELECT ${Job.publicFields}
      FROM jobs
      ORDER BY title
    `);

    return jobResults.rows;
  }

  /**
   * Filter jobs by title, minSalary, and/or hasEquity.
   * 
   * sqlForFilterBy throws BadRequestError if no criteria are valid.
   */
  static async filterBy(criteria) {

    // mapping of criteria to sql statements
    const criteriaToSql = {
      title: 'title ILIKE',
      minSalary: 'salary >=',
      hasEquity: 'equity > 0'
    };

    const { whereClause, values } = sqlForFilterBy(criteria, criteriaToSql);

    const jobResults = await db.query(`
      SELECT ${Job.publicFields}
      FROM jobs
      ${whereClause}
      ORDER BY title
    `, [...values]);

    return jobResults.rows;

  }

  /**
   * Given a job id, return data about job.
   * 
   * Returns { title, salary, equity, companyHandle }
   * 
   * Throws NotFoundError if not found.
   */
  static async get(id) {
    const jobResult = await db.query(`
      SELECT ${Job.publicFields}
      FROM jobs
      WHERE id = $1
    `, [id]);

    const job = jobResult.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /**
   * Update data for the job with the given id.
   * 
   * Data can include: { title, salary, equity }
   * 
   * Returns { title, salary, equity, companyHandle }
   * 
   * Throws NotFoundError if not found.
   */
  static async update(id, data) {
    
    const jsToSql = {
      companyHandle: "company_handle",
    }
    const { setCols, values } = sqlForPartialUpdate(data, jsToSql);
    const idParam = "$" + (values.length + 1);

    const jobResult = await db.query(`
      UPDATE jobs
      SET ${setCols}
      WHERE id = ${idParam}
      RETURNING ${Job.publicFields}
    `, [...values, id]);

    const job = jobResult.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /**
   * Delete given job from database; returns undefined.
   * 
   * Throws NotFoundError if job not found.
   */
  static async remove(id) {
    const result = await db.query(`
      DELETE 
      FROM jobs
      WHERE id = $1
      RETURNING id
    `, [id]);

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id ${id}`);
  }

}

module.exports = Job;