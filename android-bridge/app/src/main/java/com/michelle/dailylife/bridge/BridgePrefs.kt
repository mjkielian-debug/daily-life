package com.michelle.dailylife.bridge

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object BridgePrefs {
    private const val PREFS = "daily_life_bridge_secure"
    private const val KEY_TOKEN = "token"
    private const val KEY_ENABLED = "enabled_packages"

    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        PREFS,
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun token(context: Context) = prefs(context).getString(KEY_TOKEN, "").orEmpty()
    fun saveToken(context: Context, token: String) = prefs(context).edit().putString(KEY_TOKEN, token.trim()).apply()
    fun enabledPackages(context: Context): Set<String> =
        prefs(context).getStringSet(KEY_ENABLED, setOf("com.google.android.apps.messaging", "com.samsung.android.messaging", "com.facebook.orca"))
            ?.toSet() ?: emptySet()
    fun saveEnabledPackages(context: Context, values: Set<String>) =
        prefs(context).edit().putStringSet(KEY_ENABLED, values).apply()
}
