import Foundation
import Observation

/// App-wide community state: who is signed in, plus pass-through calls to the backend.
@MainActor
@Observable
final class Community {
    let backend: CommunityBackend
    private(set) var user: CommunityUser?

    var isSignedIn: Bool { user?.displayName != nil }
    var isShared: Bool { backend.signInMethod == .emailCode }

    nonisolated init(backend: CommunityBackend) {
        self.backend = backend
    }

    /// Uses the shared server when one is configured, otherwise keeps everything on the device.
    nonisolated static func make() -> Community {
        if let config = CommunityConfig.supabase {
            return Community(backend: SupabaseCommunityBackend(config: config))
        }
        return Community(backend: LocalCommunityBackend())
    }

    func restore() async {
        user = await backend.restoreSession()
    }

    func requestCode(email: String) async throws {
        try await backend.requestCode(email: email)
    }

    func verify(email: String, code: String) async throws {
        user = try await backend.verify(email: email, code: code)
    }

    func signInOnDevice(displayName: String) async throws {
        user = try await backend.signInOnDevice(displayName: displayName)
    }

    func setDisplayName(_ name: String) async throws {
        user = try await backend.setDisplayName(name)
    }

    func signOut() async {
        await backend.signOut()
        user = nil
    }
}

/// Display names are shown publicly next to tips and comments.
enum DisplayName {
    static let allowedLength = 2...30

    static func validate(_ raw: String) -> String? {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        return allowedLength.contains(name.count) ? name : nil
    }
}
