# Releasing

Releases use a local script to prepare a release PR and a manual GitHub Actions workflow to publish after the PR merges.

## Prepare a release PR

From a clean and up-to-date `trunk`:

```sh
pnpm release:prepare <major|minor|patch>
git push -u origin release/vX.Y.Z
```

Open a PR from the release branch into `trunk`. The script updates `package.json`.

Review and merge the PR after CI passes.

## Publish

After the release PR merges, run the `Publish npm package` workflow from the Actions tab.

The workflow reads the version from `package.json`, runs lint, formatting checks, tests, build, and `npm pack --dry-run`, publishes to npm, and creates the GitHub release.

GitHub generates release notes from merged PRs since the previous release.
