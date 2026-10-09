import SwiftUI
import SwiftData

struct ListsView: View {
    @Environment(HillCatalog.self) private var catalog
    @Query private var ascents: [Ascent]
    @AppStorage(SettingsKey.followedLists) private var followed = defaultFollowedLists.storageString
    @State private var showingManage = false
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            let bagged = ascents.baggedIDs
            let followedIDs = Set(followed.listIDs)
            List {
                ForEach(catalog.listsByArea) { group in
                    let shown = group.lists.filter { followedIDs.contains($0.id) }
                    if !shown.isEmpty {
                        Section(group.area) {
                            ForEach(shown) { list in
                                NavigationLink(value: list) {
                                    ListCard(list: list, progress: catalog.progress(for: list.id, bagged: bagged))
                                }
                            }
                        }
                    }
                }
                Section {
                    Button("Choose lists…", systemImage: "slider.horizontal.3") { showingManage = true }
                }
            }
            .navigationTitle("Hill Lists")
            .navigationDestination(for: HillList.self) { ListDetailView(list: $0) }
            .navigationDestination(for: Hill.self) { HillDetailView(hill: $0) }
            .toolbar {
                Button("Settings", systemImage: "gearshape") { showingSettings = true }
            }
            .sheet(isPresented: $showingManage) { ManageListsView() }
            .sheet(isPresented: $showingSettings) { SettingsView() }
        }
    }
}

struct ManageListsView: View {
    @Environment(HillCatalog.self) private var catalog
    @Environment(\.dismiss) private var dismiss
    @AppStorage(SettingsKey.followedLists) private var followed = defaultFollowedLists.storageString

    var body: some View {
        NavigationStack {
            List {
                ForEach(catalog.listsByArea) { group in
                    Section(group.area) {
                        ForEach(group.lists) { list in
                            Toggle(isOn: binding(for: list.id)) {
                                VStack(alignment: .leading) {
                                    Text("\(list.name) (\(list.count))")
                                    Text(list.criteria).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Your Lists")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
        }
    }

    private func binding(for id: String) -> Binding<Bool> {
        Binding {
            followed.listIDs.contains(id)
        } set: { on in
            var ids = followed.listIDs.filter { $0 != id }
            if on { ids.append(id) }
            // Keep the data file's ordering so sections don't jump around.
            let order = catalog.lists.map(\.id)
            followed = order.filter(ids.contains).storageString
        }
    }
}
