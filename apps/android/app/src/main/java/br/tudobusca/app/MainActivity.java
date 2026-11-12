package br.tudobusca.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Abre o Tudo-Busca em tela cheia. Links de lojas abrem no navegador do celular. */
public class MainActivity extends Activity {
    private static final String ENDERECO = "https://tudo-busca.onrender.com/?app=android";
    private WebView web;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#09090F"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // favoritos e última coleta guardados no aparelho
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("tudo-busca.onrender.com".equals(u.getHost())) return false;   // páginas do próprio app
                startActivity(new Intent(Intent.ACTION_VIEW, u));                  // lojas e cupons: navegador
                return true;
            }
        });
        setContentView(web);
        if (estado != null) web.restoreState(estado); else web.loadUrl(ENDERECO + "&shell=" + Uri.encode(versaoInstalada()));
    }

    /** Versão deste APK (ex.: 1.0.7): a página compara com o último Release e avisa quando há APK novo. */
    private String versaoInstalada() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; }
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
