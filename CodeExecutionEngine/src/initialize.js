const fs = require('fs')
const path = require('path')
const config = require('./config')
const cp = require('child_process')

async function extractLanguage(pkgDir) {
    return new Promise((resolve, reject) => {
        try {
            const installCMD = cp.execSync(`bash -c 'cd ${pkgDir} && pwd && ./install.sh && chmod 755 -R .'`, {
                stdio: [
                    process.stdin, // Use parent's stdin for child.
                    process.stdout, // Pipe child's stdout to parent.
                    process.stderr
                ]
            })
            chmodr(pkgDir, 0755,(err) => {
                if (err) {
                  console.log('Failed to execute chmod', err);
                    reject(err)
                } else {
                  console.log('Success');
                resolve()
                }
              })
        } catch (errr) {
            reject(`Error while extracting: ${pkgDir}: ${errr}`)
        }
    })
}

async function setEnv(pkgDir) {
    return new Promise((resolve, reject) => {
        let stdout;
        const envCMD = cp.spawn('env',
            [`-i`, 'bash', '-c', `cd ${pkgDir};  source environment; env;`], {
            stdio: [
                'ignore', // Use parent's stdin for child.
                'pipe',
                'pipe'
            ]
        })

        envCMD.stdout.on('data', d => {
            stdout += d;
        })
        envCMD.stderr.on('data', d => {
            console.log("ENVCMDERR: STDERR: ", d.toString())
        })
        envCMD.on('error', err => {
            reject(`Err: failed to set env ${err}`)
        })
        envCMD.once('exit', (code, _) => {
            code === 0 ? resolve(stdout) : reject("Err: Fail to set env")
        });
    })
}

async function installLanguages() {
    console.log('Installing languages')
    const languages = fs.readdirSync(path.resolve(config.packages_path.default))
    for (let language of languages) {
        const versions = fs.readdirSync(path.resolve(config.packages_path.default, language))
        for (let version of versions) {
            let pkgDir = path.resolve(config.packages_path.default, language, version)
            try {
                await extractLanguage(pkgDir)
                
                console.log(`Language Installed: ${language}:${version}`)
            } catch (e) {
                console.log(e)
            }
            let stdout = await setEnv(pkgDir)

            const filtered_env = stdout
                    .split('\n')
                    .filter(
                        l =>
                            !['PWD', 'OLDPWD', '_', 'SHLVL'].includes(
                                l.split('=', 2)[0]
                            )
                    )
                    .join('\n');
                console.log("FILTEED", filtered_env)
                fs.writeFileSync(path.join(pkgDir, '.env'), filtered_env);
        }
    }
}

async function init() {
    // create userdata directory to store code
    try {
        fs.rmdirSync(path.resolve(config.user_data_directory.default))

    } catch (er) {

    }

    try {
        var oldmask = process.umask(0);
        fs.mkdirSync(path.resolve(config.user_data_directory.default), {
            mode: 0777
        })
        process.umask(oldmask);
    } catch (err) {
        console.log(err)
    }
    await installLanguages()
}

module.exports = init