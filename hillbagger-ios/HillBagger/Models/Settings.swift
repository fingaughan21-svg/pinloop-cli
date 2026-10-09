import SwiftUI

/// User preferences, persisted with @AppStorage.
enum SettingsKey {
    static let heightUnit = "heightUnit"
    static let followedLists = "followedLists"
    static let mapList = "mapList"
}

/// Lists shown on the Lists tab by default: the classic Scottish, Lakeland and Welsh rounds.
let defaultFollowedLists = ["munros", "corbetts", "fionas", "wainwrights", "welsh-3000s"]

extension String {
    /// Followed lists are stored as a comma-separated string so @AppStorage can hold them.
    var listIDs: [String] { split(separator: ",").map(String.init) }
}

extension Array where Element == String {
    var storageString: String { joined(separator: ",") }
}
