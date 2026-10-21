// swift-tools-version: 5.7
import PackageDescription
let package = Package(name: "CompanionPolicy", platforms: [.macOS(.v12)], products: [.library(name: "CompanionPolicy", targets: ["CompanionPolicy"])], targets: [
    .target(name: "CompanionPolicy", path: "Companion", exclude: ["AppDelegate.swift", "CompanionController.swift", "OfflineStore.swift", "bridge.js", "offline.html", "Info.plist", "Info-Debug.plist", "PrivacyInfo.xcprivacy", "Assets.xcassets"], sources: ["ServerPolicy.swift"]),
    .testTarget(name: "CompanionPolicyTests", dependencies: ["CompanionPolicy"], path: "Tests")
])
