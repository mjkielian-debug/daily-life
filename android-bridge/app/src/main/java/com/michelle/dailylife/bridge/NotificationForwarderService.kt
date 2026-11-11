package com.michelle.dailylife.bridge

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

class NotificationForwarderService : NotificationListenerService() {
    private val client by lazy {
        OkHttpClient.Builder().callTimeout(20, TimeUnit.SECONDS).build()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.isGroup || sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        if (!BridgePrefs.enabledPackages(this).contains(sbn.packageName)) return

        val extras = sbn.notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
        if (text.isBlank()) return

        val token = BridgePrefs.token(this)
        if (token.length !in 40..80) return

        val sender = title.ifBlank { applicationLabel(sbn.packageName) }.take(250)
        val eventId = sha256("${sbn.packageName}|${sbn.key}|${sbn.postTime}|$text")
        val request = Request.Builder()
            .url("https://lticktlgrlljlafmjsao.supabase.co/functions/v1/text-ingest")
            .header("apikey", "sb_publishable_S8rk3-LkoyPLuyw2p_v7gA_yskyW--m")
            .header("x-daily-life-token", token)
            .header("x-inbox-sender", sender)
            .header("x-inbox-event-id", eventId)
            .header("x-inbox-source", sbn.packageName)
            .post(text.toRequestBody("text/plain; charset=utf-8".toMediaType()))
            .build()

        Thread {
            runCatching { client.newCall(request).execute().use { } }
        }.start()
    }

    private fun applicationLabel(packageName: String): String = runCatching {
        packageManager.getApplicationLabel(packageManager.getApplicationInfo(packageName, 0)).toString()
    }.getOrDefault("Unknown")

    private fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
            .joinToString("") { "%02x".format(it) }
}
