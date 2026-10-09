import SwiftUI
import PhotosUI

// MARK: - Tips

/// "Top tips" section on a peak's page: the three best-voted tips and a way to add one.
struct TipsSection: View {
    let hill: Hill
    let model: PeakCommunityModel
    @Environment(Community.self) private var community
    @State private var adding = false

    var body: some View {
        Section {
            if model.tips.isEmpty {
                Text(model.hasLoaded ? "No tips yet. Know where to park, which path is boggy, or the best spot for lunch? Share it."
                                     : "Loading tips…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            ForEach(model.tips.prefix(3)) { tip in
                TipRow(tip: tip, isTopTip: tip.id == model.topTip?.id, model: model)
            }
            if model.tips.count > 3 {
                NavigationLink("See all \(model.tips.count) tips") { AllTipsView(hill: hill, model: model) }
            }
            Button("Add a tip", systemImage: "lightbulb") {
                if model.requireSignIn(community) { adding = true }
            }
        } header: {
            Text("Top tips")
        } footer: {
            Text("Vote tips up or down so the most helpful advice rises to the top.")
        }
        .sheet(isPresented: $adding) { AddTipSheet(hill: hill, model: model) }
    }
}

struct AllTipsView: View {
    let hill: Hill
    let model: PeakCommunityModel
    @Environment(Community.self) private var community

    var body: some View {
        List(model.tips) { tip in
            TipRow(tip: tip, isTopTip: tip.id == model.topTip?.id, model: model)
        }
        .navigationTitle("Tips for \(hill.name)")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.load(community) }
    }
}

struct TipRow: View {
    let tip: Tip
    let isTopTip: Bool
    let model: PeakCommunityModel
    @Environment(Community.self) private var community
    @State private var reporting = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                if isTopTip {
                    Label("Top tip", systemImage: "star.fill")
                        .font(.caption.bold())
                        .foregroundStyle(Theme.summit)
                }
                Text(tip.body)
                Text("\(tip.authorName) · \(tip.createdAt.formatted(.relative(presentation: .named)))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            VoteControl(tip: tip, model: model)
        }
        .padding(.vertical, 4)
        .contextMenu { PostMenu(target: .tip(tip.id), isMine: tip.isMine, model: model, reporting: $reporting) }
        .reportDialog(isPresented: $reporting, target: .tip(tip.id), model: model)
    }
}

/// Up/down arrows with the score between. Large tap targets for gloved or less steady hands.
struct VoteControl: View {
    let tip: Tip
    let model: PeakCommunityModel
    @Environment(Community.self) private var community

    var body: some View {
        VStack(spacing: 0) {
            arrow(up: true)
            Text("\(tip.score)")
                .font(.subheadline.bold().monospacedDigit())
                .accessibilityLabel("Score \(tip.score)")
            arrow(up: false)
        }
    }

    private func arrow(up: Bool) -> some View {
        let active = tip.myVote == (up ? 1 : -1)
        return Button {
            Task { await model.vote(tip, up: up, community: community) }
        } label: {
            Image(systemName: up ? (active ? "arrowshape.up.fill" : "arrowshape.up")
                                 : (active ? "arrowshape.down.fill" : "arrowshape.down"))
                .font(.title3)
                .foregroundStyle(active ? Theme.green : Color.secondary)
                .frame(width: 44, height: 36)
        }
        .buttonStyle(.borderless)
        .accessibilityLabel(up ? "Helpful" : "Not helpful")
        .accessibilityAddTraits(active ? .isSelected : [])
    }
}

struct AddTipSheet: View {
    let hill: Hill
    let model: PeakCommunityModel
    @Environment(Community.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var isPosting = false
    @State private var error: String?
    private let limit = 280

    private var trimmed: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("e.g. Park at the Glen Nevis visitor centre; it fills up by 8am in summer.",
                              text: $text, axis: .vertical)
                        .lineLimit(4...8)
                } footer: {
                    HStack {
                        Text("Good tips cover parking, path conditions, river crossings or the best line up.")
                        Spacer()
                        Text("\(trimmed.count)/\(limit)")
                            .monospacedDigit()
                            .foregroundStyle(trimmed.count > limit ? Color.red : Color.secondary)
                    }
                }
                if let error {
                    Text(error).foregroundStyle(.red)
                }
            }
            .navigationTitle("Tip for \(hill.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") { post() }
                        .disabled(trimmed.count < 3 || trimmed.count > limit || isPosting)
                }
            }
        }
    }

    private func post() {
        isPosting = true
        Task {
            do {
                try await model.addTip(trimmed, community: community)
                dismiss()
            } catch {
                self.error = error.localizedDescription
                isPosting = false
            }
        }
    }
}

// MARK: - Comments and photos

struct CommentsSection: View {
    let hill: Hill
    let model: PeakCommunityModel
    @Environment(Community.self) private var community
    @State private var adding = false
    @State private var viewing: PeakComment?

    var body: some View {
        Section {
            if !model.photos.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(model.photos) { comment in
                            Button { viewing = comment } label: {
                                RemotePhoto(url: comment.photoURL)
                                    .frame(width: 104, height: 104)
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .accessibilityLabel("Photo by \(comment.authorName)")
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16))
            }
            if model.comments.isEmpty && model.hasLoaded {
                Text("No comments yet. Been up recently? Tell people how it went and add a photo.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            ForEach(model.comments.prefix(3)) { comment in
                CommentRow(comment: comment, model: model) { viewing = comment }
            }
            if model.comments.count > 3 {
                NavigationLink("See all \(model.comments.count) comments") {
                    AllCommentsView(hill: hill, model: model)
                }
            }
            Button("Add a comment or photo", systemImage: "camera") {
                if model.requireSignIn(community) { adding = true }
            }
        } header: {
            Text("Comments & photos")
        }
        .sheet(isPresented: $adding) { AddCommentSheet(hill: hill, model: model) }
        .sheet(item: $viewing) { PhotoViewer(comment: $0) }
    }
}

struct AllCommentsView: View {
    let hill: Hill
    let model: PeakCommunityModel
    @Environment(Community.self) private var community
    @State private var viewing: PeakComment?

    var body: some View {
        List(model.comments) { comment in
            CommentRow(comment: comment, model: model) { viewing = comment }
        }
        .navigationTitle("Comments")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.load(community) }
        .sheet(item: $viewing) { PhotoViewer(comment: $0) }
    }
}

struct CommentRow: View {
    let comment: PeakComment
    let model: PeakCommunityModel
    let showPhoto: () -> Void
    @State private var reporting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(comment.authorName).font(.subheadline.bold())
                Spacer()
                Text(comment.createdAt, format: .dateTime.day().month().year())
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(comment.body)
            if comment.photoURL != nil {
                Button(action: showPhoto) {
                    RemotePhoto(url: comment.photoURL)
                        .frame(maxWidth: .infinity)
                        .frame(height: 180)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("View photo")
            }
        }
        .padding(.vertical, 4)
        .contextMenu {
            PostMenu(target: .comment(comment.id), isMine: comment.isMine, model: model, reporting: $reporting)
        }
        .reportDialog(isPresented: $reporting, target: .comment(comment.id), model: model)
    }
}

struct AddCommentSheet: View {
    let hill: Hill
    let model: PeakCommunityModel
    @Environment(Community.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var pickedItem: PhotosPickerItem?
    @State private var photo: Data?
    @State private var isPosting = false
    @State private var error: String?

    private var trimmed: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("How was it? Conditions, route, views…", text: $text, axis: .vertical)
                        .lineLimit(4...12)
                }
                Section {
                    PhotosPicker(selection: $pickedItem, matching: .images) {
                        Label(photo == nil ? "Add a photo" : "Change photo", systemImage: "photo")
                    }
                    if let photo, let image = UIImage(data: photo) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        Button("Remove photo", role: .destructive) {
                            self.photo = nil
                            pickedItem = nil
                        }
                    }
                } footer: {
                    Text("Photos are shared publicly. Please don't include people who haven't agreed to it.")
                }
                if let error {
                    Text(error).foregroundStyle(.red)
                }
            }
            .navigationTitle(hill.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") { post() }.disabled(trimmed.isEmpty || isPosting)
                }
            }
            .onChange(of: pickedItem) {
                Task {
                    guard let data = try? await pickedItem?.loadTransferable(type: Data.self) else { return }
                    photo = ImageResizing.jpeg(from: data)
                }
            }
        }
    }

    private func post() {
        isPosting = true
        Task {
            do {
                try await model.addComment(trimmed, photo: photo, community: community)
                dismiss()
            } catch {
                self.error = error.localizedDescription
                isPosting = false
            }
        }
    }
}

struct RemotePhoto: View {
    let url: URL?

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image): image.resizable().scaledToFill()
            case .failure: Image(systemName: "photo").foregroundStyle(.secondary)
            default: ProgressView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.mist)
    }
}

struct PhotoViewer: View {
    let comment: PeakComment
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                AsyncImage(url: comment.photoURL) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    ProgressView().frame(maxWidth: .infinity, minHeight: 240)
                }
                Text(comment.body).padding(.horizontal)
                Text("\(comment.authorName) · \(comment.createdAt.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
                Spacer()
            }
            .toolbar { Button("Done") { dismiss() } }
        }
    }
}

// MARK: - Reporting and deleting

/// Long-press menu for a tip or comment: delete your own, or report someone else's.
struct PostMenu: View {
    let target: ReportTarget
    let isMine: Bool
    let model: PeakCommunityModel
    @Binding var reporting: Bool
    @Environment(Community.self) private var community

    var body: some View {
        if isMine {
            Button("Delete", systemImage: "trash", role: .destructive) {
                Task { await model.delete(target, community: community) }
            }
        } else {
            Button("Report…", systemImage: "flag") { reporting = true }
        }
    }
}

private struct ReportDialog: ViewModifier {
    @Binding var isPresented: Bool
    let target: ReportTarget
    let model: PeakCommunityModel
    @Environment(Community.self) private var community

    func body(content: Content) -> some View {
        content.confirmationDialog("Why are you reporting this?", isPresented: $isPresented, titleVisibility: .visible) {
            ForEach(ReportReason.allCases) { reason in
                Button(reason.rawValue) {
                    Task { await model.report(target, reason: reason, community: community) }
                }
            }
        } message: {
            Text("Thanks for helping keep Cairn friendly and safe. We'll review it.")
        }
    }
}

extension View {
    func reportDialog(isPresented: Binding<Bool>, target: ReportTarget, model: PeakCommunityModel) -> some View {
        modifier(ReportDialog(isPresented: isPresented, target: target, model: model))
    }
}

// MARK: - Sign in

struct SignInView: View {
    @Environment(Community.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var code = ""
    @State private var name = ""
    @State private var stage: Stage = .start
    @State private var isWorking = false
    @State private var error: String?

    enum Stage { case start, code, name }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        CairnMark().frame(width: 64, height: 64)
                        Text("Join the Cairn community").font(.title2.bold())
                        Text("Share tips, vote on the best advice, and post comments and photos from your days on the hill.")
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                }

                switch (community.backend.signInMethod, stage) {
                case (.onDevice, _), (_, .name):
                    Section {
                        TextField("Display name", text: $name)
                            .textContentType(.nickname)
                            .autocorrectionDisabled()
                    } footer: {
                        Text(community.isShared
                             ? "Shown next to your tips and comments."
                             : "Shown next to your tips and comments. While Cairn is in testing, these stay on this phone.")
                    }
                case (.emailCode, .start):
                    Section {
                        TextField("Email address", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } footer: {
                        Text("We'll email you a 6-digit code. No password needed.")
                    }
                case (.emailCode, .code):
                    Section {
                        TextField("6-digit code", text: $code)
                            .textContentType(.oneTimeCode)
                            .keyboardType(.numberPad)
                            .font(.title2.monospacedDigit())
                    } footer: {
                        Text("Sent to \(email). It can take a minute to arrive; check your spam folder too.")
                    }
                }

                if let error {
                    Text(error).foregroundStyle(.red)
                }

                Section {
                    Button(primaryTitle) { Task { await next() } }
                        .buttonStyle(.cairnPrimary)
                        .disabled(isWorking)
                        .listRowInsets(EdgeInsets())
                }
            }
            .navigationTitle("Sign in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Not now") { dismiss() } }
        }
    }

    private var primaryTitle: String {
        switch (community.backend.signInMethod, stage) {
        case (.emailCode, .start): "Email me a code"
        case (.emailCode, .code): "Sign in"
        default: "Continue"
        }
    }

    private func next() async {
        isWorking = true
        defer { isWorking = false }
        error = nil
        do {
            switch (community.backend.signInMethod, stage) {
            case (.onDevice, _):
                try await community.signInOnDevice(displayName: name)
                dismiss()
            case (.emailCode, .start):
                let address = email.trimmingCharacters(in: .whitespaces)
                guard address.contains("@") else { error = "Please enter a valid email address."; return }
                email = address
                try await community.requestCode(email: address)
                stage = .code
            case (.emailCode, .code):
                try await community.verify(email: email, code: code.trimmingCharacters(in: .whitespaces))
                if community.isSignedIn { dismiss() } else { stage = .name }
            case (.emailCode, .name):
                try await community.setDisplayName(name)
                dismiss()
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
