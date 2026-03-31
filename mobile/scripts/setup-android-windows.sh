#!/usr/bin/env bash
# One-time Windows setup for Android release builds.
# Run after `npm install` if the junctions below are missing.
# These junctions shorten CMake object-file paths to stay under the
# Windows MAX_PATH (260 char) limit that ninja 3.22.1 enforces.

set -e

echo "Creating Windows directory junctions for Android build..."

create_junction() {
  local link="$1"
  local target="$2"
  if [ -d "$link" ]; then
    echo "  $link already exists, skipping"
  else
    powershell -Command "New-Item -ItemType Junction -Path '$link' -Target '$target'" > /dev/null
    echo "  Created: $link -> $target"
  fi
}

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -W 2>/dev/null || pwd)"
NM="$MOBILE_DIR/node_modules"

# C:\s  ->  react-native-safe-area-context/common/cpp/.../safeareacontext
create_junction "C:/s" "$NM/react-native-safe-area-context/common/cpp/react/renderer/components/safeareacontext"

# C:\r  ->  react-native-screens/common/cpp/.../rnscreens
create_junction "C:/r" "$NM/react-native-screens/common/cpp/react/renderer/components/rnscreens"

# C:\g  ->  react-native-safe-area-context/android/build/generated/source/codegen/jni
create_junction "C:/g" "$NM/react-native-safe-area-context/android/build/generated/source/codegen/jni"

# C:\gs ->  react-native-screens/android/build/generated/.../rnscreens
create_junction "C:/gs" "$NM/react-native-screens/android/build/generated/source/codegen/jni/react/renderer/components/rnscreens"

echo ""
echo "Checking hermesc Windows binary..."
HERMESC_DIR="$NM/hermes-compiler/hermesc/win64-bin"
if [ -f "$HERMESC_DIR/hermesc.exe" ]; then
  echo "  hermesc.exe already present"
else
  echo "  Downloading hermes-compiler win64 binary (250829098.0.10)..."
  cd /tmp
  npm pack hermes-compiler@250829098.0.10 --silent
  mkdir -p hermesc-extract
  tar xzf hermes-compiler-250829098.0.10.tgz -C hermesc-extract "package/hermesc/win64-bin"
  mkdir -p "$HERMESC_DIR"
  cp hermesc-extract/package/hermesc/win64-bin/* "$HERMESC_DIR/"
  rm -rf hermesc-extract hermes-compiler-250829098.0.10.tgz
  echo "  Installed hermesc.exe to $HERMESC_DIR"
fi

echo ""
echo "Android Windows setup complete."
