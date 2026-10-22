package in.papershapers.study;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Browser-powered shell: no WebView, native bridge, account data or API client. */
public final class MainActivity extends Activity {
    private TextView status;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setBackgroundColor(Color.rgb(247, 245, 239));
        int gap = dp(24);
        content.setPadding(gap, gap, gap, gap);
        scroll.addView(content);
        scroll.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
          @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
          }
        });
        TextView heading = text("Paper Shapers\nStudy", 32);
        content.addView(heading);
        content.addView(text("Your study desk, kept up to date.", 20));
        content.addView(text("Study opens in a secure browser tab. Website improvements arrive automatically, with no APK reinstall for routine UI or backend changes.", 17));
        content.addView(button("Open Study", "app_url"));
        content.addView(button("Downloads and app updates", "update_url"));
        content.addView(text("An internet connection and an up-to-date Android browser are required. Sign-in and payments are handled by the website and browser. This launcher does not store your account or answers.", 16));
        String version;
        try { version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (android.content.pm.PackageManager.NameNotFoundException exception) { version = "unknown"; }
        content.addView(text("Android app version " + version + " · Android 8.0 or newer", 14));
        status = text("", 16);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(status);
        setContentView(scroll);
        if (savedState == null) open("app_url");
    }

    private void open(String resource) {
        String address = getString(getResources().getIdentifier(resource, "string", getPackageName()));
        Uri uri = Uri.parse(address);
        if (!"https".equals(uri.getScheme()) || !"papershapers.in".equals(uri.getHost())) {
            status.setText("This build has an invalid website address. Please obtain an official app build.");
            return;
        }
        Intent browser = new Intent(Intent.ACTION_VIEW, uri);
        browser.addCategory(Intent.CATEGORY_BROWSABLE);
        // Google's documented low-level Custom Tabs protocol, with no session.
        // Browsers without Custom Tabs can handle this as a normal HTTPS link.
        Bundle extras = new Bundle();
        extras.putBinder("android.support.customtabs.extra.SESSION", null);
        extras.putInt("android.support.customtabs.extra.TOOLBAR_COLOR", Color.rgb(23, 38, 60));
        extras.putInt("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        browser.putExtras(extras);
        try {
            startActivity(browser);
            status.setText("Your study desk opened in your browser. You can return here for app updates.");
        } catch (ActivityNotFoundException exception) {
            status.setText("No browser was found. Install or enable an Android browser, then tap Open Study.");
        }
    }

    private TextView text(String value, int size) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(Color.rgb(23, 38, 60));
        view.setPadding(0, dp(8), 0, dp(16));
        return view;
    }

    private Button button(String label, final String resource) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setMinHeight(dp(52));
        button.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { open(resource); }
        });
        return button;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
