package com.anonymous.HomeAidKit

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class WidgetListItem(
  val id: String,
  val text: String,
)

internal object WidgetDataStore {
  private const val PREF_SUFFIX = ".widgetdata"
  private const val KEY = "widgetdata"

  private fun prefs(context: Context) =
    context.getSharedPreferences(context.packageName + PREF_SUFFIX, Context.MODE_PRIVATE)

  private fun payload(context: Context): JSONObject {
    val raw = prefs(context).getString(KEY, null) ?: "{}"
    return try {
      JSONObject(raw)
    } catch (_: Throwable) {
      JSONObject("{}")
    }
  }

  private fun savePayload(context: Context, payload: JSONObject) {
    prefs(context).edit().putString(KEY, payload.toString()).apply()
  }

  fun getHouseholdId(context: Context): String? {
    val value = payload(context).optString("householdId", "").trim()
    return value.ifEmpty { null }
  }

  fun getShoppingItems(context: Context): List<WidgetListItem> = readItems(payload(context), "shopping")

  fun getMedicineItems(context: Context): List<WidgetListItem> = readItems(payload(context), "medicines")

  fun removeShoppingItem(context: Context, itemId: String): Boolean {
    return removeItem(context, "shopping", itemId)
  }

  fun removeMedicineItem(context: Context, itemId: String): Boolean {
    return removeItem(context, "medicines", itemId)
  }

  private fun removeItem(context: Context, key: String, itemId: String): Boolean {
    val payload = payload(context)
    val source = payload.optJSONArray(key) ?: return false
    val next = JSONArray()
    var removed = false

    for (index in 0 until source.length()) {
      val value = source.opt(index)
      if (value is JSONObject) {
        val id = value.optString("id", "").trim()
        if (!removed && id == itemId) {
          removed = true
          continue
        }
      }
      next.put(value)
    }

    if (removed) {
      payload.put(key, next)
      savePayload(context, payload)
    }

    return removed
  }

  private fun readItems(json: JSONObject, key: String): List<WidgetListItem> {
    val arr = json.optJSONArray(key) ?: return emptyList()
    val out = mutableListOf<WidgetListItem>()
    for (i in 0 until arr.length()) {
      val value = arr.opt(i)
      when (value) {
        is JSONObject -> {
          val id = value.optString("id", "").trim()
          val text = value.optString("text", "").trim()
          if (id.isNotEmpty() && text.isNotEmpty()) {
            out.add(WidgetListItem(id = id, text = text))
          }
        }
        is String -> {
          val text = value.trim()
          if (text.isNotEmpty()) {
            out.add(WidgetListItem(id = text, text = text))
          }
        }
      }
    }
    return out
  }
}
