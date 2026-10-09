import SwiftUI
import SwiftData
import CoreLocation

/// The closest unbagged hills on the lists you follow, from your current location.
struct NearbyView: View {
    @Environment(HillCatalog.self) private var catalog
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.followedLists) private var followed = defaultFollowedLists.storageString
    @State private var location = LocationProvider()
    @State private var includeBagged = false

    var body: some View {
        NavigationStack {
            Group {
                if let here = location.location {
                    list(from: here)
                } else if location.authorization == .denied || location.authorization == .restricted {
                    ContentUnavailableView("Location is off",
                                           systemImage: "location.slash",
                                           description: Text("Allow location access in Settings to find hills near you."))
                } else {
                    ProgressView("Finding your location…")
                }
            }
            .navigationTitle("Nearby")
            .navigationDestination(for: Hill.self) { HillDetailView(hill: $0) }
            .toolbar {
                Toggle("Include bagged", systemImage: "checkmark.circle", isOn: $includeBagged)
                    .toggleStyle(.button)
            }
            .onAppear { location.start() }
            .onDisappear { location.stop() }
        }
    }

    private func list(from here: CLLocation) -> some View {
        let bagged = ascents.baggedIDs
        let lists = Set(followed.listIDs)
        let nearest = catalog.hills
            .filter { !lists.isDisjoint(with: $0.lists) && (includeBagged || !bagged.contains($0.id)) }
            .map { NearbyHill(hill: $0, distance: $0.location.distance(from: here)) }
            .sorted { $0.distance < $1.distance }
            .prefix(50)

        return List(Array(nearest)) { item in
            NavigationLink(value: item.hill) {
                HillRow(hill: item.hill,
                        isBagged: bagged.contains(item.hill.id),
                        detail: distanceText(item.distance, hill: item.hill, lists: lists))
            }
        }
        .overlay {
            if nearest.isEmpty {
                ContentUnavailableView("Nothing left nearby",
                                       systemImage: "checkmark.seal",
                                       description: Text("You've bagged everything on your lists. Time to follow another one?"))
            }
        }
    }

    private func distanceText(_ metres: CLLocationDistance, hill: Hill, lists: Set<String>) -> String {
        let distance = Measurement(value: metres, unit: UnitLength.meters)
            .formatted(.measurement(width: .abbreviated, usage: .road))
        let names = hill.lists.filter(lists.contains).compactMap { catalog.list(id: $0)?.name }
        return ([distance] + names).joined(separator: " · ")
    }
}

private struct NearbyHill: Identifiable {
    let hill: Hill
    let distance: CLLocationDistance
    var id: Int { hill.id }
}
