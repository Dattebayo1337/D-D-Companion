package app.dndcompanion.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class ServerPolicyTest {
    @Test public void normalizesOnlyServerOrigins(){
        assertEquals("https://example.com",ServerPolicy.normalize(" EXAMPLE.COM/ ",false));
        assertEquals("https://example.com",ServerPolicy.normalize("https://example.com:443",false));
        assertEquals("https://example.com:8443",ServerPolicy.normalize("https://example.com:8443/",false));
        for(String url:new String[]{"http://example.com","https://user:password@example.com","https://example.com/path","https://example.com/?key=secret","https://example.com/#login","file:///tmp/file","javascript:alert(1)","https://example.com:65536","https://example.com:0"}){
            try{ServerPolicy.normalize(url,false);fail(url);}catch(IllegalArgumentException expected){}
        }
    }
    @Test public void debugAllowsOnlyLocalHttp(){
        for(String host:new String[]{"127.0.0.1","localhost","10.0.2.2","192.168.1.5","172.16.0.1"})assertEquals("http://"+host+":3000",ServerPolicy.normalize("http://"+host+":3000",true));
        for(String host:new String[]{"example.com","192.168.1.999","172.32.0.1","10.example.com"})assertFalse(ServerPolicy.isLocal(host));
    }
    @Test public void navigationNeverWidensTheOrigin(){
        String origin="https://example.com";
        assertTrue(ServerPolicy.sameOrigin(origin,"https://example.com:443/api/map-images/a?download=1"));
        for(String url:new String[]{"https://example.com.evil.test/","https://example.com@evil.test/","https://evil.test@example.com/","http://example.com/","https://example.com:8443/","file:///tmp/a"})assertFalse(url,ServerPolicy.sameOrigin(origin,url));
        assertEquals(".._.._map_.png",ServerPolicy.filename("../../map?.png"));
    }
}
