package app.dndcompanion.mobile;

import java.net.URI;
import java.util.Locale;

/** The selected origin is the sole trusted WebView and download origin. */
public final class ServerPolicy {
    private ServerPolicy() {}
    public static String normalize(String value, boolean debug) {
        try {
            String text = value.trim();
            if (!text.contains("://")) text = "https://" + text;
            URI uri = new URI(text);
            String host = uri.getHost(), scheme = uri.getScheme().toLowerCase(Locale.ROOT);
            if (host == null || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || (uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !uri.getRawPath().equals("/"))
                || uri.getPort() < -1 || uri.getPort() == 0 || uri.getPort() > 65535) throw new Exception();
            if (!scheme.equals("https") && !(debug && scheme.equals("http") && isLocal(host))) throw new Exception();
            int port = uri.getPort();
            if ((scheme.equals("https") && port == 443) || (scheme.equals("http") && port == 80)) port = -1;
            return new URI(scheme, null, host.toLowerCase(Locale.ROOT), port, null, null, null).toASCIIString();
        } catch (Exception e) { throw new IllegalArgumentException("Укажите HTTPS-адрес сервера без пути, логина и параметров, например https://game.example.ru"); }
    }
    public static boolean sameOrigin(String origin, String url) {
        try {
            URI u = new URI(url);
            if (u.getHost() == null || u.getRawUserInfo() != null) return false;
            String candidate = new URI(u.getScheme(), null, u.getHost(), u.getPort(), null, null, null).toString();
            return normalize(candidate, true).equals(origin);
        } catch (Exception e) { return false; }
    }
    public static boolean isLocal(String host) {
        if (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("[::1]") || host.equals("::1")) return true;
        String[] parts = host.split("\\.");
        if (parts.length != 4) return false;
        int[] n = new int[4];
        try { for (int i=0;i<4;i++) { if (!parts[i].matches("[0-9]{1,3}")) return false; n[i]=Integer.parseInt(parts[i]); if(n[i]>255)return false; } }
        catch (Exception e) { return false; }
        return n[0]==10 || (n[0]==192 && n[1]==168) || (n[0]==172 && n[1]>=16 && n[1]<=31);
    }
    public static String filename(String value) {
        String name = value == null ? "карта" : value.replaceAll("[\\p{Cntrl}\\\\/:*?\"<>|]", "_");
        if (name.trim().isEmpty() || name.equals(".") || name.equals("..")) name="файл";
        return name.substring(0,Math.min(140,name.length()));
    }
}
