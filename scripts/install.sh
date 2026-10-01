#!/bin/sh
# GenMotion installer.
#
#   curl -fsSL https://genmotion.dev/install.sh | sh
#
# This file is the one genmotion.dev serves: apps/web copies it into its public
# folder before every build, so the URL and the repo cannot drift apart.
#
# It downloads the latest signed release from GitHub, installs GenMotion.app
# into /Applications, and, when Node is installed, the `genmotion` command
# from npm. An administrator password is asked for only where the current user
# cannot write.

set -eu

REPO="haxzie/genmotion"
APP="/Applications/GenMotion.app"
# A copy of the DMG on our own CDN, and a latest.json saying where it is.
# GitHub stays the fallback and the source of truth — this is here because the
# same bytes come off it an order of magnitude faster.
MIRROR="https://assets.genmotion.dev/desktop"

if [ -t 1 ]; then
  B=$(printf '\033[1m')
  DIM=$(printf '\033[2m')
  R=$(printf '\033[0m')
else
  B=""
  DIM=""
  R=""
fi

say() { printf '%s\n' "$*"; }
die() {
  printf '%sgenmotion:%s %s\n' "$B" "$R" "$*" >&2
  exit 1
}

tmp=""
staging=""
mounted=""
cleanup() {
  # Detached first: the mount point lives inside $tmp, and removing a directory
  # a disk image is still attached to leaves the image attached.
  if [ -n "$mounted" ]; then
    hdiutil detach "$mounted" -quiet >/dev/null 2>&1 || true
  fi
  [ -n "$tmp" ] && rm -rf "$tmp"
  # A staging copy only exists if the swap below failed halfway.
  if [ -n "$staging" ] && [ -e "$staging" ]; then
    ${APP_SUDO:-} rm -rf "$staging"
  fi
  return 0
}
trap cleanup EXIT INT TERM

# ── What this Mac is ────────────────────────────────────────────────────────

[ "$(uname -s)" = "Darwin" ] || die "GenMotion is macOS-only for now."
[ "$(uname -m)" = "arm64" ] ||
  die "GenMotion ships for Apple silicon only, and this Mac reports $(uname -m)."
command -v curl >/dev/null 2>&1 || die "curl is required."

# ── Which release ───────────────────────────────────────────────────────────

# latest.json is written by our own release workflow, one key to a line, so a
# line-wise read is enough — and does not put jq between somebody and an
# install.
json_string() {
  printf '%s\n' "$1" | sed -n "s/.*\"$2\": *\"\([^\"]*\)\".*/\1/p" | head -n 1
}
json_number() {
  printf '%s\n' "$1" | sed -n "s/.*\"$2\": *\([0-9][0-9]*\).*/\1/p" | head -n 1
}

url=""
size=""
sha256=""
version=""

# The mirror first, and only for the latest build: a pinned version predates
# the mirror as often as not, and GitHub has every release either way.
if [ -z "${GENMOTION_VERSION:-}" ]; then
  latest=$(curl -fsSL --max-time 10 "$MIRROR/latest.json" 2>/dev/null) || latest=""
  if [ -n "$latest" ]; then
    version=$(json_string "$latest" version)
    url=$(json_string "$latest" url)
    size=$(json_number "$latest" size)
    sha256=$(json_string "$latest" sha256)
  fi
fi

# GitHub: the fallback, and the only route to a pinned version. Tags are
# `desktop-v…`, not `v…` — the server images release under `v*` on their own
# schedule. See .github/workflows/desktop-release.yml.
if [ -z "$url" ]; then
  if [ -n "${GENMOTION_VERSION:-}" ]; then
    api="https://api.github.com/repos/$REPO/releases/tags/desktop-v${GENMOTION_VERSION#v}"
  else
    api="https://api.github.com/repos/$REPO/releases/latest"
  fi
  release=$(curl -fsSL "$api") || die "could not reach GitHub to look up a release."
  url=$(printf '%s\n' "$release" | grep -oE 'https://[^"]+-arm64\.dmg' | head -n 1)
  [ -n "$url" ] || die "that release has no macOS build attached to it."
  size=$(printf '%s\n' "$release" |
    awk '/"name": *"[^"]*-arm64\.dmg"/ { found = 1 }
         found && /"size":/ { gsub(/[^0-9]/, "", $0); print; exit }')
  version=$(printf '%s\n' "$release" |
    grep -oE '"tag_name": *"[^"]+"' | head -n 1 |
    sed -E 's/.*"([^"]+)"$/\1/; s/^desktop-v//')
fi
[ -n "$version" ] || version="unknown"

# ── Download ────────────────────────────────────────────────────────────────

tmp=$(mktemp -d)
# The size is worth saying out loud: the download is the whole wait, and a
# progress bar with no total behind it reads as a hang rather than as a big
# file arriving.
if [ -n "$size" ]; then
  say "${B}Installing GenMotion $version${R} ${DIM}($((size / 1000000)) MB to download)${R}"
else
  say "${B}Installing GenMotion $version${R}"
fi
# Resumed rather than restarted on a retry: losing a connection near the end
# and starting over is minutes gone. The stall guard is what makes that retry
# happen — a transfer below 1KB/s for a minute is finished, not slow.
curl -fL --progress-bar -C - --retry 3 --retry-delay 2 \
  --speed-limit 1024 --speed-time 60 \
  -o "$tmp/GenMotion.dmg" "$url" || die "the download failed."

# Worth the half second precisely because the download resumes: a truncated
# file that a retry appended to would otherwise be installed without complaint.
if [ -n "$sha256" ]; then
  printf '%s  %s\n' "$sha256" "$tmp/GenMotion.dmg" | shasum -a 256 -c - >/dev/null 2>&1 ||
    die "the download did not match its checksum — try again."
fi

# -nobrowse so no Finder window opens: this runs in a terminal, and a disk
# image appearing on the desktop mid-install is somebody's next question.
mkdir -p "$tmp/mnt"
hdiutil attach -nobrowse -readonly -quiet -mountpoint "$tmp/mnt" "$tmp/GenMotion.dmg" ||
  die "could not open the disk image."
mounted="$tmp/mnt"
src="$mounted/GenMotion.app"
[ -d "$src" ] || die "the disk image did not contain GenMotion.app."

# Releases are signed and notarized. Something that arrives over the network
# failing this check is not something to move into /Applications.
codesign --verify --strict "$src" >/dev/null 2>&1 ||
  die "the downloaded app is not correctly signed — refusing to install it."
spctl --assess --type execute "$src" >/dev/null 2>&1 ||
  say "${DIM}Note: macOS could not confirm notarization; the app may warn on first open.${R}"

# ── Install the app ─────────────────────────────────────────────────────────

APP_SUDO=""
[ -w /Applications ] || APP_SUDO="sudo"

was_running=no
if pgrep -f "$APP/Contents/MacOS/GenMotion" >/dev/null 2>&1; then
  was_running=yes
  say "Quitting the running GenMotion…"
  osascript -e 'tell application "GenMotion" to quit' >/dev/null 2>&1 || true
  waited=0
  while pgrep -f "$APP/Contents/MacOS/GenMotion" >/dev/null 2>&1 && [ "$waited" -lt 20 ]; do
    sleep 0.3
    waited=$((waited + 1))
  done
fi

if [ -n "$APP_SUDO" ]; then
  say "Administrator password needed to write /Applications."
fi
# Staged and swapped rather than written in place, so there is no moment where
# /Applications holds half an app.
staging="/Applications/.GenMotion-install-$$"
$APP_SUDO ditto "$src" "$staging" || die "could not copy GenMotion into /Applications."
$APP_SUDO rm -rf "$APP"
$APP_SUDO mv "$staging" "$APP"
staging=""
say "Installed ${B}$APP${R}"

# ── Install the command ─────────────────────────────────────────────────────
#
# The `genmotion` command comes from the npm package `@genmotion/cli`
# (`genmotion` itself is a name npm refuses, as too close to `emotion`): the terminal workflow
# (init, dev, render, …) and the app launcher (`genmotion .`, `clone`, a bare
# `genmotion`) in one. Installers used to write a shell script of their own to
# /usr/local/bin instead, which then blocked `npm i -g @genmotion/cli` there. An old
# script is moved out of npm's way first and put back if npm fails, so nobody
# ends up with no command; the app's account menu runs the same sequence
# (apps/desktop/electron/cli-install.ts).

LEGACY="/usr/local/bin/genmotion"

# A script an older installer or app wrote: ours to replace, nothing else is.
is_ours() {
  [ -f "$1" ] && [ ! -L "$1" ] && head -n 1 "$1" | grep -q '^#!/bin/sh' && grep -q '^# gm-app:' "$1"
}
# "sudo" when the current user can't write the folder.
sudo_for() {
  [ -w "$1" ] || printf 'sudo'
}

cli=no
npm_bin=$(command -v npm 2>/dev/null || true)
if [ -n "$npm_bin" ]; then
  prefix=$("$npm_bin" prefix -g 2>/dev/null || true)
  target="$prefix/bin/genmotion"
  aside=""
  moved=yes
  if [ -n "$prefix" ] && is_ours "$target"; then
    aside="$target.gm-legacy"
    $(sudo_for "$prefix/bin") mv -f "$target" "$aside" || moved=no
  fi
  say "Installing the ${B}genmotion${R} command with npm…"
  if [ "$moved" = yes ] && "$npm_bin" install -g @genmotion/cli@latest >"$tmp/npm.log" 2>&1; then
    cli=yes
    if [ -n "$aside" ]; then
      $(sudo_for "$prefix/bin") rm -f "$aside" || true
    fi
    # An old script anywhere else could still answer ahead of npm's on PATH.
    if [ "$target" != "$LEGACY" ] && is_ours "$LEGACY"; then
      $(sudo_for /usr/local/bin) rm -f "$LEGACY" || true
    fi
    say "Installed ${B}genmotion${R} $("$target" --version 2>/dev/null || true)"
  else
    if [ -n "$aside" ] && [ "$moved" = yes ]; then
      $(sudo_for "$prefix/bin") mv -f "$aside" "$target" || true
    fi
    say ""
    say "${B}GenMotion is installed, but the genmotion command is not.${R}"
    if [ -s "$tmp/npm.log" ]; then
      say "${DIM}npm: $(grep -v '^\s*$' "$tmp/npm.log" | tail -n 1)${R}"
    fi
    say "Run ${B}npm install -g @genmotion/cli${R} to try again, or install it from the app's account menu."
  fi
else
  say ""
  say "${DIM}The genmotion command installs with npm. Install Node 22 or newer"
  say "(nodejs.org), then run: npm install -g @genmotion/cli${R}"
fi

# ── Done ────────────────────────────────────────────────────────────────────

if [ "$was_running" = yes ]; then
  open -a "$APP"
fi

if [ "$cli" = yes ]; then
  say ""
  say "  ${B}genmotion${R}          open GenMotion"
  say "  ${B}genmotion .${R}        open it with this folder shared with the agent"
  say "  ${B}genmotion upgrade${R}  install the latest version"
  say ""
fi
