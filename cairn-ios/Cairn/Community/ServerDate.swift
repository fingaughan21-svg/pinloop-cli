import Foundation

/// Parses the timestamps the community server returns. Supabase (Postgres `timestamptz`)
/// sends them as ISO 8601 with a colon in the offset and, usually, microseconds:
/// "2026-10-09T19:14:00.123456+00:00", or "2026-10-09T19:14:00+00:00" when the fraction is zero.
///
/// Uses `Date.ISO8601FormatStyle`, a Sendable value type, so the parsers can be shared safely
/// across threads (e.g. from JSONDecoder's `@Sendable` date-decoding closure). The older
/// `ISO8601DateFormatter` is a non-Sendable class and can't be captured there.
enum ServerDate {
    private static let withFraction = Date.ISO8601FormatStyle(timeZoneSeparator: .colon,
                                                              includingFractionalSeconds: true)
    private static let withoutFraction = Date.ISO8601FormatStyle(timeZoneSeparator: .colon)

    static func parse(_ text: String) -> Date? {
        (try? withFraction.parse(text)) ?? (try? withoutFraction.parse(text))
    }
}
