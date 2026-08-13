import { describe, it, expect } from "vitest";
import { toCsv } from "../../../src/utils/csv.js";

describe("toCsv", () => {
  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "price", label: "Price" },
  ];

  it("should generate a CSV string with header and data rows", () => {
    const rows = [
      { id: 1, name: "Coffee", price: 3.5 },
      { id: 2, name: "Tea", price: 2.0 },
    ];

    const result = toCsv(rows, columns);

    expect(result).toBe("ID,Name,Price\n1,Coffee,3.5\n2,Tea,2");
  });

  it("should return only the header row when rows are empty", () => {
    const result = toCsv([], columns);
    expect(result).toBe("ID,Name,Price");
  });

  it("should wrap values containing commas in double quotes", () => {
    const rows = [{ id: 1, name: "Rice, Noodle", price: 5 }];
    const result = toCsv(rows, columns);
    expect(result).toContain('"Rice, Noodle"');
  });

  it("should wrap values containing double quotes and escape them", () => {
    const rows = [{ id: 1, name: 'Say "Hello"', price: 5 }];
    const result = toCsv(rows, columns);
    expect(result).toContain('"Say ""Hello"""');
  });

  it("should wrap values containing newlines in double quotes", () => {
    const rows = [{ id: 1, name: "Line1\nLine2", price: 5 }];
    const result = toCsv(rows, columns);
    expect(result).toContain('"Line1\nLine2"');
  });

  it("should output empty string for null or undefined values", () => {
    const rows = [{ id: 1, name: null, price: undefined }];
    const result = toCsv(rows as never, columns);
    const [, dataRow] = result.split("\n");
    expect(dataRow).toBe("1,,");
  });

  it("should serialize object values as JSON (escaped for CSV)", () => {
    const rows = [{ id: 1, name: { first: "John" }, price: 5 }];
    const result = toCsv(rows as never, columns);
    // JSON is serialized then wrapped in quotes with internal quotes doubled
    expect(result).toContain('{""first"":""John""}');
  });
});
