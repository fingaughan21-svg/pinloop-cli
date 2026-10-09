import SwiftUI

/// Cairn's palette: white and light greys, with a fresh green for actions and progress.
/// The green is a touch lighter than AllTrails' and still passes WCAG AA (4.5:1) on white.
enum Theme {
    /// Buttons, links, progress, selected states.
    static let green = Color(hex: 0x3B8540)
    /// Larger decorative fills (rings, map pins) where a softer green reads better.
    static let leaf = Color(hex: 0x5DA845)
    /// Pale green wash for chips, highlighted cards and selected onboarding options.
    static let mint = Color(hex: 0xEAF4E4)
    /// App background behind cards and lists.
    static let mist = Color(hex: 0xF4F5F3)
    /// Card and row background.
    static let card = Color.white
    /// Hairlines and unselected outlines.
    static let stone = Color(hex: 0xDADDD8)
    /// Bagged hills on the map: a warm summit gold, distinct from the green to-do pins.
    static let summit = Color(hex: 0xB27812)
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255)
    }
}

/// Large, high-contrast primary button used for the main action on a screen.
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Theme.green.opacity(configuration.isPressed ? 0.8 : 1),
                        in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

/// Secondary button: pale green with green text.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Theme.green)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Theme.mint.opacity(configuration.isPressed ? 0.6 : 1),
                        in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var cairnPrimary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var cairnSecondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}
