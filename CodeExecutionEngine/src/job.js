const { v4: uuidV4 } = require("uuid");
const config = require("./config");
const path = require("path");
const fs = require("fs");
const cp = require("child_process");
// const wait_pid = require('waitpid');

let uid = 0;
let gid = 0;

class Job {
	constructor({ runtime, file, args, stdin, timeout, memory_limit }) {
		this.uuid = uuidV4();
		this.runtime = runtime;
		this.file = {
			name: file.name,
			content: file.content,
			encoding: ["base64", "hex", "utf8"].includes(file.encoding)
				? file.encoding
				: "utf8",
		};
		this.args = args;
		this.stdin = stdin;
		this.timeout = timeout;
		this.memory_limit = memory_limit;

		this.uid = config.runner_uid_min.default + uid;
		this.gid = config.runner_gid_min.default + gid;

		uid++;
		gid++;

		uid %=
			config.runner_uid_max.default - config.runner_uid_min.default + 1;
		gid %=
			config.runner_gid_max.default - config.runner_gid_min.default + 1;

		this.dir = path.join(config.user_data_directory.default, this.uuid);
	}

	async setup_files() {
		await fs.mkdirSync(this.dir, { mode: 0o700 });
		await fs.chownSync(this.dir, this.uid, this.gid);

		const file_path = path.join(this.dir, this.file.name);
		const rel = path.relative(this.dir, file_path);

		const file_content = Buffer.from(this.file.content, this.file.encoding);

		if (rel.startsWith(".."))
			throw Error(
				`File path "${this.file.name}" tries to escape parent directory: ${rel}`
			);
		await fs.mkdirSync(path.dirname(file_path), {
			recursive: true,
			mode: 0o700,
		});
		await fs.chownSync(path.dirname(file_path), this.uid, this.gid);
		await fs.writeFileSync(file_path, file_content);
		await fs.chmodSync(file_path, 0o765);
		await fs.chownSync(file_path, this.uid, this.gid);
	}

	async execute() {
		let compile;

		console.log(this.stdin);
		if (this.runtime.compiled) {
			compile = await this.safeCompile(
				path.join(this.runtime.pkgdir, "compile"),
				this.file,
				this.timeout.compile,
				this.memory_limit.compile
			);
		}

		const runtimeout = this.timeout.run;
		const runmem = this.memory_limit.run;
		const run = await this.safeCompile(
			path.join(this.runtime.pkgdir, "run"),
			[this.file.name, ...this.args],
			runtimeout,
			runmem
		);

		return {
			type: "success",
			compile,
			run,
			language: this.runtime.language,
			version: this.runtime.version,
		};
	}

	async safeCompile(
		compileScript,
		args,
		timeout_compile,
		memory_limit_compile
	) {
		return new Promise((resolve, reject) => {
			const nonetwork = ["nosocket"];

			const prlimit = [
				"prlimit",
				"--nproc=" + this.runtime.max_process_count,
				"--nofile=" + this.runtime.max_open_files,
				"--fsize=" + this.runtime.max_file_size,
			];

			const timeout_call = [
				"timeout",
				"-s",
				"9",
				Math.ceil(timeout_compile / 1000),
			];

			if (memory_limit_compile >= 0) {
				console.log(memory_limit_compile);
				prlimit.push("--as=" + memory_limit_compile);
			}

			const proc_call_ori = [
				"unshare -n nice",
				...timeout_call,
				...prlimit,
				"bash",
				compileScript,
				...args,
			];

			let batchSize = this.stdin.length;
			let promises = [];

			for (let i = 0; i < batchSize; i++) {
				promises.push(
					new Promise((resolve, reject) => {
						let stdout = "";
						let stderr = "";
						let output = "";

						let proc_call = [...proc_call_ori];

						const proc = cp.spawn(
							proc_call[0],
							proc_call.splice(1),
							{
								env: {
									...this.runtime.env_vars,
									language: this.runtime.language,
								},
								stdio: [
									"pipe", // Use parent's stdin for child.
									"pipe", // Pipe child's stdout to parent.
									"pipe",
								],
								cwd: this.dir,
								uid: this.uid,
								gid: this.gid,
								detached: true, //give this process its own process group
							}
						);

						console.log("process spawned ", i);

						proc.stdin.write(this.stdin[i]);
						proc.stdin.end();
						proc.stdin.destroy();

						const kill_timeout =
							(timeout_compile >= 0 &&
								setTimeout(async (_) => {
									console.log(
										`Timeout exceeded timeout=${timeout_compile}`
									);
									process.kill(proc.pid, "SIGKILL");
								}, timeout_compile)) ||
							null;

						proc.stderr.on("data", async (data) => {
							if (stderr.length > this.runtime.output_max_size) {
								console.log(`stderr length exceeded`);
								process.kill(proc.pid, "SIGKILL");
							} else {
								stderr += data;
								output += data;
							}
						});

						proc.stdout.on("data", async (data) => {
							if (stdout.length > this.runtime.output_max_size) {
								console.log(`stdout length exceeded`);
								process.kill(proc.pid, "SIGKILL");
							} else {
								stdout += data;
								output += data;
							}
						});

						const exit_cleanup = () => {
							clearTimeout(kill_timeout);

							proc.stderr.destroy();
							proc.stdout.destroy();

							//   this.cleanup_processes();
							//   console.log(`Finished exit cleanup`);
						};

						proc.on("exit", (code, signal) => {
							exit_cleanup();

							resolve({ stdout, stderr, code, signal, output });
						});

						proc.on("error", (err) => {
							exit_cleanup();

							reject({ error: err, stdout, stderr, output });
						});
					})
				);
			}
			Promise.all(promises)
				.then((r) => {
					this.cleanup_processes();
					console.log(`Finished exit cleanup`);
					resolve(r);
				})
				.catch((er) => {
					reject(er);
				});
		});
	}

	async cleanup_processes(dont_wait = []) {
		let processes = [1];
		const to_wait = [];

		while (processes.length > 0) {
			processes = [];

			const proc_ids = fs.readdirSync("/proc");

			processes = proc_ids.map((proc_id) => {
				if (isNaN(proc_id)) return -1;
				try {
					const proc_status = fs.readFileSync(
						path.join("/proc", proc_id, "status")
					);
					const proc_lines = proc_status.toString().split("\n");
					const state_line = proc_lines.find((line) =>
						line.startsWith("State:")
					);
					const uid_line = proc_lines.find((line) =>
						line.startsWith("Uid:")
					);
					const [_, ruid, euid, suid, fuid] = uid_line.split(/\s+/);

					const [_1, state, user_friendly] = state_line.split(/\s+/);

					const proc_id_int = parseInt(proc_id);

					// Skip over any processes that aren't ours.
					if (ruid != this.uid && euid != this.uid) return -1;

					if (state == "Z") {
						// Zombie process, just needs to be waited, regardless of the user id
						if (!to_wait.includes(proc_id_int))
							to_wait.push(proc_id_int);

						return -1;
					}
					// We should kill in all other state (Sleep, Stopped & Running)

					return proc_id_int;
				} catch (e) {
					console.log("process cleanup err: ", e);
					return -1;
				}
			});

			processes = processes.filter((p) => p > 0);

			if (processes.length > 0)
				console.log(`Got processes to kill: ${processes}`);

			for (const proc of processes) {
				// First stop the processes, but keep their resources allocated so they cant re-fork
				try {
					process.kill(proc, "SIGSTOP");
				} catch (e) {
					// Could already be dead
					console.log(
						`Got error while SIGSTOPing process ${proc}:`,
						e
					);
				}
			}

			for (const proc of processes) {
				// Then clear them out of the process tree
				try {
					process.kill(proc, "SIGKILL");
				} catch (e) {
					// Could already be dead and just needs to be waited on
					console.log(
						`Got error while SIGKILLing process ${proc}:`,
						e
					);
				}

				to_wait.push(proc);
			}
		}

		console.log(
			`Finished kill-loop, calling wait_pid to end any zombie processes`
		);

		// for (const proc of to_wait) {
		//     if (dont_wait.includes(proc)) continue;
		//     wait_pid(proc);
		// }

		console.log(`Cleaned up processes`);
	}

	async cleanup_filesystem() {
		for (const clean_path of config.clean_directories) {
			const contents = fs.readdirSync(clean_path);

			for (const file of contents) {
				const file_path = path.join(clean_path, file);

				try {
					const stat = fs.statSync(file_path);

					if (stat.uid === this.uid) {
						fs.rmSync(file_path, {
							recursive: true,
							force: true,
						});
					}
				} catch (e) {
					// File was somehow deleted in the time that we read the dir to when we checked the file
					console.log(`Error removing file ${file_path}: ${e}`);
				}
			}
		}

		fs.rmSync(this.dir, { recursive: true, force: true });
	}

	async cleanup() {
		this.cleanup_processes(); // Run process janitor, just incase there are any residual processes somehow
		await this.cleanup_filesystem();
	}
}

module.exports = Job;
