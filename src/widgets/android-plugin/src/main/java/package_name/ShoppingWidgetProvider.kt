package com.anonymous.HomeAidKit

import android.app.PendingIntent
import android.content.Context

class ShoppingWidgetProvider : BaseListWidgetProvider() {
  override fun title(context: Context): String = context.getString(R.string.widget_shopping_title)

  override fun items(context: Context): List<WidgetListItem> = WidgetDataStore.getShoppingItems(context)

  override fun actionLabel(context: Context): String = context.getString(R.string.widget_action_done)

  override fun actionIntent(context: Context, itemId: String): PendingIntent {
    return openWidgetActionIntent(
      context = context,
      action = "toggle_shopping",
      itemId = itemId,
      requestCodeSeed = "shopping"
    )
  }
}
