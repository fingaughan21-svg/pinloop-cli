import SwiftUI
import SwiftData
import MapKit

struct HillDetailView: View {
    let hill: Hill
    @Environment(HillCatalog.self) private var catalog
    @Environment(Community.self) private var community
    @Environment(\.modelContext) private var context
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres
    @State private var editing: Ascent?
    @State private var logging = false
    @State private var model: PeakCommunityModel

    init(hill: Hill) {
        self.hill = hill
        let id = hill.id
        _ascents = Query(filter: #Predicate<Ascent> { $0.hillID == id }, sort: \.date, order: .reverse)
        _model = State(initialValue: PeakCommunityModel(hillID: hill.id))
    }

    private var guide: PeakGuide? { catalog.guide(for: hill) }

    var body: some View {
        List {
            Section {
                Map(initialPosition: .camera(MapCamera(centerCoordinate: hill.coordinate, distance: 9000, pitch: 45))) {
                    Marker(hill.name, systemImage: "mountain.2.fill", coordinate: hill.coordinate)
                        .tint(ascents.isEmpty ? Theme.green : Theme.summit)
                }
                .mapStyle(.hybrid(elevation: .realistic))
                .frame(height: 220)
                .listRowInsets(EdgeInsets())
            }

            Section {
                PeakHeader(hill: hill, isBagged: !ascents.isEmpty)
                if let difficulty = guide?.difficulty {
                    DifficultyMeter(difficulty: difficulty)
                        .padding(.vertical, 4)
                } else {
                    Label("Difficulty not rated yet", systemImage: "questionmark.circle")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Routes") {
                RoutesContent(hill: hill, guide: guide)
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
                Text(ascents.isEmpty ? "Not yet bagged" : "Your ascents (\(ascents.count))")
            }

            TipsSection(hill: hill, model: model)
            CommentsSection(hill: hill, model: model)

            if let message = model.errorMessage {
                Section {
                    Label(message, systemImage: "wifi.exclamationmark")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Details") {
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
        }
        .navigationTitle(hill.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.load(community) }
        .refreshable { await model.load(community) }
        .sheet(isPresented: $model.isShowingSignIn, onDismiss: { Task { await model.load(community) } }) {
            SignInView()
        }
        .sheet(isPresented: $logging) { AscentEditor(hill: hill, ascent: nil) }
        .sheet(item: $editing) { AscentEditor(hill: hill, ascent: $0) }
    }
}

/// Name, height, lists and bagged status at the top of a peak's page (and the map's peak card).
struct PeakHeader: View {
    let hill: Hill
    let isBagged: Bool
    @Environment(HillCatalog.self) private var catalog

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(hill.name)
                .font(.title2.bold())
            Text("\(hill.height(in: .metres)) · \(hill.height(in: .feet)) · \(hill.regionName)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    if isBagged {
                        Label("Bagged", systemImage: "checkmark.seal.fill")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Theme.summit, in: Capsule())
                    }
                    ForEach(hill.lists.compactMap { catalog.list(id: $0) }) { Chip(text: $0.name) }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

/// Hand-picked AllTrails routes, the route note, and directions to the hill.
struct RoutesContent: View {
    let hill: Hill
    let guide: PeakGuide?

    var body: some View {
        if let trails = guide?.trails, !trails.isEmpty {
            ForEach(Array(trails.enumerated()), id: \.element.id) { index, trail in
                AllTrailsButton(trail: trail, prominent: index == 0)
                    .listRowSeparator(.hidden)
            }
        } else {
            Text("We haven't picked a route for this peak yet.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        if let note = guide?.note {
            Label {
                Text(note).font(.subheadline)
            } icon: {
                Image(systemName: "quote.opening").foregroundStyle(Theme.green)
            }
        }
        Button("Directions to the hill", systemImage: "car") { openInMaps() }
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
