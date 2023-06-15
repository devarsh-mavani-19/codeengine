const chai = require("chai");
const mocha = require("mocha");
const Job = require("../job");

describe("Execute Code Tests", () => {
	it("Can Execute Code", async () => {
		let job = new Job({
			runtime: "java",
			file: "test.java",
			args: [],
			timeout: 1000,
			memory_limit: 1000,
		});
		let res = await job.execute();
		assert.equal(res.language, "java");
	});
});
