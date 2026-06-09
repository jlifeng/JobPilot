# Support Intel Mac Release Builds

## Goal

Add macOS Intel release support so tagged desktop releases build both Apple Silicon and Intel macOS artifacts, then trigger the draft-release GitHub Actions flow with a new tag.

## Requirements

* Add `x86_64-apple-darwin` to the tagged desktop release build matrix and manual Desktop CI build matrix.
* Ensure the matrix target is passed through the build command to the Tauri CLI.
* Ensure the release updater manifest uses explicit platform keys for Windows, Apple Silicon, and Intel macOS.
* Ensure release manifest and artifact upload paths read from target-specific Tauri bundle directories.
* Ensure macOS updater tarball assets have architecture-specific file names to avoid GitHub Release asset name collisions.
* Keep GitHub Releases as draft releases; do not publish the release.
* Bump the patch version to `1.4.1` so the new tag can pass the release tag/version check.
* Do not run local build/test commands per user request.
* Preserve existing unrelated dirty Rust files.

## Acceptance Criteria

* [ ] `.github/workflows/release-desktop.yml` builds Windows, macOS Apple Silicon, and macOS Intel targets.
* [ ] `.github/workflows/desktop-build.yml` manual builds include macOS Intel.
* [ ] `scripts/build-tauri-desktop.mjs` forwards CLI args to `desktop`'s `tauri:build` script.
* [ ] The merged updater manifest can include `windows-x86_64`, `darwin-aarch64`, and `darwin-x86_64`.
* [ ] Targeted Tauri builds upload artifacts from `.codex-cargo-target/desktop-tauri/<target>/release/bundle`.
* [ ] macOS updater `.app.tar.gz` and `.sig` assets are unique per architecture in the draft release.
* [ ] Version files and changelog include `1.4.1`.
* [ ] A `v1.4.1` tag is pushed to trigger the release workflow.
* [ ] The release workflow remains draft-only.
* [ ] GitHub Actions status is observed after pushing the tag.

## Definition of Done

* Code changes are committed without including unrelated user edits.
* Tag `v1.4.1` is pushed.
* GitHub Actions run status is checked remotely.
* Local tests/builds are intentionally skipped because the user requested no local testing.

## Technical Approach

Use the existing release workflow matrix and add a second macOS entry for `x86_64-apple-darwin`. Pass the matrix target to `pnpm run build:tauri`, and update the Node wrapper so the extra args reach `npm --prefix desktop run tauri:build -- ...`, which is then forwarded by `scripts/run-tauri-cli.mjs`. Pass an explicit updater platform key through `DESKTOP_UPDATER_TARGET` so cross-architecture macOS builds do not rely on runner architecture inference. Point manifest generation and artifact upload at the target-specific bundle directory created by Tauri targeted builds.

## Decision (ADR-lite)

**Context**: The release workflow had a `matrix.target` field but did not pass it into the Tauri build command, so adding a matrix entry alone would not guarantee architecture-specific macOS artifacts.

**Decision**: Add Intel macOS as a separate matrix build and forward `--target` through the existing build wrapper.

**Consequences**: The release job now produces separate Apple Silicon and Intel macOS artifacts. The wrapper also becomes more flexible for any future Tauri build flag passed by CI.

## Out of Scope

* Local build or test execution.
* Publishing the GitHub Release.
* Changing existing Rust application code.

## Research References

* [`research/tauri-macos-targets.md`](research/tauri-macos-targets.md) — Tauri/GitHub Actions target names and draft release behavior notes.

## Technical Notes

* Existing release workflow already creates/updates releases with `--draft`.
* Existing `v1.4.0` tag is present, so this task uses `v1.4.1`.
* Existing dirty files under `desktop/src-tauri/src/*.rs` are unrelated and must not be staged.
