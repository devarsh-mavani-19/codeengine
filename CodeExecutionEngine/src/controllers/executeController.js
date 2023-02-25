const config = require("../config");
const { serverError } = require("../error/error");
const Job = require("../job");
const { getRuntimeFromLanguageAndVersion } = require("../runtime");

module.exports.executeCode = async (req, res, next) => {
    try {
        // get runtime
        let job = await get_job(req.body);

        // setup files
        await job.setup_files();

        // execute job
        const result = await job.execute();
        // cleanup files
        await job.cleanup()

        // return response
        return res.status(200).send(result);
    }
    catch (er) {
        console.log(er)
        serverError(res, "Something went wrong!")
    }

}

async function get_job(body) {
    return new Promise((resolve, reject) => {
        let {
            language,
            version,
            args,
            stdin,
            file,
        } = body;
        let compile_memory_limit = config.compile_memory_limit.default;
        let run_memory_limit = config.run_memory_limit.default;
        let run_timeout = config.run_timeout.default;
        let compile_timeout = config.compile_timeout.default;

        if (!language || typeof language !== 'string') {
            return reject({
                message: 'language is required as a string',
            });
        }
        if (!version || typeof version !== 'string') {
            return reject({
                message: 'version is required as a string',
            });
        }
        if (!file || typeof file !== 'object') {
            return reject({
                message: 'file is required as an object',
            });
        }

        if (typeof file.content !== 'string') {
            return reject({
                message: `file.content is required as a string`,
            });
        }

        const rt = getRuntimeFromLanguageAndVersion(
            language,
            version
        );

        if (rt == undefined) {
            reject({
                message: "Invalid language requested"
            })
        }

        resolve(
            new Job({
                runtime: rt,
                args: args || [],
                stdin: stdin || [''],
                file: file,
                timeout: {
                    run: run_timeout,
                    compile: compile_timeout,
                },
                memory_limit: {
                    run: run_memory_limit,
                    compile: compile_memory_limit,
                },
            })
        );

    })

}