const config = {
    runner_uid_min: {
        default: 1001,
        initialize: () => {}
    },
    runner_uid_max: {
        default: 1500,
        initialize: () => {}
    },
    runner_gid_min: {
        default: 1001,
        initialize: () => {}
    },
    runner_gid_max: {
        default: 1500,
        initialize: () => {}
    },
    user_data_directory: {
        default: '/cee_data',
        initialize: () => {}
    },
    run_timeout: {
        default: 16000,
        initialize: () => {}
    },
    run_memory_limit: {
        default: -1,
        initialize: () => {}
    },
    compile_timeout: {
        default: 100,
        initialize: () => {}
    },
    compile_memory_limit: {
        default: 100,
        initialize: () => {}
    },
    packages_path: {
        default: '/app/packages/'
    },
    output_max_size: {
        default: 10240000,
    },
    max_process_count: {
        default: 64,
    },
    max_open_files: {
        default: 2048,
    },
    max_file_size: {
        default: 10000000, //10MB
    },
    clean_directories: ['/dev/shm', '/run/lock', '/tmp', '/var/tmp']
}

module.exports = config
module.exports.packages = [
    {
        language: 'java',
        version: '15',
    },
    {
        language: 'node',
        version: '16',
    }
]