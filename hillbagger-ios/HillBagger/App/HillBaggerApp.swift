import SwiftUI
import SwiftData

@main
struct HillBaggerApp: App {
    @State private var catalog = HillCatalog.bundled()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(catalog)
                .tint(.accentColor)
        }
        .modelContainer(for: Ascent.self)
    }
}

struct RootView: View {
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
    }
}
