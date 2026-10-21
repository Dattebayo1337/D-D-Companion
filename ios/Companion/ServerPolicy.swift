import Foundation

enum ServerPolicy {
    static func origin(_ url: URL) -> String? {
        guard let scheme = url.scheme?.lowercased(), ["http", "https"].contains(scheme),
              let host = url.host?.lowercased(), url.user == nil, url.password == nil else { return nil }
        var c = URLComponents(); c.scheme = scheme; c.host = host
        if let port = url.port, port != (scheme == "https" ? 443 : 80) { c.port = port }
        return c.string
    }
    static func normalize(_ text: String) -> URL? {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: value.contains("://") ? value : "https://" + value),
              url.query == nil, url.fragment == nil, ["", "/"].contains(url.path),
              let origin = origin(url), let host = url.host, (url.port ?? 443) > 0, (url.port ?? 443) <= 65535 else { return nil }
        if url.scheme != "https" {
            #if DEBUG
            let parts = host.split(separator: ".").compactMap { Int($0) }
            let local = ["localhost", "127.0.0.1", "[::1]", "::1"].contains(host) ||
                (parts.count == 4 && parts.allSatisfy { (0...255).contains($0) } && (parts[0] == 10 || (parts[0] == 192 && parts[1] == 168) || (parts[0] == 172 && (16...31).contains(parts[1]))))
            guard url.scheme == "http", local else { return nil }
            #else
            return nil
            #endif
        }
        return URL(string: origin)
    }
    static func same(_ server: URL, _ url: URL?) -> Bool { guard let url else { return false }; return origin(server) == origin(url) }
    static func filename(_ value: String) -> String {
        let bad = CharacterSet.controlCharacters.union(CharacterSet(charactersIn: "/\\:*?\"<>|"))
        let name = value.components(separatedBy: bad).joined(separator: "_")
        return name.isEmpty || name == "." || name == ".." ? "export" : String(name.prefix(140))
    }
}
