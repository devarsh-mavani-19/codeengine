const config = require("./config");
const path = require('path')
const fs = require('fs')

class Runtime {
    constructor(
        language,
        version,
        aliases,
        pkgdir,
        runtime,
        timeouts,
        memory_limits,
        max_process_count,
        max_open_files,
        max_file_size,
        output_max_size,
    ) {
        this.language = language;
        this.version = version;
        this.aliases = aliases || [];
        this.pkgdir = pkgdir;
        this.runtime = runtime;
        this.timeouts = timeouts;
        this.memory_limits = memory_limits;
        this.max_process_count = max_process_count;
        this.max_open_files = max_open_files;
        this.max_file_size = max_file_size;
        this.output_max_size = output_max_size;
    }
    static compute_all_limits() {
        return {
            timeouts: {
                compile: config.compile_timeout.default,
                run: config.run_timeout.default
            },
            memory_limits: {
                compile: config.compile_memory_limit.default,
                run: config.run_memory_limit.default
            },
            max_process_count: config.max_process_count.default,
            max_open_files: config.max_open_files.default,
            max_file_size: config.max_file_size.default,
            output_max_size: config.output_max_size.default
        };
    }

    get compiled() {
        if (this._compiled === undefined) {
            this._compiled = fs.existsSync(path.join(this.pkgdir, 'compile'));
        }
        return this._compiled;
    }

    get env_vars() {
        if (!this._env_vars) {
            const env_file = path.join(this.pkgdir, '.env');
            const env_content = fs.readFileSync(env_file).toString();

            this._env_vars = {};

            env_content
                .trim()
                .split('\n')
                .map(line => line.split('=', 2))
                .forEach(([key, val]) => {
                    this._env_vars[key.trim()] = val.trim();
                });
        }

        return this._env_vars;
    }

}

const loadRuntimes = () => {

}

module.exports.Runtime = Runtime
module.exports.checkIfRuntimeExist = (language, version) => {
    return config.packages.filter(p => {
        return p.language == language && p.version == version
    }).length > 0
}
module.exports.getRuntimeFromLanguageAndVersion = (language, version) => {
    if (!module.exports.checkIfRuntimeExist(language, version)) return undefined;
    return new Runtime(language
        , version
        , language
        , path.resolve(config.packages_path.default, language, version)
        , language
        , {
            compile: config.compile_timeout.default,
            run: config.run_timeout.default
        }, {
        compile: config.compile_memory_limit.default,
        run: config.run_memory_limit.default
    }, config.max_process_count.default, config.max_open_files.default, config.max_file_size.default, config.output_max_size.default)
}

module.exports.loadRuntimes = loadRuntimes;