#!/bin/sh
set -eu
cd "$(dirname "$0")"
swift test
xcodebuild -project Companion.xcodeproj -scheme Companion -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
