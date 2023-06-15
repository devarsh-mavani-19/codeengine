const chai = require("chai");
const mocha = require("mocha");
const Job = require("../job");

describe("Execute Code Tests", () => {
	it("Can Execute Code", async () => {
		let job = new Job({
			runtime: "javascript",
			files: [
				{
					name: "code.js",
					content: "console.log(process.argv)",
				},
			],
			args: ["Hello"],
			timeout: 1000,
			memory_limit: 1000,
		});
		let res = await job.execute();
		assert.equal(res.language, "java");
	});

	it("Fails to execute code", async () => {
		let job = new Job({
			runtime: "javascriptxx",
			files: [
				{
					name: "code.js",
					content: "console.log(process.argv)",
				},
			],
			args: [],
			timeout: 1000,
			memory_limit: 1000,
		});
		let res = await job.execute();
		assert.equal(res.message, "language is required as a string");
	});
});
