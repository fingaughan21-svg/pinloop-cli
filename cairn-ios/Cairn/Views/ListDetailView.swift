import SwiftUI
import SwiftData

struct ListDetailView: View {
    let list: HillList
    @Environment(HillCatalog.self) private var catalog
    @Environment(\.modelContext) private var context
    @Query private var ascents: [Ascent]
    @State private var search = ""
    @State private var filter: Filter = .all
    @State private var sort: Sort = .height
    /// When set, only show rated hills at or below this difficulty.
    @State private var maxDifficulty: Difficulty?

    enum Filter: String, CaseIterable, Identifiable {
        case all = "All", toDo = "To do", bagged = "Bagged"
        var id: String { rawValue }
    }

    enum Sort: String, CaseIterable, Identifiable {
        case height = "Height", name = "Name", region = "Region"
        var id: String { rawValue }
    }

    var body: some View {
        let bagged = ascents.baggedIDs
        let progress = catalog.progress(for: list.id, bagged: bagged)
        let hills = visibleHills(bagged: bagged)

        List {
            Section {
                HStack(spacing: 16) {
                    ProgressRing(fraction: progress.fraction, lineWidth: 8).frame(width: 64, height: 64)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(progress.bagged) of \(progress.total) bagged").font(.headline)
                        Text(list.criteria).font(.caption).foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
                Picker("Show", selection: $filter) {
                    ForEach(Filter.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
            }

            if sort == .region {
                ForEach(groupedByRegion(hills)) { group in
                    Section(group.region) {
                        ForEach(group.hills) { row($0, bagged: bagged) }
                    }
                }
            } else {
                Section("\(hills.count) hills") {
                    ForEach(hills) { row($0, bagged: bagged) }
                }
            }
        }
        .navigationTitle(list.name)
        .searchable(text: $search, prompt: "Search \(list.name)")
        .toolbar {
            Menu {
                Picker("Difficulty", selection: $maxDifficulty) {
                    Text("Any difficulty").tag(Difficulty?.none)
                    ForEach(Difficulty.allCases) { level in
                        Text(level == .beginner ? "1 · Beginner only" : "Up to \(level.rawValue) · \(level.title)")
                            .tag(Difficulty?.some(level))
                    }
                }
            } label: {
                Label("Difficulty", systemImage: maxDifficulty == nil
                      ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
            }
            Menu("Sort", systemImage: "arrow.up.arrow.down") {
                Picker("Sort", selection: $sort) {
                    ForEach(Sort.allCases) { Text($0.rawValue).tag($0) }
                }
            }
        }
        .overlay {
            if hills.isEmpty {
                if !search.isEmpty {
                    ContentUnavailableView.search(text: search)
                } else if maxDifficulty != nil {
                    ContentUnavailableView("No rated hills at this level yet",
                                           systemImage: "mountain.2",
                                           description: Text("Difficulty ratings are being added. Try a higher level or show any difficulty."))
                }
            }
        }
    }

    private func row(_ hill: Hill, bagged: Set<Int>) -> some View {
        NavigationLink(value: hill) {
            HillRow(hill: hill, isBagged: bagged.contains(hill.id))
        }
        .swipeActions(edge: .leading) {
            if !bagged.contains(hill.id) {
                Button("Bag today", systemImage: "flag.fill") {
                    context.insert(Ascent(hillID: hill.id))
                }
                .tint(Theme.green)
            }
        }
    }

    private func visibleHills(bagged: Set<Int>) -> [Hill] {
        var hills = catalog.hills(in: list.id)
        switch filter {
        case .all: break
        case .toDo: hills = hills.filter { !bagged.contains($0.id) }
        case .bagged: hills = hills.filter { bagged.contains($0.id) }
        }
        if let maxDifficulty {
            hills = hills.filter { catalog.difficulty(of: $0).map { $0 <= maxDifficulty } ?? false }
        }
        let query = search.trimmingCharacters(in: .whitespaces)
        if !query.isEmpty {
            hills = hills.filter {
                $0.name.localizedStandardContains(query) || $0.region.localizedStandardContains(query)
            }
        }
        switch sort {
        case .height: break // catalog already sorts by height
        case .name: hills.sort { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
        case .region: hills.sort { ($0.region, -$0.metres) < ($1.region, -$1.metres) }
        }
        return hills
    }

    private struct RegionGroup: Identifiable {
        let region: String
        let hills: [Hill]
        var id: String { region }
    }

    private func groupedByRegion(_ hills: [Hill]) -> [RegionGroup] {
        var order: [String] = []
        var groups: [String: [Hill]] = [:]
        for hill in hills {
            if groups[hill.region] == nil { order.append(hill.region) }
            groups[hill.region, default: []].append(hill)
        }
        return order.map { RegionGroup(region: $0, hills: groups[$0]!) }
    }
}
