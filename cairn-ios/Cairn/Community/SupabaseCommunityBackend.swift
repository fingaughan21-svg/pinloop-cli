import Foundation

/// Shared community backend on Supabase, talking to its REST APIs directly
/// (Auth for email codes, PostgREST for data, Storage for photos).
/// The matching database schema is backend/supabase/schema.sql.
@MainActor
final class SupabaseCommunityBackend: CommunityBackend {
    private struct Session: Codable {
        var accessToken: String
        var refreshToken: String
        var expiresAt: Date
        var userID: String
        var email: String?
    }

    private let config: CommunityConfig.Supabase
    private let urlSession = URLSession.shared
    private var session: Session?
    private var displayName: String?

    var signInMethod: SignInMethod { .emailCode }

    nonisolated init(config: CommunityConfig.Supabase) {
        self.config = config
        session = Keychain.load(account: "session").flatMap { try? JSONDecoder().decode(Session.self, from: $0) }
    }

    // MARK: Account

    func restoreSession() async -> CommunityUser? {
        guard let session else { return nil }
        let profile = try? await fetchProfile(userID: session.userID)
        displayName = profile?.displayName
        return CommunityUser(id: session.userID, displayName: displayName, email: session.email)
    }

    func requestCode(email: String) async throws {
        _ = try await send("POST", "auth/v1/otp", json: ["email": email, "create_user": true], auth: false)
    }

    func verify(email: String, code: String) async throws -> CommunityUser {
        let data = try await send("POST", "auth/v1/verify",
                                  json: ["type": "email", "email": email, "token": code], auth: false)
        try storeSession(from: data)
        guard let session else { throw CommunityError.notSignedIn }
        displayName = try? await fetchProfile(userID: session.userID)?.displayName
        return CommunityUser(id: session.userID, displayName: displayName, email: session.email)
    }

    func signInOnDevice(displayName: String) async throws -> CommunityUser {
        throw CommunityError.server("Please sign in with your email.")
    }

    func setDisplayName(_ name: String) async throws -> CommunityUser {
        guard let session else { throw CommunityError.notSignedIn }
        guard let name = DisplayName.validate(name) else { throw CommunityError.needsName }
        _ = try await send("POST", "rest/v1/profiles", json: ["id": session.userID, "display_name": name],
                           prefer: "resolution=merge-duplicates,return=minimal")
        displayName = name
        return CommunityUser(id: session.userID, displayName: name, email: session.email)
    }

    func signOut() async {
        _ = try? await send("POST", "auth/v1/logout")
        session = nil
        displayName = nil
        Keychain.delete(account: "session")
    }

    // MARK: Tips

    private struct TipRow: Decodable {
        let id: UUID
        let hillId: Int
        let authorId: String
        let authorName: String
        let body: String
        let createdAt: Date
        let score: Int
        let myVote: Int
    }

    func tips(hillID: Int) async throws -> [Tip] {
        let rows: [TipRow] = try await get("rest/v1/tips_ranked?hill_id=eq.\(hillID)&order=score.desc,created_at.desc")
        return rows.map {
            Tip(id: $0.id, hillID: $0.hillId, authorName: $0.authorName, body: $0.body, createdAt: $0.createdAt,
                score: $0.score, myVote: $0.myVote, isMine: $0.authorId == session?.userID)
        }
    }

    func addTip(hillID: Int, body: String) async throws {
        _ = try await send("POST", "rest/v1/tips", json: ["hill_id": hillID, "body": body], prefer: "return=minimal")
    }

    func deleteTip(_ id: UUID) async throws {
        _ = try await send("DELETE", "rest/v1/tips?id=eq.\(id.uuidString)")
    }

    func vote(tipID: UUID, value: Int) async throws {
        guard let session else { throw CommunityError.notSignedIn }
        if value == 0 {
            _ = try await send("DELETE", "rest/v1/tip_votes?tip_id=eq.\(tipID.uuidString)&user_id=eq.\(session.userID)")
        } else {
            _ = try await send("POST", "rest/v1/tip_votes",
                               json: ["tip_id": tipID.uuidString, "value": value],
                               prefer: "resolution=merge-duplicates,return=minimal")
        }
    }

    // MARK: Comments

    private struct CommentRow: Decodable {
        let id: UUID
        let hillId: Int
        let authorId: String
        let authorName: String
        let body: String
        let createdAt: Date
        let photoPath: String?
    }

    func comments(hillID: Int) async throws -> [PeakComment] {
        let rows: [CommentRow] = try await get("rest/v1/comments_with_authors?hill_id=eq.\(hillID)&order=created_at.desc")
        return rows.map {
            PeakComment(id: $0.id, hillID: $0.hillId, authorName: $0.authorName, body: $0.body,
                        createdAt: $0.createdAt, photoURL: $0.photoPath.map(publicPhotoURL),
                        isMine: $0.authorId == session?.userID)
        }
    }

    func addComment(hillID: Int, body: String, photoJPEG: Data?) async throws {
        guard let session else { throw CommunityError.notSignedIn }
        var payload: [String: Any] = ["hill_id": hillID, "body": body]
        if let photoJPEG {
            // Photos live under a folder named after the user, which storage policies enforce.
            let path = "\(session.userID.lowercased())/\(UUID().uuidString.lowercased()).jpg"
            _ = try await send("POST", "storage/v1/object/photos/\(path)", body: photoJPEG, contentType: "image/jpeg")
            payload["photo_path"] = path
        }
        _ = try await send("POST", "rest/v1/comments", json: payload, prefer: "return=minimal")
    }

    func deleteComment(_ id: UUID) async throws {
        _ = try await send("DELETE", "rest/v1/comments?id=eq.\(id.uuidString)")
    }

    func report(_ target: ReportTarget, reason: ReportReason) async throws {
        let type: String
        let id: UUID
        switch target {
        case .tip(let tipID): type = "tip"; id = tipID
        case .comment(let commentID): type = "comment"; id = commentID
        }
        _ = try await send("POST", "rest/v1/reports",
                           json: ["target_type": type, "target_id": id.uuidString, "reason": reason.rawValue],
                           prefer: "return=minimal")
    }

    // MARK: Plumbing

    private struct Profile: Decodable { let displayName: String }

    private func fetchProfile(userID: String) async throws -> Profile? {
        let rows: [Profile] = try await get("rest/v1/profiles?id=eq.\(userID)&select=display_name")
        return rows.first
    }

    private func publicPhotoURL(_ path: String) -> URL {
        config.url.appendingPathComponent("storage/v1/object/public/photos/\(path)")
    }

    private func storeSession(from data: Data) throws {
        struct AuthResponse: Decodable {
            struct User: Decodable { let id: String; let email: String? }
            let accessToken: String
            let refreshToken: String
            let expiresIn: Double
            let user: User
        }
        let response = try Self.decoder.decode(AuthResponse.self, from: data)
        let new = Session(accessToken: response.accessToken, refreshToken: response.refreshToken,
                          expiresAt: Date.now.addingTimeInterval(response.expiresIn),
                          userID: response.user.id, email: response.user.email)
        session = new
        if let encoded = try? JSONEncoder().encode(new) { Keychain.save(encoded, account: "session") }
    }

    private func refreshIfNeeded() async throws {
        guard let current = session, current.expiresAt < Date.now.addingTimeInterval(60) else { return }
        do {
            let data = try await send("POST", "auth/v1/token?grant_type=refresh_token",
                                      json: ["refresh_token": current.refreshToken], auth: false)
            try storeSession(from: data)
        } catch {
            session = nil
            Keychain.delete(account: "session")
            throw CommunityError.notSignedIn
        }
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try Self.decoder.decode(T.self, from: try await send("GET", path))
    }

    @discardableResult
    private func send(_ method: String, _ path: String, json: [String: Any]? = nil, body: Data? = nil,
                      contentType: String? = nil, prefer: String? = nil, auth: Bool = true) async throws -> Data {
        if auth { try await refreshIfNeeded() }
        guard let url = URL(string: path, relativeTo: config.url) else { throw CommunityError.server("Bad URL") }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        let token = auth ? (session?.accessToken ?? config.anonKey) : config.anonKey
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if let json {
            request.httpBody = try JSONSerialization.data(withJSONObject: json)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        } else if let body {
            request.httpBody = body
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await urlSession.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            if status == 401 { throw CommunityError.notSignedIn }
            let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])
                .flatMap { $0["msg"] ?? $0["message"] ?? $0["error_description"] } as? String
            throw CommunityError.server(message ?? "Something went wrong (\(status)). Please try again.")
        }
        return data
    }

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            if let date = withFraction.date(from: text) ?? plain.date(from: text) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath,
                                                    debugDescription: "Unrecognised date \(text)"))
        }
        return decoder
    }()
}
