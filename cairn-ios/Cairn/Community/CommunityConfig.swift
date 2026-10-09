import Foundation

/// Connection details for the shared community server (Supabase).
///
/// Leave `supabase` as nil to keep tips, comments and photos on the device only, which is
/// handy while testing. To share them between users, create a Supabase project, run
/// backend/supabase/schema.sql, and fill in the URL and anon key below
/// (Supabase dashboard → Project Settings → API). The anon key is designed to be public;
/// row-level security in the schema is what protects the data.
enum CommunityConfig {
    struct Supabase {
        let url: URL
        let anonKey: String
    }

    static let supabase: Supabase? = nil
    // static let supabase: Supabase? = Supabase(
    //     url: URL(string: "https://YOUR-PROJECT.supabase.co")!,
    //     anonKey: "YOUR-ANON-KEY"
    // )
}
