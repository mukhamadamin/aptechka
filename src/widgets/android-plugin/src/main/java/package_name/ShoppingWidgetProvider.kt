package com.anonymous.HomeAidKit

import android.content.Context

class ShoppingWidgetProvider : BaseListWidgetProvider() {
  override fun title(context: Context): String = context.getString(R.string.widget_shopping_title)

  override fun lines(context: Context): List<String> = WidgetDataStore.getShoppingLines(context)
}
