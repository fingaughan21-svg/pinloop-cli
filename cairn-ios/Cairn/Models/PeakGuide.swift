import Foundation

/// Hand-picked information for a peak: its difficulty and recommended AllTrails routes.
/// Generated from curation/peaks.csv by scripts/apply_curation.py.
struct PeakGuide: Decodable, Hashable {
    let difficulty: Difficulty?
    let trails: [Trail]
    let note: String?

    struct Trail: Decodable, Hashable, Identifiable {
        let title: String
        let url: URL
        var id: URL { url }
    }
}

struct PeakGuideFile: Decodable {
    /// Keyed by DoBIH hill number, as a string (JSON object keys are strings).
    let peaks: [String: PeakGuide]

    var byHillID: [Int: PeakGuide] {
        Dictionary(uniqueKeysWithValues: peaks.compactMap { key, guide in Int(key).map { ($0, guide) } })
    }
}
