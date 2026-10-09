import SwiftUI

struct ProgressRing: View {
    let fraction: Double
    var lineWidth: CGFloat = 6

    var body: some View {
        ZStack {
            Circle().stroke(Theme.stone.opacity(0.6), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(fraction >= 1 ? Theme.summit : Theme.leaf,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut, value: fraction)
        }
    }
}

/// Shows a peak's 1–5 difficulty. The number and word are always present, so it never relies on colour alone.
struct DifficultyBadge: View {
    enum Style {
        /// A coloured circle with the number, for compact rows.
        case number
        /// Number and name, e.g. "3 · Challenging".
        case label
    }

    let difficulty: Difficulty
    var style: Style = .label

    var body: some View {
        Group {
            switch style {
            case .number:
                Text("\(difficulty.rawValue)")
                    .font(.subheadline.bold().monospacedDigit())
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(difficulty.color, in: Circle())
            case .label:
                Text("\(difficulty.rawValue) · \(difficulty.title)")
                    .font(.subheadline.bold())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(difficulty.color, in: Capsule())
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Difficulty \(difficulty.rawValue) of 5, \(difficulty.title)")
    }
}

/// Five segments filled up to the difficulty level, with the description underneath.
struct DifficultyMeter: View {
    let difficulty: Difficulty

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                DifficultyBadge(difficulty: difficulty)
                Spacer()
                HStack(spacing: 4) {
                    ForEach(Difficulty.allCases) { level in
                        RoundedRectangle(cornerRadius: 3)
                            .fill(level <= difficulty ? difficulty.color : Theme.stone)
                            .frame(width: 18, height: 8)
                    }
                }
                .accessibilityHidden(true)
            }
            Text(difficulty.summary)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

struct HillRow: View {
    let hill: Hill
    let isBagged: Bool
    var detail: String? = nil
    @Environment(HillCatalog.self) private var catalog
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: isBagged ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isBagged ? Theme.green : Theme.stone)
                .font(.title2)
                .accessibilityLabel(isBagged ? "Bagged" : "Not bagged")
            VStack(alignment: .leading, spacing: 2) {
                Text(hill.name).font(.body)
                Text(detail ?? hill.regionName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(hill.height(in: unit))
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
                if let difficulty = catalog.difficulty(of: hill) {
                    DifficultyBadge(difficulty: difficulty, style: .number)
                        .scaleEffect(0.8)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

struct ListCard: View {
    let list: HillList
    let progress: ListProgress

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                ProgressRing(fraction: progress.fraction)
                Text(progress.fraction, format: .percent.precision(.fractionLength(0)))
                    .font(.caption2.bold().monospacedDigit())
            }
            .frame(width: 52, height: 52)
            VStack(alignment: .leading, spacing: 2) {
                Text(list.name).font(.headline)
                Text(list.subtitle).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing) {
                Text("\(progress.bagged)/\(progress.total)").font(.subheadline.monospacedDigit().bold())
                Text(progress.isComplete ? "Compleat!" : "\(progress.remaining) to go")
                    .font(.caption)
                    .foregroundStyle(progress.isComplete ? Theme.summit : Color.secondary)
            }
        }
        .padding(.vertical, 6)
    }
}

/// Small rounded tag, e.g. the lists a hill belongs to.
struct Chip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.bold())
            .foregroundStyle(Theme.green)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Theme.mint, in: Capsule())
    }
}

/// Opens a hand-picked AllTrails route. Links open the AllTrails app if it's installed.
struct AllTrailsButton: View {
    let trail: PeakGuide.Trail
    var prominent = true
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            openURL(trail.url)
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "point.topleft.down.to.point.bottomright.curvepath")
                VStack(alignment: .leading, spacing: 1) {
                    Text("Open in AllTrails")
                    Text(trail.title).font(.caption).opacity(0.85).lineLimit(1)
                }
                Spacer()
                Image(systemName: "arrow.up.right")
            }
            .padding(.horizontal, 16)
        }
        .buttonStyle(prominent ? AnyButtonStyle(PrimaryButtonStyle()) : AnyButtonStyle(SecondaryButtonStyle()))
        .accessibilityHint("Opens the \(trail.title) route in AllTrails")
    }
}

/// Lets a view pick between two button styles at runtime.
struct AnyButtonStyle: ButtonStyle {
    private let make: (ButtonStyleConfiguration) -> AnyView

    init<S: ButtonStyle>(_ style: S) {
        make = { AnyView(style.makeBody(configuration: $0)) }
    }

    func makeBody(configuration: Configuration) -> some View { make(configuration) }
}
