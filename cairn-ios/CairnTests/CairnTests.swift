import XCTest
@testable import Cairn

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

    func testOnboardingListsAllExist() {
        for id in onboardingLists + defaultFollowedLists {
            XCTAssertNotNil(catalog.list(id: id), id)
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

final class CurationTests: XCTestCase {
    func testGuidesAttachToHillsByDoBIHNumber() throws {
        let hills = """
        {"source":"test","licence":"test","lists":[{"id":"munros","name":"Munros","subtitle":"","area":"Scotland","criteria":"","count":1}],
         "hills":[{"id":278,"name":"Ben Nevis","metres":1345,"drop":1345,"gridRef":"NN166712","lat":56.79,"lon":-5.0,"region":"04A: Fort William","country":"Scotland","lists":["munros"]}]}
        """
        let curation = """
        {"peaks":{"278":{"difficulty":3,"trails":[{"title":"Mountain Track","url":"https://www.alltrails.com/trail/scotland/highland/ben-nevis"}],"note":"Start early."}}}
        """
        let catalog = try HillCatalog(data: Data(hills.utf8), curation: Data(curation.utf8))
        let nevis = try XCTUnwrap(catalog.hill(id: 278))
        XCTAssertEqual(catalog.difficulty(of: nevis), .challenging)
        XCTAssertEqual(catalog.guide(for: nevis)?.trails.first?.title, "Mountain Track")
        XCTAssertEqual(catalog.guide(for: nevis)?.note, "Start early.")
    }

    func testBundledCurationLoads() {
        // The bundled curation.json must always decode, even when it's empty.
        let url = Bundle.main.url(forResource: "curation", withExtension: "json")
        XCTAssertNotNil(url)
        XCTAssertNoThrow(try JSONDecoder().decode(PeakGuideFile.self, from: Data(contentsOf: url!)))
    }

    func testDifficultyOrdering() {
        XCTAssertLessThan(Difficulty.beginner, Difficulty.strenuousPlus)
        XCTAssertEqual(Difficulty.allCases.map(\.rawValue), [1, 2, 3, 4, 5])
    }
}

@MainActor
final class LocalCommunityTests: XCTestCase {
    private func makeBackend() -> LocalCommunityBackend {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        return LocalCommunityBackend(directory: dir)
    }

    func testPostingNeedsADisplayName() async {
        let backend = makeBackend()
        do {
            try await backend.addTip(hillID: 1, body: "Park early")
            XCTFail("Expected sign-in to be required")
        } catch {}
    }

    func testVotingChangesScoreAndCanBeUndone() async throws {
        let backend = makeBackend()
        _ = try await backend.signInOnDevice(displayName: "Morag")
        try await backend.addTip(hillID: 1, body: "Bring midge spray")
        let tips = try await backend.tips(hillID: 1)
        let tip = try XCTUnwrap(tips.first)
        XCTAssertTrue(tip.isMine)

        try await backend.vote(tipID: tip.id, value: 1)
        let upvoted = try await backend.tips(hillID: 1)
        XCTAssertEqual(upvoted.first?.score, 1)
        try await backend.vote(tipID: tip.id, value: 0)
        let cleared = try await backend.tips(hillID: 1)
        XCTAssertEqual(cleared.first?.score, 0)
    }

    func testTipsAreRankedByScoreThenNewest() {
        let old = Tip(id: UUID(), hillID: 1, authorName: "A", body: "a", createdAt: .distantPast, score: 0, myVote: 0, isMine: false)
        let new = Tip(id: UUID(), hillID: 1, authorName: "B", body: "b", createdAt: .now, score: 0, myVote: 0, isMine: false)
        let top = Tip(id: UUID(), hillID: 1, authorName: "C", body: "c", createdAt: .distantPast, score: 5, myVote: 0, isMine: false)
        XCTAssertEqual(rankTips([old, new, top]).map(\.id), [top.id, new.id, old.id])
    }

    func testDisplayNameValidation() {
        XCTAssertNil(DisplayName.validate(" a "))
        XCTAssertEqual(DisplayName.validate("  Hamish  "), "Hamish")
    }
}

final class AscentExportTests: XCTestCase {
    func testEscapesCommasAndQuotes() {
        XCTAssertEqual(AscentExport.escape("plain"), "plain")
        XCTAssertEqual(AscentExport.escape("wet, windy"), "\"wet, windy\"")
        XCTAssertEqual(AscentExport.escape("the \"In Pin\""), "\"the \"\"In Pin\"\"\"")
    }
}
