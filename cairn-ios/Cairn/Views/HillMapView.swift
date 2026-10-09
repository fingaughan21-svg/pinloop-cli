import SwiftUI
import SwiftData
import MapKit

struct HillMapView: View {
    @Environment(HillCatalog.self) private var catalog
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.mapList) private var listID = "munros"
    @State private var position: MapCameraPosition = .automatic
    @State private var selectedID: Int?
    @State private var showBagged = true

    var body: some View {
        let bagged = ascents.baggedIDs
        let hills = catalog.hills(in: listID).filter { showBagged || !bagged.contains($0.id) }
        Map(position: $position, selection: $selectedID) {
            ForEach(hills) { hill in
                let isBagged = bagged.contains(hill.id)
                Marker(hill.name, systemImage: isBagged ? "checkmark" : "mountain.2.fill", coordinate: hill.coordinate)
                    .tint(isBagged ? Theme.summit : Theme.green)
                    .tag(hill.id)
            }
            UserAnnotation()
        }
        .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .safeAreaInset(edge: .top) {
            HStack {
                Picker("List", selection: $listID) {
                    ForEach(catalog.lists) { Text($0.name).tag($0.id) }
                }
                .tint(Theme.green)
                Spacer()
                Toggle("Show bagged", isOn: $showBagged)
                    .fixedSize()
                    .tint(Theme.green)
            }
            .padding(.horizontal)
            .padding(.vertical, 6)
            .background(.regularMaterial)
        }
        .onChange(of: listID) { position = .automatic }
        .sheet(item: selectedHill) { hill in
            PeakCard(hill: hill)
                .presentationDetents([.height(360), .large])
                .presentationDragIndicator(.visible)
        }
    }

    private var selectedHill: Binding<Hill?> {
        Binding {
            selectedID.flatMap { catalog.hill(id: $0) }
        } set: { hill in
            selectedID = hill?.id
        }
    }
}

/// The card that slides up when a peak is tapped on the map.
struct PeakCard: View {
    let hill: Hill
    @Environment(HillCatalog.self) private var catalog
    @Environment(\.modelContext) private var context
    @Query private var ascents: [Ascent]

    init(hill: Hill) {
        self.hill = hill
        let id = hill.id
        _ascents = Query(filter: #Predicate<Ascent> { $0.hillID == id })
    }

    var body: some View {
        let guide = catalog.guide(for: hill)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    PeakHeader(hill: hill, isBagged: !ascents.isEmpty)
                    if let difficulty = guide?.difficulty {
                        DifficultyMeter(difficulty: difficulty)
                    }
                    if let trail = guide?.trails.first {
                        AllTrailsButton(trail: trail)
                    }
                    HStack(spacing: 10) {
                        if ascents.isEmpty {
                            Button("I've bagged this", systemImage: "flag.fill") {
                                context.insert(Ascent(hillID: hill.id))
                            }
                            .buttonStyle(.cairnSecondary)
                        }
                        NavigationLink {
                            HillDetailView(hill: hill)
                        } label: {
                            Label("Tips & details", systemImage: "info.circle")
                        }
                        .buttonStyle(.cairnSecondary)
                    }
                }
                .padding(20)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
