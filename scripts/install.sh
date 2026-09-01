#!/bin/sh
# GenMotion installer.
#
#   curl -fsSL https://genmotion.dev/install.sh | sh
#
# This file is the one genmotion.dev serves: apps/web copies it into its public
# folder before every build, so the URL and the repo cannot drift apart.
#
# It downloads the latest signed release from GitHub, installs GenMotion.app
# into /Applications, and writes the `genmotion` command into /usr/local/bin.
# An administrator password is asked for only where the current user cannot
# write — on most Macs that is /usr/local/bin and not /Applications.
#
# The `genmotion` script it writes is the same one the app writes from its
# account menu (apps/desktop/electron/cli.ts). Two copies is the price of the
# command working before the app has ever been opened; keep them in step.

set -eu

REPO="haxzie/genmotion"
APP="/Applications/GenMotion.app"
BIN_DIR="/usr/local/bin"
BIN="$BIN_DIR/genmotion"
INSTALL_URL="https://genmotion.dev/install.sh"

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
cleanup() {
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

# Tags are `desktop-v…`, not `v…`: the server images release under `v*` on their
# own schedule. See .github/workflows/desktop-release.yml.
if [ -n "${GENMOTION_VERSION:-}" ]; then
  api="https://api.github.com/repos/$REPO/releases/tags/desktop-v${GENMOTION_VERSION#v}"
else
  api="https://api.github.com/repos/$REPO/releases/latest"
fi

release=$(curl -fsSL "$api") || die "could not reach GitHub to look up a release."
# The zip rather than the dmg: mounting a disk image needs a window, and this
# runs in a terminal. Both are the same signed, notarized app.
url=$(printf '%s\n' "$release" | grep -oE 'https://[^"]+-arm64-mac\.zip' | head -n 1)
[ -n "$url" ] || die "that release has no macOS build attached to it."
version=$(printf '%s\n' "$release" |
  grep -oE '"tag_name": *"[^"]+"' | head -n 1 |
  sed -E 's/.*"([^"]+)"$/\1/; s/^desktop-v//')
[ -n "$version" ] || version="unknown"

# ── Download ────────────────────────────────────────────────────────────────

tmp=$(mktemp -d)
say "${B}Installing GenMotion $version${R}"
curl -fL --progress-bar -o "$tmp/GenMotion.zip" "$url" || die "the download failed."

# ditto, not unzip: it is the extractor that keeps a signed bundle's symlinks
# and extended attributes intact, and a broken signature is an app macOS
# refuses to open at all.
ditto -x -k "$tmp/GenMotion.zip" "$tmp/unpacked" || die "could not unpack the download."
src="$tmp/unpacked/GenMotion.app"
[ -d "$src" ] || die "the download did not contain GenMotion.app."

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

cat > "$tmp/genmotion" <<'SHIM'
#!/bin/sh
# GenMotion @VERSION@ — command line launcher.
# Written by the installer; `genmotion upgrade` replaces it.
# gm-app: /Applications/GenMotion.app

APP='/Applications/GenMotion.app'

case "$1" in
  upgrade)
    exec /bin/sh -c 'curl -fsSL https://genmotion.dev/install.sh | /bin/sh'
    ;;
  -h|--help)
    echo "usage: genmotion [folder]"
    echo
    echo "  genmotion          open GenMotion"
    echo "  genmotion .        open GenMotion and share this folder with the agent"
    echo "  genmotion <path>   the same, for another folder"
    echo "  genmotion upgrade  install the latest version"
    exit 0
    ;;
  -v|--version)
    echo "@VERSION@"
    exit 0
    ;;
esac

# -P so the path is the physical one, which is the shape the app stores a
# shared folder as: /tmp and /private/tmp have to end up as the same folder.
if [ -n "$1" ]; then
  DIR=$(cd -- "$1" 2>/dev/null && pwd -P) || {
    echo "genmotion: no such folder: $1" >&2
    exit 1
  }
  # The app refuses these too — a grant is meant to name a folder, and the
  # whole disk or home directory names every credential in it. Saying so here
  # is the difference between a rule and a command that quietly did nothing.
  if [ "$DIR" = "/" ] || [ "$DIR" = "$HOME" ]; then
    echo "genmotion: not sharing your whole home folder or disk — opening without it." >&2
    exec open -a "$APP"
  fi
  exec open -n -a "$APP" --args "--gm-cwd=$DIR"
fi

exec open -a "$APP"
SHIM

sed -i '' "s/@VERSION@/$version/g" "$tmp/genmotion"

BIN_SUDO=""
if [ -d "$BIN_DIR" ]; then
  [ -w "$BIN_DIR" ] || BIN_SUDO="sudo"
else
  [ -w /usr/local ] || BIN_SUDO="sudo"
fi
if [ -n "$BIN_SUDO" ]; then
  say "Administrator password needed to write $BIN_DIR."
fi
# Not fatal, and deliberately so: the app is already in /Applications by this
# point, so dying here would report a failed install of something that
# succeeded. The password prompt is the usual reason this fails — a pipeline
# with no terminal behind it, or somebody declining — and the app can write the
# command itself from its account menu afterwards.
cli=no
if $BIN_SUDO mkdir -p "$BIN_DIR" && $BIN_SUDO install -m 755 "$tmp/genmotion" "$BIN"; then
  cli=yes
  say "Installed ${B}$BIN${R}"
else
  say ""
  say "${B}GenMotion is installed, but the genmotion command is not.${R}"
  say "Writing $BIN needs an administrator password. Run this installer again"
  say "from a terminal, or open GenMotion and choose \"Install the 'genmotion'"
  say "command\" from the account menu."
fi

if [ "$cli" = yes ]; then
  case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *) say "${DIM}Note: $BIN_DIR is not on your PATH — add it to use the command.${R}" ;;
  esac
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
