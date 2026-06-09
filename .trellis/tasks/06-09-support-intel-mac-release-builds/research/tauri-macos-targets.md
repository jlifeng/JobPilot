# Tauri macOS Release Targets

## Findings

* Tauri release automation commonly builds architecture-specific macOS targets with Rust target triples.
* Apple Silicon target: `aarch64-apple-darwin`.
* Intel macOS target: `x86_64-apple-darwin`.
* The Tauri CLI accepts target-specific builds through `--target <triple>`.
* The repository's release workflow already keeps releases as drafts by using `gh release create --draft` and `gh release edit --draft`.

## Repo Mapping

* `.github/workflows/release-desktop.yml` already has a build matrix with a `target` field and a `rust_target` field.
* `scripts/run-tauri-cli.mjs` already forwards arguments after the Tauri mode to the actual `tauri` CLI.
* `scripts/build-tauri-desktop.mjs` currently drops extra CLI arguments, so workflow target arguments must be forwarded there.
* `scripts/build-release-updater-manifest.mjs` supports `DESKTOP_UPDATER_TARGET`, which should be set by the release matrix so cross-target macOS builds produce the correct updater platform keys.
* Tauri targeted builds write bundles under `.codex-cargo-target/desktop-tauri/<target>/release/bundle`, so manifest generation and artifact uploads must use the target-specific path.
* Tauri names both macOS updater tarballs `JobPilot.app.tar.gz` by default, so release uploads need architecture-specific renaming before manifest generation.

## References

* Tauri GitHub Action examples include architecture-specific macOS targets such as `--target x86_64-apple-darwin`.
* GitHub CLI release creation supports draft releases through the `--draft` flag.
