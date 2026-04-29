#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );
const releaseType = process.argv[ 2 ];
const validReleaseTypes = new Set( [ 'major', 'minor', 'patch' ] );

const run = ( command, args ) =>
	execFileSync( command, args, {
		cwd: rootDir,
		stdio: 'inherit',
	} );

const output = ( command, args ) =>
	execFileSync( command, args, {
		cwd: rootDir,
		encoding: 'utf8',
		stdio: [ 'ignore', 'pipe', 'pipe' ],
	} ).trim();

const fail = message => {
	console.error( message );
	process.exit( 1 );
};

const refExists = ref => {
	try {
		output( 'git', [ 'rev-parse', '--verify', '--quiet', ref ] );
		return true;
	} catch {
		return false;
	}
};

if ( ! validReleaseTypes.has( releaseType ) ) {
	fail( 'Usage: pnpm release:prepare <major|minor|patch>' );
}

// Ensure the release starts from the latest trunk.
if ( output( 'git', [ 'branch', '--show-current' ] ) !== 'trunk' ) {
	fail( 'Run this from trunk after pulling the latest changes.' );
}

if ( output( 'git', [ 'status', '--porcelain' ] ) ) {
	fail( 'Working tree must be clean before preparing a release.' );
}

run( 'git', [ 'fetch', 'origin', '--prune' ] );

if (
	output( 'git', [ 'rev-parse', 'HEAD' ] ) !== output( 'git', [ 'rev-parse', 'origin/trunk' ] )
) {
	fail( 'Local trunk must match origin/trunk. Run git pull --ff-only and try again.' );
}

// Read the current package version.
const packageJsonPath = resolve( rootDir, 'package.json' );
const packageJson = JSON.parse( readFileSync( packageJsonPath, 'utf8' ) );
const versionMatch = packageJson.version.match( /^(\d+)\.(\d+)\.(\d+)$/ );

if ( ! versionMatch ) {
	fail( `Expected package.json version to be stable semver. Found ${ packageJson.version }.` );
}

// Calculate the next version from the requested release type.
const nextVersionParts = versionMatch.slice( 1 ).map( Number );

if ( releaseType === 'major' ) {
	nextVersionParts[ 0 ] += 1;
	nextVersionParts[ 1 ] = 0;
	nextVersionParts[ 2 ] = 0;
} else if ( releaseType === 'minor' ) {
	nextVersionParts[ 1 ] += 1;
	nextVersionParts[ 2 ] = 0;
} else {
	nextVersionParts[ 2 ] += 1;
}

const nextVersion = nextVersionParts.join( '.' );
const releaseBranch = `release/v${ nextVersion }`;

// Refuse to overwrite an existing release branch.
if ( refExists( releaseBranch ) ) {
	fail( `${ releaseBranch } already exists locally.` );
}

if ( refExists( `origin/${ releaseBranch }` ) ) {
	fail( `${ releaseBranch } already exists on origin.` );
}

// Update package.json; GitHub Releases provide the generated changelog.
packageJson.version = nextVersion;
writeFileSync( packageJsonPath, `${ JSON.stringify( packageJson, null, 2 ) }\n` );

// Commit the version bump on a release branch.
run( 'git', [ 'checkout', '-b', releaseBranch ] );
run( 'git', [ 'add', 'package.json' ] );
run( 'git', [ 'commit', '-m', `Release v${ nextVersion }` ] );

// Print the remaining manual release steps.
console.log( '' );
console.log( `Prepared ${ releaseBranch }.` );
console.log( `Push it with: git push -u origin ${ releaseBranch }` );
console.log( 'Open a PR into trunk. After it merges, run the Publish npm package workflow.' );
