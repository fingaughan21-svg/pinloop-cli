import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(HillCatalog.self) private var catalog
    @Environment(\.dismiss) private var dismiss
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres

    var body: some View {
        NavigationStack {
            Form {
                Section("Units") {
                    Picker("Heights", selection: $unit) {
                        ForEach(HeightUnit.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    ShareLink(item: exportFile(), preview: SharePreview("HillBagger ascents")) {
                        Label("Export ascents (CSV)", systemImage: "square.and.arrow.up")
                    }
                    .disabled(ascents.isEmpty)
                } header: {
                    Text("Your log")
                } footer: {
                    Text("\(ascents.count) ascents are stored on this device.")
                }

                Section("About the data") {
                    Text("Hill data from the \(catalog.source), licensed CC BY 4.0. © the DoBIH contributors.")
                        .font(.callout)
                    Link("Database of British and Irish Hills",
                         destination: URL(string: "https://www.hill-bagging.co.uk/dobih")!)
                    Text("Always carry a map and compass, check the mountain weather forecast, and tell someone your route.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
        }
    }

    private func exportFile() -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("hillbagger-ascents.csv")
        try? AscentExport.csv(ascents: ascents, catalog: catalog).write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}
