package com.anonymous.HomeAidKit.widgets

import android.content.Context
import com.anonymous.HomeAidKit.R

class ShoppingWidgetProvider : BaseListWidgetProvider() {
  override fun title(context: Context): String = context.getString(R.string.widget_shopping_title)

  override fun lines(context: Context): List<String> = WidgetDataStore.getShoppingLines(context)
}
