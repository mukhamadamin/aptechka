package com.anonymous.HomeAidKit.widgets

import android.content.Context
import org.json.JSONObject

internal object WidgetDataStore {
  private const val PREF_SUFFIX = ".widgetdata"
  private const val KEY = "widgetdata"

  private fun payload(context: Context): JSONObject {
    val prefs = context.getSharedPreferences(context.packageName + PREF_SUFFIX, Context.MODE_PRIVATE)
    val raw = prefs.getString(KEY, null) ?: "{}"
    return try {
      JSONObject(raw)
    } catch (_: Throwable) {
      JSONObject("{}")
    }
  }

  fun getShoppingLines(context: Context): List<String> {
    return readArray(payload(context), "shopping")
  }

  fun getMedicineLines(context: Context): List<String> {
    return readArray(payload(context), "medicines")
  }

  private fun readArray(json: JSONObject, key: String): List<String> {
    val arr = json.optJSONArray(key) ?: return emptyList()
    val out = mutableListOf<String>()
    for (i in 0 until arr.length()) {
      val value = arr.optString(i, "").trim()
      if (value.isNotEmpty()) out.add(value)
    }
    return out
  }
}
