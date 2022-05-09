"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureAuthUserOrAdmin,
} = require("./auth");


const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");


describe("authenticateJWT", function () {
  test("works: via header", function () {
    expect.assertions(2);
    // there are multiple ways to pass an authorization token, this is how you pass it in the header.
    // this has been provided to show you another way to pass the token. 
    // you are only expected to read this code for this project.
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    expect.assertions(2);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});


describe("ensureLoggedIn", function () {
  test("works", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureLoggedIn(req, res, next);
  });
});

describe("ensureAdmin", () => {
  test("authorizes admin", () => {
    const req = {};
    const res = { locals: { user: { isAdmin: true } } };
    const next = err => expect(err).toBeFalsy();
    ensureAdmin(req, res, next);
  });

  test("does not authorize non-admin", () => {
    const req = {};
    const res = { locals: { user: { isAdmin: false } } };
    const next = err => expect(err).toBeInstanceOf(UnauthorizedError);
    ensureAdmin(req, res, next);
  });
});

describe("ensureAuthUserOrAdmin", () => {
  test("authorizes routes for this user", () => {
    const req = { params: { username: 'user' } };
    const res = { locals: { user: { username: 'user' } } };
    const next = err => expect(err).toBeFalsy();
    ensureAuthUserOrAdmin(req, res, next);
  });

  test("authorizes routes for a different user if this user is admin", () => {
    const req = { params: { username: 'another-user' } };
    const res = { locals: { user: { username: 'user', isAdmin: true } } };
    const next = err => expect(err).toBeFalsy();
    ensureAuthUserOrAdmin(req, res, next);
  });

  test("does not authorize routes for a different user if this user is non-admin", () => {
    const req = { params: { username: 'another-user' } };
    const res = { locals: { user: { username: 'user', isAdmin: false } } };
    const next = err => expect(err).toBeInstanceOf(UnauthorizedError);
    ensureAuthUserOrAdmin(req, res, next);
  });
});