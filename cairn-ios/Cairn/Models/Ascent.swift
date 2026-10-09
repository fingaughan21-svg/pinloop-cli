import Foundation
import SwiftData

/// One logged ascent of a hill. A hill counts as bagged once it has at least one ascent.
@Model
final class Ascent {
    var hillID: Int
    var date: Date
    var notes: String
    var companions: String
    var createdAt: Date

    init(hillID: Int, date: Date = .now, notes: String = "", companions: String = "") {
        self.hillID = hillID
        self.date = date
        self.notes = notes
        self.companions = companions
        self.createdAt = .now
    }
}

extension Collection where Element == Ascent {
    var baggedIDs: Set<Int> { Set(map(\.hillID)) }
}
