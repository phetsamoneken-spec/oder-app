package com.beerlao.pos

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    companion object {
        const val TARGET_URL = "https://phetsamoneken-spec.github.io/Preorder/"
        private const val FILE_PROVIDER_AUTHORITY = "com.beerlao.pos.fileprovider"
    }

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineContainer: LinearLayout
    private lateinit var btnRetry: Button

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null

    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null

    // Activity Result Launcher for Camera & File Picker
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback == null) return@registerForActivityResult

        var results: Array<Uri>? = null
        if (result.resultCode == RESULT_OK) {
            val intentData = result.data
            if (intentData?.data != null) {
                // User picked an image from gallery
                results = arrayOf(intentData.data!!)
            } else if (cameraPhotoUri != null) {
                // User took a photo with camera
                results = arrayOf(cameraPhotoUri!!)
            }
        }

        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    // Permission Launcher for Geolocation
    private val requestLocationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        val granted = fineGranted || coarseGranted
        pendingGeoCallback?.invoke(pendingGeoOrigin, granted, false)
        pendingGeoCallback = null
        pendingGeoOrigin = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 1. Configure Fullscreen Immersive Sticky Mode
        setupImmersiveStickyFullscreen()

        // 2. Initialize Views
        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        progressBar = findViewById(R.id.progressBar)
        offlineContainer = findViewById(R.id.offlineContainer)
        btnRetry = findViewById(R.id.btnRetry)

        // 3. Configure Hardware Back Navigation
        setupBackNavigation()

        // 4. Configure Pull-To-Refresh
        swipeRefreshLayout.setColorSchemeColors(ContextCompat.getColor(this, R.color.beerlao_green))
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }

        // 5. Configure Offline Retry Button
        btnRetry.setOnClickListener {
            offlineContainer.visibility = View.GONE
            webView.visibility = View.VISIBLE
            webView.loadUrl(TARGET_URL)
        }

        // 6. Configure WebView Engine
        setupWebView()

        // 7. Load Target Beerlao POS Application
        if (savedInstanceState == null) {
            webView.loadUrl(TARGET_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onResume() {
        super.onResume()
        setupImmersiveStickyFullscreen()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            setupImmersiveStickyFullscreen()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    /**
     * Configures modern Android Fullscreen Immersive Sticky mode using WindowInsetsControllerCompat.
     * Both the top status bar and bottom navigation bar are hidden. Swiping from screen edges
     * temporarily displays transient system bars that automatically disappear.
     */
    private fun setupImmersiveStickyFullscreen() {
        // Allow content to extend Edge-to-Edge behind system bars
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Extend layout through display cutout / notch area on Android 9+ (API 28+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        // Keep screen awake for active POS cashier registers
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Hide both Status Bar and Navigation Bar with Sticky Swipe-to-show behavior
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        insetsController.hide(WindowInsetsCompat.Type.systemBars())
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings

        // JavaScript & DOM Storage
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true

        // Responsive Viewport & Zoom settings
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.displayZoomControls = false
        settings.builtInZoomControls = false
        settings.setSupportZoom(false)

        // Cache & Performance
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mediaPlaybackRequiresUserGesture = false

        // Security
        settings.allowFileAccess = false
        settings.allowContentAccess = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        // Geolocation
        settings.setGeolocationEnabled(true)

        // Custom User Agent identifier
        settings.userAgentString = settings.userAgentString + " BeerlaoPOS-Android/1.0"

        // WebChromeClient: Handles location permissions, file uploads (Camera/Gallery), and Progress
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress in 1..99) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                    swipeRefreshLayout.isRefreshing = false
                }
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                if (hasLocationPermission()) {
                    callback?.invoke(origin, true, false)
                } else {
                    pendingGeoCallback = callback
                    pendingGeoOrigin = origin
                    requestLocationPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                openImageChooser()
                return true
            }
        }

        // WebViewClient: Handles URL navigation, WhatsApp intent launching, and error screens
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                return handleUrlRouting(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false
                return handleUrlRouting(url)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // If main page failed to load (offline)
                if (request?.isForMainFrame == true) {
                    webView.visibility = View.GONE
                    offlineContainer.visibility = View.VISIBLE
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
                offlineContainer.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }
        }
    }

    /**
     * Intercepts URL requests to handle WhatsApp sharing, dialer, and trusted domain routing.
     */
    private fun handleUrlRouting(url: String): Boolean {
        val uri = Uri.parse(url)
        val scheme = uri.scheme?.lowercase(Locale.ROOT)
        val host = uri.host?.lowercase(Locale.ROOT) ?: ""

        // WhatsApp deep link handling (wa.me or whatsapp://)
        if (scheme == "whatsapp" || host.contains("wa.me") || host.contains("api.whatsapp.com")) {
            return launchWhatsAppIntent(uri)
        }

        // Tel link handling
        if (scheme == "tel") {
            try {
                val dialIntent = Intent(Intent.ACTION_DIAL, uri)
                startActivity(dialIntent)
            } catch (e: Exception) {
                Toast.makeText(this, "ບໍ່ສາມາດເປີດເບີໂທໄດ້", Toast.LENGTH_SHORT).show()
            }
            return true
        }

        // Mailto handling
        if (scheme == "mailto") {
            try {
                val emailIntent = Intent(Intent.ACTION_SENDTO, uri)
                startActivity(emailIntent)
            } catch (e: Exception) {
                // Ignore
            }
            return true
        }

        // Trusted app domains (load directly inside WebView)
        if (host.contains("github.io") ||
            host.contains("docs.google.com") ||
            host.contains("script.google.com") ||
            host.contains("accounts.google.com") ||
            host.contains("drive.google.com")
        ) {
            return false // Allow WebView to load
        }

        // All other external web links: open in system browser
        return try {
            val browserIntent = Intent(Intent.ACTION_VIEW, uri)
            startActivity(browserIntent)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Launches official WhatsApp app or falls back to system browser.
     */
    private fun launchWhatsAppIntent(uri: Uri): Boolean {
        try {
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                setPackage("com.whatsapp")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            return true
        } catch (e: ActivityNotFoundException) {
            // Try WhatsApp Business
            try {
                val wbIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                    setPackage("com.whatsapp.w4b")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(wbIntent)
                return true
            } catch (e2: ActivityNotFoundException) {
                // Fallback to normal browser
                return try {
                    val fallbackIntent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(fallbackIntent)
                    true
                } catch (e3: Exception) {
                    Toast.makeText(this, getString(R.string.whatsapp_not_installed), Toast.LENGTH_LONG).show()
                    true
                }
            }
        }
    }

    /**
     * Opens Image picker allowing the user to either capture a photo with Camera or pick from Gallery.
     */
    private fun openImageChooser() {
        val cameraIntents = mutableListOf<Intent>()

        // 1. Camera Intent with FileProvider URI
        val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (captureIntent.resolveActivity(packageManager) != null) {
            try {
                val photoFile = createImageFile()
                cameraPhotoUri = FileProvider.getUriForFile(
                    this,
                    FILE_PROVIDER_AUTHORITY,
                    photoFile
                )
                captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri)
                captureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                cameraIntents.add(captureIntent)
            } catch (ex: IOException) {
                cameraPhotoUri = null
            }
        }

        // 2. Gallery Intent
        val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }

        // 3. Chooser Intent combining Camera + Gallery
        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, galleryIntent)
            putExtra(Intent.EXTRA_TITLE, "ເລືອກຮູບພາບ ຫຼື ຖ່າຍຮູບໃບບິນ")
            if (cameraIntents.isNotEmpty()) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, cameraIntents.toTypedArray())
            }
        }

        fileChooserLauncher.launch(chooserIntent)
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("BEERLAO_SLIP_${timeStamp}_", ".jpg", storageDir)
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
        return fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Hardware Back Navigation using OnBackPressedDispatcher.
     * Navigates WebView back-history first; confirms before exiting POS application.
     */
    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    showExitConfirmDialog()
                }
            }
        })
    }

    private fun showExitConfirmDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.exit_confirm_title)
            .setMessage(R.string.exit_confirm_message)
            .setPositiveButton(R.string.exit) { _, _ ->
                finish()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }
}
