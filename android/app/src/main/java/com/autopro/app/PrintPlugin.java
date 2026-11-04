package com.autopro.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * window.print() does nothing in an Android WebView. This opens the system print screen for the
 * current page, from where it goes to a printer or is saved as a PDF.
 */
@CapacitorPlugin(name = "AppPrint")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String title = call.getString("title", "AutoPro");
        getActivity().runOnUiThread(() -> {
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            PrintDocumentAdapter adapter = getBridge().getWebView().createPrintDocumentAdapter(title);
            manager.print(title, adapter, new PrintAttributes.Builder().build());
            call.resolve();
        });
    }
}
