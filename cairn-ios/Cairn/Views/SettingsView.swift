import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(HillCatalog.self) private var catalog
    @Environment(Community.self) private var community
    @Environment(\.dismiss) private var dismiss
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres
    @State private var signingIn = false
    @State private var choosingJourney = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    if let name = community.user?.displayName {
                        LabeledContent("Signed in as", value: name)
                        Button("Sign out", role: .destructive) { Task { await community.signOut() } }
                    } else {
                        Button("Sign in or create an account", systemImage: "person.crop.circle") {
                            signingIn = true
                        }
                    }
                }

                Section("Your bagging") {
                    Button("Change what I'm bagging", systemImage: "mountain.2") {
                        choosingJourney = true
                    }
                    NavigationLink {
                        DifficultyGuideView()
                    } label: {
                        Label("Difficulty scale explained", systemImage: "gauge.with.dots.needle.33percent")
                    }
                    Picker("Heights in", selection: $unit) {
                        ForEach(HeightUnit.allCases) { Text($0.label).tag($0) }
                    }
                }

                Section {
                    ShareLink(item: exportFile(), preview: SharePreview("Cairn ascents")) {
                        Label("Export my ascents (spreadsheet)", systemImage: "square.and.arrow.up")
                    }
                    .disabled(ascents.isEmpty)
                } header: {
                    Text("Your log")
                } footer: {
                    Text("\(ascents.count) ascents are stored on this phone.")
                }

                Section("About") {
                    Text("Hill data from the \(catalog.source), licensed CC BY 4.0. © the DoBIH contributors.")
                        .font(.callout)
                    Link("Database of British and Irish Hills",
                         destination: URL(string: "https://www.hill-bagging.co.uk/dobih")!)
                    Text("Cairn is not affiliated with AllTrails. Route links open on AllTrails.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Text("Always carry a map and compass, check the mountain weather forecast, and tell someone your route.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
            .sheet(isPresented: $signingIn) { SignInView() }
            .fullScreenCover(isPresented: $choosingJourney) { OnboardingView(startStep: 1) }
        }
    }

    private func exportFile() -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("cairn-ascents.csv")
        try? AscentExport.csv(ascents: ascents, catalog: catalog).write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

struct DifficultyGuideView: View {
    var body: some View {
        List {
            Section {
                ForEach(Difficulty.allCases) { level in
                    HStack(alignment: .top, spacing: 14) {
                        DifficultyBadge(difficulty: level, style: .number)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(level.title).font(.headline)
                            Text(level.summary).font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            } footer: {
                Text("Ratings assume good summer conditions. Snow, ice, wind and short winter days can make any hill much harder.")
            }
        }
        .navigationTitle("Difficulty")
    }
}
