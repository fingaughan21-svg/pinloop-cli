import SwiftUI

struct ProgressRing: View {
    let fraction: Double
    var lineWidth: CGFloat = 6

    var body: some View {
        ZStack {
            Circle().stroke(Color.secondary.opacity(0.2), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(fraction >= 1 ? Color.green : Color.accentColor,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut, value: fraction)
        }
    }
}

struct HillRow: View {
    let hill: Hill
    let isBagged: Bool
    var detail: String? = nil
    @AppStorage(SettingsKey.heightUnit) private var unit: HeightUnit = .metres

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: isBagged ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isBagged ? Color.green : Color.secondary)
                .font(.title3)
                .accessibilityLabel(isBagged ? "Bagged" : "Not bagged")
            VStack(alignment: .leading, spacing: 2) {
                Text(hill.name).font(.body)
                Text(detail ?? hill.regionName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            Text(hill.height(in: unit))
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(.secondary)
        }
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
            .frame(width: 48, height: 48)
            VStack(alignment: .leading, spacing: 2) {
                Text(list.name).font(.headline)
                Text(list.subtitle).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing) {
                Text("\(progress.bagged)/\(progress.total)").font(.subheadline.monospacedDigit().bold())
                Text(progress.isComplete ? "Compleat!" : "\(progress.remaining) to go")
                    .font(.caption)
                    .foregroundStyle(progress.isComplete ? Color.green : Color.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
