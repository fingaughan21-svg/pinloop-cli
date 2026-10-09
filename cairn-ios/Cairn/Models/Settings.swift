import SwiftUI

/// User preferences, persisted with @AppStorage.
enum SettingsKey {
    static let heightUnit = "heightUnit"
    static let followedLists = "followedLists"
    static let mapList = "mapList"
    static let hasOnboarded = "hasOnboarded"
}

/// Lists followed if someone skips choosing during onboarding.
let defaultFollowedLists = ["munros", "corbetts", "fionas", "wainwrights", "welsh-3000s"]

/// The journeys offered on the first screen, in the order shown. Everything else is under "Other".
let onboardingLists = ["munros", "corbetts", "fionas", "wainwrights", "welsh-3000s", "furths"]

extension String {
    /// Followed lists are stored as a comma-separated string so @AppStorage can hold them.
    var listIDs: [String] { split(separator: ",").map(String.init) }
}

extension Array where Element == String {
    var storageString: String { joined(separator: ",") }
}
