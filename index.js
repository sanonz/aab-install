#! /usr/bin/env node
const fs = require('fs');
const execa = require('execa');
const path = require('path');
const tempDir = require('temp-dir');

const jarPath = path.resolve(__dirname, 'bundletool-all-0.10.2.jar');

if (!process.argv[2]) {
	console.log('Pass a path to an .aab file. For example:');
	console.log('npx aab-install myapp.aab');
	process.exit(1);
}
const filePath = path.resolve(process.cwd(), process.argv[2]);
if (!fs.existsSync(filePath)) {
	console.log(`No file exists at ${filePath}`);
	process.exit(1);
}

const dir = path.join(tempDir, `aab-install-${Date.now()}`);
fs.mkdirSync(dir);

const apksOutput = `${dir}/app.apks`;

function cleanUp() {
	console.log('Cleaning up...');
	execa.sync('rm', ['-rf', dir]);
	console.log('Done.');
}

console.log('Extracting APK...');
execa('java', [
	'-jar',
	jarPath,
	'build-apks',
	`--bundle=${filePath}`,
	`--output=${apksOutput}`
])
	.catch(err => {
		console.log(`Could not run bundletool: ${err.message}`);
		cleanUp();
		process.exit(1);
	})
	.then(() => {
		const apkPath = apksOutput;
		console.log('Installing...');
		const installationProcess = execa('java', [
			'-jar',
			jarPath,
			'install-apks',
			`--apks=${apkPath}`,
		]);
		installationProcess.stdout.pipe(process.stdout);
		installationProcess.stderr.pipe(process.stderr);
		return installationProcess;
	})
	.catch(err => {
		console.log(`Could not install: ${err.message}`);
		cleanUp();
		process.exit(1);
	})
	.then(() => {
		console.log('Installed!');
		cleanUp();
		process.exit(0);
	});
