import SwiftUI
import SwiftData
import Charts

struct ProgressTabView: View {
    @Environment(HillCatalog.self) private var catalog
    @Query(sort: \Ascent.date, order: .reverse) private var ascents: [Ascent]
    @AppStorage(SettingsKey.followedLists) private var followed = defaultFollowedLists.storageString
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres

    var body: some View {
        NavigationStack {
            let bagged = ascents.baggedIDs
            let stats = Stats(ascents: ascents, catalog: catalog)
            List {
                Section {
                    HStack {
                        StatTile(value: "\(bagged.count)", label: "Hills bagged")
                        StatTile(value: "\(ascents.count)", label: "Ascents")
                        StatTile(value: stats.highest.map { $0.height(in: unit) } ?? "–", label: "Highest")
                    }
                    .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
                }

                Section("Lists") {
                    ForEach(listsToShow(bagged: bagged)) { list in
                        let progress = catalog.progress(for: list.id, bagged: bagged)
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(list.name).font(.subheadline.bold())
                                Spacer()
                                Text("\(progress.bagged)/\(progress.total)").font(.caption.monospacedDigit())
                            }
                            ProgressView(value: progress.fraction)
                                .tint(progress.isComplete ? Color.green : Color.accentColor)
                        }
                    }
                }

                if !stats.byYear.isEmpty {
                    Section("New hills by year") {
                        Chart(stats.byYear) { item in
                            BarMark(x: .value("Year", String(item.year)), y: .value("New hills", item.count))
                                .foregroundStyle(Color.accentColor)
                        }
                        .frame(height: 160)
                    }
                }

                Section("Recent ascents") {
                    if ascents.isEmpty {
                        Text("Log your first ascent from any hill's page, or swipe right on a hill in a list.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }
                    ForEach(ascents.prefix(15)) { ascent in
                        if let hill = catalog.hill(id: ascent.hillID) {
                            NavigationLink(value: hill) {
                                HillRow(hill: hill, isBagged: true,
                                        detail: ascent.date.formatted(date: .abbreviated, time: .omitted))
                            }
                        }
                    }
                }
            }
            .navigationTitle("Progress")
            .navigationDestination(for: Hill.self) { HillDetailView(hill: $0) }
        }
    }

    /// Followed lists, plus any other list where the user has already bagged something.
    private func listsToShow(bagged: Set<Int>) -> [HillList] {
        let followedIDs = Set(followed.listIDs)
        return catalog.lists.filter {
            followedIDs.contains($0.id) || catalog.progress(for: $0.id, bagged: bagged).bagged > 0
        }
    }
}

struct Stats {
    let highest: Hill?
    let byYear: [YearCount]

    struct YearCount: Identifiable {
        let year: Int
        let count: Int
        var id: Int { year }
    }

    /// "New hills by year" counts each hill once, in the year of its first ascent.
    init(ascents: [Ascent], catalog: HillCatalog) {
        var firstAscent: [Int: Date] = [:]
        for ascent in ascents {
            if let existing = firstAscent[ascent.hillID], existing <= ascent.date { continue }
            firstAscent[ascent.hillID] = ascent.date
        }
        highest = firstAscent.keys.compactMap { catalog.hill(id: $0) }.max { $0.metres < $1.metres }
        let calendar = Calendar.current
        let counts = Dictionary(grouping: firstAscent.values) { calendar.component(.year, from: $0) }
            .mapValues(\.count)
        byYear = counts.keys.sorted().map { YearCount(year: $0, count: counts[$0]!) }
    }
}

struct StatTile: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value).font(.title2.bold().monospacedDigit()).minimumScaleFactor(0.6).lineLimit(1)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
