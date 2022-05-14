const { BadRequestError } = require("../expressError");
const db = require("../db");

/**
 * Parameterizes sql queries for partial update of a record.
 *  
 * @param {*} dataToUpdate An object containing data to update a record in the sql database. 
 * @param {*} jsToSql An object containing the model properties as keys and the corresponding 
 *                    column name in the table as values. 
 * @returns An object containing a string of comma-separated column names set to their identifiers 
 *          ($n) and a list of their corresponding values. 
 * 
 * Example usage: 
 *  sqlForPartialUpdate({firstName: 'Aliya', age: 32}, {"firstName": "first_name"}) =>
 *  { setCols: '"first_name"=$1, "age"=$2', values: ['Aliya', 32] }
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {

  // throws errors if invalid
  validateArgs(dataToUpdate, jsToSql);

  const keys = Object.keys(dataToUpdate);

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      // convert prop name to col name if necessary
      `"${jsToSql[colName] || colName}"=$${idx + 1}`, // add 1 for 1-based indexing
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
};

/**
 * Helper function to validate arguments for sqlForPartialUpdate.
 * 
 * Throws an error if the arguments provided are missing, are not object literals, or
 * if dataToUpdate is an empty object. Otherwise returns undefined.
 */
const validateArgs = (dataToUpdate, jsToSql) => {
  if (dataToUpdate === undefined || jsToSql === undefined) throw new BadRequestError("Missing args");

  // check if args are object literals
  if (Object.getPrototypeOf(dataToUpdate) !== Object.prototype ||
      Object.getPrototypeOf(jsToSql) !== Object.prototype) {
        throw new BadRequestError("Args must be object literals");
  }

  // check if dataToUpdate is empty
  if (Object.keys(dataToUpdate).length === 0) throw new BadRequestError("No data");
}



/**
 * Returns an object containing the sql conditions and values
 * for a WHERE clause.
 * 
 * Throws a BadRequestError if no criteria are valid.
 * 
 * @param {*} criteria The criteria to filter records by. 
 * @param {*} criteriaToSql The mapping of a criterion to its sql statement. 
 */
const sqlForFilterBy = (criteria, criteriaToSql) => {

  // get a list of all valid criteria by checking if criterion is in 'criteriaToSql'
  const validCriteria = Object.keys(criteria).filter(c => c in criteriaToSql);
  // if no valid criteria are provided throw err
  if (validCriteria.length === 0) throw new BadRequestError('Could not filter by criteria provided');
  
  const values = []; // operand values for the where clause
  
  let paramNum = 1;
  const sqlConditions = validCriteria.filter(c => criteria[c] !== false && criteria[c] !== 'false') // ignore criteria set to false
    .map(c => {
      const sql = criteriaToSql[c];
      if (criteria[c] === true || criteria[c] === 'true') return sql;
        
      // for non-boolean values push to 'values' list and increment paramNum
      values.push(criteria[c]); 
      return sql.includes('ILIKE') ? `${sql} CONCAT('%', $${paramNum++}::text, '%')` : `${sql} $${paramNum++}`; // if matching string add '%'s
  });

  // concatenate sql conditions into string separated by AND
  const whereClause = sqlConditions.length ? 'WHERE ' + sqlConditions.join(' AND ') : '';

  return {
    whereClause,
    values
  };
};

/**
 * Throws a BadRequestError if trying to add a duplicate
 * record to the database.
 * @param {*} table  The table the record is being added to.
 * @param {*} pkName The column name of the primary key.
 * @param {*} pkToCheck The value of the primary key to check for. 
 */
const checkDuplicate = async (table, pkName, pkToCheck ) => {

  const duplicateCheck = await db.query(`
    SELECT ${pkName}
    FROM ${table}
    WHERE ${pkName} = $1
  `, [pkToCheck]);

  if (duplicateCheck.rows[0])
    throw new BadRequestError(`Duplicate: ${pkToCheck} already exists in ${table}`);
};

module.exports = { 
  sqlForPartialUpdate, 
  sqlForFilterBy,
  checkDuplicate 
};
