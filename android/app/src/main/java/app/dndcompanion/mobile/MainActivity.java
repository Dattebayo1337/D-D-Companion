package app.dndcompanion.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class MainActivity extends Activity {
    private static final int PICK_FILE=10, SAVE_FILE=11, BG=0xff17232d;
    private final ExecutorService worker=Executors.newFixedThreadPool(2);
    private FrameLayout root;
    private LinearLayout browserLayout;
    private View overlay;
    private TextView serverTitle;
    private WebView web;
    private ProgressBar progress;
    private String server="", retryUrl="";
    private ValueCallback<Uri[]> fileCallback;
    private File pendingFile;
    private boolean downloadBusy=false, failed=false;
    private volatile boolean destroyed=false;
    private int generation=0;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root=new FrameLayout(this); root.setBackgroundColor(BG); setContentView(root);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);}
            else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        root.requestApplyInsets();
        server=getPreferences(MODE_PRIVATE).getString("server",BuildConfig.DEFAULT_SERVER_URL);
        if(!server.isEmpty()) {
            try {server=ServerPolicy.normalize(server,BuildConfig.DEBUG);openServer();}
            catch(IllegalArgumentException e){server="";showSetup();}
        } else showSetup();
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.WHITE);t.setPadding(0,dp(8),0,dp(8));return t;}
    private Button button(String title,Runnable action){Button b=new Button(this);b.setText(title);b.setAllCaps(false);b.setOnClickListener(v->action.run());return b;}
    private void hideOverlay(){if(overlay!=null){root.removeView(overlay);overlay=null;}if(browserLayout!=null)browserLayout.setVisibility(View.VISIBLE);}
    private LinearLayout panel(){hideOverlay();if(browserLayout!=null)browserLayout.setVisibility(View.GONE);ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(24),dp(28),dp(24),dp(24));scroll.addView(box);root.addView(scroll,new FrameLayout.LayoutParams(-1,-1));overlay=scroll;return box;}
    private void showSetup(){
        LinearLayout box=panel();box.addView(text("D&D COMPANION",15));box.addView(text("Ваш сервер приключений",28));
        box.addView(text("Введите адрес, на котором размещён D&D Companion. Справочники открываются сразу, для личных данных войдите в аккаунт на своём сервере.",16));
        box.addView(text("Адрес сервера",14));EditText address=new EditText(this);address.setSingleLine(true);address.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);address.setHint("https://game.example.ru");address.setText(server);box.addView(address);
        TextView status=text("Для работы нужен интернет. Адрес можно изменить позже.",14);box.addView(status);
        Button connect=button("Подключиться",()->{});box.addView(connect);
        connect.setOnClickListener(v->{
            final String target;
            try{target=ServerPolicy.normalize(address.getText().toString(),BuildConfig.DEBUG);}catch(IllegalArgumentException e){status.setText(e.getMessage());return;}
            connect.setEnabled(false);status.setText("Проверяю подключение…");final int request=++generation;
            worker.execute(()->{
                String error=null;
                try{HttpURLConnection c=connection(target+"/api/mobile/status");try{
                    if(c.getResponseCode()!=200)throw new Exception("Сервер не ответил. Проверьте адрес и обновите серверную версию приложения.");
                    JSONObject body=new JSONObject(new String(readLimited(c.getInputStream(),64*1024),StandardCharsets.UTF_8));
                    if(!body.optString("application").equals("dnd-companion")||body.optInt("protocol")!=1)throw new Exception("По этому адресу нет совместимого сервера D&D Companion.");
                }finally{c.disconnect();}}catch(Exception e){error=e.getMessage();}
                final String message=error;runOnUiThread(()->{if(destroyed||request!=generation)return;connect.setEnabled(true);if(message!=null){status.setText("Не удалось подключиться. "+message);return;}
                    Runnable apply=()->{server=target;getPreferences(MODE_PRIVATE).edit().putString("server",server).apply();openServer();};
                    if(!server.isEmpty()&&!server.equals(target)){
                        if(web!=null){web.stopLoading();web.clearCache(true);web.clearHistory();}
                        WebStorage.getInstance().deleteAllData();CookieManager.getInstance().removeAllCookies(done->{CookieManager.getInstance().flush();apply.run();});
                    }else apply.run();
                });
            });
        });
        if(!server.isEmpty())box.addView(button("Вернуться к приложению",()->{generation++;hideOverlay();}));
        if(BuildConfig.DEBUG)box.addView(text("Тестовая сборка: разрешён HTTP для локальных IP. На эмуляторе компьютер доступен по http://10.0.2.2:3000. На телефоне используйте HTTPS-хостинг или adb reverse и http://127.0.0.1:3000.",13));
    }
    @SuppressLint("SetJavaScriptEnabled") private void openServer(){
        hideOverlay();if(web!=null){browserLayout.removeView(web);web.destroy();}if(browserLayout!=null)root.removeView(browserLayout);
        browserLayout=new LinearLayout(this);browserLayout.setOrientation(LinearLayout.VERTICAL);browserLayout.setBackgroundColor(BG);
        LinearLayout bar=new LinearLayout(this);bar.setGravity(android.view.Gravity.CENTER_VERTICAL);
        Button back=button("‹",this::goBack);back.setContentDescription("Назад");bar.addView(back,new LinearLayout.LayoutParams(dp(52),dp(48)));
        serverTitle=text(Uri.parse(server).getAuthority(),13);serverTitle.setMaxLines(1);serverTitle.setEllipsize(android.text.TextUtils.TruncateAt.END);serverTitle.setContentDescription("Настройки адреса сервера");serverTitle.setOnClickListener(v->showSetup());bar.addView(serverTitle,new LinearLayout.LayoutParams(0,-2,1));
        Button menu=button("⋮",()->{android.widget.PopupMenu popup=new android.widget.PopupMenu(this,serverTitle);popup.getMenu().add("Обновить");popup.getMenu().add("Адрес сервера");popup.getMenu().add("Читать без сети");popup.getMenu().add("Печать / PDF");popup.getMenu().add("Открыть в браузере");popup.setOnMenuItemClickListener(item->{switch(item.getTitle().toString()){case "Обновить":web.reload();break;case "Адрес сервера":showSetup();break;case "Читать без сети":hideOverlay();web.loadUrl(server+"/offline.html");break;case "Печать / PDF":printPage();break;default:external(server);}return true;});popup.show();});menu.setContentDescription("Меню приложения");bar.addView(menu,new LinearLayout.LayoutParams(dp(52),dp(48)));
        browserLayout.addView(bar);progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);browserLayout.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        web=new WebView(this);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setGeolocationEnabled(false);settings.setMediaPlaybackRequiresUserGesture(true);settings.setUserAgentString(settings.getUserAgentString()+" DnDCompanionAndroid/1");
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web,"CompanionFiles",Collections.singleton(server),(view,message,origin,mainFrame,reply)->{
                if(!mainFrame||!ServerPolicy.sameOrigin(server,origin.toString())||!ServerPolicy.sameOrigin(server,view.getUrl()))return;
                if("print".equals(message.getData())){printPage();return;}
                receiveBlob(message.getData());
            });
        }
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int percent){progress.setProgress(percent);progress.setVisibility(percent==100?View.GONE:View.VISIBLE);}
            @Override public boolean onJsAlert(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Понятно",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){confirmJs(message,result);return true;}
            @Override public boolean onJsBeforeUnload(WebView v,String url,String message,JsResult result){confirmJs("Есть несохранённые изменения. Покинуть страницу?",result);return true;}
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent picker=params.createIntent();picker.addCategory(Intent.CATEGORY_OPENABLE);
                try{startActivityForResult(picker,PICK_FILE);}catch(ActivityNotFoundException e){fileCallback.onReceiveValue(null);fileCallback=null;toast("На устройстве нет приложения выбора файлов.");}return true;
            }
        });
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){
                String url=request.getUrl().toString();if(ServerPolicy.sameOrigin(server,url))return false;
                if(request.isForMainFrame())external(url);return true;
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){
                failed=false;if(!ServerPolicy.sameOrigin(server,url)){v.stopLoading();showError("Переход на другой сервер заблокирован.");return;}retryUrl=url;
            }
            @Override public void onPageFinished(WebView v,String url){
                CookieManager.getInstance().flush();if(!failed&&ServerPolicy.sameOrigin(server,url)){
                    try(InputStream input=getAssets().open("downloads.js")){v.evaluateJavascript(new String(readLimited(input,64*1024),StandardCharsets.UTF_8),null);}catch(Exception ignored){toast("Не удалось подключить сохранение файлов.");}
                }
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showError("Сервер недоступен. Проверьте интернет и адрес сервера.");}
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest request,WebResourceResponse response){if(request.isForMainFrame())showError("Сервер вернул ошибку "+response.getStatusCode()+". Попробуйте позже.");}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error){handler.cancel();showError("Не удалось проверить HTTPS-сертификат сервера. Проверьте домен и сертификат хостинга.");}
            @Override public boolean onRenderProcessGone(WebView v,android.webkit.RenderProcessGoneDetail detail){browserLayout.removeView(v);v.destroy();web=null;showError("Просмотрщик был закрыт Android. Откройте приложение снова.");return true;}
        });
        web.setDownloadListener((url,agent,disposition,mime,length)->{
            if(url.startsWith("blob:"+server+"/")){web.evaluateJavascript("window.__companionSaveBlob("+JSONObject.quote(url)+",'export')",null);return;}
            if(!ServerPolicy.sameOrigin(server,url)){toast("Скачивание доступно только с выбранного сервера.");return;}
            fetchDownload(url,disposition,mime);
        });
        browserLayout.addView(web,new LinearLayout.LayoutParams(-1,0,1));root.addView(browserLayout,new FrameLayout.LayoutParams(-1,-1));web.loadUrl(server+"/");
    }
    private void printPage(){if(web==null||!ServerPolicy.sameOrigin(server,web.getUrl()))return;android.print.PrintManager manager=(android.print.PrintManager)getSystemService(PRINT_SERVICE);if(manager!=null)manager.print("D&D Companion",web.createPrintDocumentAdapter("D&D Companion"),new android.print.PrintAttributes.Builder().build());}
    private void confirmJs(String message,JsResult result){new AlertDialog.Builder(this).setMessage(message).setPositiveButton("Да",(d,w)->result.confirm()).setNegativeButton("Отмена",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();}
    private void showError(String message){failed=true;LinearLayout box=panel();box.addView(text("Не удалось открыть приключение",26));box.addView(text(message,16));box.addView(button("Повторить",()->{hideOverlay();failed=false;if(web==null)openServer();else web.loadUrl(ServerPolicy.sameOrigin(server,retryUrl)?retryUrl:server+"/");}));box.addView(button("Читать сохранённые правила",()->{hideOverlay();if(web==null)openServer();web.loadUrl(server+"/offline.html");}));box.addView(button("Изменить адрес сервера",this::showSetup));}
    private void external(String url){try{Uri uri=Uri.parse(url);if(!"https".equals(uri.getScheme())&&!"http".equals(uri.getScheme())){toast("Эта ссылка не поддерживается.");return;}startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException e){toast("Не найден браузер для открытия ссылки.");}}
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    private HttpURLConnection connection(String address)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(address).openConnection();c.setConnectTimeout(12000);c.setReadTimeout(20000);c.setInstanceFollowRedirects(false);return c;}
    private static byte[] readLimited(InputStream input,int limit)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1){if(out.size()+count>limit)throw new Exception("Файл превышает допустимый размер.");out.write(buffer,0,count);}return out.toByteArray();}
    private static String mime(String value){String m=value==null?"application/octet-stream":value.split(";",2)[0].trim().toLowerCase(Locale.ROOT);switch(m){case "text/plain":case "image/png":case "image/svg+xml":case "application/json":case "application/pdf":case "application/zip":case "application/octet-stream":return m;default:throw new IllegalArgumentException("Этот тип файла не поддерживается.");}}
    private void receiveBlob(String payload){
        if(payload==null||payload.length()>23*1024*1024||downloadBusy)return;downloadBusy=true;final int request=generation;
        worker.execute(()->{try{JSONObject data=new JSONObject(payload);String type=mime(data.optString("mime"));byte[] bytes=android.util.Base64.decode(data.getString("base64"),android.util.Base64.DEFAULT);if(bytes.length>16*1024*1024)throw new Exception("Файл больше 16 МБ.");File temp=File.createTempFile("export-",".tmp",getCacheDir());try(OutputStream out=new FileOutputStream(temp)){out.write(bytes);}String name=ServerPolicy.filename(data.optString("name","export"));runOnUiThread(()->offerSave(temp,name,type,request));}catch(Exception e){downloadError(e.getMessage(),request);}});
    }
    private void fetchDownload(String url,String disposition,String type){
        if(downloadBusy){toast("Сначала завершите текущее сохранение.");return;}downloadBusy=true;final String origin=server,cookies=CookieManager.getInstance().getCookie(server);final int request=generation;toast("Подготовка файла…");
        worker.execute(()->{File temp=null;try{
            String current=url;HttpURLConnection c=null;
            try {
                for(int redirects=0;redirects<=4;redirects++){
                    if(!ServerPolicy.sameOrigin(origin,current))throw new Exception("Файл перенаправлен на другой сервер.");
                    c=connection(current);if(cookies!=null)c.setRequestProperty("Cookie",cookies);int code=c.getResponseCode();
                    if(code>=300&&code<400){String next=c.getHeaderField("Location");c.disconnect();if(next==null||redirects==4)throw new Exception("Некорректное перенаправление.");current=new URL(new URL(current),next).toString();continue;}
                    if(code!=200)throw new Exception("Сервер не выдал файл. Попробуйте войти в аккаунт заново.");break;
                }
                String contentType=mime(c.getContentType());if(c.getContentLengthLong()>64*1024*1024)throw new Exception("Файл больше 64 МБ.");
                temp=File.createTempFile("export-",".tmp",getCacheDir());
                try(InputStream input=c.getInputStream();OutputStream out=new FileOutputStream(temp)){byte[] b=new byte[8192];int count,total=0;while((count=input.read(b))!=-1){total+=count;if(total>64*1024*1024)throw new Exception("Файл больше 64 МБ.");out.write(b,0,count);}}
                String name="export";String header=c.getHeaderField("Content-Disposition");if(header==null)header=disposition;
                if(header!=null){Matcher utf=Pattern.compile("filename\\*=UTF-8''([^;]+)",Pattern.CASE_INSENSITIVE).matcher(header);Matcher basic=Pattern.compile("filename=\"([^\"]+)\"",Pattern.CASE_INSENSITIVE).matcher(header);if(utf.find())name=URLDecoder.decode(utf.group(1),"UTF-8");else if(basic.find())name=basic.group(1);}
                File completed=temp;String filename=ServerPolicy.filename(name);runOnUiThread(()->offerSave(completed,filename,contentType,request));
            }finally{if(c!=null)c.disconnect();}
        }catch(Exception e){if(temp!=null)temp.delete();downloadError(e.getMessage(),request);}});
    }
    private void offerSave(File file,String name,String type,int request){
        if(destroyed||request!=generation){file.delete();downloadBusy=false;return;}pendingFile=file;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE,name);
        try{startActivityForResult(intent,SAVE_FILE);}catch(ActivityNotFoundException e){clearPending();toast("Не найдено приложение для сохранения файлов.");}
    }
    private void downloadError(String error,int request){runOnUiThread(()->{downloadBusy=false;if(!destroyed&&request==generation)toast("Не удалось сохранить файл. "+error);});}
    private void clearPending(){if(pendingFile!=null){pendingFile.delete();pendingFile=null;}downloadBusy=false;}
    @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);
        if(request==PICK_FILE&&fileCallback!=null){Uri[] uris=WebChromeClient.FileChooserParams.parseResult(result,intent);if(uris!=null)for(Uri uri:uris)if(!"content".equals(uri.getScheme())){uris=null;break;}fileCallback.onReceiveValue(uris);fileCallback=null;}
        if(request==SAVE_FILE){if(result!=RESULT_OK||intent==null||intent.getData()==null||pendingFile==null){clearPending();return;}Uri destination=intent.getData();File file=pendingFile;pendingFile=null;worker.execute(()->{String failure=null;try(InputStream input=new java.io.FileInputStream(file);OutputStream out=getContentResolver().openOutputStream(destination)){if(out==null)throw new Exception();byte[] b=new byte[8192];int n;while((n=input.read(b))!=-1)out.write(b,0,n);}catch(Exception e){failure="Не удалось записать файл в выбранную папку.";}finally{file.delete();}String error=failure;runOnUiThread(()->{downloadBusy=false;if(!destroyed)toast(error==null?"Файл сохранён":error);});});}
    }
    private void goBack(){
        if(overlay!=null){if(web!=null){generation++;hideOverlay();}else finish();return;}
        if(web==null){showSetup();return;}
        web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){const e=new Event('cancel',{cancelable:true});if(d.dispatchEvent(e))d.close();return true;}const m=document.querySelector('button[aria-label=\"Закрыть меню\"]');if(m){m.click();return true;}const a=document.querySelector('.nav-item.active');if(a&&a.textContent.trim()!=='Главная'){const h=[...document.querySelectorAll('.nav-item')].find(b=>b.textContent.trim()==='Главная');if(h){h.click();return true;}}return false;})()",handled->{if(!"true".equals(handled)){if(web.canGoBack())web.goBack();else moveTaskToBack(true);}});
    }
    @Override public void onBackPressed(){goBack();}
    @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();if(web!=null)web.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){destroyed=true;generation++;if(fileCallback!=null)fileCallback.onReceiveValue(null);clearPending();if(web!=null){web.stopLoading();web.destroy();}worker.shutdownNow();super.onDestroy();}
}
