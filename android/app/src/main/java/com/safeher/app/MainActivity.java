package com.safeher.app;

import android.os.Bundle;
import android.os.Handler;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private int volumeClickCount = 0;
    private final Handler clickHandler = new Handler();
    private final Runnable resetClickCount = new Runnable() {
        @Override
        public void run() {
            volumeClickCount = 0;
        }
    };

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            // Only count ACTION_DOWN to avoid double counting
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                volumeClickCount++;
                
                clickHandler.removeCallbacks(resetClickCount);
                if (volumeClickCount >= 3) {
                    // Inject JS event into webview
                    if (this.bridge != null && this.bridge.getWebView() != null) {
                        this.bridge.getWebView().evaluateJavascript("window.dispatchEvent(new Event('hardware_sos_trigger'));", null);
                    }
                    volumeClickCount = 0; // reset
                } else {
                    // Allow 1.5 seconds to do 3 rapid clicks
                    clickHandler.postDelayed(resetClickCount, 1500);
                }
            }
            // Return false so we don't block the actual volume change, remaining stealthy
        }
        return super.onKeyDown(keyCode, event);
    }
}
