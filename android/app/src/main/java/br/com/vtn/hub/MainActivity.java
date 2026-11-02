package br.com.vtn.hub;

/*
 * VTN Hub para Android: abre o VTN Hub (servidor no computador do Victor) numa janela própria.
 * Na 1ª vez pede o endereço (o mesmo que o Victor manda para a equipe). Depois abre direto.
 * A página fala com o Android pela ponte "VTNAndroid" (ver js/android.js no app):
 * salvar arquivos em Downloads, imprimir / gerar PDF, abrir links de fora no navegador.
 */

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.text.InputType;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final int ESCOLHER_ARQUIVO = 7;
    private SharedPreferences prefs;
    private WebView web;
    private WebView webImpressao;            // mantém viva a página que está sendo impressa
    private ValueCallback<Uri[]> retornoArquivo;
    private String endereco = "";

    @Override
    protected void onCreate(Bundle salvo) {
        super.onCreate(salvo);
        prefs = getSharedPreferences("vtn", MODE_PRIVATE);
        endereco = prefs.getString("url", "");
        if (endereco.isEmpty()) endereco = getString(R.string.url_padrao);
        if (endereco.isEmpty()) mostrarConfiguracao(null); else abrirApp();
    }

    /* ---------- tela "Endereço do VTN Hub" ---------- */
    private void mostrarConfiguracao(String aviso) {
        if (web != null) { web.destroy(); web = null; }
        int p = dp(24);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(p, dp(48), p, p);
        box.setBackgroundColor(Color.parseColor("#0B1530"));

        TextView t = new TextView(this);
        t.setText("VTN Hub");
        t.setTextColor(Color.WHITE); t.setTextSize(28); t.setTypeface(Typeface.DEFAULT_BOLD);
        box.addView(t);

        TextView s = new TextView(this);
        s.setText("Cole o endereço do VTN Hub que o Victor enviou (começa com https://). É feito só uma vez.");
        s.setTextColor(Color.parseColor("#CBD5E1")); s.setTextSize(15); s.setPadding(0, dp(10), 0, dp(18));
        box.addView(s);

        if (aviso != null) {
            TextView a = new TextView(this);
            a.setText(aviso); a.setTextColor(Color.parseColor("#FCA5A5")); a.setTextSize(14); a.setPadding(0, 0, 0, dp(12));
            box.addView(a);
        }

        final EditText campo = new EditText(this);
        campo.setHint("https://....ts.net/");
        campo.setText(prefs.getString("url", ""));
        campo.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        campo.setTextColor(Color.parseColor("#0F172A")); campo.setHintTextColor(Color.parseColor("#94A3B8"));
        campo.setBackgroundColor(Color.WHITE); campo.setPadding(dp(14), dp(14), dp(14), dp(14));
        box.addView(campo, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button ok = new Button(this);
        ok.setText("Abrir o VTN Hub");
        ok.setTextColor(Color.WHITE); ok.setBackgroundColor(Color.parseColor("#2563EB")); ok.setAllCaps(false); ok.setTextSize(16);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        lp.topMargin = dp(16);
        box.addView(ok, lp);
        ok.setOnClickListener(v -> {
            String u = extrairEndereco(campo.getText().toString());
            if (u == null) { mostrarConfiguracao("Endereço inválido. Ele começa com https://"); return; }
            prefs.edit().putString("url", u).apply();
            endereco = u;
            abrirApp();
        });

        ScrollView sv = new ScrollView(this);
        sv.setFillViewport(true); sv.setBackgroundColor(Color.parseColor("#0B1530"));
        sv.addView(box);
        setContentView(sv);
    }

    private static String extrairEndereco(String texto) {
        Matcher m = Pattern.compile("https://[^\\s\"'<>]+").matcher(texto == null ? "" : texto.trim());
        if (!m.find()) return null;
        String u = m.group();
        Uri x = Uri.parse(u);
        if (x.getHost() == null || x.getHost().isEmpty()) return null;
        return "https://" + x.getHost() + (x.getPort() > 0 ? ":" + x.getPort() : "") + "/";
    }

    /* ---------- o app ---------- */
    private void abrirApp() {
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0B1530"));
        WebSettings w = web.getSettings();
        w.setJavaScriptEnabled(true);
        w.setDomStorageEnabled(true);
        w.setDatabaseEnabled(true);
        w.setLoadWithOverviewMode(true);
        w.setUseWideViewPort(true);
        w.setBuiltInZoomControls(true);
        w.setDisplayZoomControls(false);
        w.setAllowFileAccess(false);
        w.setUserAgentString(w.getUserAgentString() + " VTNHubAndroid/1");
        web.addJavascriptInterface(new Ponte(), "VTNAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (Uri.parse(endereco).getHost().equalsIgnoreCase(String.valueOf(u.getHost()))) return false;
                abrirFora(u.toString());
                return true;
            }
            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (!r.isForMainFrame()) return;
                String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><meta charset='utf-8'></head>"
                    + "<body style='margin:0;font-family:sans-serif;background:#0B1530;color:#fff;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px;box-sizing:border-box'><div>"
                    + "<h2>Sem conexão com o VTN Hub</h2><p style='color:#CBD5E1'>O computador do Victor precisa estar ligado e com internet. Confira também a internet do celular.</p>"
                    + "<button onclick=\"location.replace('" + endereco + "')\" style='background:#2563EB;color:#fff;border:0;border-radius:10px;padding:14px 22px;font-size:16px;width:100%'>Tentar de novo</button>"
                    + "<p><a href='#' onclick='VTNAndroid.trocarEndereco();return false' style='color:#93C5FD'>Trocar o endereço</a></p></div></body></html>";
                v.loadDataWithBaseURL(endereco, html, "text/html", "utf-8", endereco);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (retornoArquivo != null) retornoArquivo.onReceiveValue(null);
                retornoArquivo = cb;
                Intent i = params.createIntent();
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try { startActivityForResult(Intent.createChooser(i, "Escolher arquivo"), ESCOLHER_ARQUIVO); }
                catch (ActivityNotFoundException ex) { retornoArquivo = null; return false; }
                return true;
            }
        });
        web.setDownloadListener((url, ua, cd, mime, tam) -> { if (url.startsWith("http")) abrirFora(url); });
        setContentView(web);
        web.loadUrl(endereco);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent dados) {
        if (req != ESCOLHER_ARQUIVO || retornoArquivo == null) { super.onActivityResult(req, res, dados); return; }
        Uri[] r = null;
        if (res == RESULT_OK && dados != null) {
            if (dados.getClipData() != null) {
                int n = dados.getClipData().getItemCount();
                r = new Uri[n];
                for (int k = 0; k < n; k++) r[k] = dados.getClipData().getItemAt(k).getUri();
            } else if (dados.getData() != null) r = new Uri[]{ dados.getData() };
        }
        retornoArquivo.onReceiveValue(r);
        retornoArquivo = null;
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    private void abrirFora(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (ActivityNotFoundException e) { Toast.makeText(this, "Nenhum app abre este link", Toast.LENGTH_SHORT).show(); }
    }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    /* ---------- ponte com a página (js/android.js) ---------- */
    class Ponte {
        @JavascriptInterface
        public void salvar(String base64, String nome, String tipo) {
            final byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            final String arq = nome.replaceAll("[\\\\/:*?\"<>|]", "_");
            runOnUiThread(() -> {
                try {
                    Uri uri = null;
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, arq);
                        cv.put(MediaStore.Downloads.MIME_TYPE, tipo);
                        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/VTN Hub");
                        uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        try (OutputStream o = getContentResolver().openOutputStream(uri)) { o.write(bytes); }
                    } else {
                        File d = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                        try (FileOutputStream o = new FileOutputStream(new File(d, arq))) { o.write(bytes); }
                    }
                    Toast.makeText(MainActivity.this, "Salvo em Downloads/VTN Hub: " + arq, Toast.LENGTH_LONG).show();
                    if (uri != null) {
                        Intent i = new Intent(Intent.ACTION_VIEW);
                        i.setDataAndType(uri, tipo);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        try { startActivity(i); } catch (ActivityNotFoundException e) { /* fica só salvo */ }
                    }
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Não foi possível salvar: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void imprimir(String html, String titulo, String base) {
            runOnUiThread(() -> {
                webImpressao = new WebView(MainActivity.this);
                webImpressao.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView v, String url) {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        pm.print(titulo, v.createPrintDocumentAdapter(titulo),
                            new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                    }
                });
                webImpressao.loadDataWithBaseURL(base, html, "text/html", "utf-8", null);
            });
        }

        @JavascriptInterface
        public void abrirExterno(String url) { runOnUiThread(() -> abrirFora(url)); }

        @JavascriptInterface
        public void trocarEndereco() { runOnUiThread(() -> mostrarConfiguracao(null)); }

        @JavascriptInterface
        public String versao() { return "1"; }
    }
}
