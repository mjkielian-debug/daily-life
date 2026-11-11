package com.michelle.dailylife.bridge

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var tokenInput: EditText
    private lateinit var status: TextView
    private val choices = linkedMapOf(
        "com.google.android.apps.messaging" to "Google Messages",
        "com.samsung.android.messaging" to "Samsung Messages",
        "com.facebook.orca" to "Messenger"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (20 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            gravity = Gravity.CENTER_VERTICAL
        }
        root.addView(TextView(this).apply {
            text = "Daily Life Bridge"
            textSize = 26f
            setTextColor(0xff49344f.toInt())
        })
        root.addView(TextView(this).apply {
            text = "Forward new notification previews from selected messaging apps to your private Daily Life inbox. Old messages and photos are not imported."
            textSize = 16f
            setPadding(0, pad / 2, 0, pad)
        })
        tokenInput = EditText(this).apply {
            hint = "Paste the one-time token from Daily Life"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(BridgePrefs.token(this@MainActivity))
        }
        root.addView(tokenInput)
        root.addView(TextView(this).apply {
            text = "Forward previews from:"
            textSize = 17f
            setPadding(0, pad, 0, 4)
        })
        val checks = mutableMapOf<String, CheckBox>()
        val enabled = BridgePrefs.enabledPackages(this)
        choices.forEach { (pkg, label) ->
            val box = CheckBox(this).apply {
                text = label
                isChecked = pkg in enabled
                minHeight = (48 * resources.displayMetrics.density).toInt()
            }
            checks[pkg] = box
            root.addView(box)
        }
        val save = Button(this).apply { text = "Save connection" }
        root.addView(save)
        val permission = Button(this).apply {
            text = "Enable notification access"
            setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
        }
        root.addView(permission)
        status = TextView(this).apply { textSize = 14f; setPadding(0, pad, 0, 0) }
        root.addView(status)
        save.setOnClickListener {
            val token = tokenInput.text.toString().trim()
            if (token.length !in 40..80 || !token.startsWith("dl_")) {
                status.text = "Paste the full Daily Life connection token first."
                return@setOnClickListener
            }
            BridgePrefs.saveToken(this, token)
            BridgePrefs.saveEnabledPackages(this, checks.filterValues { it.isChecked }.keys)
            status.text = if (notificationAccessEnabled()) {
                "Saved. New previews from selected apps will be forwarded."
            } else {
                "Saved. Now enable notification access to start forwarding."
            }
        }
        setContentView(root)
        status.text = if (notificationAccessEnabled()) "Notification access is enabled." else "Notification access is not enabled yet."
    }

    private fun notificationAccessEnabled(): Boolean {
        val component = "$packageName/${NotificationForwarderService::class.java.name}"
        val enabled = Settings.Secure.getString(contentResolver, "enabled_notification_listeners").orEmpty()
        return enabled.split(':').any { it.equals(component, ignoreCase = true) }
    }
}
