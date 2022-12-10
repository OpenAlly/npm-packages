// Import Third-party Dependencies
import { expect } from "chai";

// Import Internal Dependencies
import { tSv, TSV_SYMBOL } from "../src/index";

describe("tSv", () => {
  it("should return a function", () => {
    const fn = tSv();

    expect(typeof fn).to.equal("function");
  });

  it("should return a value with an hidden Symbol on it", () => {
    const result = tSv()("");

    expect(result[TSV_SYMBOL]).to.equal(true);
    expect(Object.keys(result).length).to.equal(2);
  });

  it("should return the expected TTL and value", () => {
    const expectedTTL = 500;
    const expectedValue = "foobar";

    const result = tSv({ ttl: expectedTTL })(expectedValue);

    expect(result.ttl).to.equal(expectedTTL);
    expect(result.value).to.equal(expectedValue);
    expect(Object.keys(result).sort())
      .to.deep.equal(["ttl", "value"].sort());
  });

  it("should return an undefined TTL", () => {
    const result = tSv()("");

    expect(result.ttl).to.equal(undefined);
  });
});
