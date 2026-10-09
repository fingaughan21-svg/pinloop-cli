import Foundation

/// Stores community content in a JSON file on this device. Used until a server is configured,
/// so the whole tips/comments/photos experience can be tried without any setup.
@MainActor
final class LocalCommunityBackend: CommunityBackend {
    private struct Store: Codable {
        var user: CommunityUser?
        var tips: [StoredTip] = []
        var votes: [UUID: Int] = [:]
        var comments: [StoredComment] = []
        var reported: [String] = []
    }

    private struct StoredTip: Codable {
        let id: UUID
        let hillID: Int
        let authorName: String
        let body: String
        let createdAt: Date
    }

    private struct StoredComment: Codable {
        let id: UUID
        let hillID: Int
        let authorName: String
        let body: String
        let createdAt: Date
        let photoFile: String?
    }

    private let directory: URL
    private var store: Store

    var signInMethod: SignInMethod { .onDevice }

    nonisolated init(directory: URL? = nil) {
        let base = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Community", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        self.directory = base
        let data = try? Data(contentsOf: base.appendingPathComponent("community.json"))
        store = data.flatMap { try? JSONDecoder().decode(Store.self, from: $0) } ?? Store()
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(store) else { return }
        try? data.write(to: directory.appendingPathComponent("community.json"), options: .atomic)
    }

    private func currentName() throws -> String {
        guard let name = store.user?.displayName else { throw CommunityError.notSignedIn }
        return name
    }

    // MARK: Account

    func restoreSession() async -> CommunityUser? { store.user }

    func requestCode(email: String) async throws {}

    func verify(email: String, code: String) async throws -> CommunityUser {
        throw CommunityError.server("Email sign-in needs the community server to be set up.")
    }

    func signInOnDevice(displayName: String) async throws -> CommunityUser {
        guard let name = DisplayName.validate(displayName) else { throw CommunityError.needsName }
        let user = CommunityUser(id: store.user?.id ?? UUID().uuidString, displayName: name, email: nil)
        store.user = user
        save()
        return user
    }

    func setDisplayName(_ name: String) async throws -> CommunityUser {
        try await signInOnDevice(displayName: name)
    }

    func signOut() async {
        store.user = nil
        save()
    }

    // MARK: Tips

    func tips(hillID: Int) async throws -> [Tip] {
        let me = store.user?.displayName
        return rankTips(store.tips.filter { $0.hillID == hillID }.map { tip in
            let vote = store.votes[tip.id] ?? 0
            return Tip(id: tip.id, hillID: tip.hillID, authorName: tip.authorName, body: tip.body,
                       createdAt: tip.createdAt, score: vote, myVote: vote, isMine: tip.authorName == me)
        })
    }

    func addTip(hillID: Int, body: String) async throws {
        store.tips.append(StoredTip(id: UUID(), hillID: hillID, authorName: try currentName(),
                                    body: body, createdAt: .now))
        save()
    }

    func deleteTip(_ id: UUID) async throws {
        store.tips.removeAll { $0.id == id }
        store.votes[id] = nil
        save()
    }

    func vote(tipID: UUID, value: Int) async throws {
        _ = try currentName()
        store.votes[tipID] = value == 0 ? nil : value
        save()
    }

    // MARK: Comments

    func comments(hillID: Int) async throws -> [PeakComment] {
        let me = store.user?.displayName
        return store.comments
            .filter { $0.hillID == hillID }
            .sorted { $0.createdAt > $1.createdAt }
            .map { c in
                PeakComment(id: c.id, hillID: c.hillID, authorName: c.authorName, body: c.body,
                            createdAt: c.createdAt,
                            photoURL: c.photoFile.map { directory.appendingPathComponent($0) },
                            isMine: c.authorName == me)
            }
    }

    func addComment(hillID: Int, body: String, photoJPEG: Data?) async throws {
        let name = try currentName()
        let id = UUID()
        var file: String?
        if let photoJPEG {
            file = "\(id.uuidString).jpg"
            try photoJPEG.write(to: directory.appendingPathComponent(file!), options: .atomic)
        }
        store.comments.append(StoredComment(id: id, hillID: hillID, authorName: name, body: body,
                                            createdAt: .now, photoFile: file))
        save()
    }

    func deleteComment(_ id: UUID) async throws {
        if let file = store.comments.first(where: { $0.id == id })?.photoFile {
            try? FileManager.default.removeItem(at: directory.appendingPathComponent(file))
        }
        store.comments.removeAll { $0.id == id }
        save()
    }

    func report(_ target: ReportTarget, reason: ReportReason) async throws {
        store.reported.append("\(target) \(reason.rawValue)")
        save()
    }
}
