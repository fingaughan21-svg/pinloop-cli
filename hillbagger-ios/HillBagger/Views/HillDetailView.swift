import SwiftUI
import SwiftData
import MapKit

struct HillDetailView: View {
    let hill: Hill
    @Environment(HillCatalog.self) private var catalog
    @Environment(\.modelContext) private var context
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres
    @State private var editing: Ascent?
    @State private var logging = false

    init(hill: Hill) {
        self.hill = hill
        let id = hill.id
        _ascents = Query(filter: #Predicate<Ascent> { $0.hillID == id }, sort: \.date, order: .reverse)
    }

    var body: some View {
        List {
            Section {
                Map(initialPosition: .camera(MapCamera(centerCoordinate: hill.coordinate, distance: 9000, pitch: 45))) {
                    Marker(hill.name, systemImage: "mountain.2.fill", coordinate: hill.coordinate)
                        .tint(ascents.isEmpty ? Color.orange : Color.green)
                }
                .mapStyle(.hybrid(elevation: .realistic))
                .frame(height: 220)
                .listRowInsets(EdgeInsets())
            }

            Section {
                LabeledContent("Height", value: "\(hill.height(in: .metres)) · \(hill.height(in: .feet))")
                if let drop = hill.drop {
                    LabeledContent("Prominence", value: "\(drop.formatted(.number.precision(.fractionLength(0))))m")
                }
                LabeledContent("Grid ref", value: hill.gridRef)
                LabeledContent("Region", value: hill.regionName)
                if !hill.sectionCode.isEmpty {
                    LabeledContent("Section", value: hill.sectionCode)
                }
                LabeledContent("Country", value: hill.country)
            }

            Section("On these lists") {
                ForEach(hill.lists.compactMap { catalog.list(id: $0) }) { list in
                    Label(list.name, systemImage: "list.bullet")
                }
            }

            Section {
                Button("Log an ascent", systemImage: "flag.fill") { logging = true }
                    .font(.headline)
                ForEach(ascents) { ascent in
                    Button { editing = ascent } label: { AscentRow(ascent: ascent) }
                        .foregroundStyle(.primary)
                }
                .onDelete { offsets in
                    for index in offsets { context.delete(ascents[index]) }
                }
            } header: {
                Text(ascents.isEmpty ? "Not yet bagged" : "Ascents (\(ascents.count))")
            }

            Section {
                Button("Directions in Maps", systemImage: "car") { openInMaps() }
            }
        }
        .navigationTitle(hill.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $logging) { AscentEditor(hill: hill, ascent: nil) }
        .sheet(item: $editing) { AscentEditor(hill: hill, ascent: $0) }
    }

    private func openInMaps() {
        let item = MKMapItem(placemark: MKPlacemark(coordinate: hill.coordinate))
        item.name = hill.name
        item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
}

struct AscentRow: View {
    let ascent: Ascent

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(ascent.date, format: .dateTime.day().month(.wide).year()).font(.subheadline.bold())
            if !ascent.companions.isEmpty {
                Text("With \(ascent.companions)").font(.caption).foregroundStyle(.secondary)
            }
            if !ascent.notes.isEmpty {
                Text(ascent.notes).font(.caption).lineLimit(3)
            }
        }
    }
}

/// Creates a new ascent, or edits an existing one.
struct AscentEditor: View {
    let hill: Hill
    let ascent: Ascent?
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var date = Date.now
    @State private var companions = ""
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Date", selection: $date, in: ...Date.now, displayedComponents: .date)
                TextField("Who with?", text: $companions)
                TextField("Notes: route, weather, views…", text: $notes, axis: .vertical)
                    .lineLimit(4...10)
            }
            .navigationTitle(hill.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { save() } }
            }
            .onAppear {
                if let ascent {
                    date = ascent.date
                    companions = ascent.companions
                    notes = ascent.notes
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func save() {
        if let ascent {
            ascent.date = date
            ascent.companions = companions
            ascent.notes = notes
        } else {
            context.insert(Ascent(hillID: hill.id, date: date, notes: notes, companions: companions))
        }
        dismiss()
    }
}
