import SwiftUI

/// First-launch welcome: what the app is, which lists you're bagging, and how difficulty works.
struct OnboardingView: View {
    @Environment(HillCatalog.self) private var catalog
    @AppStorage(SettingsKey.hasOnboarded) private var hasOnboarded = false
    @AppStorage(SettingsKey.followedLists) private var followed = ""
    @AppStorage(SettingsKey.mapList) private var mapList = "munros"
    @Environment(\.dismiss) private var dismiss
    @State private var step: Int
    @State private var selected: Set<String> = []
    @State private var showingOther = false

    /// Pass 1 to skip the welcome page when changing lists later from Settings.
    init(startStep: Int = 0) {
        _step = State(initialValue: startStep)
    }

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $step) {
                welcome.tag(0)
                journey.tag(1)
                difficulty.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut, value: step)

            VStack(spacing: 12) {
                StepDots(count: 3, current: step)
                Button(step == 2 ? "Start bagging" : "Continue") { advance() }
                    .buttonStyle(.cairnPrimary)
                if step == 1 {
                    Text(selected.isEmpty ? "Not sure yet? Tap Continue and we'll show the popular lists." :
                            "You can change this any time from the Lists tab.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 16)
        }
        .background(Theme.mist.ignoresSafeArea())
        .onAppear {
            selected = Set(followed.listIDs)
            showingOther = selected.contains { !onboardingLists.contains($0) }
        }
    }

    private func advance() {
        if step < 2 {
            step += 1
            return
        }
        let chosen = selected.isEmpty ? defaultFollowedLists : catalog.lists.map(\.id).filter(selected.contains)
        followed = chosen.storageString
        mapList = chosen.first ?? "munros"
        hasOnboarded = true
        dismiss()
    }

    // MARK: Pages

    private var welcome: some View {
        VStack(spacing: 24) {
            Spacer()
            CairnMark()
                .frame(width: 120, height: 120)
            VStack(spacing: 12) {
                Text("Welcome to Cairn")
                    .font(.largeTitle.bold())
                Text("Track every summit on your way to completing the Munros, Wainwrights and more. Find routes, share tips and log your ascents.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            Spacer()
            Spacer()
        }
        .padding(.horizontal, 28)
    }

    private var journey: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("What are you bagging?")
                    .font(.largeTitle.bold())
                Text("Pick as many as you like.")
                    .font(.title3)
                    .foregroundStyle(.secondary)

                ForEach(onboardingLists.compactMap { catalog.list(id: $0) }) { list in
                    JourneyOption(list: list, isSelected: selected.contains(list.id)) { toggle(list.id) }
                }

                Button {
                    withAnimation { showingOther.toggle() }
                } label: {
                    HStack {
                        Image(systemName: "ellipsis.circle")
                            .font(.title2)
                        Text("Other lists")
                            .font(.headline)
                        Spacer()
                        Image(systemName: showingOther ? "chevron.up" : "chevron.down")
                    }
                    .padding(16)
                    .frame(minHeight: 64)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Theme.stone))
                }
                .buttonStyle(.plain)

                if showingOther {
                    ForEach(catalog.lists.filter { !onboardingLists.contains($0.id) }) { list in
                        JourneyOption(list: list, isSelected: selected.contains(list.id)) { toggle(list.id) }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 32)
        }
    }

    private var difficulty: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Know before you go")
                    .font(.largeTitle.bold())
                Text("Peaks are rated from 1 to 5, so you can pick hills that suit you.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                ForEach(Difficulty.allCases) { level in
                    HStack(alignment: .top, spacing: 14) {
                        DifficultyBadge(difficulty: level, style: .number)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(level.title).font(.headline)
                            Text(level.summary).font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                }
                Label("Always check the mountain forecast, carry a map and compass, and tell someone your plans.",
                      systemImage: "exclamationmark.shield")
                    .font(.subheadline)
                    .padding(14)
                    .background(Theme.mint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 32)
        }
    }

    private func toggle(_ id: String) {
        if selected.contains(id) { selected.remove(id) } else { selected.insert(id) }
    }
}

private struct JourneyOption: View {
    let list: HillList
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(list.name).font(.title3.bold())
                    Text("\(list.count) hills · \(list.subtitle)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title)
                    .foregroundStyle(isSelected ? Theme.green : Theme.stone)
            }
            .padding(16)
            .frame(minHeight: 72)
            .background(isSelected ? Theme.mint : Theme.card,
                        in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(isSelected ? Theme.green : Theme.stone, lineWidth: isSelected ? 2 : 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

private struct StepDots: View {
    let count: Int
    let current: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<count, id: \.self) { index in
                Capsule()
                    .fill(index == current ? Theme.green : Theme.stone)
                    .frame(width: index == current ? 22 : 8, height: 8)
            }
        }
        .animation(.easeInOut, value: current)
        .accessibilityHidden(true)
    }
}

/// A simple stacked-stones mark used until the real app icon artwork arrives.
struct CairnMark: View {
    var body: some View {
        ZStack {
            Circle().fill(Theme.mint)
            VStack(spacing: 3) {
                Capsule().fill(Theme.leaf).frame(width: 26, height: 16)
                Capsule().fill(Theme.green.opacity(0.85)).frame(width: 40, height: 20)
                Capsule().fill(Theme.green).frame(width: 56, height: 22)
            }
            .offset(y: 4)
        }
        .accessibilityHidden(true)
    }
}
