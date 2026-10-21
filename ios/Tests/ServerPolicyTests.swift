import XCTest
@testable import CompanionPolicy
final class ServerPolicyTests: XCTestCase {
    func testOriginsAndInvalidAddresses() {
        XCTAssertEqual(ServerPolicy.normalize("https://example.com:443/")?.absoluteString, "https://example.com")
        for input in ["https://user:password@example.com", "https://example.com/login", "https://example.com?q=1", "https://example.com#token", "javascript:alert(1)", "http://example.com", "https://example.com:0"] { XCTAssertNil(ServerPolicy.normalize(input), input) }
        let server = URL(string: "https://example.com")!
        XCTAssertTrue(ServerPolicy.same(server, URL(string: "https://example.com:443/play")))
        XCTAssertFalse(ServerPolicy.same(server, URL(string: "https://example.com.evil.test")))
        XCTAssertFalse(ServerPolicy.same(server, URL(string: "https://user@example.com")))
        XCTAssertEqual(ServerPolicy.filename("../private/file.json"), ".._private_file.json")
    }
}
