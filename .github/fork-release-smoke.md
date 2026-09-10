# Isolated release workflow test

This branch tests CherryHQ/cherry-studio PR #20316 at
`5fa2ced1a6f968b99fee2e1939ca155e4830f95c` in DeJeune/cherry-studio only.

The original fork default branch is `main`, initially at
`640985a5e6558625e0c03a475495236bbed6677b`. It must not be overwritten.
The temporary default branch is `fork-release-test-20316`; restore `main`
when the test finishes or pauses for user input.

Unrelated workflows are retained in `fork-test-disabled-workflows` so they
cannot run on this sandbox branch. Restore only the release workflows being
tested, with fork-only repository and source-branch substitutions.

Any fixture release or artifact is for control-flow testing, not an application
package, production release, platform build, or code-signing validation.
Never merge this sandbox configuration into the upstream PR or the fork's main.
