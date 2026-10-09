import XCTest
@testable import HillBagger

final class HillCatalogTests: XCTestCase {
    // Hosted tests run inside the app, so Bundle.main is the app bundle with hills.json.
    let catalog = HillCatalog.bundled()

    func testListSizesMatchTheOfficialLists() {
        XCTAssertEqual(catalog.hills(in: "munros").count, 282)
        XCTAssertEqual(catalog.hills(in: "corbetts").count, 222)
        XCTAssertEqual(catalog.hills(in: "fionas").count, 231)
        XCTAssertEqual(catalog.hills(in: "wainwrights").count, 214)
        XCTAssertEqual(catalog.hills(in: "welsh-3000s").count, 15)
        for list in catalog.lists {
            XCTAssertEqual(catalog.hills(in: list.id).count, list.count, list.name)
        }
    }

    func testListsAreSortedHighestFirst() {
        let munros = catalog.hills(in: "munros")
        XCTAssertTrue(munros.first?.name.hasPrefix("Ben Nevis") == true)
        XCTAssertTrue(zip(munros, munros.dropFirst()).allSatisfy { $0.metres >= $1.metres })
    }

    func testWelsh3000ersAreAllInWalesAndOver3000ft() {
        for hill in catalog.hills(in: "welsh-3000s") {
            XCTAssertEqual(hill.country, "Wales")
            XCTAssertGreaterThanOrEqual(hill.feet, 3000, hill.name)
        }
    }

    func testProgressCountsOnlyMembersOfTheList() {
        let nevis = catalog.hills(in: "munros")[0]
        let scafellPike = catalog.hills(in: "wainwrights")[0]
        let progress = catalog.progress(for: "munros", bagged: [nevis.id, scafellPike.id])
        XCTAssertEqual(progress, ListProgress(bagged: 1, total: 282))
        XCTAssertFalse(progress.isComplete)
    }

    func testRegionParsing() {
        let hill = catalog.hills(in: "munros")[0]
        XCTAssertFalse(hill.sectionCode.isEmpty)
        XCTAssertFalse(hill.regionName.contains(":"))
    }
}

final class AscentExportTests: XCTestCase {
    func testEscapesCommasAndQuotes() {
        XCTAssertEqual(AscentExport.escape("plain"), "plain")
        XCTAssertEqual(AscentExport.escape("wet, windy"), "\"wet, windy\"")
        XCTAssertEqual(AscentExport.escape("the \"In Pin\""), "\"the \"\"In Pin\"\"\"")
    }
}
