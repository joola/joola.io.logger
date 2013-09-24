"use strict";

require('../../lib/utils');

describe("globals", function () {

  it("should format date correctly", function () {
    var _date = new Date();
    var fixtureDate = _date.getFullYear() + '-' + (_date.getMonth() + 1) + '-' + _date.getDate();
    expect(_date.format('yyyy-m-d')).to.equal(fixtureDate);
  });
});