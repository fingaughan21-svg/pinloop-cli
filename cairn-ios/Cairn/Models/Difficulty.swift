import SwiftUI

/// Cairn's 1–5 difficulty scale, set by hand for each peak (see curation/peaks.csv).
enum Difficulty: Int, CaseIterable, Identifiable, Codable, Comparable {
    case beginner = 1, moderate, challenging, strenuous, strenuousPlus

    var id: Int { rawValue }

    static func < (a: Difficulty, b: Difficulty) -> Bool { a.rawValue < b.rawValue }

    var title: String {
        switch self {
        case .beginner: "Beginner"
        case .moderate: "Moderate"
        case .challenging: "Challenging"
        case .strenuous: "Strenuous"
        case .strenuousPlus: "Strenuous+"
        }
    }

    var summary: String {
        switch self {
        case .beginner:
            "Clear paths and steady gradients. A great first hill for families and new walkers."
        case .moderate:
            "A longer day with some steep or rough ground. Good walking fitness helps."
        case .challenging:
            "Long, steep or pathless sections. You'll need to navigate with a map and compass."
        case .strenuous:
            "A big, demanding day on rough mountain terrain. For fit, experienced hillwalkers."
        case .strenuousPlus:
            "Technical ground: Grade 2 scrambling or harder. Hands-on rock and a head for heights."
        }
    }

    /// Green → amber → red, so the colour hints at the level. The number is always shown
    /// alongside it, so the scale never relies on colour alone.
    var color: Color {
        switch self {
        case .beginner: Color(hex: 0x3B8540)
        case .moderate: Color(hex: 0x5E7A16)
        case .challenging: Color(hex: 0x9A6A00)
        case .strenuous: Color(hex: 0xB4520F)
        case .strenuousPlus: Color(hex: 0xB3261E)
        }
    }
}
