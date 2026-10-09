import Foundation
import Observation

/// Tips and comments for one peak, loaded on demand when its page opens.
@MainActor
@Observable
final class PeakCommunityModel {
    let hillID: Int
    private(set) var tips: [Tip] = []
    private(set) var comments: [PeakComment] = []
    private(set) var hasLoaded = false
    var errorMessage: String?
    /// Set when an action needs an account; the peak's page shows the sign-in sheet.
    var isShowingSignIn = false

    nonisolated init(hillID: Int) {
        self.hillID = hillID
    }

    var photos: [PeakComment] { comments.filter { $0.photoURL != nil } }
    /// A tip only counts as the "top tip" once someone has found it helpful.
    var topTip: Tip? { tips.first.flatMap { $0.score > 0 ? $0 : nil } }

    func load(_ community: Community) async {
        do {
            tips = try await community.backend.tips(hillID: hillID)
            comments = try await community.backend.comments(hillID: hillID)
            errorMessage = nil
        } catch {
            errorMessage = "Couldn't load tips and comments. Check your connection and pull to refresh."
        }
        hasLoaded = true
    }

    /// Returns true if signed in; otherwise asks the user to sign in and returns false.
    func requireSignIn(_ community: Community) -> Bool {
        if community.isSignedIn { return true }
        isShowingSignIn = true
        return false
    }

    /// Tapping the same arrow again removes your vote. Updates the screen straight away,
    /// then puts it back if the server says no.
    func vote(_ tip: Tip, up: Bool, community: Community) async {
        guard requireSignIn(community), let index = tips.firstIndex(where: { $0.id == tip.id }) else { return }
        let wanted = up ? 1 : -1
        let newVote = tip.myVote == wanted ? 0 : wanted
        let before = tips
        tips[index].score += newVote - tip.myVote
        tips[index].myVote = newVote
        do {
            try await community.backend.vote(tipID: tip.id, value: newVote)
        } catch {
            tips = before
            errorMessage = error.localizedDescription
        }
    }

    func addTip(_ body: String, community: Community) async throws {
        try await community.backend.addTip(hillID: hillID, body: body)
        await load(community)
    }

    func addComment(_ body: String, photo: Data?, community: Community) async throws {
        try await community.backend.addComment(hillID: hillID, body: body, photoJPEG: photo)
        await load(community)
    }

    func delete(_ target: ReportTarget, community: Community) async {
        do {
            switch target {
            case .tip(let id): try await community.backend.deleteTip(id)
            case .comment(let id): try await community.backend.deleteComment(id)
            }
            await load(community)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func report(_ target: ReportTarget, reason: ReportReason, community: Community) async {
        guard requireSignIn(community) else { return }
        do {
            try await community.backend.report(target, reason: reason)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
