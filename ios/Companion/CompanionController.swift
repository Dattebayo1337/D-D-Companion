import UIKit
import WebKit

final class CompanionController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKScriptMessageHandlerWithReply, URLSessionTaskDelegate {
    private var web: WKWebView!
    private var server: URL?
    private var probe: URLSessionDataTask?
    private let offline = OfflineStore()
    private var switching = false
    private var pendingExports = [URL]()

    override func viewDidLoad() {
        super.viewDidLoad(); title = "D&D Companion"; view.backgroundColor = .systemBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Назад", style: .plain, target: self, action: #selector(back))
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Меню", style: .plain, target: self, action: #selector(menu))
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(self, name: "CompanionFiles")
        configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "CompanionOffline")
        if let url = Bundle.main.url(forResource: "bridge", withExtension: "js"), let script = try? String(contentsOf: url, encoding: .utf8) {
            configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        web = WKWebView(frame: .zero, configuration: configuration); web.navigationDelegate = self; web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true; web.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(web)
        NSLayoutConstraint.activate([web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor), web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor)])
        if let value = UserDefaults.standard.string(forKey: "server"), let url = ServerPolicy.normalize(value) { server = url; home() }
        else { DispatchQueue.main.async { self.setup() } }
    }
    private func home() { if let server { web.load(URLRequest(url: server.appendingPathComponent("/"))) } }
    @objc private func back() {
        web.evaluateJavaScript("(()=>{const d=document.querySelector('dialog[open]');if(!d)return false;const e=new Event('cancel',{cancelable:true});if(d.dispatchEvent(e))d.close();return true})()") { [weak self] result, _ in
            guard let self, result as? Bool != true else { return }; if self.web.canGoBack { self.web.goBack() } else { self.home() }
        }
    }
    @objc private func menu() {
        let sheet = UIAlertController(title: "D&D Companion", message: server?.absoluteString, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "Обновить", style: .default) { _ in self.web.reload() })
        sheet.addAction(UIAlertAction(title: "Читать без сети", style: .default) { _ in self.showOffline() })
        sheet.addAction(UIAlertAction(title: "Печать / PDF", style: .default) { _ in self.printPage() })
        sheet.addAction(UIAlertAction(title: "Адрес сервера", style: .default) { _ in self.setup() })
        sheet.addAction(UIAlertAction(title: "Удалить автономные копии", style: .destructive) { _ in
            self.confirm("Удалить сохранённые правила? Их можно сохранить заново при подключении.") { yes in guard yes, let server = self.server else { return }; do { try self.offline.clear(server) } catch { self.notice("Не удалось очистить копии.") } }
        })
        sheet.addAction(UIAlertAction(title: "Отмена", style: .cancel))
        sheet.popoverPresentationController?.barButtonItem = navigationItem.rightBarButtonItem; present(sheet, animated: true)
    }
    private func setup() {
        let dialog = UIAlertController(title: "Адрес вашего сервера", message: "После размещения укажите HTTPS-адрес без пути. Для личных данных используется обычный аккаунт сайта.", preferredStyle: .alert)
        dialog.addTextField { field in field.text = self.server?.absoluteString; field.placeholder = "https://game.example.ru"; field.keyboardType = .URL; field.autocapitalizationType = .none; field.autocorrectionType = .no }
        dialog.addAction(UIAlertAction(title: "Подключиться", style: .default) { _ in
            guard let target = ServerPolicy.normalize(dialog.textFields?.first?.text ?? "") else { self.notice("Нужен HTTPS-адрес без логина, пути и параметров."); return }
            if let old = self.server, old != target {
                self.confirm("Сменить сервер? Вход, черновики браузера и автономные копии прежнего сервера будут удалены с этого устройства. Серверные данные сохранятся.") { yes in if yes { self.connect(target) } }
            } else { self.connect(target) }
        })
        dialog.addAction(UIAlertAction(title: "Отмена", style: .cancel)); present(dialog, animated: true)
    }
    private func connect(_ target: URL) {
        guard !switching else { return }; switching = true; title = "Подключение…"
        var request = URLRequest(url: target.appendingPathComponent("api/mobile/status")); request.timeoutInterval = 15
        let session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: .main)
        probe = session.dataTask(with: request) { [weak self] data, response, error in
            session.finishTasksAndInvalidate()
            DispatchQueue.main.async {
                guard let self else { return }; self.title = "D&D Companion"
                guard error == nil, let response = response as? HTTPURLResponse, response.statusCode == 200,
                      ServerPolicy.same(target, response.url), let data, data.count < 65536,
                      let body = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], body["application"] as? String == "dnd-companion", body["protocol"] as? Int == 1 else {
                    self.switching = false; self.notice("Сервер недоступен или несовместим. Проверьте адрес и HTTPS."); return
                }
                let apply = { self.server = target; UserDefaults.standard.set(target.absoluteString, forKey: "server"); self.switching = false; self.home() }
                if let old = self.server, old != target {
                    self.web.stopLoading()
                    do { try self.offline.clear(old) } catch { self.switching = false; self.notice("Не удалось очистить прежние копии. Смена сервера отменена."); return }
                    WKWebsiteDataStore.default().removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast, completionHandler: apply)
                } else { apply() }
            }
        }; probe?.resume()
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    private func trusted(_ message: WKScriptMessage) -> Bool {
        guard let server, message.frameInfo.isMainFrame, ServerPolicy.same(server, web.url), ServerPolicy.same(server, message.frameInfo.request.url) else { return false }
        return true
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard trusted(message), let body = message.body as? [String: Any] else { return }
        if body["action"] as? String == "print" { printPage(); return }
        guard body["action"] as? String == "file", let raw = body["base64"] as? String, raw.count < 23 * 1024 * 1024,
              let data = Data(base64Encoded: raw), data.count <= 16 * 1024 * 1024,
              let mime = body["mime"] as? String, ["text/plain", "application/json", "image/png", "image/svg+xml", "application/pdf", "application/zip", "application/octet-stream"].contains(String(mime.split(separator: ";").first ?? "")) else { notice("Файл слишком большой или его формат не поддерживается."); return }
        guard presentedViewController == nil else { return }
        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString(), isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let url = directory.appendingPathComponent(ServerPolicy.filename(body["name"] as? String ?? "export"))
            try data.write(to: url, options: .atomic); pendingExports.append(directory)
            let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            share.popoverPresentationController?.barButtonItem = navigationItem.rightBarButtonItem
            share.completionWithItemsHandler = { [weak self] _, _, _, _ in try? FileManager.default.removeItem(at: directory); self?.pendingExports.removeAll { $0 == directory } }
            present(share, animated: true)
        } catch { notice("Не удалось подготовить файл для сохранения.") }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard trusted(message), let server, let card = message.body as? [String: Any] else { replyHandler(nil, "Доступ запрещён"); return }
        do { try offline.save(card, server: server); replyHandler(true, nil) } catch { replyHandler(nil, "Не удалось сохранить карточку. Проверьте свободное место и лимит 200 карточек.") }
    }
    private func showOffline() { guard let server else { setup(); return }; do { navigationController?.pushViewController(try offline.reader(server), animated: true) } catch { notice("Не удалось прочитать сохранённые карточки.") } }
    private func printPage() {
        guard let server, ServerPolicy.same(server, web.url), presentedViewController == nil else { return }
        let printer = UIPrintInteractionController.shared; printer.printFormatter = web.viewPrintFormatter()
        if let button = navigationItem.rightBarButtonItem { printer.present(from: button, animated: true, completionHandler: nil) }
    }
    private func notice(_ text: String) { guard presentedViewController == nil else { return }; let alert = UIAlertController(title: "D&D Companion", message: text, preferredStyle: .alert); alert.addAction(UIAlertAction(title: "Понятно", style: .default)); present(alert, animated: true) }
    private func confirm(_ text: String, reply: @escaping (Bool) -> Void) {
        guard presentedViewController == nil else { reply(false); return }
        let alert = UIAlertController(title: "D&D Companion", message: text, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Продолжить", style: .default) { _ in reply(true) }); alert.addAction(UIAlertAction(title: "Отмена", style: .cancel) { _ in reply(false) }); present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let server else { decisionHandler(.cancel); return }
        if ServerPolicy.same(server, url) {
            if url.path == "/offline.html", navigationAction.targetFrame?.isMainFrame != false { decisionHandler(.cancel); showOffline(); return }
            decisionHandler(.allow)
        } else { decisionHandler(.cancel); if navigationAction.targetFrame?.isMainFrame != false && navigationAction.navigationType == .linkActivated && ["https", "http"].contains(url.scheme ?? "") { UIApplication.shared.open(url) } }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url, let server else { return nil }
        if ServerPolicy.same(server, url) { if url.path == "/offline.html" { showOffline() } else { web.load(navigationAction.request) } }
        else if ["https", "http"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
        return nil
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { notice("Просмотрщик остановлен системой. Нажмите «Обновить» в меню.") }
    private func failed(_ error: Error) {
        if (error as NSError).code == NSURLErrorCancelled || presentedViewController != nil { return }
        let alert = UIAlertController(title: "Нет подключения", message: "Проверьте сервер и сеть. Ранее сохранённые правила доступны без интернета.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Повторить", style: .default) { _ in self.home() }); alert.addAction(UIAlertAction(title: "Читать без сети", style: .default) { _ in self.showOffline() }); alert.addAction(UIAlertAction(title: "Закрыть", style: .cancel)); present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard presentedViewController == nil else { completionHandler(); return }; let alert = UIAlertController(title: "D&D Companion", message: message, preferredStyle: .alert); alert.addAction(UIAlertAction(title: "Понятно", style: .default) { _ in completionHandler() }); present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) { confirm(message, reply: completionHandler) }
    deinit { probe?.cancel(); for url in pendingExports { try? FileManager.default.removeItem(at: url) } }
}
