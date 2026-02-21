package com.anonymous.HomeAidKit

import android.app.PendingIntent
import android.content.Context

class MedicinesWidgetProvider : BaseListWidgetProvider() {
  override fun title(context: Context): String = context.getString(R.string.widget_medicines_title)

  override fun items(context: Context): List<WidgetListItem> = WidgetDataStore.getMedicineItems(context)

  override fun actionLabel(context: Context): String = context.getString(R.string.widget_action_take)

  override fun actionIntent(context: Context, itemId: String): PendingIntent {
    return openWidgetActionIntent(
      context = context,
      action = "take_medicine",
      itemId = itemId,
      requestCodeSeed = "medicines"
    )
  }
}
