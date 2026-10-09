import SwiftUI
import SwiftData

@main
struct CairnApp: App {
    @State private var catalog = HillCatalog.bundled()
    @State private var community = Community.make()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(catalog)
                .environment(community)
                .tint(Theme.green)
                // Cairn's look is light: white and pale greys with green accents.
                .preferredColorScheme(.light)
                .task { await community.restore() }
        }
        .modelContainer(for: Ascent.self)
    }
}

struct RootView: View {
    @AppStorage(SettingsKey.hasOnboarded) private var hasOnboarded = false

    var body: some View {
        TabView {
            ListsView()
                .tabItem { Label("Lists", systemImage: "list.bullet.rectangle") }
            HillMapView()
                .tabItem { Label("Map", systemImage: "map") }
            NearbyView()
                .tabItem { Label("Nearby", systemImage: "location") }
            ProgressTabView()
                .tabItem { Label("Progress", systemImage: "chart.bar") }
        }
        .fullScreenCover(isPresented: Binding(get: { !hasOnboarded }, set: { hasOnboarded = !$0 })) {
            OnboardingView()
        }
    }
}
