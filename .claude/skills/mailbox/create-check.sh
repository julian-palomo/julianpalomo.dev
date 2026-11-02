#!/usr/bin/env bash
# Checks the arguments of /mailbox create before anything is created. The
# skill runs it as step 1, before any git command, and it runs no git itself,
# so a refusal never leaves a branch, a commit or a PR behind.
#
# A forgotten title looks like `create design 44`: the epic lands where the
# title goes. So a title that is empty, only an issue number, padded with
# spaces, more than one line or holding a `|` (it would break the AGENTS.md
# table) is refused. Otherwise the title is a name and is kept exactly as
# given, in any language.
#
# On success it prints the AGENTS.md row to add in step 5, with <pr> for the
# number the draft PR will get.
#
# Usage: bash .claude/skills/mailbox/create-check.sh <name> "<cloud thread>" <epic…>

set -u

fail() {
  printf 'mailbox create: %s\n' "$1" >&2
  exit 1
}

usage='usage: create-check.sh <name> "<cloud thread>" <epic…>'
[ $# -ge 1 ] || fail "$usage"
name=$1
thread=${2-}
[ $# -ge 2 ] && shift 2 || shift $#

printf '%s' "$name" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$' ||
  fail "a mailbox name is lowercase letters, digits and hyphens: '$name'"

[ -n "$thread" ] || fail "the cloud thread's title is missing. $usage"
[ "$(printf '%s' "$thread" | wc -l | tr -d ' ')" = 0 ] || fail "the cloud thread's title must be one line"
printf '%s' "$thread" | grep -qE '^#?[0-9]+$' &&
  fail "'$thread' is an issue number, not the cloud thread's title, which is missing. $usage"
case "$thread" in
  ' '* | *' ') fail "the cloud thread's title starts or ends with a space: '$thread'" ;;
  *'|'*) fail "the cloud thread's title can't hold a '|', which would break the AGENTS.md table: '$thread'" ;;
esac

[ $# -ge 1 ] || fail "no epic given. $usage"
for epic in "$@"; do
  printf '%s' "$epic" | grep -qE '^[0-9]+$' || fail "an epic is an issue number: '$epic'"
done

# AGENTS.md from this script's own path, so the check needs no git.
agents="$(cd "$(dirname "$0")/../../.." && pwd)/AGENTS.md"
[ -f "$agents" ] || fail "can't find AGENTS.md at $agents"
! grep -qE "^ *\| *\`$name\` *\|" "$agents" || fail "AGENTS.md already has a mailbox named '$name'"

for epic in "$@"; do
  state=$(gh api "repos/{owner}/{repo}/issues/$epic" --jq '[.state, .author_association] | @tsv' 2>/dev/null) ||
    fail "can't read issue #$epic"
  [ "$state" = "$(printf 'open\tOWNER')" ] ||
    fail "#$epic isn't an open issue the owner opened; it is: $(printf '%s' "$state" | tr '\t' ' ')"
done

epics=$(printf '#%s, ' "$@")
printf '| `%s` | #<pr> | %s | %s |\n' "$name" "$thread" "${epics%, }"
