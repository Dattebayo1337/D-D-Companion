import UIKit
import WebKit
import CryptoKit

final class OfflineStore {
    private func file(_ server: URL) throws -> URL {
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("Offline", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let key = SHA256.hash(data: Data(server.absoluteString.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory.appendingPathComponent(key + ".json")
    }
    func cards(_ server: URL) throws -> [[String: Any]] {
        let url = try file(server)
        guard FileManager.default.fileExists(atPath: url.path) else { return [] }
        return (try JSONSerialization.jsonObject(with: Data(contentsOf: url))) as? [[String: Any]] ?? []
    }
    func save(_ card: [String: Any], server: URL) throws {
        guard let id = card["id"] as? String, UUID(uuidString: id) != nil, card["name"] is String,
              let edition = card["edition"] as? String, ["5e_2014", "5e_2024"].contains(edition), card["blocks"] is [[String: String]] else { throw NSError(domain: "Некорректная карточка", code: 1) }
        let encoded = try JSONSerialization.data(withJSONObject: card)
        guard encoded.count <= 2_000_000 else { throw NSError(domain: "Карточка слишком большая", code: 2) }
        var rows = try cards(server); rows.removeAll { ($0["id"] as? String) == id }
        guard rows.count < 200 else { throw NSError(domain: "Лимит: 200 карточек", code: 3) }
        rows.append(card)
        let archive = try JSONSerialization.data(withJSONObject: rows)
        guard archive.count <= 50_000_000 else { throw NSError(domain: "Хранилище превышает 50 МБ", code: 4) }
        try archive.write(to: file(server), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    func clear(_ server: URL) throws { let url = try file(server); if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) } }
    func reader(_ server: URL) throws -> UIViewController {
        let controller = OfflineController()
        controller.encoded = try JSONSerialization.data(withJSONObject: cards(server)).base64EncodedString()
        return controller
    }
}
final class OfflineController: UIViewController {
    var encoded = "W10="
    private let web = WKWebView()
    override func viewDidLoad() {
        super.viewDidLoad(); title = "Правила без сети"; view = web
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Печать", style: .plain, target: self, action: #selector(printPage))
        guard let path = Bundle.main.url(forResource: "offline", withExtension: "html"), let html = try? String(contentsOf: path, encoding: .utf8) else { return }
        web.loadHTMLString(html.replacingOccurrences(of: "__CARDS_BASE64__", with: encoded), baseURL: nil)
    }
    @objc private func printPage() {
        let printer = UIPrintInteractionController.shared; printer.printFormatter = web.viewPrintFormatter()
        if let button = navigationItem.rightBarButtonItem { printer.present(from: button, animated: true, completionHandler: nil) }
    }
}
