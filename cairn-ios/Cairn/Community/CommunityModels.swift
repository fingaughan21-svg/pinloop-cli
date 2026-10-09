import Foundation

struct CommunityUser: Codable, Equatable {
    let id: String
    var displayName: String?
    var email: String?
}

/// A short, practical tip about a peak. Tips are ranked by votes so the most useful rise to the top.
struct Tip: Identifiable, Hashable {
    let id: UUID
    let hillID: Int
    let authorName: String
    let body: String
    let createdAt: Date
    var score: Int
    /// The signed-in user's vote: -1, 0 (none) or 1.
    var myVote: Int
    let isMine: Bool
}

/// A comment on a peak or its routes, optionally with a photo.
struct PeakComment: Identifiable, Hashable {
    let id: UUID
    let hillID: Int
    let authorName: String
    let body: String
    let createdAt: Date
    let photoURL: URL?
    let isMine: Bool
}

enum ReportTarget: Hashable {
    case tip(UUID)
    case comment(UUID)
}

enum ReportReason: String, CaseIterable, Identifiable {
    case unsafe = "Unsafe or misleading advice"
    case offensive = "Offensive or abusive"
    case spam = "Spam or advertising"
    case other = "Something else"
    var id: String { rawValue }
}

enum SignInMethod {
    /// Accounts live on a server: sign in with a one-time code sent by email.
    case emailCode
    /// No server configured yet: a name is enough and everything stays on this phone.
    case onDevice
}

enum CommunityError: LocalizedError {
    case notSignedIn
    case needsName
    case server(String)

    var errorDescription: String? {
        switch self {
        case .notSignedIn: "Please sign in first."
        case .needsName: "Please choose a display name."
        case .server(let message): message
        }
    }
}

/// Where community content is stored. `LocalCommunityBackend` keeps it on the device;
/// `SupabaseCommunityBackend` shares it between everyone once a server is set up.
@MainActor
protocol CommunityBackend: AnyObject {
    var signInMethod: SignInMethod { get }
    func restoreSession() async -> CommunityUser?
    func requestCode(email: String) async throws
    func verify(email: String, code: String) async throws -> CommunityUser
    func signInOnDevice(displayName: String) async throws -> CommunityUser
    func setDisplayName(_ name: String) async throws -> CommunityUser
    func signOut() async

    func tips(hillID: Int) async throws -> [Tip]
    func addTip(hillID: Int, body: String) async throws
    func deleteTip(_ id: UUID) async throws
    func vote(tipID: UUID, value: Int) async throws

    func comments(hillID: Int) async throws -> [PeakComment]
    func addComment(hillID: Int, body: String, photoJPEG: Data?) async throws
    func deleteComment(_ id: UUID) async throws

    func report(_ target: ReportTarget, reason: ReportReason) async throws
}

/// Shared ordering for tips: highest score first, then newest.
func rankTips(_ tips: [Tip]) -> [Tip] {
    tips.sorted { ($0.score, $0.createdAt) > ($1.score, $1.createdAt) }
}
