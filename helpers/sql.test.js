/**
 * unit tests for sql helper methods
 */

const { sqlForPartialUpdate, sqlForFilteringCompaniesBy } = require('./sql');



describe("sqlForPartialUpdate unit tests", () => {
  const updateData = {
    stringProp: 'test string',
    intProp: 12345,
    decProp: 67.89,
    nullProp: null,
    boolProp: false,
    keep_bool: true // key should not change name
  };
  
  const jsToSql = {
    stringProp: "string_prop",
    intProp: "int_prop",
    decProp: "dec_prop",
    boolProp: "bool_prop",
    nullProp: "null_prop"
  };


  describe("sqlForPartialUpdate with valid inputs", () => {
    test("returns correct setCols string and values in correct order", () => {
      const expected = {
        setCols: '"string_prop"=$1, "int_prop"=$2, "dec_prop"=$3, "null_prop"=$4, "bool_prop"=$5, "keep_bool"=$6',
        values: ['test string', 12345, 67.89, null, false, true]
      };
  
      const output = sqlForPartialUpdate(updateData, jsToSql);
    
      expect(output).toEqual(expected);
    });
    
    test("returns setCols as a string of unformatted column names when jsToSql is empty", () => {
      const expected = {
        setCols: '"stringProp"=$1, "intProp"=$2, "decProp"=$3, "nullProp"=$4, "boolProp"=$5, "keep_bool"=$6',
        values: ['test string', 12345, 67.89, null, false, true]
      };
  
      const output = sqlForPartialUpdate(updateData, {});
    
      expect(output).toEqual(expected);
    });
  
    test("returns correct output when value in dataToUpdate is 0", () => {
      const expected = {
        setCols: '"zero"=$1',
        values: [0]
      }
      const output = sqlForPartialUpdate({ zero: 0 }, {});
  
      expect(output).toEqual(expected);
    });
  
    test("returns correct output when value in dataToUpdate is the maximum 4-byte integer", () => {
      const MAX = Math.pow(2, 32) / 2 - 1;
      
      const expected = {
        setCols: '"max"=$1',
        values: [MAX]
      }
      const output = sqlForPartialUpdate({ max: MAX }, {});
  
      expect(output).toEqual(expected);
    });
  
    test("returns correct output when value in dataToUpdate is a string of length 25", () => {
      const maxString = 'a'.repeat(25);
  
      const expected = {
        setCols: '"maxString"=$1',
        values: [maxString]
      }
      const output = sqlForPartialUpdate({ maxString }, {});
  
      expect(output).toEqual(expected);
    })
  
  });
  
  describe("sqlForPartialUpdate with invalid inputs", () => {
  
    test("throws an error when dataToUpdate is empty", () => {
  
      expect(() => sqlForPartialUpdate({}, jsToSql)).toThrow('No data');
    });
  
    test("throws an error if no args are provided", () => {
  
      expect(sqlForPartialUpdate).toThrow('Missing args');
    });
  
    test("throws an error if 1 arg is provided", () => {
  
      expect(() => sqlForPartialUpdate(updateData)).toThrow('Missing args');
    });
  
    test("throws error if not object literal", () => {
  
      expect(() => sqlForPartialUpdate([], jsToSql)).toThrow('Args must be object literals');
    });
  });
});
// end sqlForPartialUpdate unit tests

describe("sqlForFilteringCompaniesBy unit tests", () => {
  let criteria;
  let expected;
  const criteriaToSql = {
    name: 'name ILIKE',
    minEmployees: 'num_employees >=',
    maxEmployees: 'num_employees <='
  };
  
  beforeEach(() => {
    criteria = {
      name: 'company name',
      minEmployees: 10,
      maxEmployees: 999
    };

    expected = {
      sqlConditions: 'name ILIKE $1 AND num_employees >= $2 AND num_employees <= $3',
      values: ['%company name%', 10, 999]
    };

  });
  
  describe("sqlForFilteringCompaniesBy with valid inputs", () => {
    
    test("returns the correct sql conditions and their values in order with all criteria provided", () => {

      const output = sqlForFilteringCompaniesBy(criteria);

      expect(output).toEqual(expected);
    });

    test("returns the correct sql condition and its value with 1 criterion provided", () => {
      Object.entries(criteria).forEach(([k, v]) => {

        const criterion = {};
        criterion[k] = v;
        const { sqlConditions, values } = sqlForFilteringCompaniesBy(criterion);
        
        expect(sqlConditions).toBe(`${criteriaToSql[k]} $1`);
        typeof(values[0]) === 'string' ? expect(values[0]).toContain(criteria[k]) 
                                        : expect(values[0]).toEqual(criteria[k]);
        expect(values).toHaveLength(1);
      });
    });
  });
  
  describe("sqlForFilteringCompanniesBy with invalid inputs", () => {
    test("throws error if no properties in criteria match minEmployees, maxEmployees, or name", () => {

      
      expect(() => sqlForFilteringCompaniesBy({ age: 99 })).toThrow('Could not filter by criteria provided');
    });

    test("throws error if minEmployees > maxEmployees", () => {
      criteria.minEmployees = 9999;

      expect(() => sqlForFilteringCompaniesBy(criteria)).toThrow('maxEmployees must be greater than or equal to minEmployees')
    });

    test("returns the correct sql conditions and their values in order when given an additional invalid criterion", () => {
      criteria.invalid = 'invalid'; // add a new invalid criterion

      const output = sqlForFilteringCompaniesBy(criteria);

      expect(output).toEqual(expected);
    })
  });
  
});