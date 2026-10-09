import Foundation

/// CSV export of the user's ascents, so their log can be backed up or moved to a spreadsheet.
enum AscentExport {
    static func csv(ascents: [Ascent], catalog: HillCatalog) -> String {
        let dateFormat = Date.ISO8601FormatStyle().year().month().day()
        var lines = ["date,hill,metres,grid_ref,lists,dobih_number,companions,notes"]
        for ascent in ascents.sorted(by: { $0.date < $1.date }) {
            let hill = catalog.hill(id: ascent.hillID)
            let lists = hill?.lists.compactMap { catalog.list(id: $0)?.name }.joined(separator: "; ") ?? ""
            lines.append([
                ascent.date.formatted(dateFormat),
                hill?.name ?? "Unknown",
                hill.map { String($0.metres) } ?? "",
                hill?.gridRef ?? "",
                lists,
                String(ascent.hillID),
                ascent.companions,
                ascent.notes,
            ].map(escape).joined(separator: ","))
        }
        return lines.joined(separator: "\n") + "\n"
    }

    static func escape(_ field: String) -> String {
        guard field.contains(where: { $0 == "," || $0 == "\"" || $0 == "\n" }) else { return field }
        return "\"" + field.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
}
