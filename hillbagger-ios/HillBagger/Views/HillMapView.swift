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
        NavigationStack {
            let bagged = ascents.baggedIDs
            let hills = catalog.hills(in: listID).filter { showBagged || !bagged.contains($0.id) }
            Map(position: $position, selection: $selectedID) {
                ForEach(hills) { hill in
                    Marker(hill.name, systemImage: "mountain.2.fill", coordinate: hill.coordinate)
                        .tint(bagged.contains(hill.id) ? Color.green : Color.orange)
                        .tag(hill.id)
                }
                UserAnnotation()
            }
            .mapStyle(.standard(elevation: .realistic))
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
                    Spacer()
                    Toggle("Show bagged", isOn: $showBagged).fixedSize()
                }
                .padding(.horizontal)
                .padding(.vertical, 6)
                .background(.thinMaterial)
            }
            .onChange(of: listID) { position = .automatic }
            .sheet(item: selectedHill) { hill in
                NavigationStack { HillDetailView(hill: hill) }
                    .presentationDetents([.medium, .large])
            }
            .toolbar(.hidden, for: .navigationBar)
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
