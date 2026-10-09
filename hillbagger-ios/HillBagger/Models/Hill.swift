import Foundation
import CoreLocation

struct Hill: Identifiable, Hashable, Decodable {
    let id: Int
    let name: String
    let metres: Double
    let drop: Double?
    let gridRef: String
    let lat: Double
    let lon: Double
    let region: String
    let country: String
    let lists: [String]

    var coordinate: CLLocationCoordinate2D { CLLocationCoordinate2D(latitude: lat, longitude: lon) }
    var location: CLLocation { CLLocation(latitude: lat, longitude: lon) }
    var feet: Int { Int((metres / 0.3048).rounded()) }

    /// DoBIH regions look like "01A: Loch Tay to Perth"; this is the part after the section code.
    var regionName: String {
        guard let colon = region.firstIndex(of: ":") else { return region }
        return region[region.index(after: colon)...].trimmingCharacters(in: .whitespaces)
    }

    /// The section code, e.g. "01A", used to group Munros/Corbetts the way guidebooks do.
    var sectionCode: String {
        guard let colon = region.firstIndex(of: ":") else { return "" }
        return String(region[..<colon])
    }

    func height(in unit: HeightUnit) -> String {
        switch unit {
        case .metres: return "\(metres.formatted(.number.precision(.fractionLength(0...1))))m"
        case .feet: return "\(feet.formatted())ft"
        }
    }
}

struct HillList: Identifiable, Hashable, Decodable {
    let id: String
    let name: String
    let subtitle: String
    let area: String
    let criteria: String
    let count: Int
}

enum HeightUnit: String, CaseIterable, Identifiable {
    case metres, feet
    var id: String { rawValue }
    var label: String { self == .metres ? "Metres" : "Feet" }
}
