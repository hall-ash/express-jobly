const { BadRequestError } = require("../expressError");

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
}

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

module.exports = { sqlForPartialUpdate };
